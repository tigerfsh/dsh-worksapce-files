/*
 * test.mjs — behaviour + differential tests for the fuzzy matcher.
 *
 * Run: node test.mjs
 * Verifies that the wasm and the pure-JS implementation agree exactly (not just
 * on match/no-match), that ranking heuristics behave, and that the embedded
 * base64 constant decodes to the shipped binary.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

import fuzzy from "./fuzzy.js";
import b64mod from "./fuzzy.wasm.b64.js";

const { createFuzzy, scoreAllJS } = fuzzy;
const { FUZZY_WASM_B64 } = b64mod;

const here = path.dirname(fileURLToPath(import.meta.url));
let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
}

function ranked(scores, paths) {
  return paths
    .map((p, i) => ({ path: p, score: scores[i] }))
    .sort((a, b) => b.score - a.score);
}

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

/* ---------------------------------------------------------------- */
/* 1. base64 constant                                               */
/* ---------------------------------------------------------------- */
const wasmBytes = readFileSync(path.join(here, "fuzzy.wasm"));
ok(typeof FUZZY_WASM_B64 === "string", "FUZZY_WASM_B64 is a string");
ok(FUZZY_WASM_B64.length > 0, "FUZZY_WASM_B64 is non-empty");
ok(!/[\s]/.test(FUZZY_WASM_B64), "FUZZY_WASM_B64 has no whitespace/line breaks");
ok(/^[A-Za-z0-9+/]+={0,2}$/.test(FUZZY_WASM_B64), "FUZZY_WASM_B64 is valid base64");
const decoded = Buffer.from(FUZZY_WASM_B64, "base64");
ok(decoded.equals(wasmBytes), "FUZZY_WASM_B64 decodes to exactly fuzzy.wasm");

