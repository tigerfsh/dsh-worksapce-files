# fuzzy — a tiny fuzzy path matcher for the DSH Web GUI plugin

Self-contained Rust → WebAssembly fuzzy path matcher plus a byte-for-byte
identical pure-JS fallback. No crates, no dependencies, no Node APIs, no
network calls at runtime. Built and tested entirely inside this directory.

| File | Bytes | Purpose |
| --- | ---: | --- |
| `src/lib.rs` | 9.0 KB | Rust source: `#![no_std]`, `panic=abort`, bump allocator, scorer |
| `build.sh` | 6.1 KB | Reproducible build using a workspace-local wasm32 sysroot |
| `fuzzy.wasm` | **1472** | Compiled `wasm32-unknown-unknown` cdylib (0 imports) |
| `fuzzy.wasm.b64.js` | 2260 | `FUZZY_WASM_B64` — single-line base64 (1964 chars), CJS export |
| `fuzzy.js` | 12353 | `createFuzzy()` wasm wrapper + `scoreAllJS` pure-JS fallback |
| `test.mjs` | 13.2 KB | 106 assertions: ABI, ranking, differential wasm↔JS equality |
| `bench.mjs` | 7.6 KB | 50,000-path benchmark (wasm API / wasm kernel / pure JS) |
| `package.json` | 293 | `{"type":"commonjs"}` so `require('./fuzzy.js')` works here |
| `Cargo.toml` | 604 | Optional cargo build (see [Build](#build)) |

`fuzzy.wasm` sha256: `948c16c09317d3bbd43623e8eb38342d70e685d374944b41f79060102b12df27`

```
$ node test.mjs
ok - 106 checks passed (wasm built: yes, no wasm imports)
```

## Quick start

CommonJS (this directory is CJS on purpose — the repo root is `"type":"module"`):

```js
const { createFuzzy, scoreAllJS } = require("./fuzzy.js");

// Resolves to { scoreAll(paths, query) } or null. Instantiated once per process;
// calling it again returns the same cached handle.
const fuzzy = await createFuzzy();

if (fuzzy) {
  const scores = fuzzy.scoreAll(["src/app.py", "src/index.ts", "uv.lock"], "py");
  // Int32Array [ 385, 0, 0 ]  — 0 means "no match"
  const ranked = ["src/app.py", "src/index.ts", "uv.lock"]
    .map((p, i) => ({ path: p, score: scores[i] }))
    .sort((a, b) => b.score - a.score);
} else {
  const scores = scoreAllJS(paths, query); // same numbers, ~1.5-2.5x slower
}
```

ESM consumers (Node or a bundler that does CJS→ESM interop):

```js
import fuzzy from "./fuzzy.js";          // default export = module.exports
const { createFuzzy, scoreAllJS } = fuzzy;
```

Browser: `fuzzy.js` uses only `WebAssembly`, `atob`, `Uint8Array`, `Int32Array`,
`TextEncoder` (and `TextEncoder.encodeInto` when present, with a fallback). It
has no `require`, `import`, `export`, `process` or `Buffer` references; the test
suite loads it in a `node:vm` sandbox that provides nothing else and it works.

Copying the base64 constant instead of shipping the extra file:

```js
const { FUZZY_WASM_B64 } = require("./fuzzy.wasm.b64.js");
// or paste the literal: var FUZZY_WASM_B64 = "AGFzbQ...";
```

## API

### `createFuzzy(): Promise<{ scoreAll } | null>`

Decodes `FUZZY_WASM_B64`, calls `WebAssembly.instantiate(bytes, {})` (no imports
module) and resolves to a handle. Concurrent and repeated calls share one
promise, so the module is instantiated exactly once. Any failure — `atob` or
`WebAssembly` missing, bad base64, instantiation error — resolves to `null`
instead of rejecting; callers fall back to `scoreAllJS`.

`handle.scoreAll(paths: string[], query: string): Int32Array`

* One non-negative score per input path, in path order: `0` = no match,
  `1` = every path when the query is empty.
* Throws `TypeError` for a non-array, a non-string path, or a path containing
  `\n` (the internal encoding is newline-separated).
* Empty array → empty `Int32Array` (no wasm call).
* Stateless: the path list is validated, joined with `\n` and UTF-8 encoded on
  every call, then the buffers are freed. Nothing is cached between calls.

### `scoreAllJS(paths, query): Int32Array`

Pure-JS implementation with identical byte-level semantics and *identical
scores* (the benchmark and tests assert equality, not just match/no-match).
Used as the fallback and as the differential oracle.

## WASM ABI

All strings are UTF-8 byte blobs; the host owns every buffer it passes in.

```text
alloc(len: usize) -> *mut u8                 // 16-byte aligned, grows memory on demand
dealloc(ptr: *mut u8, len: usize)            // frees the most recent block (LIFO)
score_all(paths_ptr: *const u8, paths_len: usize,
          query_ptr: *const u8, query_len: usize,
          out_ptr: *mut i32, out_cap: usize) -> usize
```

* `paths` is a `\n`-separated UTF-8 blob; it is split exactly like
  `String.prototype.split("\n")` (so `[""]` → empty blob → one empty path).
* `score_all` writes `min(path_count, out_cap)` scores into `out_ptr` and
  returns that count. Query may be empty (`→ 1` for every path); scores never
  exceed `i32`.
* The allocator is a bump allocator over linear memory. `dealloc` reclaims a
  block only if it is the most recent allocation; freeing out of order parks it
  until the next `memory.grow`. The JS wrapper always allocates
  `query → paths → out` and frees `out → paths → query`, so a full cycle returns
  the heap top to where it started and memory never grows across calls.
* Exports: `memory`, `alloc`, `dealloc`, `score_all`. Imports: none.
* Note: passing a large `paths_len` that is not a multiple of the actual blob
  size is UB by contract; the JS wrapper always passes exact lengths.

## Scoring model

Case-insensitive subsequence match over bytes, ASCII-only case folding (as
specified), with these weights per matched query byte:

| Component | Points |
| --- | ---: |
| Base per matched byte | +100 |
| Exact case (path byte equals the lowercased query byte) | +20 |
| Segment start (index 0, or right after `/` or `\`) | +40 |
| Right after `_ - . / \ :` | +30 |
| Inside the basename (after the last `/` or `\`; whole path if no separator) | +60 |
| Gap between consecutive matches | −2 per byte, capped at −16 |
| Leading gap | −1 per 2 bytes, capped at −8 |
| Trailing gap | −1 per 2 bytes, capped at −4 |
| Path length | −1 per 8 bytes |

Both a leftmost-greedy and a rightmost-greedy pass score the match and the
better window wins, so `py` picks `src/app.py`'s basename `py` rather than a
loose early match, and `uvlock` matches `uv.lock`. Scores are clamped to `≥ 1`
for actual matches. Worst case is two linear scans per path — O(paths_len × 2 +
query_len), no allocation per path, no regex. Example scores:

```
"py"      src/app.py 385   src/index.ts 0   uv.lock 0
"uvlock"  src/app.py 0     src/index.ts 0   uv.lock 1148
""        every path 1
```

## Build

The host has rustc/cargo 1.100.0 for `x86_64` only, and
`rustup target add wasm32-unknown-unknown` fails with
`component download failed ... cleaning up cached downloads`. `build.sh` works
around that without touching `~/.rustup` or `~/.cargo`:

1. Downloads `rust-std-1.100.0-wasm32-unknown-unknown.tar.xz` from
   `https://static.rust-lang.org/dist/2026-11-12/` (the date matching rustc
   1.100.0, commit `0ef1bc386 2026-11-09`), verifies the manifest sha256
   (`19b7954d…d7b9`), and extracts it into `./.sysroot`.
2. Compiles with that sysroot:

```bash
rustc --edition 2021 --crate-type=cdylib \
  --target wasm32-unknown-unknown --sysroot "$PWD/.sysroot" \
  -C panic=abort -C opt-level=z -C lto -C debuginfo=0 -C strip=symbols \
  -C link-arg=-zstack-size=131072 \
  src/lib.rs -o fuzzy.wasm
```

3. Asserts the exports (`memory`, `alloc`, `dealloc`, `score_all`) and zero
   imports, then regenerates `fuzzy.js` (from `src/fuzzy.template.js`) and
   `fuzzy.wasm.b64.js` from the fresh binary.

```bash
./build.sh            # full build (uses .sysroot, re-downloads if missing)
./build.sh --js-only  # regenerate fuzzy.js / b64 from the existing fuzzy.wasm
```

The build is reproducible: two consecutive runs produced the same sha256
(`948c16c0…df27`). `.cache/` (22 MB tarball) and `.sysroot/` (100 MB) are local
build inputs; delete them and `build.sh` will fetch the component again (the
mirror is slow, ~30–40 KB/s in this environment, so keep them for a while).

If the target ever becomes installed system-wide, `build.sh` detects it
(`rustc --print target-libdir`) and builds without the local sysroot.

Cargo also works once `.sysroot` exists (verified, same behaviour, 1473 bytes):

```bash
RUSTFLAGS="--sysroot=$PWD/.sysroot" \
  cargo build --release --target wasm32-unknown-unknown
# → target/wasm32-unknown-unknown/release/fuzzy.wasm
```

## Benchmark

50,000 deterministic generated paths (nested `src/`, `apps/web/`, `packages/`,
`node_modules/`, `.venv/lib/python3.12/site-packages/`, `site-packages/pip/`,
`crates/…` with realistic names and extensions), 1.79 MB joined blob. Query
scoring plus UTF-8 encoding of the blob is included for both implementations, so
the columns are like-for-like. Node v26.13.0, Linux x64, Intel i5-10210U, 8
threads, one process, `performance.now()`, median of 21 (wasm) / 7 (JS) runs
after warm-up.

| query | matches | wasm API (median) | wasm kernel only | pure JS (median) |
| --- | ---: | ---: | ---: | ---: |
| `py` | 16,712 | 12.74 ms | 8.25 ms | 21.23 ms |
| `uvlock` | 523 | 12.40 ms | 7.68 ms | 18.57 ms |
| `app` | 12,683 | 13.15 ms | 8.94 ms | 20.32 ms |
| `node_modules` | 12,176 | 13.56 ms | 9.13 ms | 20.88 ms |
| `index.ts` | 107 | 12.03 ms | 7.68 ms | 17.28 ms |
| **median** | | **12.74 ms** | **8.25 ms** | **20.32 ms** |

* wasm public API: **1.6× faster** than pure JS end-to-end (≈255 ns/path).
* wasm kernel only (`score_all` with pre-encoded buffers): **2.5× faster**
  (≈165 ns/path).
* ~4.5 ms of every wasm call is the stateless wrapper (validate + join +
  UTF-8 encode + copy). The public API deliberately re-encodes per call; if your
  plugin keeps a stable path list and only the query changes, you can expect
  roughly the "kernel only" column (≈8 ms per keystroke for 50k paths, ≈0.8 ms
  for 5k).
* Reproduce with `node bench.mjs`. Results vary ±10% run to run; JS numbers
  vary more (GC/JIT). The script also verifies wasm and JS produce identical
  score arrays for every query before timing.

Scaling is linear in total path bytes: a 5,000-path list costs ≈1.3 ms (wasm API)
/ ≈2 ms (JS).

## Integration notes for the DSH Web GUI plugin

1. Keep the base64 + wrapper in your client bundle and call `createFuzzy()`
   once at module init. It is a shared promise; do not await it on every
   keystroke. Until it resolves, use `scoreAllJS`.
2. Scores are `Int32Array` copies — safe to hold after the call (the wasm heap is
   reused).
3. Ranking: `paths.map((p, i) => [p, scores[i]]).sort((a, b) => b[1] - a[1])`.
   `0` means "hide"; an empty query scores every path `1`, so filtering by
   `score > 0` keeps all paths.
4. Cap the list you send: 50k paths is ~13 ms per query on this machine, which
   is one frame-ish; for large workspaces either filter by a cheaper prefilter
   or run the matcher on the top-N recent files.
5. Newlines in paths are rejected (`TypeError`); Windows-style paths with
   backslashes are supported and `\` is treated as a segment separator.
6. Browser/CJS: `fuzzy.js` is CommonJS because this directory's `package.json`
   sets `"type":"commonjs"` (the repo root is `"type":"module"`, so without it
   `require('./fuzzy.js')` would be treated as ESM and fail). If your bundler
   insists on ESM source, either import the default export
   (`import fuzzy from './fuzzy.js'`), or copy `FUZZY_WASM_B64` from
   `fuzzy.wasm.b64.js` into your own module together with the scoring code.
7. Only one wasm instance is created per JS realm. It is synchronous and
   single-threaded; do not share the handle across workers (instantiate in each
   worker if needed).
8. `alloc`/`dealloc` are exposed for completeness; only use them in LIFO order
   (`alloc A, alloc B, dealloc B, dealloc A`) — out-of-order frees park memory
   until a future `memory.grow`.

## Limitations

* **ASCII-only case folding.** Non-ASCII bytes must match exactly; `İ`/`ß`-style
  case pairs are not folded (matches the spec and keeps the kernel branch-free).
* **Byte-level subsequence matching.** Paths and queries are UTF-8 bytes, so in
  theory a match can start mid-codepoint for multi-byte characters. In practice
  queries are ASCII; wasm and JS agree exactly on the behaviour.
* **Heuristic, not fzf-v2.** Two greedy passes and fixed weights; it does not
  compute the optimal alignment like fzf's DP. Ordering is stable and sensible,
  but not identical to fzf.
* **Single-threaded, no SIMD, no regex, wasm32 only.**
* `path_count > out_cap` truncates output (by design of the ABI); the JS wrapper
  always passes `out_cap = paths.length`.
* The vendored rust-std component is pinned to rustc 1.100.0; bump
  `RUSTC_VERSION`, `DIST_DATE` and `SHA256` in `build.sh` together when the
  toolchain changes.

## Environment caveats

* Network to `static.rust-lang.org` works but is slow here (~30–40 KB/s); the
  first `build.sh` run must download 23 MB, which timed out at 5 minutes once
  and was resumed with `curl -C -`. `build.sh` itself resumes with `-C -` and
  re-verifies the sha256 on every run.
* `cargo` works only with `RUSTFLAGS="--sysroot=$PWD/.sysroot"` because the
  wasm32 target is not registered with rustup; `./build.sh` is the supported
  path on this machine.
