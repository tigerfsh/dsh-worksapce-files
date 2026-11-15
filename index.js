/**
 * Host half of the Workspace Explorer bundle.
 *
 * The browser page needs two operations that the native Workspace Files
 * Remote does not expose: one bounded file inventory for instant fuzzy
 * "quick open", and one ripgrep content search. Both run through the Host
 * subprocess seam and the packaged ripgrep binary, so a large project never
 * streams every file into the browser or blocks the UI thread.
 *
 * The service is intentionally self-contained: it imports only Node builtins
 * and reaches DSH services through the Cordis context. It uses the Typert
 * source-mode marker (the frozen `typertRemote` binding plus method markers)
 * so the Client can call it through the existing authenticated `/api` RPC
 * carrier without a code-generated Remote contribution.
 */

import { createRequire } from 'node:module'
import { readFileSync, realpathSync } from 'node:fs'
import { readdir, stat as fsStat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** Directory names omitted from the inventory and from content search by default. */
const DEFAULT_EXCLUDED = [
  '.git', '.hg', '.svn', '.next', '.nuxt', '.turbo', '.yarn', '.pnpm-store',
  'node_modules', 'bower_components', 'dist', 'build', 'out', 'coverage',
  'target', '.venv', 'venv', 'env', '.tox', '__pycache__', '.pytest_cache',
  '.mypy_cache', '.ruff_cache', '.gradle', '.idea', '.vscode', '.cache',
]

/** Hard cap for one inventory answer; paths beyond it are reported as truncated. */
const MAX_FILES = 100_000
/** Collected stdout cap for the inventory. 100k average paths fit comfortably. */
const INVENTORY_BYTES = 32 * 1024 * 1024
/** Results returned for one content search. */
const MAX_MATCHES = 500
/** Collected stdout cap for content search. */
const SEARCH_BYTES = 32 * 1024 * 1024
/** Preview characters per content match. */
const PREVIEW_CHARS = 320
/** Inventory freshness; a refresh button or an expired cache re-runs rg. */
const INVENTORY_TTL_MS = 15_000

const REMOTE_METHODS_KEY = '@deepseek-ai/dsh-typert-protocol/remote-methods'

/** Locate the running DSH installation root without relying on an env var. */
function findDshInstall() {
  if (typeof process.env.DSH_INSTALL_DIR === 'string' && process.env.DSH_INSTALL_DIR.length > 0) {
    return process.env.DSH_INSTALL_DIR
  }
  const starts = []
  try {
    if (typeof process.argv[1] === 'string') starts.push(realpathSync(process.argv[1]))
  } catch {
    // The entry may be an ephemeral path; fall through to the executable.
  }
  starts.push(join(dirname(dirname(process.execPath)), 'lib', 'node_modules', '@deepseek-ai', 'dsh'))
  for (const start of starts) {
    let dir = start.endsWith('.js') ? dirname(start) : start
    for (let depth = 0; depth < 6; depth += 1) {
      try {
        const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
        if (manifest?.name === '@deepseek-ai/dsh') return dir
      } catch {
        // Keep walking up.
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  return undefined
}

/** Find the ripgrep binary shipped beside the running DSH installation. */
function resolveRipgrep() {
  const install = findDshInstall()
  if (install !== undefined) {
    try {
      const requireFromDsh = createRequire(join(install, 'package.json'))
      const path = requireFromDsh('@vscode/ripgrep').rgPath
      if (typeof path === 'string' && path.length > 0) return path
    } catch {
      // Fall through to PATH for source launches or unusual packaging.
    }
  }
  return 'rg'
}

/** Escape one literal for a ripgrep PCRE-like Rust regex. */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Normalize a search glob so a bare directory name excludes the whole subtree. */
function excludeGlob(name) {
  return name.includes('/') ? `!${name}` : `!**/${name}/**`
}

/** Final segment of a path in either separator spelling. */
function basenameOf(value) {
  const trimmed = value.replace(/[\\/]+$/, '')
  const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return cut === -1 ? trimmed : trimmed.slice(cut + 1)
}

/** Zero-padded elapsed milliseconds for diagnostics. */
function nowMs() {
  return Number(process.hrtime.bigint() / 1_000_000n)
}

/** The service object registered as the `workspaceExplorer` Cordis service. */
class WorkspaceExplorerService {
  /**
   * @param ctx - Host plugin context carrying `fs` and `subprocess`.
   */
  constructor(ctx) {
    this.ctx = ctx
    this.inventory = new Map()
    /** Frozen Typert source-mode binding consumed by the Gateway. */
    this.typertRemote = Object.freeze({
      service: this,
      serviceKey: 'workspaceExplorer',
      namespace: 'workspaceExplorer',
    })
  }

  /**
   * Resolve a Session's workspace root without activating its Agent.
   * @param sessionId - Session identity on the wire.
   * @param signal - caller cancellation.
   * @returns the canonical process-world root and its absolute spelling.
   */
  async rootOf(sessionId, signal) {
    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      throw new Error('workspaceExplorer: a Session id is required')
    }
    const sessions = this.ctx.get('sessions')
    let header = sessions?.get?.(sessionId)?.header
    if (header === undefined) {
      try {
        const stored = await this.ctx.get('sessionPersistence')?.stat?.(sessionId)
        header = stored?.header
      } catch {
        header = undefined
      }
    }
    const policy = this.ctx.get('sandboxPolicy')
    const cwd = header?.cwd ?? policy?.workspaceRoot
    if (typeof cwd !== 'string' || cwd.length === 0) {
      throw new Error('workspaceExplorer: the Session has no working directory')
    }
    const target = await this.ctx.fs.resolve(cwd, { signal })
    const info = await this.ctx.fs.stat(target, signal)
    if (info === undefined) throw new Error(`workspaceExplorer: workspace "${cwd}" does not exist`)
    if (info.type !== 'directory') throw new Error(`workspaceExplorer: workspace "${cwd}" is not a directory`)
    const processRoot = this.ctx.fs.processPath(target)
    return {
      cwd,
      target,
      root: typeof processRoot === 'string' && processRoot.length > 0 ? processRoot : cwd,
    }
  }

  /**
   * Run one managed child with collected output.
   * @param argv - exact argv, never shell-interpreted.
   * @param cwd - child working directory.
   * @param maxBytes - collected stdout cap.
   * @param signal - cancellation/deadline signal.
   * @returns exit facts and collected output.
   */
  async run(argv, cwd, maxBytes, signal) {
    const handle = this.ctx.subprocess.spawn({
      argv,
      cwd,
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes },
        stderr: { maxBytes: 128 * 1024 },
      },
      graceMs: 3_000,
      signal,
    })
    let failure
    try {
      await handle.done
    } catch (error) {
      failure = error
    }
    const stdout = handle.collected?.stdout?.readFrom(0)?.text ?? ''
    const stderr = handle.collected?.stderr?.readFrom(0)?.text ?? ''
    return { failure, stdout, stderr }
  }

  /**
   * Find Python project marker files with one ripgrep pass.
   *
   * Listing every top-level directory to look for a marker costs one stat per
   * child on a large project. Restricting ripgrep to the six marker names
   * keeps the traversal bounded and returns only a handful of paths.
   *
   * @param sessionId - Session whose workspace root is scanned.
   * @param signal - cancellation.
   * @returns project directories relative to the workspace, with an env hint.
   */
  async findProjects(sessionId, signal) {
    const resolved = await this.rootOf(sessionId, signal)
    const argv = [resolveRipgrep(), '--files', '--null', '--no-config', '--hidden', '--color', 'never']
    for (const name of DEFAULT_EXCLUDED) argv.push('--glob', excludeGlob(name))
    argv.push('--glob', '!**/.git/**')
    for (const marker of ['pyproject.toml', 'uv.lock', '.python-version', 'requirements.txt', 'Pipfile', 'setup.py']) {
      argv.push('--glob', marker)
    }
    const { failure, stdout, stderr } = await this.run(argv, resolved.root, 1024 * 1024, signal)
    if (failure !== undefined && stdout.length === 0) {
      throw new Error(`Project discovery failed: ${stderr.trim() || failure.message}`)
    }
    const groups = new Map()
    for (const rawPath of stdout.split('\0')) {
      if (rawPath.length === 0) continue
      const raw = rawPath.replace(/\\/g, '/')
      const slash = raw.lastIndexOf('/')
      const dir = slash === -1 ? '.' : raw.slice(0, slash)
      const name = slash === -1 ? raw : raw.slice(slash + 1)
      let markers = groups.get(dir)
      if (markers === undefined) {
        markers = new Set()
        groups.set(dir, markers)
      }
      markers.add(name)
    }
    const projects = []
    for (const [dir, markers] of groups) {
      if (dir.split('/').length > 3) continue
      const env = markers.has('uv.lock') ? 'uv'
        : markers.has('.python-version') ? 'pyenv'
        : 'python'
      projects.push({
        name: dir === '.' ? basenameOf(resolved.cwd) : dir.slice(dir.lastIndexOf('/') + 1),
        path: dir,
        env,
      })
      if (projects.length >= 32) break
    }
    projects.sort((a, b) => a.path.localeCompare(b.path))
    return { projects, truncated: groups.size > projects.length }
  }

  /**
   * List one workspace directory through the local filesystem backend.
   *
   * The native endpoint stats every child on the local backend; a directory
   * with thousands of files then spends seconds before the tree can paint.
   * `readdir({ withFileTypes: true })` answers names and kinds in one pass.
   * Only symlinks pay for an extra stat so links keep reporting their target.
   *
   * @param sessionId - Session whose workspace root owns the directory.
   * @param path - absolute directory path, inside the workspace.
   * @param options - entry cap hint.
   * @param signal - cancellation.
   * @returns entries in backend order, cut to the cap.
   */
  async listDir(sessionId, path, options, signal) {
    if (typeof path !== 'string' || path.length === 0) throw new Error('workspaceExplorer: a directory path is required')
    const resolved = await this.rootOf(sessionId, signal)
    const target = await this.ctx.fs.resolve(path, { signal })
    const info = await this.ctx.fs.stat(target, signal)
    if (info === undefined) throw new Error(`workspaceExplorer: "${path}" does not exist`)
    if (info.type !== 'directory') throw new Error(`workspaceExplorer: "${path}" is not a directory`)
    if (!this.ctx.fs.contains(resolved.target, target)) throw new Error(`workspaceExplorer: "${path}" is outside the workspace`)
    const processPath = this.ctx.fs.processPath(target)
    if (typeof processPath !== 'string' || processPath.length === 0) throw new Error('workspaceExplorer: the filesystem has no local path')
    const maxEntries = Math.min(5000, Math.max(1, Number(options?.maxEntries) || 5000))
    const dirents = await readdir(processPath, { withFileTypes: true })
    const sliced = dirents.length > maxEntries ? dirents.slice(0, maxEntries) : dirents
    const entries = []
    for (const dirent of sliced) {
      let type = dirent.isDirectory() ? 'directory' : dirent.isFile() ? 'file' : 'other'
      if (dirent.isSymbolicLink()) {
        try {
          const linked = await fsStat(join(processPath, dirent.name))
          type = linked.isDirectory() ? 'directory' : linked.isFile() ? 'file' : 'other'
        } catch {
          type = 'other'
        }
      }
      entries.push({ name: dirent.name, type })
    }
    return { entries, truncated: dirents.length > maxEntries }
  }

  /**
   * List workspace files with ripgrep's ignore rules.
   * @param sessionId - Session whose workspace root is searched.
   * @param options - hidden/ignored switches and a client cap hint.
   * @param signal - cancellation.
   * @returns bounded inventory sorted by depth/path on the Client.
   */
  async listFiles(sessionId, options, signal) {
    const flags = {
      includeHidden: options?.includeHidden === true,
      includeIgnored: options?.includeIgnored === true,
      maxFiles: Math.min(MAX_FILES, Math.max(1, Number(options?.maxFiles) || MAX_FILES)),
    }
    const resolved = await this.rootOf(sessionId, signal)
    const key = `${sessionId}\0${resolved.root}\0${flags.includeHidden}\0${flags.includeIgnored}`
    if (options?.force === true) this.inventory.delete(key)
    const cached = this.inventory.get(key)
    if (cached !== undefined && Date.now() - cached.at < INVENTORY_TTL_MS) {
      return await cached.promise
    }
    const started = nowMs()
    const promise = (async () => {
      const argv = [resolveRipgrep(), '--files', '--null', '--no-config', '--color', 'never']
      if (flags.includeHidden) argv.push('--hidden')
      if (flags.includeIgnored) {
        argv.push('--no-ignore')
        argv.push('--glob', '!**/.git/**')
      } else {
        for (const name of DEFAULT_EXCLUDED) argv.push('--glob', excludeGlob(name))
        argv.push('--glob', '!**/.git/**')
      }
      const { failure, stdout, stderr } = await this.run(argv, resolved.root, INVENTORY_BYTES, signal)
      if (failure !== undefined && stdout.length === 0) {
        throw new Error(`Workspace file inventory failed: ${stderr.trim() || failure.message}`)
      }
      const all = stdout.split('\0').filter(Boolean)
      const truncated = all.length > flags.maxFiles
      const files = truncated ? all.slice(0, flags.maxFiles) : all
      return {
        root: resolved.cwd,
        files,
        truncated,
        elapsedMs: nowMs() - started,
        error: failure === undefined ? undefined : String(failure.message ?? failure),
      }
    })()
    const entry = { at: Date.now(), promise }
    this.inventory.set(key, entry)
    promise.catch(() => {
      if (this.inventory.get(key) === entry) this.inventory.delete(key)
    })
    return await promise
  }

  /**
   * Search workspace file contents with ripgrep JSON output.
   * @param sessionId - Session whose workspace root is searched.
   * @param request - query, matching switches and glob filters.
   * @param signal - cancellation.
   * @returns bounded line matches with one preview line each.
   */
  async searchContent(sessionId, request, signal) {
    const query = typeof request?.query === 'string' ? request.query : ''
    if (query.trim().length === 0) throw new Error('Content search needs a non-empty query')
    const resolved = await this.rootOf(sessionId, signal)
    const started = nowMs()
    const pattern = request?.regex === true ? query : escapeRegExp(query)
    const argv = [
      resolveRipgrep(), '--json', '--no-config', '--color', 'never',
      '--max-columns', '400', '--max-columns-preview',
      '--max-filesize', '2M', '--max-count', '10', '--threads', '4',
    ]
    if (request?.caseSensitive !== true) argv.push('-i')
    if (request?.wholeWord === true) argv.push('-w')
    if (request?.includeHidden === true || request?.includeIgnored === true) argv.push('--hidden')
    if (request?.includeIgnored === true || request?.respectGitignore === false) argv.push('--no-ignore')
    if (request?.includeIgnored !== true) {
      for (const name of DEFAULT_EXCLUDED) argv.push('--glob', excludeGlob(name))
      argv.push('--glob', '!**/.git/**')
    }
    const includes = Array.isArray(request?.include) ? request.include : []
    for (const glob of includes) {
      if (typeof glob === 'string' && glob.trim() !== '') argv.push('--glob', glob.trim())
    }
    const excludes = Array.isArray(request?.exclude) ? request.exclude : []
    for (const glob of excludes) {
      if (typeof glob === 'string' && glob.trim() !== '') argv.push('--glob', `!${glob.trim()}`)
    }
    argv.push('-e', pattern, '.')
    const timeout = AbortSignal.timeout(20_000)
    const combined = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
    const { failure, stdout, stderr } = await this.run(argv, resolved.root, SEARCH_BYTES, combined)
    const matches = []
    let incomplete = timeout.aborted
    const lines = stdout.split('\n')
    for (const line of lines) {
      if (!line.startsWith('{')) continue
      let event
      try {
        event = JSON.parse(line)
      } catch {
        continue
      }
      if (event?.type !== 'match') continue
      const data = event.data
      const rawPath = data?.path?.text
      if (typeof rawPath !== 'string') continue
      const path = rawPath.replace(/^\.\//, '')
      const lineNumber = Number(data.line_number)
      if (!Number.isFinite(lineNumber)) continue
      const rawText = typeof data.lines?.text === 'string' ? data.lines.text : ''
      const preview = rawText.replace(/\r?\n$/, '').slice(0, PREVIEW_CHARS)
      const submatch = Array.isArray(data.submatches) ? data.submatches[0] : undefined
      const column = Number(submatch?.start) + 1
      matches.push({
        path,
        line: lineNumber,
        column: Number.isFinite(column) ? column : 1,
        preview,
      })
      if (matches.length >= MAX_MATCHES) {
        incomplete = true
        break
      }
    }
    if (failure !== undefined && matches.length === 0) {
      const diagnostic = stderr.trim() || failure.message || 'ripgrep failed'
      const error = new Error(`Content search failed: ${diagnostic}`)
      error.code = 'workspace-explorer/search-failed'
      throw error
    }
    return {
      query,
      root: resolved.cwd,
      matches,
      truncated: matches.length >= MAX_MATCHES,
      incomplete,
      elapsedMs: nowMs() - started,
      error: failure === undefined ? undefined : String(failure.message ?? failure),
    }
  }
}

// Typert source-mode markers: the Gateway reads these from the service
// prototype and the frozen binding above. Function signatures must stay
// simple (no defaults/destructuring) because source mode derives wire argument
// names from the live method source.
Object.defineProperty(WorkspaceExplorerService.prototype, REMOTE_METHODS_KEY, {
  configurable: true,
  value: Object.freeze({
    version: 1,
    methods: Object.freeze([
      { method: 'findProjects', invocation: Object.freeze({ kind: 'direct' }) },
      { method: 'listDir', invocation: Object.freeze({ kind: 'direct' }) },
      { method: 'listFiles', invocation: Object.freeze({ kind: 'direct' }) },
      { method: 'searchContent', invocation: Object.freeze({ kind: 'direct' }) },
    ]),
  }),
})

/** Host services this plugin cannot run without. */
export const inject = ['fs', 'subprocess']

/** Register the Host service for this bundle. */
export function apply(ctx) {
  const service = new WorkspaceExplorerService(ctx)
  ctx.effect(() => ctx.provide('workspaceExplorer', service), 'workspace-explorer: service')
}

export { WorkspaceExplorerService }
