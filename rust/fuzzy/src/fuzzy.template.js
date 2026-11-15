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
var FUZZY_WASM_B64 = "__FUZZY_WASM_B64__";

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
