/*
 * bench.mjs — latency benchmark for the fuzzy matcher.
 *
 * Generates 50,000 deterministic, realistic nested paths (JS/TS project,
 * node_modules, Python venv / site-packages) and reports the median wall-clock
 * latency of the wasm fast path vs the pure-JS fallback for 5 queries. Both
 * implementations include UTF-8 encoding of the joined path blob, so the
 * numbers compare like for like.
 *
 * Run: node bench.mjs
 */
import { performance } from "node:perf_hooks";
import fuzzy from "./fuzzy.js";
import b64 from "./fuzzy.wasm.b64.js";

const { createFuzzy, scoreAllJS } = fuzzy;
const { FUZZY_WASM_B64 } = b64;
const N = 50000;

/* ---------------------------------------------------------------- */
/* Deterministic path corpus                                        */
/* ---------------------------------------------------------------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(0xf00d);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const roots = [
  "src", "src/app", "src/components", "src/lib", "src/shared", "tests", "docs",
  "apps/web/src", "apps/api/src", "packages/core/src", "packages/ui/src",
  "crates/engine/src", "crates/fuzzy/src", "scripts", "public/assets", "config",
  "node_modules/react", "node_modules/react-dom", "node_modules/@types/node",
  "node_modules/next/dist/server", "node_modules/.pnpm/vite@5.0.0/node_modules/vite/dist",
  "node_modules/eslint/lib/rules", "node_modules/lodash",
  ".venv/lib/python3.12/site-packages", ".venv/bin",
  "venv/lib/python3.11/site-packages", "site-packages/pip/_internal",
  "python/.venv/lib/python3.10/site-packages/numpy", "backend/app/models",
];
const dirWords = [
  "components", "hooks", "utils", "lib", "core", "shared", "features", "modules",
  "pages", "services", "store", "types", "api", "tests", "__tests__", "fixtures",
  "mocks", "scripts", "styles", "assets", "models", "views", "controllers", "internal",
];
const fileWords = [
  "index", "main", "app", "utils", "config", "settings", "types", "helpers", "router",
  "store", "api", "client", "server", "model", "view", "controller", "service", "test",
  "spec", "mock", "fixture", "Button", "Card", "Modal", "useAuth", "useFetch", "format",
  "parse", "validate", "schema", "styles", "theme", "layout", "page", "query", "cache",
  "logger", "errors", "constants", "env", "setup", "build", "deploy", "README",
  "pyproject", "uv", "package", "tsconfig", "__init__", "conftest",
];
const exts = [
  ".py", ".pyi", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".rs", ".go",
  ".json", ".md", ".toml", ".yaml", ".yml", ".lock", ".css", ".scss", ".html", "",
];

function makePath() {
  const root = pick(roots);
  const extra = rnd() < 0.55 ? 1 + Math.floor(rnd() * 3) : 0;
  const dirs = [];
  for (let i = 0; i < extra; i++) dirs.push(pick(dirWords));
  const name = pick(fileWords);
  const ext = rnd() < 0.08 ? "" : pick(exts);
  return (dirs.length ? root + "/" + dirs.join("/") : root) + "/" + name + ext;
}

const paths = new Array(N);
for (let i = 0; i < N; i++) paths[i] = makePath();

let bytes = 0;
for (const p of paths) bytes += p.length + 1;

const queries = ["py", "uvlock", "app", "node_modules", "index.ts"];

/* ---------------------------------------------------------------- */
/* Timing                                                           */
/* ---------------------------------------------------------------- */
function median(samples) {
  const s = samples.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function timeIt(fn, reps) {
  const samples = new Array(reps);
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    fn();
    samples[i] = performance.now() - t0;
  }
  return median(samples);
}

const wasm = await createFuzzy();

console.log("=== fuzzy matcher benchmark ===");
console.log(
  `node ${process.version}, ${process.platform} ${process.arch}, ` +
    `${N.toLocaleString("en-US")} paths (${(bytes / 1048576).toFixed(2)} MB blob), ` +
    (wasm ? "wasm instantiated" : "wasm UNAVAILABLE (JS only)")
);

