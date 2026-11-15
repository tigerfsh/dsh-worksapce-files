/* Built by build-client.mjs. Source: src/plugin.js + rust/fuzzy/fuzzy.js. */
window.__ModuleLoader__.load({
  id: "@fushouhai/dsh-workspace-files",
  factory(require) {
/* Workspace Explorer client body. Bundled into client.js by build-client.mjs. */
'use strict'

const React = require('react')
const {
  useCallback, useDeferredValue, useEffect, useMemo, useRef, useState,
} = React
const h = React.createElement
const Fragment = React.Fragment

const ID = '@fushouhai/dsh-workspace-files'
const NS = 'workspaceExplorer'
const ROW_HEIGHT = 24
const MAX_FILE_RESULTS = 120
const MAX_CONTENT_ROWS = 400
const PREFS_KEY = 'dsh.workspace-explorer.prefs.v1'
const INDEX_TTL_MS = 60_000

/** Directory/file names hidden from the tree and from search unless revealed. */
const IGNORED_NAMES = new Set([
  '.git', '.hg', '.svn', '.next', '.nuxt', '.turbo', '.yarn', '.pnpm-store',
  'node_modules', 'bower_components', 'dist', 'build', 'out', 'coverage',
  'target', '.venv', 'venv', 'env', '.tox', '__pycache__', '.pytest_cache',
  '.mypy_cache', '.ruff_cache', '.gradle', '.idea', '.vscode', '.cache',
])

/** Files that mark a Python project and carry its virtual-environment style. */
const PROJECT_MARKERS = new Set(['pyproject.toml', 'uv.lock', '.python-version', 'requirements.txt', 'Pipfile', 'setup.py'])

"use strict";
/*
 * fuzzy.js — dependency-free fuzzy path matcher with a WebAssembly fast path.
 *
 * Public surface (CommonJS):
 *   createFuzzy(): Promise<{ scoreAll(paths: string[], query: string): Int32Array } | null>
 *   scoreAllJS(paths: string[], query: string): Int32Array
 *
 * Browser-safe: only `WebAssembly`, `atob`, `Uint8Array` and `TextEncoder` are
 * used. There is no `require`, no ESM `import`/`export`, and no Node API.
 * `createFuzzy()` instantiates the embedded wasm module at most once; if
 * instantiation is unavailable or fails it resolves to `null` and callers
 * should fall back to `scoreAllJS`.
 *
 * The WASM ABI is described in src/lib.rs. Byte-level semantics (UTF-8 bytes,
 * ASCII-only case folding) are identical between the wasm and JS paths, which
 * is what makes differential testing useful: scores match exactly, not just
 * match/no-match.
 */

/* Base64 of fuzzy.wasm, injected by build.sh (single line, no whitespace). */
var FUZZY_WASM_B64 = "AGFzbQEAAAABKgZgCH9/f39/f39/AX9gAn9/AGABfwF/YAZ/f39/f38Bf2ADf39/AGAAAAMIBwABAgEDBAUFAwEAAwYIAX8BQYCACAsHKAQGbWVtb3J5AgAFYWxsb2MAAgdkZWFsbG9jAAMJc2NvcmVfYWxsAAQKxgoHpwEAAkACQAJAAkAgAiABTw0AIAUgBE8NAUH4AEHkACAAIAJqIgEtAAAgAyAFai0AAEYbIQUgAkUNAgJAAkAgAUF/ai0AACIBQVNqDgMBAQQACwJAIAFBpH9qDgQEBQUBAAsgAUE6Rw0ECyAFQR5qIQUMAwsgAiABEIGAgIAAAAsgBSAEEIGAgIAAAAsgBUEoaiEFCyAFIAVBPGoiASAHGyABIAIgBkkbCwkAEIaAgIAAAAuaAQEDf0EAIQECQCAAQQ9qQXBxIgIgAEkNAAJAQQAoAoSAiIAAIgANAEEAPwBBEHQiADYCgICIgABBACAANgKEgIiAAAsgACEDAkAgAkUNAEEAIQEgACACaiIDQQAoAoCAiIAAIgJNDQAgAyACa0H//wNqQRB2QABBf0YNAUEAIAM2AoCAiIAAC0EAIAM2AoSAiIAAIAAhAQsgAQs8AQF/AkAgAEUNACABQQ9qQXBxIgFFDQBBACgChICIgAAiAkUNACABIABqIAJHDQBBACAANgKEgIiAAAsLqQcBEn8jgICAgABBEGsiBiSAgICAAEEAIQcCQCAERQ0AIAVFDQAgA0EAIAIbIQggAUEAIAAbIQkgAiAGQQ9qIAMbIAZBD2ogAhshCiAAIAZBD2ogARsgBkEPaiAAGyILQX9qIQxBACENQQAhBwNAAkAgByAFRw0AIAUhBwwCCyAJIA0gCSANSxshACANIQICQANAIAAgAkYNAQJAIAsgAmotAABBCkcNACACIQAMAgsgAkEBaiECDAALCwJAAkAgACANSQ0AIAAgCUsNAAJAIAgNAEEBIQ4MAgsCQCAIIAAgDWsiD00NAEEAIQ4MAgsgCyANaiEQIAwgAGohAiAPIRECQANAQX8hEgJAIBENAEF/IREMAgsgEUF/aiERIAItAAAiAUHcAEYNASACQX9qIQIgAUEvRw0ACwsgEUEBaiETQQAhDkEAIRRBACECQQAhFUEAIQEDQCAPIAJGDQICQCABIAhPDQAgECACai0AACIWQSByIBYgFkG/f2pB/wFxQRpJG0H/AXEgCiABai0AACIWQSByIBYgFkG/f2pB/wFxQRpJG0H/AXFHDQAgECAPIAIgCiAIIAEgEyARQX9zQR92IhcQgICAgAAgFWohFQJAAkAgEkEATg0AIAIhFAwBCyAVIBJBf3MgAmoiFkEIIBZBCEkbQQF0ayEVCwJAIAFBAWoiASAIRg0AIAIhEgwBC0F/IQ4gFSAPIAJBf3NqIgJBCCACQQhJG0EBdiAUQRAgFEEQSRtBAXZqayEUIAwgDWohFUEAIQ0gDyERIAMhFgJAAkADQCAKIBZBf2oiFmohEgNAIBEiAkUNAiAWIAhPDQMgAkF/aiERIBUgAmotAAAiAUEgciABIAFBv39qQf8BcUEaSRtB/wFxIBItAAAiAUEgciABIAFBv39qQf8BcUEaSRtB/wFxRw0ACyAQIA8gESAKIAggFiATIBcQgICAgAAgDWohAQJAAkAgDkF/Sg0AIA8gAmsiAkEIIAJBCEkbQQF2IQIMAQsgDiACayICQQggAkEISRtBAXQhAgsgASACayENIBEhDiAWDQALIA0gEUEQIBFBEEkbQQF2ayICIBQgAiAUShshFAsgFCAPQQN2ayICQQEgAkEBShshDgwECyAWIAgQgYCAgAAACyACQQFqIQIMAAsLIA0gACAJEIWAgIAAAAsgBCAHQQJ0aiAONgIAIAdBAWohByAAIAlPDQEgAEEBaiENDAALCyAGQRBqJICAgIAAIAcLCQAQhoCAgAAACwMAAAs=";

/* ------------------------------------------------------------------ */
/* Byte-level scoring (mirrors src/lib.rs exactly)                    */
/* ------------------------------------------------------------------ */

var BASE = 100; // per matched query byte
var EXACT_CASE = 20; // path byte equals the (lowercased) query byte
var SEG_START = 40; // index 0 or right after `/` or `\`
var AFTER_BOUNDARY = 30; // right after `_ - . / \ :`
var BASENAME = 60; // match inside the basename

function lower(c) {
  return c >= 65 && c <= 90 ? c + 32 : c;
}

function isSep(c) {
  return c === 47 || c === 92;
}

function gapPenalty(g) {
  return (g < 8 ? g : 8) * 2;
}

function leadPenalty(g) {
  return ((g < 16 ? g : 16) / 2) | 0;
}

function tailPenalty(g) {
  return ((g < 8 ? g : 8) / 2) | 0;
}

/* Bonus for matching path byte p[i] against query byte q[j]. */
function charScore(p, i, ps, q, j, baseStart, hasSep) {
  var c = p[i];
  var s = BASE;
  if (c === q[j]) s += EXACT_CASE;
  var prev = i === ps ? 0 : p[i - 1];
  if (i === ps || prev === 47 || prev === 92) s += SEG_START;
  else if (prev === 95 || prev === 45 || prev === 46 || prev === 58) s += AFTER_BOUNDARY;
  if (!hasSep || i >= baseStart) s += BASENAME;
  return s;
}

/*
 * Score the path byte range p[ps..pe) against the lowercased query bytes q.
 * Returns 0 for no subsequence match, otherwise a positive score (1 for an
 * empty query).
 */
function scorePathBytes(p, ps, pe, q) {
  var qlen = q.length;
  if (qlen === 0) return 1;
  var plen = pe - ps;
  if (qlen > plen) return 0;

  var lastSep = -1;
  for (var k = pe - 1; k >= ps; k--) {
    if (p[k] === 47 || p[k] === 92) {
      lastSep = k;
      break;
    }
  }
  var hasSep = lastSep >= 0;
  var baseStart = hasSep ? lastSep + 1 : ps;

  /* Forward pass: leftmost greedy match; decides whether it matches at all. */
  var qi = 0;
  var last = -1;
  var first = ps;
  var acc = 0;
  var matched = false;
  var i;
  for (i = ps; i < pe; i++) {
    if (qi < qlen && lower(p[i]) === lower(q[qi])) {
      acc += charScore(p, i, ps, q, qi, baseStart, hasSep);
      if (last >= 0) acc -= gapPenalty(i - last - 1);
      else first = i;
      last = i;
      qi++;
      if (qi === qlen) {
        matched = true;
        break;
      }
    }
  }
  if (!matched) return 0;
  var best = acc - leadPenalty(first - ps) - tailPenalty(pe - 1 - last);

  /* Backward pass: rightmost greedy match, tightest window around the
   * basename. Keep the better of the two. */
  qi = qlen;
  var next = -1;
  var acc2 = 0;
  var i2;
  for (i2 = pe - 1; i2 >= ps; i2--) {
    if (qi > 0 && lower(p[i2]) === lower(q[qi - 1])) {
      acc2 += charScore(p, i2, ps, q, qi - 1, baseStart, hasSep);
      if (next >= 0) acc2 -= gapPenalty(next - i2 - 1);
      else acc2 -= tailPenalty(pe - 1 - i2);
      next = i2;
      qi--;
      if (qi === 0) {
        var s2 = acc2 - leadPenalty(i2 - ps);
        if (s2 > best) best = s2;
        break;
      }
    }
  }

  best -= (plen / 8) | 0; /* mild preference for shorter paths on ties */
  return best < 1 ? 1 : best;
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                     */
/* ------------------------------------------------------------------ */

var _encoder = null;

function encoder() {
  if (!_encoder) _encoder = new TextEncoder();
  return _encoder;
}

/* ASCII-only lowercasing, matching `u8::to_ascii_lowercase` in Rust. */
function asciiLower(str) {
  return str.replace(/[A-Z]/g, function (c) {
    return String.fromCharCode(c.charCodeAt(0) + 32);
  });
}

function joinPaths(paths) {
  var n = paths.length;
  for (var i = 0; i < n; i++) {
    var s = paths[i];
    if (typeof s !== "string") {
      throw new TypeError("fuzzy.scoreAll: path at index " + i + " is not a string");
    }
    if (s.indexOf("\n") !== -1) {
      throw new TypeError("fuzzy.scoreAll: path at index " + i + " contains a newline");
    }
  }
  return paths.join("\n");
}

/* ------------------------------------------------------------------ */
/* Pure-JS implementation                                             */
/* ------------------------------------------------------------------ */

function scoreAllJS(paths, query) {
  if (!Array.isArray(paths)) {
    throw new TypeError("fuzzy.scoreAllJS: paths must be an Array");
  }
  var n = paths.length;
  var out = new Int32Array(n);
  if (n === 0) return out;

  var joined = joinPaths(paths);
  var p = encoder().encode(joined);
  var plen = p.length;
  var q = encoder().encode(asciiLower(query == null ? "" : String(query)));
  var qlen = q.length;

  if (qlen === 0) {
    for (var z = 0; z < n; z++) out[z] = 1;
    return out;
  }

  var start = 0;
  var idx = 0;
  while (idx < n) {
    var end = start;
    while (end < plen && p[end] !== 10) end++;
    out[idx++] = scorePathBytes(p, start, end, q);
    if (end >= plen) break;
    start = end + 1;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* WASM wrapper                                                       */
/* ------------------------------------------------------------------ */

function base64ToBytes(b64) {
  if (typeof atob !== "function") throw new Error("fuzzy: atob is unavailable");
  var bin = atob(b64);
  var len = bin.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function makeHandle(instance) {
  var ex = instance.exports;
  var memory = ex.memory;
  if (!memory) throw new Error("fuzzy: wasm module does not export memory");
  var alloc = ex.alloc;
  var dealloc = ex.dealloc;
  var scoreAllWasm = ex.score_all;
  if (typeof alloc !== "function" || typeof dealloc !== "function" || typeof scoreAllWasm !== "function") {
    throw new Error("fuzzy: wasm module is missing part of the ABI");
  }

  function scoreAll(paths, query) {
    if (!Array.isArray(paths)) {
      throw new TypeError("fuzzy.scoreAll: paths must be an Array");
    }
    var n = paths.length;
    var out = new Int32Array(n);
    if (n === 0) return out;

    var joined = joinPaths(paths);
    var enc = encoder();
    var q = enc.encode(asciiLower(query == null ? "" : String(query)));
    var qlen = q.length;
    var canEncodeInto = typeof enc.encodeInto === "function";

    /* Allocate the query, then the path blob, then the score array. The bump
     * allocator reclaims blocks in reverse order, so free them in reverse. */
    var qp = alloc(qlen + 1);
    /* 6-7% slack fits plain ASCII without a retry; the retry path uses the
     * UTF-8 worst case (3 bytes per UTF-16 code unit). */
    var pCap = joined.length + (joined.length >> 4) + 64;
    var pp = alloc(pCap + 1);
    if (!qp || !pp) {
      if (pp) dealloc(pp, pCap + 1);
      if (qp) dealloc(qp, qlen + 1);
      throw new Error("fuzzy: wasm allocation failed");
    }

    var plen;
    if (canEncodeInto) {
      /* Encode straight into linear memory: one pass, no intermediate array. */
      var res = enc.encodeInto(joined, new Uint8Array(memory.buffer, pp, pCap));
      if (res.read < joined.length) {
        dealloc(pp, pCap + 1);
        pCap = 3 * joined.length + 4;
        pp = alloc(pCap + 1);
        if (!pp) {
          dealloc(qp, qlen + 1);
          throw new Error("fuzzy: wasm allocation failed");
        }
        res = enc.encodeInto(joined, new Uint8Array(memory.buffer, pp, pCap));
      }
      plen = res.written;
    } else {
      var pbytes = enc.encode(joined);
      plen = pbytes.length;
      if (plen > pCap) {
        dealloc(pp, pCap + 1);
        pCap = plen;
        pp = alloc(plen + 1);
        if (!pp) {
          dealloc(qp, qlen + 1);
          throw new Error("fuzzy: wasm allocation failed");
        }
      }
      new Uint8Array(memory.buffer, pp, plen).set(pbytes);
    }

    var op = alloc(n * 4);
    if (!op) {
      dealloc(pp, pCap + 1);
      dealloc(qp, qlen + 1);
      throw new Error("fuzzy: wasm allocation failed");
    }
    /* Views are created after the final allocation: `alloc` may grow memory
     * and detach earlier ArrayBuffers. */
    new Uint8Array(memory.buffer, qp, qlen).set(q);

    var scores;
    try {
      var written = scoreAllWasm(pp, plen, qp, qlen, op, n);
      scores = new Int32Array(memory.buffer, op, written).slice();
    } finally {
      dealloc(op, n * 4);
      dealloc(pp, pCap + 1);
      dealloc(qp, qlen + 1);
    }
    return scores;
  }

  return { scoreAll: scoreAll, memory: memory };
}

var wasmPromise = null;

function loadWasm() {
  if (typeof WebAssembly === "undefined") return Promise.resolve(null);
  var bytes;
  try {
    bytes = base64ToBytes(FUZZY_WASM_B64);
  } catch (err) {
    return Promise.resolve(null);
  }
  return WebAssembly.instantiate(bytes, {})
    .then(function (result) {
      return makeHandle(result.instance);
    })
    .catch(function () {
      return null;
    });
}

/*
 * Resolve to `{ scoreAll }` backed by wasm, or `null` if wasm cannot be used.
 * The wasm module is instantiated once per module instance; concurrent callers
 * share the same promise.
 */
function createFuzzy() {
  if (!wasmPromise) wasmPromise = loadWasm();
  return wasmPromise;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createFuzzy: createFuzzy, scoreAllJS: scoreAllJS };
}


const DICTS = {
  zh: {
    title: '工作区资源管理器',
    tabTitle: '资源管理器',
    guideDescription: '浏览工作区、快速打开文件、搜索内容与复制路径。',
    open: '打开',
    refresh: '刷新',
    collapse: '全部折叠',
    showHidden: '显示隐藏项',
    hideHidden: '隐藏隐藏项',
    showIgnored: '显示忽略项',
    hideIgnored: '隐藏忽略项',
    noWorkspace: '当前会话没有工作目录。',
    loading: '读取中…',
    emptyDir: '空目录',
    truncated: '目录条目过多，仅显示前面的部分。',
    searchFile: '查找文件',
    searchContent: '查找内容',
    quickOpenTitle: '快速打开文件',
    contentTitle: '在工作区中查找内容',
    quickOpenPlaceholder: '输入文件名或路径…',
    contentPlaceholder: '输入要查找的文本或正则…',
    indexing: '正在建立文件索引…',
    filesCount: '{count} 个文件',
    noMatches: '没有匹配项',
    contentNoMatches: '没有内容匹配',
    contentError: '内容搜索失败：{message}',
    indexFailed: '文件索引失败：{message}',
    retry: '重试',
    selectFileFirst: '请先在资源管理器中选中一个文件',
    copiedContent: '已复制文件内容',
    copiedPath: '已复制 @ 路径',
    copied: '已复制',
    insertPath: '插入路径到对话框',
    copyContent: '复制文件内容',
    copyPath: '复制 @ 路径',
    openFile: '打开文件',
    reveal: '在资源管理器中定位',
    dragHint: '拖到对话框可插入相对路径',
    openHint: '双击打开 · 拖拽插入路径',
    project: '项目',
    envUv: 'uv',
    envPyenv: 'pyenv',
    envVenv: 'venv',
    envPython: 'Python',
    matchCount: '{count} 处匹配',
    searching: '搜索中…',
    caseSensitive: '区分大小写',
    regex: '正则表达式',
    wholeWord: '全词匹配',
    close: '关闭',
    line: '第 {line} 行',
    file: '文件',
    folder: '文件夹',
    root: '根目录',
    noSession: '当前没有可用的会话',
    noComposer: '找不到输入框，请先打开一个会话',
    insertFailed: '插入失败，请重试',
    insertedPath: '已插入路径',
    copyFailed: '复制失败',
    openFailed: '打开文件失败',
    selected: '已选择',
    indexHelp: '首次打开会建立一次文件索引；之后按本地模糊匹配即时响应。',
    indexTruncated: '文件数超过上限，仅索引前面的文件。',
    contentTruncated: '匹配过多，仅显示前面的结果。',
    contentIncomplete: '搜索在完成前结束，结果可能不完整。',
    clear: '清空',
    contextHint: '右键查看更多操作',
    openShortcut: '打开资源管理器',
    contentShortcutHint: 'Ctrl/Cmd+Shift+F',
    quickOpenShortcutHint: 'Ctrl/Cmd+P',
    pastePath: '粘贴代码位置或文件路径',
    pastePathHint: '选中代码后按 Ctrl+U 插入文件名与行号；否则优先使用打开/选中的文件路径，最后使用剪贴板路径',
    noPath: '没有可用的文件路径',
    iconLabel: '工作区资源管理器',
    noFileIndex: '索引不可用，使用宿主文件搜索。',
    searchingFiles: '搜索文件…',
  },
  en: {
    title: 'Workspace Explorer',
    tabTitle: 'Explorer',
    guideDescription: 'Browse the workspace, quick-open files, search contents, and copy paths.',
    open: 'Open',
    refresh: 'Refresh',
    collapse: 'Collapse all',
    showHidden: 'Show hidden entries',
    hideHidden: 'Hide hidden entries',
    showIgnored: 'Show ignored entries',
    hideIgnored: 'Hide ignored entries',
    noWorkspace: 'This session has no working directory.',
    loading: 'Loading…',
    emptyDir: 'Empty directory',
    truncated: 'The directory has more entries than can be shown.',
    searchFile: 'Find file',
    searchContent: 'Find in files',
    quickOpenTitle: 'Quick open file',
    contentTitle: 'Search workspace contents',
    quickOpenPlaceholder: 'Type a file name or path…',
    contentPlaceholder: 'Type text or a regular expression…',
    indexing: 'Building the file index…',
    filesCount: '{count} files',
    noMatches: 'No matches',
    contentNoMatches: 'No content matches',
    contentError: 'Content search failed: {message}',
    indexFailed: 'File index failed: {message}',
    retry: 'Retry',
    selectFileFirst: 'Select a file in the explorer first',
    copiedContent: 'Copied file content',
    copiedPath: 'Copied @ path',
    copied: 'Copied',
    insertPath: 'Insert path into chat',
    copyContent: 'Copy file content',
    copyPath: 'Copy @ path',
    openFile: 'Open file',
    reveal: 'Reveal in explorer',
    dragHint: 'Drag into the composer to insert the relative path',
    openHint: 'Double-click to open · drag to insert the path',
    project: 'Project',
    envUv: 'uv',
    envPyenv: 'pyenv',
    envVenv: 'venv',
    envPython: 'Python',
    matchCount: '{count} matches',
    searching: 'Searching…',
    caseSensitive: 'Match case',
    regex: 'Regular expression',
    wholeWord: 'Whole word',
    close: 'Close',
    line: 'Line {line}',
    file: 'File',
    folder: 'Folder',
    root: 'Workspace',
    noSession: 'No active session',
    noComposer: 'No composer is available',
    insertFailed: 'Could not insert; please try again',
    insertedPath: 'Inserted path',
    copyFailed: 'Copy failed',
    openFailed: 'Could not open the file',
    selected: 'Selected',
    indexHelp: 'The first open builds one file index; later keystrokes use a local fuzzy match.',
    indexTruncated: 'The workspace has more files than the index cap; only the first files were indexed.',
    contentTruncated: 'Too many matches; showing the first results.',
    contentIncomplete: 'The search ended before completion; results may be incomplete.',
    clear: 'Clear',
    contextHint: 'Right-click for more actions',
    openShortcut: 'Open Workspace Explorer',
    contentShortcutHint: 'Ctrl/Cmd+Shift+F',
    quickOpenShortcutHint: 'Ctrl/Cmd+P',
    pastePath: 'Paste code location or file path',
    pastePathHint: 'Select code and press Ctrl+U to insert its file and line range; otherwise use the open/selected file path, then a clipboard path',
    noPath: 'No file path is available',
    iconLabel: 'Workspace Explorer',
    noFileIndex: 'Index unavailable; using the host file search.',
    searchingFiles: 'Searching files…',
  },
}

/* ------------------------------------------------------------------ */
/* Path helpers                                                        */
/* ------------------------------------------------------------------ */

function normalizeRoot(value) {
  if (typeof value !== 'string') return undefined
  if (value === '/') return value
  return value.replace(/[\\/]+$/, '')
}

function separatorOf(path) {
  return path.includes('\\') && !path.includes('/') ? '\\' : '/'
}

function joinPath(dir, name) {
  if (dir === '') return name
  if (dir === '/') return `/${name}`
  if (dir.endsWith('/') || dir.endsWith('\\')) return `${dir}${name}`
  return `${dir}${separatorOf(dir)}${name}`
}

function basename(path) {
  const trimmed = path.replace(/[\\/]+$/, '')
  const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return cut === -1 ? trimmed : trimmed.slice(cut + 1)
}

function relativePath(root, path) {
  if (typeof root !== 'string' || root.length === 0) return path
  const normRoot = root.replace(/\\/g, '/').replace(/\/+$/, '') || '/'
  const normPath = path.replace(/\\/g, '/')
  if (normRoot === '/') return normPath.startsWith('/') ? normPath.slice(1) : normPath
  if (normPath === normRoot) return ''
  if (normPath.startsWith(`${normRoot}/`)) return normPath.slice(normRoot.length + 1)
  return path
}

function encodeSegment(segment) {
  return encodeURIComponent(segment).replace(/%3A/gi, ':')
}

function sessionFileAddress(sessionId, path) {
  const normalized = path.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '')
  return `dsh-resource://file/session/${encodeSegment(sessionId)}/${normalized.split('/').map(encodeSegment).join('/')}`
}

function isIgnoredName(name) {
  return IGNORED_NAMES.has(name)
}

function isHiddenName(name) {
  return name.startsWith('.')
}

function formatText(template, vars) {
  if (vars === undefined) return template
  return String(template).replace(/\{(\w+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  ))
}

/* ------------------------------------------------------------------ */
/* Clipboard / file content                                            */
/* ------------------------------------------------------------------ */

async function writeClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  area.style.top = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(area)
  if (!ok) throw new Error('clipboard unavailable')
}

async function readAllText(ctx, sessionId, path, signal) {
  const chunks = []
  let offset = 1
  let total = 0
  for (let pageIndex = 0; pageIndex < 500; pageIndex += 1) {
    const result = await ctx.remote.workspaceFiles.read(sessionId, path, { offset, limit: 5000 }, signal)
    if (!result.ok) throw new Error(result.error?.message ?? 'read failed')
    chunks.push(result.value.text)
    total += result.value.text.length
    if (result.value.eof || total >= 2_000_000) break
    const count = Number(result.value.lines)
    offset += Number.isFinite(count) && count > 0 ? count : 1
  }
  return chunks.join('\n')
}

function insertComposerText(state, text, t) {
  const actions = state?.composerInputActions ?? state?.inputActions
  if (!actions) return { ok: false, reason: t('noComposer') }
  const draft = typeof state?.composerDraft === 'string'
    ? state.composerDraft
    : typeof state?.draft === 'string' ? state.draft : ''
  const payload = draft.length > 0 && !/\s$/.test(draft) ? ` ${text}` : text
  const span = actions.captureInsertion()
  const inserted = actions.insertText(payload, span)
  return inserted ? { ok: true } : { ok: false, reason: t('insertFailed') }
}

function fileMention(path) {
  if (typeof path !== 'string' || path.length === 0) return path
  if (path.startsWith('@')) return path
  return /\s/.test(path) ? `@"${path}"` : `@${path}`
}

function hasLineRange(value) {
  return /:\d+(?:[~-]\d+)?$/.test(value)
}

function insertSelectedPath(state, path, t) {
  return insertComposerText(state, fileMention(relativePath(state?.root, path)), t)
}

/** Return a clipboard path, relativized under the workspace, or undefined. */
function pathFromClipboard(text, cwd) {
  if (typeof text !== 'string') return undefined
  let value = text.trim()
  if (value === '' || value.length > 1024 || /[\r\n]/.test(value)) return undefined
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return undefined
  let quoted = false
  if ((value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
    || (value.startsWith('`') && value.endsWith('`'))) {
    value = value.slice(1, -1).trim()
    quoted = true
  }
  if (value.startsWith('@')) value = value.slice(1).trim()
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).trim()
    quoted = true
  }
  const range = /^(.*?)(:\d+(?:[~-]\d+)?)$/.exec(value)
  let filePart = (range ? range[1] : value).replace(/\\/g, '/')
  const suffix = range ? range[2] : ''
  if (filePart === '') return undefined
  if (!quoted && /\s/.test(filePart)) return undefined
  if (!quoted && /[()[\]{}"'`;=<>|]/.test(filePart)) return undefined
  const dot = filePart.lastIndexOf('.')
  const ext = dot === -1 ? '' : filePart.slice(dot + 1).toLowerCase()
  const pathLike = filePart.includes('/') || ext === 'py' || TYPE_STYLES[ext] !== undefined
  if (!pathLike) return undefined
  if (cwd !== undefined && (filePart.startsWith('/') || /^[A-Za-z]:\//.test(filePart))) {
    const relative = relativePath(cwd, filePart)
    if (relative !== filePart) filePart = relative
  }
  return `${filePart}${suffix}`
}

/** Extract a workspace-relative path from a file resource address. */
function parseFileResource(contentId) {
  const prefix = 'dsh-resource://file/'
  if (typeof contentId !== 'string' || !contentId.startsWith(prefix)) return undefined
  try {
    let rest = contentId.slice(prefix.length)
    const query = rest.search(/[?#]/)
    if (query !== -1) rest = rest.slice(0, query)
    const parts = rest.split('/')
    const scope = parts.shift()
    if (scope === 'session') {
      const sessionId = parts.shift()
      if (sessionId === undefined || sessionId === '') return undefined
      const path = parts.map(decodeURIComponent).join('/')
      if (path === '') return undefined
      return { sessionId: decodeURIComponent(sessionId), path }
    }
    if (scope === 'absolute') {
      const unc = parts[0] === '' && parts.length > 1
      const segments = (unc ? parts.slice(1) : parts).map(decodeURIComponent)
      return { path: unc ? `//${segments.join('/')}` : `/${segments.join('/')}` }
    }
  } catch {
    return undefined
  }
  return undefined
}

function filePathFromContentId(contentId, cwd) {
  const file = parseFileResource(contentId)
  if (file === undefined) return undefined
  const path = file.path
  if (cwd !== undefined && path.startsWith('/')) return relativePath(cwd, path)
  return path
}

function selectionLocationText(location, cwd) {
  const path = relativePath(cwd, location.path)
  const range = location.startLine === location.endLine ? `${location.startLine}` : `${location.startLine}~${location.endLine}`
  return `${path}:${range}`
}

function codeLocationFromRange(range, codeRoot) {
  try {
    const lines = [...codeRoot.querySelectorAll('code .line')]
    let start = -1
    let end = -1
    for (let index = 0; index < lines.length; index += 1) {
      if (range.intersectsNode(lines[index])) {
        if (start === -1) start = index
        end = index
      }
    }
    if (start === -1) return undefined
    return { startLine: start + 1, endLine: end + 1 }
  } catch {
    return undefined
  }
}

function codeSelectionDescriptor(ctx, selection) {
  if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) return undefined
  try {
    const range = selection.getRangeAt(0)
    const common = range.commonAncestorContainer
    const element = common instanceof Element ? common : common?.parentElement
    if (!element) return undefined
    const codeRoot = element.closest('[data-code-preview]')
    if (codeRoot === null) return undefined
    const preview = element.closest('[data-textpreview-url]')
    let file = parseFileResource(preview?.getAttribute('data-textpreview-url'))
    if (file === undefined) {
      try { file = parseFileResource(ctx.sidebarRight.active()?.contentId) } catch { file = undefined }
    }
    if (file === undefined) return undefined
    let sessionId = file.sessionId
    if (sessionId === undefined) {
      try { sessionId = ctx.sidebarRight.focusedTarget(element)?.sessionId } catch { sessionId = undefined }
    }
    if (sessionId === undefined) return undefined
    return { sessionId, path: file.path, codeRoot, range }
  } catch {
    return undefined
  }
}

/* ------------------------------------------------------------------ */
/* RPC                                                                 */
/* ------------------------------------------------------------------ */

function createRpc(ctx) {
  return async function call(endpoint, args, signal) {
    const connection = ctx.connection
    if (!connection || !connection.rpc || typeof connection.rpc.call !== 'function') {
      throw new Error('workspace explorer: the connection service is unavailable')
    }
    const result = await connection.rpc.call('/api', `workspaceExplorer/${endpoint}`, { args }, signal)
    if (!result || result.ok !== true) {
      const failure = result?.error
      const error = new Error(failure?.message ?? `workspaceExplorer/${endpoint} failed`)
      error.code = failure?.code
      throw error
    }
    return result.value
  }
}

/* ------------------------------------------------------------------ */
/* Stores                                                              */
/* ------------------------------------------------------------------ */

function createIntentStore() {
  let state = { sessionId: undefined, mode: undefined, seq: 0 }
  const listeners = new Set()
  const emit = () => { for (const listener of [...listeners]) listener() }
  return {
    snapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set(sessionId, mode) {
      state = { sessionId, mode, seq: state.seq + 1 }
      emit()
    },
    take(sessionId) {
      if (state.sessionId !== sessionId || state.mode === undefined) return undefined
      const mode = state.mode
      state = { sessionId, mode: undefined, seq: state.seq + 1 }
      emit()
      return mode
    },
    peek(sessionId) {
      return state.sessionId === sessionId ? state.mode : undefined
    },
  }
}

function createSessionRegistry() {
  const byId = new Map()
  return {
    set(sessionId, patch) {
      byId.set(sessionId, { ...(byId.get(sessionId) ?? {}), ...patch })
    },
    get(sessionId) {
      return byId.get(sessionId)
    },
    remove(sessionId) {
      byId.delete(sessionId)
    },
  }
}

function loadPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
    return {
      showHidden: parsed?.showHidden === true,
      showIgnored: parsed?.showIgnored === true,
    }
  } catch {
    return { showHidden: false, showIgnored: false }
  }
}

/* ------------------------------------------------------------------ */
/* File icons                                                          */
/* ------------------------------------------------------------------ */

const TYPE_STYLES = {
  py: { label: 'PY', color: '#3572A5' },
  pyi: { label: 'PY', color: '#3572A5' },
  js: { label: 'JS', color: '#B8A000' },
  mjs: { label: 'JS', color: '#B8A000' },
  cjs: { label: 'JS', color: '#B8A000' },
  jsx: { label: 'JS', color: '#61DAFB' },
  ts: { label: 'TS', color: '#3178C6' },
  tsx: { label: 'TS', color: '#3178C6' },
  json: { label: '{}', color: '#C08A00' },
  jsonc: { label: '{}', color: '#C08A00' },
  md: { label: 'M↓', color: '#519ABA' },
  markdown: { label: 'M↓', color: '#519ABA' },
  yaml: { label: 'Y', color: '#CB171E' },
  yml: { label: 'Y', color: '#CB171E' },
  toml: { label: 'T', color: '#9C4121' },
  ini: { label: 'I', color: '#6B7280' },
  cfg: { label: 'C', color: '#6B7280' },
  conf: { label: 'C', color: '#6B7280' },
  sh: { label: '$_', color: '#4EAA25' },
  bash: { label: '$_', color: '#4EAA25' },
  zsh: { label: '$_', color: '#4EAA25' },
  fish: { label: '$_', color: '#4EAA25' },
  rs: { label: 'R', color: '#DEA584' },
  go: { label: 'GO', color: '#00ADD8' },
  java: { label: 'J', color: '#B07219' },
  kt: { label: 'K', color: '#A97BFF' },
  c: { label: 'C', color: '#555555' },
  h: { label: 'H', color: '#555555' },
  cc: { label: 'C+', color: '#00599C' },
  cpp: { label: 'C+', color: '#00599C' },
  hpp: { label: 'H+', color: '#00599C' },
  cs: { label: 'C#', color: '#178600' },
  php: { label: 'PHP', color: '#777BB4' },
  rb: { label: 'RB', color: '#CC342D' },
  lua: { label: 'L', color: '#000080' },
  sql: { label: 'SQL', color: '#E38C00' },
  html: { label: '<>', color: '#E34C26' },
  htm: { label: '<>', color: '#E34C26' },
  css: { label: '#', color: '#563D7C' },
  scss: { label: '#', color: '#C6538C' },
  less: { label: '#', color: '#1D365D' },
  vue: { label: 'V', color: '#41B883' },
  svelte: { label: 'S', color: '#FF3E00' },
  dart: { label: 'D', color: '#00B4AB' },
  swift: { label: 'S', color: '#F05138' },
  r: { label: 'R', color: '#276DC3' },
  ipynb: { label: 'IP', color: '#F37626' },
  lock: { label: 'LK', color: '#6B7280' },
  txt: { label: 'T', color: '#6B7280' },
  log: { label: 'L', color: '#6B7280' },
  png: { label: 'IMG', color: '#A855F7' },
  jpg: { label: 'IMG', color: '#A855F7' },
  jpeg: { label: 'IMG', color: '#A855F7' },
  gif: { label: 'IMG', color: '#A855F7' },
  webp: { label: 'IMG', color: '#A855F7' },
  svg: { label: 'SVG', color: '#FFB13B' },
  ico: { label: 'IMG', color: '#A855F7' },
  pdf: { label: 'PDF', color: '#D93025' },
  zip: { label: 'ZIP', color: '#B45309' },
  gz: { label: 'ZIP', color: '#B45309' },
  tar: { label: 'TAR', color: '#B45309' },
  wasm: { label: 'W', color: '#654FF0' },
  env: { label: 'ENV', color: '#6B7280' },
}

const NAME_STYLES = {
  Dockerfile: { label: 'DK', color: '#2496ED' },
  Makefile: { label: 'MK', color: '#6B7280' },
  'CMakeLists.txt': { label: 'CM', color: '#064F8C' },
  'pyproject.toml': { label: 'PY', color: '#3572A5' },
  'uv.lock': { label: 'UV', color: '#7C3AED' },
  '.python-version': { label: 'PY', color: '#3572A5' },
  'requirements.txt': { label: 'PY', color: '#3572A5' },
  'package.json': { label: '{}', color: '#CB3837' },
  'tsconfig.json': { label: 'TS', color: '#3178C6' },
  'README.md': { label: 'M↓', color: '#519ABA' },
  'README.zh.md': { label: 'M↓', color: '#519ABA' },
  '.gitignore': { label: 'GIT', color: '#F05032' },
  '.gitattributes': { label: 'GIT', color: '#F05032' },
  'LICENSE': { label: '©', color: '#6B7280' },
  'Cargo.toml': { label: 'RS', color: '#DEA584' },
  'Cargo.lock': { label: 'LK', color: '#DEA584' },
}

function styleForFile(name) {
  if (NAME_STYLES[name]) return NAME_STYLES[name]
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return { label: '·', color: '#6B7280' }
  const ext = name.slice(dot + 1).toLowerCase()
  return TYPE_STYLES[ext] ?? { label: ext.slice(0, 3).toUpperCase(), color: '#6B7280' }
}

function FileIcon({ name, kind, size = 16 }) {
  if (kind === 'directory') {
    return h('svg', {
      width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true,
      className: 'we-icon we-folder-icon',
    },
      h('path', { d: 'M1.5 4.2c0-.8.6-1.4 1.4-1.4h3.1l1.3 1.6h5.8c.8 0 1.4.6 1.4 1.4v6.5c0 .8-.6 1.4-1.4 1.4H2.9c-.8 0-1.4-.6-1.4-1.4Z', fill: '#E8B34B' }),
      h('path', { d: 'M1.5 6.3h13v5.9c0 .8-.6 1.4-1.4 1.4H2.9c-.8 0-1.4-.6-1.4-1.4Z', fill: '#F2C14E' }),
    )
  }
  const style = styleForFile(name)
  return h('svg', {
    width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true,
    className: 'we-icon we-file-icon',
  },
    h('path', { d: 'M3.2 1.4h6.1l3.5 3.5v9.2c0 .4-.3.7-.7.7H3.9a.7.7 0 0 1-.7-.7Z', fill: 'var(--dsw-alias-bg-layer-2, #fff)', stroke: 'var(--dsw-alias-border-l2, #c7c7c7)', strokeWidth: '0.8' }),
    h('path', { d: 'M9.3 1.4v3.1c0 .2.2.4.4.4h3.1Z', fill: style.color, opacity: '0.9' }),
    h('text', {
      x: '8.2', y: '11.4', textAnchor: 'middle',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: style.label.length > 2 ? '3.6' : '4.4',
      fontWeight: '700', fill: style.color,
    }, style.label),
  )
}

/* ------------------------------------------------------------------ */
/* Small UI atoms                                                      */
/* ------------------------------------------------------------------ */

function Icon({ name, size = 14 }) {
  const common = {
    width: size, height: size, viewBox: '0 0 16 16', 'aria-hidden': true,
    fill: 'none', stroke: 'currentColor', strokeWidth: '1.4',
    strokeLinecap: 'round', strokeLinejoin: 'round', className: 'we-glyph',
  }
  switch (name) {
    case 'search':
      return h('svg', common, h('circle', { cx: 7, cy: 7, r: 4.4 }), h('path', { d: 'm10.4 10.4 3.4 3.4' }))
    case 'content':
      return h('svg', common, h('path', { d: 'M2.2 3.4h11.6M2.2 8h7.2M2.2 12.6h9.2' }), h('circle', { cx: 12.2, cy: 11.6, r: 2.2 }), h('path', { d: 'm13.8 13.2 1.2 1.2' }))
    case 'refresh':
      return h('svg', common, h('path', { d: 'M13 6.2A5.2 5.2 0 1 0 13.2 10' }), h('path', { d: 'M13.2 2.6v3.8H9.4' }))
    case 'eye':
      return h('svg', common, h('path', { d: 'M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8Z' }), h('circle', { cx: 8, cy: 8, r: 1.8 }))
    case 'eye-off':
      return h('svg', common, h('path', { d: 'M2.4 2.4 13.6 13.6' }), h('path', { d: 'M6.3 4.3A7 7 0 0 1 8 4c4.1 0 6.5 4 6.5 4a12 12 0 0 1-2.3 2.5M3.9 5.7A12 12 0 0 0 1.5 8s2.4 4 6.5 4c.7 0 1.3-.1 1.9-.3' }))
    case 'folder':
      return h('svg', common, h('path', { d: 'M1.8 4.4c0-.8.6-1.4 1.4-1.4h3l1.2 1.5h5.4c.8 0 1.4.6 1.4 1.4v5.7c0 .8-.6 1.4-1.4 1.4H3.2c-.8 0-1.4-.6-1.4-1.4Z' }))
    case 'close':
      return h('svg', common, h('path', { d: 'm4 4 8 8M12 4l-8 8' }))
    case 'chevron':
      return h('svg', common, h('path', { d: 'm6 4 4 4-4 4' }))
    case 'copy':
      return h('svg', common, h('rect', { x: 5.2, y: 5.2, width: 7.2, height: 8.2, rx: 1.4 }), h('path', { d: 'M3.4 10.7V3.2c0-.7.6-1.2 1.2-1.2h6.1' }))
    case 'chat':
      return h('svg', common, h('path', { d: 'M2.2 3.3h11.6v7.2H7.4l-3.2 2.6v-2.6H2.2Z' }))
    case 'file':
      return h('svg', common, h('path', { d: 'M3.4 1.8h5.2l3.2 3.2v9.2H3.4Z' }), h('path', { d: 'M8.4 1.9v3.2h3.2' }))
    default:
      return h('svg', common, h('circle', { cx: 8, cy: 8, r: 5 }))
  }
}

function ToolButton({ label, onClick, active, disabled, children, shortcut }) {
  return h('button', {
    type: 'button',
    className: `we-tool${active ? ' we-tool-active' : ''}`,
    'aria-label': label,
    title: shortcut ? `${label} (${shortcut})` : label,
    'aria-pressed': active === undefined ? undefined : active,
    disabled,
    onClick,
  }, children)
}

function Highlight({ text, query, caseSensitive }) {
  if (!query) return text
  const flags = caseSensitive ? 'g' : 'gi'
  let pattern
  try {
    pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
  } catch {
    return text
  }
  const parts = []
  let last = 0
  let match
  let guard = 0
  while ((match = pattern.exec(text)) !== null && guard < 50) {
    guard += 1
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(h('mark', { key: `m${match.index}` }, match[0]))
    last = match.index + match[0].length
    if (match[0].length === 0) pattern.lastIndex += 1
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 0 ? text : parts
}

/* ------------------------------------------------------------------ */
/* Tree                                                                */
/* ------------------------------------------------------------------ */

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const aDir = a.type === 'directory' ? 0 : 1
    const bDir = b.type === 'directory' ? 0 : 1
    if (aDir !== bDir) return aDir - bDir
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })
}

function buildRows(root, levels, expanded, showHidden, showIgnored, depthLimit = 128) {
  const rows = []
  const visit = (dir, depth) => {
    if (depth > depthLimit) return
    const level = levels.get(dir)
    if (!level || level.ready !== true) return
    for (const entry of sortEntries(level.entries)) {
      if (!showHidden && isHiddenName(entry.name)) continue
      if (!showIgnored && isIgnoredName(entry.name)) continue
      const path = joinPath(dir, entry.name)
      const kind = entry.type === 'directory' ? 'directory' : entry.type === 'file' ? 'file' : 'other'
      rows.push({
        key: path,
        path,
        name: entry.name,
        kind,
        depth,
        size: entry.size,
        loading: kind === 'directory' && expanded.has(path) && levels.get(path)?.loading === true,
      })
      if (kind === 'directory' && expanded.has(path)) visit(path, depth + 1)
    }
  }
  visit(root, 0)
  return rows
}

const TreeRow = React.memo(function TreeRow({
  row, top, selected, expanded, loadingLabel, onToggle, onOpen, onSelect, onContextMenu, onDragStart,
}) {
  const isDir = row.kind === 'directory'
  const isOther = row.kind === 'other'
  return h('div', {
    className: `we-row${selected ? ' we-row-selected' : ''}${isOther ? ' we-row-other' : ''}`,
    style: { top, paddingLeft: 6 + row.depth * 13 },
    role: 'treeitem',
    'aria-level': row.depth + 1,
    'aria-selected': selected || undefined,
    'aria-expanded': isDir ? expanded : undefined,
    'data-we-path': row.path,
    title: row.path,
    draggable: !isDir && !isOther,
    onDragStart: (event) => { if (!isDir && !isOther) onDragStart(event, row) },
    onClick: () => {
      onSelect(row.path)
      if (isDir) onToggle(row.path)
    },
    onDoubleClick: () => {
      if (!isDir && !isOther) onOpen(row.path)
    },
    onContextMenu: (event) => {
      event.preventDefault()
      onSelect(row.path)
      onContextMenu(event, row)
    },
  },
    h('span', {
      className: `we-chev${isDir ? (expanded ? ' we-chev-open' : '') : ' we-chev-empty'}`,
      'aria-hidden': true,
      onClick: isDir ? (event) => { event.stopPropagation(); onToggle(row.path) } : undefined,
    }, isDir ? h(Icon, { name: 'chevron', size: 12 }) : null),
    h(FileIcon, { name: row.name, kind: isDir ? 'directory' : 'file', size: 16 }),
    h('span', { className: 'we-name' }, row.name),
    row.loading ? h('span', { className: 'we-row-loading', 'aria-label': loadingLabel }) : null,
  )
})

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

function Palette({
  palette, setPalette, root, index, indexLoading, indexError, content, contentLoading, contentError,
  fileMatches, t, onClose, onOpenFile, onRetryIndex, inputRef, highlight,
}) {
  if (!palette) return null
  const fileMode = palette.mode === 'file'
  const rows = fileMode ? fileMatches : (content ? content.matches : [])
  const selected = Math.max(0, Math.min(rows.length - 1, palette.selected))
  const setQuery = (query) => setPalette(prev => prev ? { ...prev, query, selected: 0 } : prev)
  const move = (delta) => setPalette(prev => {
    if (!prev || rows.length === 0) return prev
    return { ...prev, selected: Math.max(0, Math.min(rows.length - 1, prev.selected + delta)) }
  })
  const choose = (indexToUse) => {
    if (fileMode) {
      const row = fileMatches[indexToUse]
      if (row) onOpenFile(row.path)
      return
    }
    const row = content?.matches?.[indexToUse]
    if (row) onOpenFile(row.path, row.line)
  }
  const toggle = (key) => setPalette(prev => prev ? { ...prev, [key]: !prev[key], selected: 0 } : prev)
  return h('div', { className: 'we-palette-backdrop', onMouseDown: (event) => { if (event.target === event.currentTarget) onClose() } },
    h('div', { className: 'we-palette', role: 'dialog', 'aria-modal': 'true', 'aria-label': fileMode ? t('quickOpenTitle') : t('contentTitle') },
      h('div', { className: 'we-palette-head' },
        h('span', { className: 'we-palette-icon' }, h(Icon, { name: fileMode ? 'search' : 'content', size: 16 })),
        h('input', {
          ref: inputRef,
          className: 'we-input',
          value: palette.query,
          autoFocus: true,
          spellCheck: false,
          placeholder: fileMode ? t('quickOpenPlaceholder') : t('contentPlaceholder'),
          onChange: (event) => setQuery(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Escape') { event.preventDefault(); onClose() }
            else if (event.key === 'ArrowDown') { event.preventDefault(); move(1) }
            else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1) }
            else if (event.key === 'Enter') { event.preventDefault(); choose(selected) }
          },
        }),
        !fileMode ? h('div', { className: 'we-toggles' },
          h('button', { type: 'button', className: `we-toggle${palette.caseSensitive ? ' active' : ''}`, title: t('caseSensitive'), 'aria-pressed': palette.caseSensitive, onClick: () => toggle('caseSensitive') }, 'Aa'),
          h('button', { type: 'button', className: `we-toggle${palette.regex ? ' active' : ''}`, title: t('regex'), 'aria-pressed': palette.regex, onClick: () => toggle('regex') }, '.*'),
          h('button', { type: 'button', className: `we-toggle${palette.wholeWord ? ' active' : ''}`, title: t('wholeWord'), 'aria-pressed': palette.wholeWord, onClick: () => toggle('wholeWord') }, 'W'),
        ) : null,
        h('button', { type: 'button', className: 'we-close', title: t('close'), 'aria-label': t('close'), onClick: onClose }, h(Icon, { name: 'close', size: 14 })),
      ),
      h('div', { className: 'we-palette-meta' },
        fileMode
          ? (indexLoading ? t('indexing') : indexError ? t('indexFailed', { message: indexError }) : index ? t('filesCount', { count: index.files.length }) : '')
          : (contentLoading ? t('searching') : content ? t('matchCount', { count: content.matches.length }) : ''),
        fileMode && index?.truncated ? h('span', { className: 'we-warn' }, t('indexTruncated')) : null,
        !fileMode && content?.truncated ? h('span', { className: 'we-warn' }, t('contentTruncated')) : null,
        !fileMode && content?.incomplete ? h('span', { className: 'we-warn' }, t('contentIncomplete')) : null,
      ),
      h('div', { className: 'we-results', role: 'listbox' },
        fileMode
          ? (indexError && !indexLoading && fileMatches.length === 0
            ? h('div', { className: 'we-empty' },
              h('div', null, t('indexFailed', { message: indexError })),
              h('button', { type: 'button', className: 'we-link', onClick: onRetryIndex }, t('retry')),
              h('div', { className: 'we-hint' }, t('noFileIndex')))
            : fileMatches.length === 0
              ? h('div', { className: 'we-empty' }, indexLoading ? t('indexing') : t('noMatches'))
              : fileMatches.map((result, position) => h('button', {
                type: 'button',
                key: result.path,
                className: `we-result${position === selected ? ' selected' : ''}`,
                role: 'option',
                'aria-selected': position === selected,
                onMouseEnter: () => setPalette(prev => prev ? { ...prev, selected: position } : prev),
                onClick: () => choose(position),
              },
                h(FileIcon, { name: basename(result.path), kind: 'file', size: 16 }),
                h('span', { className: 'we-result-main' },
                  h('span', { className: 'we-result-name' }, basename(result.path)),
                  h('span', { className: 'we-result-dir' }, relativePath(root, result.path).split('/').slice(0, -1).join('/')),
                ),
              )))
          : contentError
            ? h('div', { className: 'we-empty' },
              h('div', null, t('contentError', { message: contentError })),
              h('button', { type: 'button', className: 'we-link', onClick: () => setPalette(prev => prev ? { ...prev, query: prev.query + ' ' } : prev) }, t('retry')))
            : !content || content.matches.length === 0
              ? h('div', { className: 'we-empty' }, palette.query.trim() === '' ? t('contentPlaceholder') : contentLoading ? t('searching') : t('contentNoMatches'))
              : content.matches.slice(0, MAX_CONTENT_ROWS).map((match, position) => h('button', {
                type: 'button',
                key: `${match.path}:${match.line}:${position}`,
                className: `we-result we-content-result${position === selected ? ' selected' : ''}`,
                role: 'option',
                'aria-selected': position === selected,
                onMouseEnter: () => setPalette(prev => prev ? { ...prev, selected: position } : prev),
                onClick: () => choose(position),
              },
                h('span', { className: 'we-line-no' }, match.line),
                h('span', { className: 'we-preview' }, highlight(match.preview, palette.query)),
                h('span', { className: 'we-result-path' }, match.path),
              )),
      ),
      h('div', { className: 'we-palette-foot' },
        h('span', null, fileMode ? t('quickOpenShortcutHint') : t('contentShortcutHint')),
        h('span', null, fileMode ? t('indexHelp') : ''),
      ),
    ),
  )
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

function ComposerBridge({ sessionId, inputActions, useSessions, useInput, sessions }) {
  const token = useRef(Symbol('workspace-explorer-composer'))
  const cwd = typeof useSessions === 'function' ? useSessions(snapshot => snapshot.byId[sessionId]?.cwd) : undefined
  const draft = typeof useInput === 'function' ? useInput(snapshot => snapshot.draft) : ''
  useEffect(() => {
    sessions.set(sessionId, {
      composerInputActions: inputActions,
      composerCwd: cwd,
      composerDraft: draft,
      composerToken: token.current,
    })
    return () => {
      const current = sessions.get(sessionId)
      if (current?.composerToken === token.current) {
        sessions.set(sessionId, {
          composerInputActions: undefined,
          composerCwd: undefined,
          composerDraft: undefined,
          composerToken: undefined,
        })
      }
    }
  }, [sessionId, inputActions, cwd, draft, sessions])
  return h('span', { 'data-we-path-bridge': true, 'aria-hidden': true, style: { display: 'none' } })
}

function ExplorerBody({ sessionId, useSessions, useTabInfo, useInput, inputActions, t, ctx, intents, sessions, rpc, activeSession }) {
  const translate = typeof t === 'function' ? t : (key, vars) => formatText(DICTS.en[key] ?? key, vars)
  const tt = useCallback((key, vars) => formatText(translate(key), vars), [translate])
  const { tab, panel } = useTabInfo()
  const cwd = useSessions(snapshot => snapshot.byId[sessionId]?.cwd)
  const draft = typeof useInput === 'function' ? useInput(snapshot => snapshot.draft) : ''
  const root = normalizeRoot(cwd)
  const [levels, setLevels] = useState(() => new Map())
  const levelsRef = useRef(levels)
  levelsRef.current = levels
  const [expanded, setExpanded] = useState(() => new Set())
  const expandedRef = useRef(expanded)
  expandedRef.current = expanded
  const [selected, setSelected] = useState(undefined)
  const [prefs, setPrefs] = useState(loadPrefs)
  const [projects, setProjects] = useState([])
  const [toast, setToast] = useState(undefined)
  const toastTimer = useRef(undefined)
  const [menu, setMenu] = useState(undefined)
  const [palette, setPalette] = useState(undefined)
  const paletteRef = useRef(palette)
  paletteRef.current = palette
  const [index, setIndex] = useState(undefined)
  const indexRef = useRef(index)
  indexRef.current = index
  const [indexLoading, setIndexLoading] = useState(false)
  const [indexError, setIndexError] = useState(undefined)
  const [content, setContent] = useState(undefined)
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState(undefined)
  const [fallbackResults, setFallbackResults] = useState([])
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(360)
  const scrollRef = useRef(null)
  const paletteInputRef = useRef(null)
  const pendingScrollRef = useRef(undefined)
  const loadControllers = useRef(new Map())
  const fastListRef = useRef(true)
  const contentController = useRef(undefined)
  const fallbackController = useRef(undefined)
  const indexController = useRef(undefined)
  const aliveRef = useRef(true)
  const sessionToken = useRef(Symbol('workspace-explorer'))
  const deferredQuery = useDeferredValue(palette?.query ?? '')

  const showToast = useCallback((message) => {
    setToast(message)
    if (toastTimer.current !== undefined) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { toastTimer.current = undefined; setToast(undefined) }, 2400)
  }, [])

  useEffect(() => () => {
    aliveRef.current = false
    if (toastTimer.current !== undefined) clearTimeout(toastTimer.current)
    for (const controller of loadControllers.current.values()) controller.abort()
    contentController.current?.abort()
    fallbackController.current?.abort()
    indexController.current?.abort()
  }, [])

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch { /* private mode */ }
  }, [prefs])

  useEffect(() => {
    indexRef.current = undefined
    setIndex(undefined)
    setIndexError(undefined)
    setFallbackResults([])
  }, [prefs.showHidden, prefs.showIgnored])

  const notify = useCallback((message) => showToast(message), [showToast])

  useEffect(() => {
    sessions.set(sessionId, {
      token: sessionToken.current,
      inputActions,
      draft,
      root,
      selected,
      notify,
      tab,
      panel,
    })
    return () => {
      const current = sessions.get(sessionId)
      if (current?.token === sessionToken.current) {
        sessions.set(sessionId, {
          token: undefined,
          inputActions: undefined,
          draft: undefined,
          root: undefined,
          selected: undefined,
          notify: undefined,
          tab: undefined,
          panel: undefined,
        })
      }
    }
  }, [sessionId, inputActions, draft, root, selected, notify, tab, panel, sessions])

  useEffect(() => {
    if (tab.visible) {
      activeSession.sessionId = sessionId
      activeSession.token = sessionToken.current
    } else if (activeSession.token === sessionToken.current) {
      activeSession.sessionId = undefined
    }
    return () => {
      if (activeSession.token === sessionToken.current) activeSession.sessionId = undefined
    }
  }, [activeSession, sessionId, tab.visible])

  const loadDir = useCallback(async (path, options = {}) => {
    if (!root) return
    const existing = levelsRef.current.get(path)
    if (!options.force && existing?.ready === true) return
    if (!options.force && existing?.loading === true) return
    const previous = loadControllers.current.get(path)
    if (previous !== undefined) previous.abort()
    const controller = new AbortController()
    loadControllers.current.set(path, controller)
    setLevels(prev => new Map(prev).set(path, {
      ...(prev.get(path) ?? {}),
      loading: true,
      ready: existing?.ready === true,
      entries: existing?.entries ?? [],
    }))
    try {
      let entries
      let truncated = false
      if (fastListRef.current) {
        try {
          const fast = await rpc('listDir', { sessionId, path, options: { maxEntries: 5000 } }, controller.signal)
          entries = fast.entries
          truncated = fast.truncated
        } catch (error) {
          if (controller.signal.aborted) return
          fastListRef.current = false
        }
      }
      if (entries === undefined) {
        const result = await ctx.remote.workspaceFiles.list(sessionId, path, controller.signal)
        if (controller.signal.aborted) return
        if (!result.ok) throw new Error(result.error?.message ?? 'list failed')
        entries = result.value.entries
        truncated = result.value.truncated
      }
      if (!aliveRef.current) return
      setLevels(prev => new Map(prev).set(path, {
        loading: false,
        ready: true,
        entries,
        truncated,
      }))
    } catch (error) {
      if (controller.signal.aborted) return
      setLevels(prev => new Map(prev).set(path, {
        loading: false,
        ready: false,
        entries: [],
        error: error?.message ?? String(error),
      }))
    } finally {
      if (loadControllers.current.get(path) === controller) loadControllers.current.delete(path)
    }
  }, [root, ctx, sessionId, rpc])

  useEffect(() => {
    if (!root) return
    setLevels(new Map())
    setExpanded(new Set([root]))
    expandedRef.current = new Set([root])
    setSelected(undefined)
    setProjects([])
    setIndex(undefined)
    indexRef.current = undefined
    setIndexError(undefined)
    setIndexLoading(false)
    fastListRef.current = true
    void loadDir(root, { force: true })
    return () => {
      for (const controller of loadControllers.current.values()) controller.abort()
      loadControllers.current.clear()
    }
  }, [root, loadDir])

  useEffect(() => {
    for (const path of expanded) {
      const level = levelsRef.current.get(path)
      if (level === undefined || (level.ready !== true && level.loading !== true)) void loadDir(path)
    }
  }, [expanded, loadDir])

  useEffect(() => {
    const element = scrollRef.current
    if (element === null) return
    const update = () => setViewportHeight(element.clientHeight || 360)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [root, palette])

  const rows = useMemo(
    () => root ? buildRows(root, levels, expanded, prefs.showHidden, prefs.showIgnored) : [],
    [root, levels, expanded, prefs.showHidden, prefs.showIgnored],
  )
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  useEffect(() => {
    const target = pendingScrollRef.current
    if (target === undefined) return
    const index = rows.findIndex(row => row.path === target)
    if (index < 0) return
    pendingScrollRef.current = undefined
    const element = scrollRef.current
    if (element === null) return
    const top = Math.max(0, index * ROW_HEIGHT - viewportHeight / 3)
    element.scrollTop = top
    setScrollTop(top)
  }, [rows, viewportHeight])

  const toggleDir = useCallback((path) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      expandedRef.current = next
      return next
    })
  }, [])

  const revealPath = useCallback(async (path) => {
    if (!root) return
    const rel = relativePath(root, path)
    if (rel === '') { pendingScrollRef.current = root; return }
    const parts = rel.split('/').filter(Boolean)
    let current = root
    const toOpen = [root]
    for (const part of parts) {
      current = joinPath(current, part)
      toOpen.push(current)
    }
    setExpanded(prev => {
      const next = new Set(prev)
      for (const item of toOpen) next.add(item)
      expandedRef.current = next
      return next
    })
    for (const item of toOpen) await loadDir(item)
    pendingScrollRef.current = path
    setSelected(path)
  }, [root, loadDir])

  const openFile = useCallback((path, line) => {
    if (!root) return
    const rel = relativePath(root, path)
    const address = sessionFileAddress(sessionId, rel)
    const options = {}
    if (!panel.isFloating) options.paneId = panel.id
    if (Number.isFinite(line) && line > 0) options.params = { line }
    try {
      tab.actions.openResource(address, options)
      setPalette(undefined)
    } catch (error) {
      showToast(tt('openFailed'))
    }
  }, [root, sessionId, panel, tab, showToast, tt])

  const copyContent = useCallback(async (path) => {
    try {
      const text = await readAllText(ctx, sessionId, path)
      await writeClipboard(text)
      showToast(tt('copiedContent'))
    } catch (error) {
      showToast(`${tt('copyFailed')}: ${error?.message ?? error}`)
    }
  }, [sessionId, showToast, tt])

  const copyPath = useCallback(async (path) => {
    try {
      await writeClipboard(fileMention(path))
      showToast(tt('copiedPath'))
    } catch (error) {
      showToast(`${tt('copyFailed')}: ${error?.message ?? error}`)
    }
  }, [showToast, tt])

  const insertPath = useCallback((path) => {
    const state = sessions.get(sessionId)
    if (!state) return
    const result = insertSelectedPath(state, path, tt)
    showToast(result.ok ? tt('insertedPath') : result.reason)
  }, [sessions, sessionId, showToast, tt])

  const onDragStart = useCallback((event, row) => {
    if (!root) return
    const rel = relativePath(root, row.path)
    event.dataTransfer.setData('text/plain', row.path)
    event.dataTransfer.setData('application/x-dsh-file-path', rel)
    event.dataTransfer.effectAllowed = 'copy'
  }, [root])

  const ensureIndex = useCallback(async (force = false) => {
    if (!root) return undefined
    const current = indexRef.current
    if (!force && current && current.root === root && Date.now() - current.at < INDEX_TTL_MS) return current
    indexController.current?.abort()
    const controller = new AbortController()
    indexController.current = controller
    setIndexLoading(true)
    setIndexError(undefined)
    try {
      const value = await rpc('listFiles', {
        sessionId,
        options: { includeHidden: prefs.showHidden, includeIgnored: prefs.showIgnored, force },
      }, controller.signal)
      if (controller.signal.aborted) return undefined
      const entry = { root, at: Date.now(), files: value.files, truncated: value.truncated }
      indexRef.current = entry
      setIndex(entry)
      return entry
    } catch (error) {
      if (!controller.signal.aborted) setIndexError(error?.message ?? String(error))
      return undefined
    } finally {
      if (indexController.current === controller) indexController.current = undefined
      if (!controller.signal.aborted) setIndexLoading(false)
    }
  }, [root, sessionId, prefs.showHidden, prefs.showIgnored, rpc])

  useEffect(() => {
    let cancelled = false
    if (typeof createFuzzy !== 'function') return undefined
    createFuzzy().then(handle => { if (!cancelled) fuzzyRef.current = handle })
    return () => { cancelled = true }
  }, [])

  const openPalette = useCallback((mode) => {
    setPalette({
      mode,
      query: '',
      selected: 0,
      caseSensitive: false,
      regex: false,
      wholeWord: false,
    })
    setContent(undefined)
    setContentError(undefined)
    setContentLoading(false)
    setFallbackResults([])
    if (mode === 'file') void ensureIndex()
  }, [ensureIndex])

  useEffect(() => {
    const intent = intents.peek(sessionId)
    if (intent !== undefined) {
      const mode = intents.take(sessionId)
      if (mode !== undefined) openPalette(mode)
    }
    return intents.subscribe(() => {
      const next = intents.peek(sessionId)
      if (next !== undefined) {
        const mode = intents.take(sessionId)
        if (mode !== undefined) openPalette(mode)
      }
    })
  }, [intents, sessionId, openPalette])

  useEffect(() => {
    if (palette === undefined) return
    const frame = requestAnimationFrame(() => paletteInputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [palette?.mode])

  useEffect(() => {
    if (!root) { setProjects([]); return }
    let cancelled = false
    const timer = setTimeout(() => {
      void detectProjects(ctx, sessionId, root, levelsRef.current.get(root)?.entries ?? [], rpc)
        .then(found => { if (!cancelled && aliveRef.current) setProjects(found) })
        .catch(() => { if (!cancelled) setProjects([]) })
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [root, sessionId, levels, ctx, rpc])

  const fileMatches = useMemo(() => {
    if (palette?.mode !== 'file') return []
    const query = deferredQuery.trim()
    if (index?.files?.length) {
      if (query === '') return index.files.slice(0, MAX_FILE_RESULTS).map(path => ({ path }))
      const scores = scorePaths(index.files, query)
      const found = []
      for (let i = 0; i < scores.length; i += 1) {
        if (scores[i] > 0) found.push({ path: index.files[i], score: scores[i] })
      }
      found.sort((a, b) => b.score - a.score || a.path.length - b.path.length)
      return found.slice(0, MAX_FILE_RESULTS)
    }
    return fallbackResults.slice(0, MAX_FILE_RESULTS).map(path => ({ path }))
  }, [palette?.mode, deferredQuery, index, fallbackResults])

  useEffect(() => {
    if (palette?.mode !== 'file' || index !== undefined || indexLoading || !indexError) return
    const query = deferredQuery.trim()
    if (query === '') { setFallbackResults([]); return }
    fallbackController.current?.abort()
    const controller = new AbortController()
    fallbackController.current = controller
    const timer = setTimeout(async () => {
      try {
        const result = await ctx.remote.workspaceFiles.search(sessionId, {
          query,
          excludedPaths: [],
          includeHidden: prefs.showHidden,
          respectGitignore: !prefs.showIgnored,
        }, controller.signal)
        if (controller.signal.aborted) return
        if (result.ok) setFallbackResults(result.value.matches.filter(item => item.type === 'file').map(item => joinPath(root, item.path)))
      } catch {
        // Keep the previous results; the palette shows the index error.
      }
    }, 240)
    return () => { clearTimeout(timer); controller.abort() }
  }, [palette?.mode, deferredQuery, index, indexLoading, indexError, ctx, sessionId, root, prefs.showHidden, prefs.showIgnored])

  useEffect(() => {
    if (palette?.mode !== 'content') return
    const query = palette.query.trim()
    if (query === '') {
      setContent(undefined)
      setContentError(undefined)
      setContentLoading(false)
      return
    }
    contentController.current?.abort()
    const controller = new AbortController()
    contentController.current = controller
    const timer = setTimeout(async () => {
      setContentLoading(true)
      setContentError(undefined)
      try {
        const value = await rpc('searchContent', {
          sessionId,
          request: {
            query,
            caseSensitive: palette.caseSensitive,
            regex: palette.regex,
            wholeWord: palette.wholeWord,
            includeHidden: prefs.showHidden,
            includeIgnored: prefs.showIgnored,
            respectGitignore: !prefs.showIgnored,
          },
        }, controller.signal)
        if (controller.signal.aborted) return
        setContent(value)
      } catch (error) {
        if (!controller.signal.aborted) {
          setContent(undefined)
          setContentError(error?.message ?? String(error))
        }
      } finally {
        if (!controller.signal.aborted) setContentLoading(false)
      }
    }, 220)
    return () => { clearTimeout(timer); controller.abort() }
  }, [palette?.mode, palette?.query, palette?.caseSensitive, palette?.regex, palette?.wholeWord, rpc, sessionId, prefs.showHidden, prefs.showIgnored])

  useEffect(() => {
    if (menu === undefined) return
    const close = () => setMenu(undefined)
    const key = (event) => { if (event.key === 'Escape') setMenu(undefined) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key) }
  }, [menu])

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 6)
  const end = Math.min(rows.length, start + Math.ceil(viewportHeight / ROW_HEIGHT) + 12)
  const visible = rows.slice(start, end)
  const rootLevel = root ? levels.get(root) : undefined
  const rootError = rootLevel?.error
  const anyTruncated = [...expanded].some(path => levels.get(path)?.truncated === true)

  const onToggle = useCallback((path) => { toggleDir(path) }, [toggleDir])
  const onOpen = useCallback((path) => { setSelected(path); openFile(path) }, [openFile])
  const onSelect = useCallback((path) => setSelected(path), [])
  const onContextMenu = useCallback((event, row) => {
    event.preventDefault()
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 210),
      y: Math.min(event.clientY, window.innerHeight - 210),
      path: row.path,
      kind: row.kind,
    })
  }, [])

  if (!root) {
    return h('div', { className: 'we-root' },
      h('style', null, STYLE),
      h('div', { className: 'we-empty' }, tt('noWorkspace')),
    )
  }

  return h('div', { className: 'we-root' },
    h('style', null, STYLE),
    h('div', { className: 'we-header' },
      h('div', { className: 'we-root-label', title: root },
        h(Icon, { name: 'folder', size: 14 }),
        h('span', { className: 'we-root-name' }, basename(root) || root),
        h('span', { className: 'we-root-path' }, root),
      ),
      h('div', { className: 'we-actions' },
        h(ToolButton, { label: tt('searchFile'), shortcut: tt('quickOpenShortcutHint'), onClick: () => openPalette('file') }, h(Icon, { name: 'search' })),
        h(ToolButton, { label: tt('searchContent'), shortcut: tt('contentShortcutHint'), onClick: () => openPalette('content') }, h(Icon, { name: 'content' })),
        h(ToolButton, { label: tt('refresh'), onClick: () => { void ensureIndex(true); for (const path of expandedRef.current) void loadDir(path, { force: true }) } }, h(Icon, { name: 'refresh' })),
        h(ToolButton, { label: prefs.showHidden ? tt('hideHidden') : tt('showHidden'), active: prefs.showHidden, onClick: () => setPrefs(prev => ({ ...prev, showHidden: !prev.showHidden })) }, h(Icon, { name: prefs.showHidden ? 'eye' : 'eye-off' })),
        h(ToolButton, { label: prefs.showIgnored ? tt('hideIgnored') : tt('showIgnored'), active: prefs.showIgnored, onClick: () => setPrefs(prev => ({ ...prev, showIgnored: !prev.showIgnored })) }, h('span', { className: 'we-ignore-glyph' }, '{}')),
      ),
    ),
    projects.length > 0 ? h('div', { className: 'we-projects' },
      projects.map(project => h('button', {
        type: 'button',
        key: project.path,
        className: 'we-chip',
        title: project.path,
        onClick: () => { void revealPath(project.path) },
      },
        h(FileIcon, { name: project.name, kind: 'directory', size: 14 }),
        h('span', { className: 'we-chip-name' }, project.name),
        h('span', { className: `we-env we-env-${project.env}` }, envLabel(project.env, tt)),
      )),
    ) : null,
    h('div', { className: 'we-body' },
      h('div', {
        className: 'we-tree-wrap',
        ref: scrollRef,
        onMouseDown: (event) => { if (event.target === event.currentTarget) event.currentTarget.focus() },
        onScroll: (event) => setScrollTop(event.currentTarget.scrollTop),
        role: 'tree',
        'aria-label': tt('title'),
        tabIndex: 0,
        onKeyDown: (event) => {
          if (rows.length === 0) return
          const current = rows.findIndex(row => row.path === selected)
          const focus = (next) => {
            const row = rows[Math.max(0, Math.min(rows.length - 1, next))]
            if (row) onSelect(row.path)
          }
          if (event.key === 'ArrowDown') { event.preventDefault(); focus(current < 0 ? 0 : current + 1) }
          else if (event.key === 'ArrowUp') { event.preventDefault(); focus(current < 0 ? 0 : current - 1) }
          else if (event.key === 'Home') { event.preventDefault(); focus(0) }
          else if (event.key === 'End') { event.preventDefault(); focus(rows.length - 1) }
          else if (event.key === 'Enter' && current >= 0) {
            const row = rows[current]
            if (row.kind === 'directory') onToggle(row.path)
            else if (row.kind === 'file') onOpen(row.path)
          } else if (event.key === 'ArrowRight' && current >= 0) {
            const row = rows[current]
            if (row.kind === 'directory' && !expanded.has(row.path)) onToggle(row.path)
          } else if (event.key === 'ArrowLeft' && current >= 0) {
            const row = rows[current]
            if (row.kind === 'directory' && expanded.has(row.path)) onToggle(row.path)
          }
        },
      },
        rows.length === 0 ? h('div', { className: 'we-empty' }, rootLevel?.loading ? tt('loading') : rootError ? rootError : tt('emptyDir')) : null,
        h('div', { className: 'we-tree-inner', style: { height: rows.length * ROW_HEIGHT } },
          visible.map((row, position) => h(TreeRow, {
            key: row.key,
            row,
            top: (start + position) * ROW_HEIGHT,
            selected: row.path === selected,
            expanded: expanded.has(row.path),
            loadingLabel: tt('loading'),
            onToggle: onToggle,
            onOpen: onOpen,
            onSelect: onSelect,
            onContextMenu: onContextMenu,
            onDragStart,
          })),
        ),
      ),
    ),
    h('div', { className: 'we-footer' },
      h('span', null, anyTruncated ? tt('truncated') : (rows.length > 0 ? `${rows.length}` : '')),
      h('span', null, selected ? `${relativePath(root, selected)} · ${tt('openHint')}` : tt('dragHint')),
    ),
    palette !== undefined ? h(Palette, {
      palette,
      setPalette,
      root,
      index,
      indexLoading,
      indexError,
      content,
      contentLoading,
      contentError,
      fileMatches,
      t: tt,
      onClose: () => setPalette(undefined),
      onOpenFile: openFile,
      onRetryIndex: () => {
        setIndex(undefined)
        indexRef.current = undefined
        setIndexError(undefined)
        setFallbackResults([])
        void ensureIndex(true)
      },
      inputRef: paletteInputRef,
      highlight: (text, query) => h(Highlight, { text, query, caseSensitive: palette?.caseSensitive === true }),
    }) : null,
    menu !== undefined ? h('div', {
      className: 'we-menu',
      style: { left: menu.x, top: menu.y },
      role: 'menu',
      onMouseDown: (event) => event.stopPropagation(),
    },
      h('button', { type: 'button', role: 'menuitem', onClick: () => { setMenu(undefined); if (menu.kind !== 'directory') openFile(menu.path); else void revealPath(menu.path) } }, tt('openFile')),
      h('button', { type: 'button', role: 'menuitem', onClick: () => { setMenu(undefined); void copyPath(menu.path) } }, tt('copyPath')),
      menu.kind !== 'directory' ? h(Fragment, null,
        h('button', { type: 'button', role: 'menuitem', onClick: () => { setMenu(undefined); void copyContent(menu.path) } }, tt('copyContent')),
        h('button', { type: 'button', role: 'menuitem', onClick: () => { setMenu(undefined); insertPath(menu.path) } }, tt('insertPath')),
      ) : null,
      menu.kind === 'directory' ? h('button', { type: 'button', role: 'menuitem', onClick: () => { setMenu(undefined); void revealPath(menu.path) } }, tt('reveal')) : null,
    ) : null,
    toast !== undefined ? h('div', { className: 'we-toast', role: 'status' }, toast) : null,
  )
}

