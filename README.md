# Workspace Explorer

npm package: `@fushouhai/dsh-workspace-files`

A fast replacement for the native **Workspace Files** page in the DeepSeek
Harness Web GUI. The plugin takes over the `files` tab kind through the
right-Sidebar tab registry, so the shell keeps every other feature (document
preview, terminal, guide, file resources) intact.

## Features

- **Lazy directory tree** with virtual scrolling. Only visible rows are in the
  DOM; a directory with thousands of entries remains fast.
- **File-type icons** for Python, JavaScript/TypeScript, Rust, Go, JSON, YAML,
  Markdown, shell, config, archives, images, and more.
- **Quick open** (`Ctrl/Cmd+P`): one bounded `rg --files` inventory per Session,
  then local fuzzy matching—including a Rust→WASM scorer.
- **Content search** (`Ctrl/Cmd+Shift+F`): ripgrep runs in the Host and returns
  a bounded result page. Clicking a result opens the file at that line in the
  native document preview (which supplies syntax highlighting).
- **Double-click** a file to open it, or press Enter in the tree.
- **Drag a file row into the composer** to insert its workspace-relative path.
- **Paste code location or file path** (`Ctrl/Cmd+U`): select a range in a file
  preview and press `Ctrl/Cmd+U` directly; no copy step is needed. It inserts
  the location as plain `a/b/c.py:100~105`. With no code selection, it inserts
  the open preview file path as an `@` mention, for example `@a/b/c.py`, then
  the selected explorer file, then a pure path-like clipboard text. The
  right-click menu still exposes **copy file content** and **insert path** as
  ordinary actions, and its copy-path action now copies `@path`.
- **Python project badges**: directories with `pyproject.toml`, `uv.lock`,
  `.python-version`, `requirements.txt`, `Pipfile`, or `setup.py` get a project
  chip labeled `uv`, `pyenv`, or `Python`. Clicking a chip expands and reveals
  the project. `uv` and `pyenv` projects need no special highlighting setup;
  the shared preview renderer highlights both.
- **Ignored/hidden entry toggles**. `.git`, `node_modules`, `.venv`,
  `__pycache__`, build outputs, and similar directories are hidden by default
  and can be revealed with the `{}` toolbar button.

## Shortcuts

| Action | Shortcut |
|---|---|
| Open Workspace Explorer | `Ctrl/Cmd+Shift+E` |
| Quick open file | `Ctrl/Cmd+P` |
| Search file contents | `Ctrl/Cmd+Shift+F` |
| Paste the selected code location, or the open/selected `@` path | `Ctrl/Cmd+U` |

These are registered as fixed local actions. DSH's editable shortcut policy
reserves several of these combinations on Web/Linux, so the plugin reserves
them directly while still contributing them to the shortcut catalog. They work
while the page or composer has focus. `Ctrl/Cmd+U` first uses the current code
selection from a file preview and inserts `path:start~end`; with no selection,
the open preview file's path comes first as `@path`, then the selected
explorer file, then a pure path-like clipboard text. A path-like clipboard
value that already carries a line range is inserted without the `@` prefix.
Copy/insert remain available from the right-click menu.

## Language

The plugin has no language switch of its own. Page text, menus, the guide card,
shortcut labels, and the tab title follow the DSH locale. Dictionaries are
provided for Chinese and English; the plugin metadata files are
[locale/zh.json](locale/zh.json) and [locale/en.json](locale/en.json).

## Performance

- One directory is listed at a time; collapsing a directory keeps its last
  listing for a later re-open.
- Rows are flattened only for expanded directories, then windowed at a fixed
  24 px row height. A 3,000-file directory rendered ~40 DOM rows and expanded
  in ~100 ms on the development machine.
- The fast local listing path uses `readdir({ withFileTypes: true })` instead of
  one stat per child, and falls back to the native bounded listing when the
  filesystem provider is not local.
- Quick open builds one inventory (bounded to 100,000 files, 15 s Host cache)
  and scores it locally. The Rust→WASM module is 1,472 bytes and scores 50,000
  paths in ~12.7 ms (median, 1.6× the pure-JS fallback on the same machine).
- Content search is executed by the packaged ripgrep binary; it never streams
  file contents into the browser.

## Layout

- `index.js` — Host service: `workspaceExplorer` Typert source-mode methods
  `listDir`, `listFiles`, `findProjects`, and `searchContent`.
- `client.js` — built browser artifact (source in `src/plugin.js`).
- `rust/fuzzy/` — Rust fuzzy matcher, WASM binary, JS fallback, build script,
  and benchmark. The built WASM is embedded in `client.js`, so runtime has no
  extra files or toolchain requirement.
- `cordis.patch.yml` — inserts the Host row.

## Build

```sh
node build-client.mjs
node --check client.js
```

Rebuild the WASM module only when changing the scorer:

```sh
cd rust/fuzzy && ./build.sh
```

The build script uses a workspace-local wasm32 sysroot and does not modify the
user's rustup installation.

## Limits and compatibility

- The explorer is a read-only browser: it lists, previews, searches, copies, and
  inserts paths; it does not rename, delete, or edit files.
- Syntax highlighting, line navigation, and the full-file viewer come from the
  host's document preview package, not from a second highlighter. This keeps
  Python highlighting identical for `uv` and `pyenv` projects.
- The fast local directory listing uses `readdir({ withFileTypes: true })` and
  falls back to the native bounded listing when the Session's filesystem is not
  local.
- The Host methods are registered with Typert's source-mode markers
  (`typertRemote` plus the prototype method descriptor). They were verified on
  DSH `0.2.2-rc.3`; re-run the checks after a DSH upgrade that changes that
  internal marker.
- Quick-open inventory is capped at 100,000 files and cached for 15 seconds.
  The refresh button forces a new inventory.

- `Ctrl/Cmd+U` reads a text selection in the native code preview directly; no
  copy is required. With no code selection it inserts the open preview file's
  path as `@path`, then the selected explorer file, then a pure path-like
  clipboard text.
  Selections in other surfaces (chat Markdown, editors, another application)
  have no file/line identity. The tracker reads the preview's
  `data-textpreview-url` and line nodes; a DSH preview refactor may require an
  update.
