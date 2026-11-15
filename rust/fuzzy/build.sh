#!/usr/bin/env bash
# Build fuzzy.wasm from src/lib.rs using a workspace-local wasm32 sysroot.
#
# The host has rustc/cargo for x86_64 only and `rustup target add
# wasm32-unknown-unknown` fails while downloading the component, so this script
# downloads the matching rust-std component from static.rust-lang.org into
# ./.sysroot and points rustc at it with --sysroot. It never touches
# ~/.rustup or ~/.cargo.
#
# Usage: ./build.sh [--js-only]
#   --js-only   regenerate fuzzy.js and fuzzy.wasm.b64.js from the existing
#               fuzzy.wasm without rebuilding it (for JS-only tweaks).
set -euo pipefail
cd "$(dirname "$0")"

RUSTC_VERSION="1.100.0"          # rustc 1.100.0 (0ef1bc386 2026-11-09)
DIST_DATE="${DIST_DATE:-2026-11-12}"
COMPONENT="rust-std-${RUSTC_VERSION}-wasm32-unknown-unknown"
CACHE=".cache"
SYSROOT=".sysroot"
XZ="$CACHE/${COMPONENT}.tar.xz"
SHA256="19b7954d650fc0d22767eceb76b8e03d07ce0d6a9f4234f33c32a17ee8d6d7b9"
URL="https://static.rust-lang.org/dist/${DIST_DATE}/${COMPONENT}.tar.xz"

JS_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --js-only) JS_ONLY=1 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# ---------------------------------------------------------------------------
# 1. Locate or materialise a wasm32 sysroot
# ---------------------------------------------------------------------------
TARGET_LIBDIR="$(rustc --print target-libdir --target wasm32-unknown-unknown 2>/dev/null || true)"
if [ -d "$TARGET_LIBDIR" ] && compgen -G "$TARGET_LIBDIR/libcore-*.rlib" >/dev/null; then
  echo "using rustc's installed wasm32 target: $TARGET_LIBDIR"
  RUSTC_TARGET_ARGS=(--target wasm32-unknown-unknown)
elif compgen -G "$SYSROOT/lib/rustlib/wasm32-unknown-unknown/lib/libcore-*.rlib" >/dev/null; then
  echo "using workspace-local sysroot: $SYSROOT"
  RUSTC_TARGET_ARGS=(--target wasm32-unknown-unknown --sysroot "$PWD/$SYSROOT")
else
  echo "wasm32 target missing; preparing workspace-local sysroot from $URL"
  mkdir -p "$CACHE" "$SYSROOT/lib/rustlib"
  if [ ! -f "$XZ" ]; then
    curl -fSL --retry 5 --retry-delay 2 -C - -o "$XZ" "$URL"
  elif ! echo "$SHA256  $XZ" | sha256sum -c - >/dev/null 2>&1; then
    echo "cached component is incomplete/corrupt; resuming download"
    curl -fSL --retry 5 --retry-delay 2 -C - -o "$XZ" "$URL"
  fi
  echo "$SHA256  $XZ" | sha256sum -c -
  TMPDIR_WASM="$(mktemp -d)"
  tar -xJf "$XZ" -C "$TMPDIR_WASM"
  STD_DIR="$TMPDIR_WASM/${COMPONENT}/rust-std-wasm32-unknown-unknown"
  [ -d "$STD_DIR" ] || STD_DIR="$TMPDIR_WASM/rust-std-wasm32-unknown-unknown"
  [ -d "$STD_DIR" ] || STD_DIR="$(find "$TMPDIR_WASM" -type d -name 'rust-std-wasm32-unknown-unknown' -print -quit)"
  if [ ! -d "$STD_DIR" ]; then echo "unexpected component layout in $XZ" >&2; exit 1; fi
  rm -rf "$SYSROOT/lib/rustlib/wasm32-unknown-unknown"
  cp -a "$STD_DIR/lib/rustlib/wasm32-unknown-unknown" "$SYSROOT/lib/rustlib/"
  cp -a "$STD_DIR/lib/rustlib/components" "$SYSROOT/lib/rustlib/" 2>/dev/null || true
  rm -rf "$TMPDIR_WASM"
  echo "sysroot ready: $SYSROOT"
  RUSTC_TARGET_ARGS=(--target wasm32-unknown-unknown --sysroot "$PWD/$SYSROOT")
fi

# ---------------------------------------------------------------------------
# 2. Compile the cdylib
# ---------------------------------------------------------------------------
if [ "$JS_ONLY" -eq 0 ]; then
  rustc --edition 2021 \
    --crate-type=cdylib \
    "${RUSTC_TARGET_ARGS[@]}" \
    -C panic=abort \
    -C opt-level=z \
    -C lto \
    -C debuginfo=0 \
    -C strip=symbols \
    -C link-arg=-zstack-size=131072 \
    src/lib.rs -o fuzzy.wasm
  echo "built fuzzy.wasm: $(wc -c < fuzzy.wasm) bytes"
fi

# ---------------------------------------------------------------------------
# 3. Verify the exports we promise in the README
# ---------------------------------------------------------------------------
node - <<'NODE'
const fs = require("fs");
if (!fs.existsSync("fuzzy.wasm")) { console.error("fuzzy.wasm missing"); process.exit(1); }
const bytes = fs.readFileSync("fuzzy.wasm");
const mod = new WebAssembly.Module(bytes);
const exports = WebAssembly.Module.exports(mod).map((e) => e.name).sort();
const want = ["alloc", "dealloc", "score_all", "memory"];
const missing = want.filter((n) => !exports.includes(n));
if (missing.length) {
  console.error("missing wasm exports:", missing.join(", "), "have:", exports.join(", "));
  process.exit(1);
}
const imports = WebAssembly.Module.imports(mod);
if (imports.length) {
  console.error("unexpected wasm imports:", imports.map((i) => `${i.module}.${i.name}`).join(", "));
  process.exit(1);
}
console.log("wasm exports ok: " + exports.join(", ") + " (no imports)");
NODE

# ---------------------------------------------------------------------------
# 4. Regenerate fuzzy.js and fuzzy.wasm.b64.js from the template + binary
# ---------------------------------------------------------------------------
node - <<'NODE'
const fs = require("fs");
const wasm = fs.readFileSync("fuzzy.wasm");
const b64 = wasm.toString("base64");
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
  console.error("base64 output is not a single clean token");
  process.exit(1);
}
const tpl = fs.readFileSync("src/fuzzy.template.js", "utf8");
if (tpl.indexOf("__FUZZY_WASM_B64__") === -1) {
  console.error("src/fuzzy.template.js is missing the __FUZZY_WASM_B64__ placeholder");
  process.exit(1);
}
fs.writeFileSync("fuzzy.js", tpl.replace("__FUZZY_WASM_B64__", b64));
fs.writeFileSync(
  "fuzzy.wasm.b64.js",
  '"use strict";\n' +
    "/* Base64 of fuzzy.wasm (" + wasm.length + " bytes). Single line, no whitespace.\n" +
    " * Copy this constant into your plugin when you cannot ship the extra file. */\n" +
    'var FUZZY_WASM_B64 = "' + b64 + '";\n' +
    'if (typeof module !== "undefined" && module.exports) {\n' +
    "  module.exports = { FUZZY_WASM_B64: FUZZY_WASM_B64 };\n" +
    "}\n"
);
console.log("wrote fuzzy.js and fuzzy.wasm.b64.js (" + b64.length + " base64 chars)");
NODE

echo "done. run 'node test.mjs' and 'node bench.mjs'"