if (!wasm) {
  console.log("wasm not available; nothing to compare.");
  process.exit(0);
}

/* correctness cross-check before timing */
for (const q of queries) {
  const w = wasm.scoreAll(paths, q);
  const j = scoreAllJS(paths, q);
  for (let i = 0; i < N; i++) {
    if (w[i] !== j[i]) {
      console.error(`MISMATCH for query ${JSON.stringify(q)} at path ${i}: wasm=${w[i]} js=${j[i]}`);
      process.exit(1);
    }
  }
  console.log(`verified identical wasm/JS scores for ${JSON.stringify(q)} (${w.filter((s) => s > 0).length} matches)`);
}

/* warm-up */
wasm.scoreAll(paths, "py");
scoreAllJS(paths, "py");

/* Raw compute-only path: pre-encode the blob and query once, then time nothing
 * but the exported score_all call. This isolates the wasm kernel from the
 * unavoidable JS-side validation/join/UTF-8 encoding in the public wrapper. */
const te = new TextEncoder();
const raw = await WebAssembly.instantiate(Buffer.from(FUZZY_WASM_B64, "base64"), {});
const X = raw.instance.exports;
const pbytes = te.encode(paths.join("\n"));
const pptr = X.alloc(pbytes.length + 1);
new Uint8Array(X.memory.buffer, pptr, pbytes.length).set(pbytes);
const optr = X.alloc(N * 4);
const qbufs = new Map();
for (const q of queries) {
  const qb = te.encode(q);
  const qptr = X.alloc(qb.length + 1);
  new Uint8Array(X.memory.buffer, qptr, qb.length).set(qb);
  qbufs.set(q, { qptr, qlen: qb.length });
}
for (const q of queries) {
  const b = qbufs.get(q);
  X.score_all(pptr, pbytes.length, b.qptr, b.qlen, optr, N);
  const rawScores = new Int32Array(X.memory.buffer, optr, N);
  const ref = wasm.scoreAll(paths, q);
  for (let i = 0; i < N; i++) {
    if (rawScores[i] !== ref[i]) {
      console.error(`raw/API mismatch for ${JSON.stringify(q)} at ${i}`);
      process.exit(1);
    }
  }
}

const rows = [];
for (const q of queries) {
  const wasmMs = timeIt(() => wasm.scoreAll(paths, q), 21);
  const computeMs = timeIt(() => X.score_all(pptr, pbytes.length, qbufs.get(q).qptr, qbufs.get(q).qlen, optr, N), 21);
  const jsMs = timeIt(() => scoreAllJS(paths, q), 7);
  rows.push({ q, wasmMs, computeMs, jsMs, speedup: jsMs / wasmMs });
}

const medW = median(rows.map((r) => r.wasmMs));
const medC = median(rows.map((r) => r.computeMs));
const medJ = median(rows.map((r) => r.jsMs));

console.log("");
console.log("query            wasm API     wasm compute   pure JS    API speedup");
for (const r of rows) {
  console.log(
    `${JSON.stringify(r.q).padEnd(17)} ${r.wasmMs.toFixed(2).padStart(7)} ms ${r.computeMs.toFixed(2).padStart(11)} ms ` +
      `${r.jsMs.toFixed(2).padStart(8)} ms ${r.speedup.toFixed(1).padStart(9)}x`
  );
}
console.log("");
console.log(
  `median across queries: wasm API ${medW.toFixed(2)} ms, wasm compute ${medC.toFixed(2)} ms, JS ${medJ.toFixed(2)} ms ` +
    `(${(medJ / medW).toFixed(1)}x API, ${(medJ / medC).toFixed(1)}x compute)`
);
console.log(
  `per path: wasm API ${((medW * 1e6) / N).toFixed(0)} ns, wasm compute ${((medC * 1e6) / N).toFixed(0)} ns, ` +
    `JS ${((medJ * 1e6) / N).toFixed(0)} ns`
);
console.log(
  `wrapper overhead (validate + join + UTF-8 encode + copy): ~${(medW - medC).toFixed(2)} ms per call; ` +
    "the public API is stateless and re-encodes the path list on every call."
);