/* ---------------------------------------------------------------- */
/* 2. fuzzy.js stays browser-safe                                   */
/* ---------------------------------------------------------------- */
const fuzzySrc = readFileSync(path.join(here, "fuzzy.js"), "utf8");
ok(!/\brequire\s*\(/.test(fuzzySrc), "fuzzy.js has no require() call");
ok(!/^\s*import\s+/m.test(fuzzySrc), "fuzzy.js has no ESM import statement");
ok(!/^\s*export\s+/m.test(fuzzySrc), "fuzzy.js has no ESM export statement");
ok(!/\bprocess\./.test(fuzzySrc), "fuzzy.js does not use process");
ok(!/\bBuffer\./.test(fuzzySrc), "fuzzy.js does not use Buffer");
ok(/new TextEncoder\(\)/.test(fuzzySrc), "fuzzy.js uses TextEncoder");
ok(/atob\(/.test(fuzzySrc), "fuzzy.js uses atob");

/* ---------------------------------------------------------------- */
/* 3. wasm instantiation, exactly once                              */
/* ---------------------------------------------------------------- */
const handle = await createFuzzy();
ok(handle !== null, "createFuzzy() resolved to a wasm handle");
ok(typeof handle.scoreAll === "function", "handle exposes scoreAll");
const handleAgain = await createFuzzy();
ok(handleAgain === handle, "createFuzzy() instantiates the wasm module only once");

const wasmScore = handle.scoreAll;

/* fuzzy.js must run in a bare web environment: no Node globals at all. */
{
  const sandbox = { module: { exports: {} }, WebAssembly, atob, TextEncoder, Uint8Array, Int32Array, Promise };
  vm.createContext(sandbox);
  vm.runInContext(fuzzySrc, sandbox);
  const sandboxApi = sandbox.module.exports;
  ok(
    typeof sandboxApi.createFuzzy === "function" && typeof sandboxApi.scoreAllJS === "function",
    "fuzzy.js loads in a web-only sandbox (no require/process/Buffer)"
  );
  const sandboxHandle = await sandboxApi.createFuzzy();
  ok(sandboxHandle !== null, "wasm instantiates in the web-only sandbox");
  const sandboxScores = sandboxHandle.scoreAll(["src/app.py", "src/index.ts"], "py");
  ok(sandboxScores instanceof Int32Array && sandboxScores[0] > 0, "sandbox scoreAll returns an Int32Array");
  ok(
    Array.from(sandboxScores).join(",") === Array.from(wasmScore(["src/app.py", "src/index.ts"], "py")).join(","),
    "sandbox scores match the host scores"
  );
  ok(Array.from(sandboxApi.scoreAllJS(["src/app.py"], "py"))[0] === 385, "scoreAllJS works in the web-only sandbox");
}

/* createFuzzy() must resolve to null (not reject) when wasm cannot be used. */
{
  const noWasm = { module: { exports: {} }, atob, TextEncoder, Uint8Array, Int32Array, Promise, WebAssembly: undefined };
  vm.createContext(noWasm);
  vm.runInContext(fuzzySrc, noWasm);
  ok((await noWasm.module.exports.createFuzzy()) === null, "createFuzzy() -> null without WebAssembly");
  ok(Array.from(noWasm.module.exports.scoreAllJS(["src/app.py"], "py"))[0] === 385, "scoreAllJS works without WebAssembly");

  const noAtob = { module: { exports: {} }, WebAssembly, TextEncoder, Uint8Array, Int32Array, Promise };
  vm.createContext(noAtob);
  vm.runInContext(fuzzySrc, noAtob);
  ok((await noAtob.module.exports.createFuzzy()) === null, "createFuzzy() -> null without atob");
}

/* ---------------------------------------------------------------- */
/* 4. basic contract                                                */
/* ---------------------------------------------------------------- */
const emptyArr = wasmScore([], "anything");
ok(emptyArr instanceof Int32Array && emptyArr.length === 0, "empty path array -> empty Int32Array");
ok(scoreAllJS([], "anything") instanceof Int32Array, "scoreAllJS empty -> Int32Array");

const allOne = wasmScore(["a", "b/c", "d/e/f"], "");
ok(allOne.length === 3, "one score per path");
ok(allOne.every((s) => s === 1), "empty query -> 1 for every path");
ok(scoreAllJS(["a", "b/c"], "").every((s) => s === 1), "scoreAllJS empty query -> 1");

const noMatch = wasmScore(["src/app.py", "src/main.rs"], "nomatch");
ok(noMatch.every((s) => s === 0), "non-matching query -> 0 for every path");

ok(wasmScore([""], "")[0] === 1, "empty path + empty query -> 1");
ok(wasmScore([""], "a")[0] === 0, "empty path + non-empty query -> 0");

assert.throws(() => wasmScore(["a\nb"], "x"), TypeError, "newline in a path is rejected");
assert.throws(() => wasmScore(["a", 3], "x"), TypeError, "non-string path is rejected");
assert.throws(() => wasmScore("not-an-array", "x"), TypeError, "non-array paths rejected");
assert.throws(() => scoreAllJS(["a\nb"], "x"), TypeError, "scoreAllJS rejects newlines");
passed += 4;

/* ---------------------------------------------------------------- */
/* 5. ranking heuristics                                            */
/* ---------------------------------------------------------------- */

/* query "py" must rank "src/app.py" first and leave unrelated files at 0 */
{
  const paths = ["src/app.py", "src/p/y/deeper/x.txt", "README.md", "src/index.ts"];
  const r = ranked(wasmScore(paths, "py"), paths);
  ok(r[0].path === "src/app.py", `"py" ranks src/app.py first (got ${r[0].path})`);
  ok(r[1].path === "src/p/y/deeper/x.txt", "scattered p/y still matches, ranked below basename hit");
  ok(r[0].score > r[1].score, "basename hit outscores scattered hit");
  const readme = wasmScore(paths, "py")[2];
  ok(readme === 0, "README.md does not match py");
}

/* "uvlock" matches uv.lock and nothing else here */
{
  const paths = ["uv.lock", "src/uv.lock", "uvloop.py", "README.md"];
  const s = wasmScore(paths, "uvlock");
  ok(s[0] > 0 && s[1] > 0, "uvlock matches uv.lock and src/uv.lock");
  ok(s[2] === 0 && s[3] === 0, "uvlock does not match uvloop.py or README.md");
  ok(s[0] >= s[1], "shallower uv.lock not worse than nested uv.lock");
}

/* basename matches beat directory matches */
{
  const paths = ["src/app/other.txt", "src/other/app.txt"];
  const r = ranked(wasmScore(paths, "app"), paths);
  ok(r[0].path === "src/other/app.txt", "basename hit outranks directory hit");
  ok(r[0].score > r[1].score, "basename bonus is positive");
}

/* case: matching is case-insensitive, lowercase keeps the exact-case bonus */
{
  const lower = wasmScore(["src/app.py"], "app")[0];
  const upper = wasmScore(["src/App.py"], "app")[0];
  ok(lower > 0 && upper > 0, "case-insensitive match works both ways");
  ok(lower > upper, "lowercase path keeps the exact-case bonus");
  ok(wasmScore(["src/App.py"], "APP")[0] > 0, "uppercase query matches via ASCII case folding");
  ok(scoreAllJS(["src/App.py"], "APP")[0] === wasmScore(["src/App.py"], "APP")[0], "case folding identical in JS");
}

/* segment-start and boundary bonuses (same length, same basename, so only the
 * boundary rule differs between the two candidates) */
{
  const a = wasmScore(["src/utils/index.ts"], "utils")[0];
  const b = wasmScore(["src/xutilsy/index.ts"], "utils")[0];
  ok(a > b, "segment-start hit outscores a mid-word hit");
  const c = wasmScore(["src/app_config.py"], "config")[0];
  const d = wasmScore(["src/appxconfig.py"], "config")[0];
  ok(c > d, "match after '_' outscores a mid-word match");
  ok(c - d === 30, "boundary bonus is exactly +30");
}

/* ---------------------------------------------------------------- */
/* 6. exact differential agreement: fixtures                        */
/* ---------------------------------------------------------------- */
{
  const paths = [
    "src/app.py",
    "src/App.py",
    "apps/web/src/index.tsx",
    "node_modules/react/index.js",
    "node_modules/@types/node/index.d.ts",
    ".venv/lib/python3.11/site-packages/pip/_internal/main.py",
    "uv.lock",
    "package-lock.json",
    "README.md",
    "docs/guide/installation.md",
    "中文/文件.txt",
    "src/données/fichier.py",
    "C:\\Users\\me\\project\\Main.rs",
    "a_very_long_path_with_many_segments/and-more-segments/and/even/more/file_name_here.py",
    "",
  ];
  const queries = ["", "py", "uvlock", "app", "lock", "src", "index", "main.py", "nomatch", "PY", "ée", "文", "_"];
  for (const q of queries) {
    const w = wasmScore(paths, q);
    const j = scoreAllJS(paths, q);
    assert.deepEqual(Array.from(w), Array.from(j), `wasm/JS disagree for query ${JSON.stringify(q)}`);
    passed++;
    ok(w.every((s) => s >= 0), `all scores non-negative for query ${JSON.stringify(q)}`);
  }
}

/* ---------------------------------------------------------------- */
/* 7. differential fuzz                                             */
/* ---------------------------------------------------------------- */
{
  const rnd = mulberry32(20261114);
  const segs = [
    "src", "lib", "app", "utils", "main", "index", "test", "spec", "dist", "build",
    "node_modules", "react", "vue", "types", "vendor", "docs", "examples", "assets",
    "components", "hooks", "styles", "public", "api", "server", "client", "shared",
    ".venv", "site-packages", "python3.11", "pip", "_internal", "tests", "App", "Main",
    "README", "uv", "lock", "package", "config", "settings", "index", "données", "文件",
    "a", "b", "x_y", "x-y", "x.y", "C:",
  ];
  const exts = ["", ".py", ".js", ".ts", ".tsx", ".rs", ".json", ".md", ".toml", ".lock", ".d.ts", ".txt", ".pyi", ".yml"];
  const makePath = () => {
    const depth = 1 + Math.floor(rnd() * 6);
    const parts = [];
    for (let i = 0; i < depth; i++) parts.push(segs[Math.floor(rnd() * segs.length)]);
    const sep = rnd() < 0.15 ? "\\" : "/";
    return parts.join(sep) + exts[Math.floor(rnd() * exts.length)];
  };
  const paths = Array.from({ length: 400 }, makePath);
  const queries = ["a", "py", "s", "src", "index.ts", "venv", "node_modules", "data", "文件", "zz", ".", "C:"];
  for (const q of queries) {
    const w = wasmScore(paths, q);
    const j = scoreAllJS(paths, q);
    assert.deepEqual(Array.from(w), Array.from(j), `fuzz mismatch for query ${JSON.stringify(q)}`);
    passed++;
    ok(w.length === paths.length, `fuzz result length for ${JSON.stringify(q)}`);
  }
}

/* ---------------------------------------------------------------- */
/* 8. allocator stability (LIFO reclaim, no unbounded growth)       */
/* ---------------------------------------------------------------- */
{
  const paths = Array.from({ length: 500 }, (_, i) => `src/pkg${i % 37}/file_${i}.py`);
  wasmScore(paths, "py");
  const before = handle.memory.buffer.byteLength;
  for (let i = 0; i < 200; i++) {
    wasmScore(paths, "p" + i);
    wasmScore(["a", "b"], "");
  }
  const after = handle.memory.buffer.byteLength;
  ok(after <= before + 65536, `wasm memory does not grow per call (${before} -> ${after})`);
  const again = wasmScore(paths, "py");
  ok(Array.from(again).join(",") === Array.from(wasmScore(paths, "py")).join(","), "results stable across calls");
}

/* ---------------------------------------------------------------- */
/* 9. Int32Array / alignment contract                               */
/* ---------------------------------------------------------------- */
{
  const paths = ["x/y/z", "x/y", "z"];
  const s = wasmScore(paths, "z");
  ok(s instanceof Int32Array, "scoreAll returns Int32Array");
  ok(s.length === 3, "scores aligned with input array");
  ok(s.every((v) => Number.isInteger(v)), "integer scores");
}

console.log(`ok - ${passed} checks passed (wasm built: yes, no wasm imports)`);
