# Workspace Explorer

A fast replacement for the native **Workspace Files** page in the DeepSeek
Harness Web GUI.

## What it adds

- Lazy directory tree with file-type icons and virtual scrolling.
- Fuzzy file find (`Ctrl/Cmd+P`) backed by one bounded `rg --files` inventory.
- Content search (`Ctrl/Cmd+Shift+F`) backed by ripgrep.
- Drag a file row into the composer to insert its workspace-relative path.
- Select a range of code in a file preview and press `Ctrl/Cmd+U` to insert its
  `path:start~end` location; no copy step is needed. Without a code selection,
  the open preview file's path is inserted as `@path`, then the selected
  explorer file, then a pure path-like clipboard text. Copy/insert also remain
  in the right-click menu.
- Project badges for Python workspaces managed by `uv` or `pyenv`.

## Performance

The tree lists one directory at a time and renders only the visible rows. On a
3,000-file directory it rendered about 40 rows and expanded in about 100 ms.
Quick open builds one inventory per Session and answers keystrokes locally; the
included Rust→WASM fuzzy matcher (1,472 bytes) scores 50,000 paths in about
12.7 ms median, with a pure-JS fallback. Content search runs in the Host through
the packaged ripgrep binary and returns a bounded result page.

## Notes

The page deliberately reuses the host's document preview for syntax
highlighting and line navigation. Python is highlighted by the same renderer in
both `uv` and `pyenv` projects; the virtual-environment layout never changes the
highlighter's language mapping. Double-click a file to open it, or press Enter
while it is selected.

## Limits

The explorer is read-only; it does not rename, delete, or edit files. Syntax
highlighting and line navigation are supplied by the host's document preview,
so Python looks the same in `uv` and `pyenv` projects. The fast local listing
falls back to the native bounded listing for non-local filesystems, and the
Host methods use Typert source-mode markers verified on DSH `0.2.2-rc.3`.

`Ctrl/Cmd+U` reads the file and line range directly from a text selection in
the native code preview; no copy is required. Without a code selection it uses
the open preview file's path as `@path`, then the selected explorer file, then
a pure path-like clipboard value.


## Language

The UI follows the DSH language setting and provides Chinese and English
dictionaries; there is no separate language switch in the plugin.