/* ------------------------------------------------------------------ */
/* Project detection                                                   */
/* ------------------------------------------------------------------ */

function envLabel(env, tt) {
  if (env === 'uv') return tt('envUv')
  if (env === 'pyenv') return tt('envPyenv')
  if (env === 'venv') return tt('envVenv')
  return tt('envPython')
}

async function detectProjects(ctx, sessionId, root, rootEntries, rpc) {
  // One bounded ripgrep pass finds marker files across the workspace and
  // avoids stat-ing every child of every top-level directory.
  try {
    const result = await rpc('findProjects', { sessionId })
    if (Array.isArray(result?.projects)) {
      return result.projects.map(project => ({
        name: project.name,
        path: project.path === '.' ? root : joinPath(root, project.path),
        env: project.env,
      }))
    }
  } catch {
    // Fall through to the directory-level inspection below.
  }
  const inspect = async (dir, name) => {
    let entries = rootEntries
    if (dir !== root) {
      const result = await ctx.remote.workspaceFiles.list(sessionId, dir)
      if (!result.ok) return undefined
      entries = result.value.entries
    }
    const names = new Set(entries.map(entry => entry.name))
    if (![...PROJECT_MARKERS].some(marker => names.has(marker))) return undefined
    const env = names.has('uv.lock') ? 'uv'
      : names.has('.python-version') ? 'pyenv'
      : names.has('.venv') ? 'venv'
      : 'python'
    return { name, path: dir, env }
  }
  const found = []
  const rootProject = await inspect(root, basename(root) || root)
  if (rootProject) found.push(rootProject)
  const children = rootEntries
    .filter(entry => entry.type === 'directory')
    .filter(entry => entry.name !== '.git' && entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .slice(0, 16)
  for (const entry of children) {
    const project = await inspect(joinPath(root, entry.name), entry.name)
    if (project) found.push(project)
  }
  const seen = new Set()
  return found.filter(project => seen.has(project.path) ? false : (seen.add(project.path), true))
}

/* ------------------------------------------------------------------ */
/* Fuzzy integration                                                   */
/* ------------------------------------------------------------------ */

let fuzzyRef = { current: null }

function scorePaths(paths, query) {
  const handle = fuzzyRef.current
  if (handle) {
    try { return handle.scoreAll(paths, query) } catch { /* fall through */ }
  }
  try {
    return scoreAllJS(paths, query)
  } catch {
    return new Int32Array(paths.length)
  }
}

/* ------------------------------------------------------------------ */
/* Style                                                               */
/* ------------------------------------------------------------------ */

const STYLE = `
.we-root { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 0; font-size: 12px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); }
.we-header { display: flex; align-items: center; gap: 6px; padding: 6px 8px 4px; }
.we-root-label { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1; color: var(--dsw-alias-label-secondary); }
.we-root-name { font-weight: 600; color: var(--dsw-alias-label-primary); white-space: nowrap; }
.we-root-path { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .7; text-align: left; }
.we-actions { display: flex; align-items: center; gap: 2px; flex: 0 0 auto; }
.we-tool { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; padding: 0; }
.we-tool:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); color: var(--dsw-alias-label-primary); }
.we-tool-active { color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); }
.we-ignore-glyph { font: 700 9px/1 ui-monospace, monospace; }
.we-projects { display: flex; gap: 4px; overflow-x: auto; padding: 0 8px 5px; scrollbar-width: thin; }
.we-chip { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border-radius: 999px; padding: 2px 8px 2px 5px; font-size: 11px; cursor: pointer; }
.we-chip:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.we-chip-name { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.we-env { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 1px 4px; border-radius: 4px; color: #fff; background: #6b7280; }
.we-env-uv { background: #7c3aed; }
.we-env-pyenv { background: #2563eb; }
.we-env-venv { background: #16a34a; }
.we-env-python { background: #3572a5; }
.we-body { position: relative; flex: 1; min-height: 0; display: flex; }
.we-tree-wrap { flex: 1; min-width: 0; overflow: auto; position: relative; contain: layout paint; }
.we-tree { position: absolute; inset: 0; overflow: auto; outline: none; }
.we-tree:focus-visible { box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary); border-radius: 6px; }
.we-tree-inner { position: relative; width: 100%; min-width: 0; }
.we-row { position: absolute; left: 0; right: 0; height: 24px; display: flex; align-items: center; gap: 5px; padding-right: 8px; border-radius: 5px; color: var(--dsw-alias-label-primary); cursor: pointer; user-select: none; white-space: nowrap; }
.we-row:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); }
.we-row-selected, .we-row-selected:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent); }
.we-row-other { color: var(--dsw-alias-label-secondary); opacity: .65; cursor: default; }
.we-chev { width: 12px; height: 12px; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 12px; color: var(--dsw-alias-label-secondary); transition: transform .12s ease; }
.we-chev-open { transform: rotate(90deg); }
.we-chev-empty { visibility: hidden; }
.we-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.we-row-loading { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--dsw-alias-border-l2); border-top-color: var(--dsw-alias-brand-primary); animation: we-spin .7s linear infinite; margin-left: auto; }
@keyframes we-spin { to { transform: rotate(360deg); } }
.we-footer { display: flex; justify-content: space-between; gap: 8px; padding: 3px 9px 5px; color: var(--dsw-alias-label-secondary); font-size: 10.5px; border-top: 1px solid var(--dsw-alias-border-l1); }
.we-footer span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.we-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 24px 16px; color: var(--dsw-alias-label-secondary); text-align: center; line-height: 1.5; }
.we-link { border: 0; background: transparent; color: var(--dsw-alias-brand-primary); cursor: pointer; font: inherit; padding: 2px 4px; }
.we-hint { opacity: .75; font-size: 11px; }
.we-warn { margin-left: 6px; color: var(--dsw-alias-state-warn-primary); }
.we-palette-backdrop { position: absolute; inset: 0; z-index: 30; display: flex; align-items: flex-start; justify-content: center; padding: 8px; background: color-mix(in srgb, var(--dsw-alias-bg-base) 55%, transparent); backdrop-filter: blur(2px); }
.we-palette { display: flex; flex-direction: column; width: 100%; max-height: 100%; min-height: 0; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.22); overflow: hidden; }
.we-palette-head { display: flex; align-items: center; gap: 6px; padding: 8px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.we-palette-icon { color: var(--dsw-alias-label-secondary); display: inline-flex; }
.we-input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; outline: none; padding: 4px 2px; }
.we-input::placeholder { color: var(--dsw-alias-label-secondary); }
.we-toggles { display: flex; gap: 2px; }
.we-toggle { border: 1px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary); border-radius: 5px; padding: 2px 4px; font: 600 10px/1.4 ui-monospace, monospace; cursor: pointer; }
.we-toggle:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
.we-toggle.active { color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent); }
.we-close { border: 0; background: transparent; color: var(--dsw-alias-label-secondary); width: 24px; height: 24px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.we-close:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
.we-palette-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 5px 10px; color: var(--dsw-alias-label-secondary); font-size: 10.5px; }
.we-results { flex: 1; min-height: 0; overflow: auto; padding: 2px 4px 5px; }
.we-result { width: 100%; display: flex; align-items: center; gap: 7px; border: 0; background: transparent; color: inherit; text-align: left; padding: 5px 7px; border-radius: 6px; cursor: pointer; font: inherit; }
.we-result:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); }
.we-result.selected { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent); }
.we-result-main { display: flex; flex-direction: column; min-width: 0; gap: 1px; }
.we-result-name { font-weight: 550; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.we-result-dir { font-size: 10px; color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.we-content-result { align-items: flex-start; gap: 8px; padding: 4px 7px; }
.we-line-no { flex: 0 0 38px; text-align: right; color: var(--dsw-alias-label-secondary); font: 10px/1.5 ui-monospace, monospace; padding-top: 1px; }
.we-preview { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
.we-result-path { flex: 0 1 34%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-secondary); font-size: 10px; text-align: right; }
.we-preview mark { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent); color: inherit; border-radius: 2px; }
.we-palette-foot { display: flex; justify-content: space-between; gap: 8px; padding: 5px 10px; border-top: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font-size: 10px; }
.we-menu { position: fixed; z-index: 50; min-width: 190px; padding: 4px; background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-border-l2); border-radius: 9px; box-shadow: 0 10px 30px rgba(0,0,0,.24); }
.we-menu button { display: block; width: 100%; text-align: left; border: 0; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; padding: 6px 9px; border-radius: 6px; cursor: pointer; }
.we-menu button:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
.we-toast { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 40; max-width: 90%; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); border-radius: 8px; padding: 5px 10px; font-size: 11px; box-shadow: 0 8px 24px rgba(0,0,0,.18); }
.we-tab-title { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
.we-tab-title-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.we-icon { flex: 0 0 auto; }
.we-glyph { flex: 0 0 auto; }
@media (prefers-reduced-motion: reduce) { .we-chev { transition: none; } .we-row-loading { animation: none; } }
`

/* ------------------------------------------------------------------ */
/* Plugin                                                              */
/* ------------------------------------------------------------------ */

function GuideIcon() {
  return h('svg', { width: 28, height: 28, viewBox: '0 0 64 64', 'aria-hidden': true },
    h('rect', { x: 4, y: 6, width: 56, height: 52, rx: 12, fill: '#2563eb' }),
    h('path', { d: 'M14 22a4 4 0 0 1 4-4h8l4 5h14a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4Z', fill: '#dbeafe' }),
    h('path', { d: 'M22 30h8M22 36h12M22 42h6', stroke: '#1e3a8a', strokeWidth: 3, strokeLinecap: 'round' }),
    h('circle', { cx: 45, cy: 43, r: 8, fill: '#0f172a', stroke: '#fff', strokeWidth: 3 }),
    h('path', { d: 'm51 49 6 6', stroke: '#fff', strokeWidth: 4, strokeLinecap: 'round' }),
  )
}

function ExplorerTitle({ t }) {
  return h('span', { className: 'we-tab-title' },
    h(FileIcon, { name: '', kind: 'directory', size: 16 }),
    h('span', { className: 'we-tab-title-text' }, typeof t === 'function' ? t('tabTitle') : 'Explorer'),
  )
}

function apply(ctx) {
  const t = ctx.locale.bind(NS)
  const intents = createIntentStore()
  const sessions = createSessionRegistry()
  const activeSession = { sessionId: undefined, token: undefined }
  const rpc = createRpc(ctx)

  ctx.effect(() => ctx.locale.register(NS, {
    zh: DICTS.zh,
    en: DICTS.en,
  }), 'workspace-explorer: locale')

  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: ID,
    kind: 'files',
    title: () => t('tabTitle'),
    keepMounted: true,
    guide: [{
      id: 'workspace-explorer',
      commandId: 'workspace.explorer.open',
      order: 10,
      title: () => t('title'),
      description: () => t('guideDescription'),
      icon: GuideIcon,
    }],
  }), 'workspace-explorer: files tab')

  const Body = (props) => ExplorerBody({ ...props, ctx, intents, sessions, rpc, activeSession })
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: ID,
    locale: NS,
  }, Body)), 'workspace-explorer: files body')

  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab.title',
    key: ID,
    locale: NS,
  }, ExplorerTitle)), 'workspace-explorer: tab title')

  const Bridge = (props) => ComposerBridge({ ...props, sessions })
  ctx.effect(() => ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'workspace-explorer-path-bridge',
    order: 1000,
  }, Bridge)), 'workspace-explorer: composer bridge')

  ctx.effect(() => {
    const carriesPath = (event) => {
      const types = event.dataTransfer?.types
      if (types === undefined) return false
      return Array.isArray(types) ? types.includes('application/x-dsh-file-path') : Array.from(types).includes('application/x-dsh-file-path')
    }
    const composerAt = (event) => event.target instanceof Element ? event.target.closest('[data-composer-input]') : null
    const over = (event) => {
      if (!carriesPath(event)) return
      const composer = composerAt(event)
      if (composer === null) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
    const drop = (event) => {
      if (!carriesPath(event)) return
      const composer = composerAt(event)
      if (composer === null) return
      const path = event.dataTransfer.getData('application/x-dsh-file-path')
      if (path === '') return
      const sessionId = activeSession.sessionId
      const state = sessionId === undefined ? undefined : sessions.get(sessionId)
      if (state?.inputActions === undefined) return
      event.preventDefault()
      event.stopPropagation()
      try { composer.focus({ preventScroll: true }) } catch { /* focus may be refused */ }
      const inserted = insertSelectedPath(state, path, t)
      state.notify?.(inserted.ok ? t('insertedPath') : inserted.reason)
    }
    document.addEventListener('dragover', over, true)
    document.addEventListener('drop', drop, true)
    return () => {
      document.removeEventListener('dragover', over, true)
      document.removeEventListener('drop', drop, true)
    }
  }, 'workspace-explorer: composer drop target')

  ctx.inject(['shortcuts'], (scope) => {
    // Ctrl/Cmd+U is not used by DSH's shortcut catalog. The browser's default
    // View Source is consumed by this fixed action. It also stays outside the
    // Web/Linux editable-shortcut reservations, like the other fixed actions.
    const bindings = {
      open: { code: 'KeyE', modifiers: ['primary', 'shift'] },
      quick: { code: 'KeyP', modifiers: ['primary'] },
      content: { code: 'KeyF', modifiers: ['primary', 'shift'] },
      paste: { code: 'KeyU', modifiers: ['primary'] },
    }
    const normalized = {}
    for (const [key, binding] of Object.entries(bindings)) {
      normalized[key] = scope.shortcuts.describeBinding(binding).binding
    }
    const registerFixed = (id, labelKey, binding) => scope.effect(() => scope.shortcuts.registerFixed({
      id,
      label: () => t(labelKey),
      keys: scope.shortcuts.describeBinding(binding).keys,
      bindings: [binding],
      group: 'application',
    }), `workspace-explorer: ${id}`)
    registerFixed('workspace.explorer.open', 'openShortcut', bindings.open)
    registerFixed('workspace.explorer.quickOpen', 'quickOpenTitle', bindings.quick)
    registerFixed('workspace.explorer.searchContent', 'contentTitle', bindings.content)
    registerFixed('workspace.explorer.pastePath', 'pastePath', bindings.paste)

    const matches = (key, gesture) => {
      const binding = normalized[key]
      if (binding === null || binding === undefined || binding.code !== gesture.code) return false
      return ['control', 'alt', 'shift', 'meta'].every(modifier => gesture[modifier] === binding.modifiers.includes(modifier))
    }
    const openExplorer = (mode, target) => {
      const hit = scope.sidebarRight.commandTarget(target)
      if (hit === undefined) return false
      scope.sidebarRight.openTabFromTarget('files', hit)
      intents.set(hit.sessionId, mode)
      return true
    }
    const pastePath = async (targetElement) => {
      const hit = scope.sidebarRight.commandTarget(targetElement)
      if (hit === undefined) return
      const state = sessions.get(hit.sessionId)
      const cwd = state?.composerCwd ?? state?.root
      let path
      let activeFile
      try { activeFile = parseFileResource(scope.sidebarRight.active()?.contentId) } catch { activeFile = undefined }
      // The primary flow is selection-only: select code in the active preview,
      // then press Ctrl+U. No clipboard copy is required. A selection left in a
      // different or detached preview must not shadow the newly opened file.
      const currentSelection = codeSelectionDescriptor(ctx, window.getSelection())
      if (currentSelection !== undefined
        && currentSelection.sessionId === hit.sessionId
        && currentSelection.codeRoot.isConnected
        && activeFile !== undefined
        && activeFile.path === currentSelection.path) {
        const lineRange = codeLocationFromRange(currentSelection.range, currentSelection.codeRoot)
        if (lineRange !== undefined) {
          path = selectionLocationText({ path: currentSelection.path, ...lineRange }, cwd)
        }
      }
      // With no live code selection, the open preview file's path wins over
      // the clipboard or the explorer selection.
      if (path === undefined && activeFile !== undefined) {
        path = fileMention(cwd === undefined ? activeFile.path : relativePath(cwd, activeFile.path))
      }
      if (path === undefined && state?.selected) path = fileMention(relativePath(state.root, state.selected))
      if (path === undefined) {
        let clipboardText
        try {
          clipboardText = await navigator.clipboard.readText()
        } catch {
          // Clipboard read is permission-gated.
        }
        if (clipboardText !== undefined) {
          const clipboardPath = pathFromClipboard(clipboardText, cwd)
          if (clipboardPath !== undefined) path = hasLineRange(clipboardPath) ? clipboardPath : fileMention(clipboardPath)
        }
      }
      if (path === undefined) {
        state?.notify?.(t('noPath'))
        return
      }
      const current = scope.sidebarRight.commandTarget(targetElement)
      if (current?.sessionId !== hit.sessionId) return
      const inserted = insertComposerText(state, path, t)
      state?.notify?.(inserted.ok ? t('insertedPath') : inserted.reason)
    }
    // Lexical consumes Ctrl/Cmd+U as underline inside the composer before the
    // shortcut service's bubble listener. This capture listener handles the
    // path paste everywhere the user can reasonably invoke it.
    scope.effect(() => {
      const keydown = (event) => {
        if (event.defaultPrevented || event.repeat || event.isComposing) return
        const primary = scope.shortcuts.platform === 'macos' ? event.metaKey : event.ctrlKey
        if (!primary || event.altKey || event.shiftKey || event.code !== 'KeyU') return
        const target = event.target instanceof Element ? event.target : document.activeElement
        if (target === null) return
        if (target.closest('.xterm, .we-palette, [role="dialog"][aria-modal="true"]')) return
        const composer = target.closest('[data-composer-input]')
        if (composer === null) {
          const editable = target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
          if (editable !== null) return
        }
        event.preventDefault()
        event.stopPropagation()
        void pastePath(target)
      }
      window.addEventListener('keydown', keydown, true)
      return () => window.removeEventListener('keydown', keydown, true)
    }, 'workspace-explorer: paste path capture')
    scope.effect(() => scope.shortcuts.observeFixedInput((input) => {
      if (input.type !== 'keydown') return
      const { gesture, context } = input
      if (gesture.composing || gesture.defaultPrevented || gesture.repeat) return
      if (context.modal !== null || context.region === 'terminal') return
      if (matches('open', gesture)) {
        if (openExplorer(undefined, context.target)) input.consume()
        return
      }
      if (matches('quick', gesture)) {
        if (openExplorer('file', context.target)) input.consume()
        return
      }
      if (matches('content', gesture)) {
        if (openExplorer('content', context.target)) input.consume()
        return
      }
    }), 'workspace-explorer: fixed shortcut input')
  })
}

return { inject: [
  'slots', 'locale', 'sidebarRightTabs', 'sidebarRight', 'remote',
  'remote.workspaceFiles', 'connection', 'shortcuts',
], apply }

  },
});
