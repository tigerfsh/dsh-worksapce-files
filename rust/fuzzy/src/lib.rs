//! fuzzy — a tiny, dependency-free fuzzy path matcher compiled to WebAssembly.
//!
//! Target: `wasm32-unknown-unknown`, `cdylib`, `no_std`, `panic = abort`.
//! No imports, no external crates, no per-path allocation. The only memory the
//! module touches is its own linear memory plus the buffers the host allocates
//! through [`alloc`].
//!
//! # ABI
//!
//! All strings are UTF-8 byte buffers ("blobs"). `paths` is a newline (`\n`)
//! separated list of path strings. `out` is an array of `i32` scores.
//!
//! ```text
//! alloc(len: usize) -> *mut u8
//! dealloc(ptr: *mut u8, len: usize)
//! score_all(paths_ptr: *const u8, paths_len: usize,
//!           query_ptr: *const u8, query_len: usize,
//!           out_ptr: *mut i32, out_cap: usize) -> usize
//! ```
//!
//! `score_all` writes one non-negative score per path into `out_ptr` in path
//! order (0 = no match, 1 for every path when the query is empty) and returns
//! `min(path_count, out_cap)`. The blob is split on `\n` exactly like
//! `String.prototype.split("\n")`, so the JS wrapper's `array.join("\n")` round
//! trips precisely; an empty blob is one empty path.
//!
//! The allocator is a bump allocator over the module's own linear memory. It
//! grows memory on demand and reclaims the *most recent* block when `dealloc`
//! is called (stack discipline); freeing out of order is a no-op and simply
//! parks the block until the next `memory.grow`. That is enough because the JS
//! wrapper allocates `paths`, `query`, `out` and frees them in reverse order.

#![no_std]
#![allow(clippy::missing_safety_doc)]

use core::panic::PanicInfo;

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    // `unreachable` traps the instance; there is no unwinding in the wasm ABI.
    core::arch::wasm32::unreachable()
}

#[cfg(not(target_arch = "wasm32"))]
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

// ---------------------------------------------------------------------------
// Allocator
// ---------------------------------------------------------------------------

const PAGE: usize = 65536;

static mut HEAP_TOP: usize = 0;
static mut HEAP_END: usize = 0;

#[inline]
fn align16(len: usize) -> usize {
    len.wrapping_add(15) & !15usize
}

/// Allocate `len` bytes (16-byte aligned). Returns null on failure.
#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    unsafe {
        let want = align16(len);
        if want < len {
            return core::ptr::null_mut(); // size overflow
        }
        if HEAP_TOP == 0 {
            let end = core::arch::wasm32::memory_size(0) * PAGE;
            HEAP_TOP = end;
            HEAP_END = end;
        }
        let top = HEAP_TOP;
        if want > 0 && top + want > HEAP_END {
            let need = top + want - HEAP_END;
            let pages = (need + PAGE - 1) / PAGE;
            if core::arch::wasm32::memory_grow(0, pages) == usize::MAX {
                return core::ptr::null_mut();
            }
            HEAP_END = top + want;
        }
        HEAP_TOP = top + want;
        top as *mut u8
    }
}

/// Free the most recently allocated block. Any other block is ignored.
#[no_mangle]
pub extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    unsafe {
        if ptr.is_null() {
            return;
        }
        let want = align16(len);
        if want == 0 {
            return;
        }
        if HEAP_TOP != 0 && ptr as usize + want == HEAP_TOP {
            HEAP_TOP = ptr as usize;
        }
    }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const BASE: i32 = 100; // per matched query byte
const EXACT_CASE: i32 = 20; // path byte equals the (lowercased) query byte
const SEG_START: i32 = 40; // index 0 or right after `/` or `\`
const AFTER_BOUNDARY: i32 = 30; // right after `_ - . / \ :`
const BASENAME: i32 = 60; // match inside the basename

#[inline]
fn ascii_lower(c: u8) -> u8 {
    if c.is_ascii_uppercase() {
        c | 0x20
    } else {
        c
    }
}

#[inline]
fn is_sep(c: u8) -> bool {
    c == b'/' || c == b'\\'
}

#[inline]
fn is_boundary(c: u8) -> bool {
    matches!(c, b'/' | b'\\' | b'_' | b'-' | b'.' | b':')
}

#[inline]
fn gap_penalty(g: usize) -> i32 {
    (g.min(8) * 2) as i32
}

#[inline]
fn lead_penalty(g: usize) -> i32 {
    (g.min(16) / 2) as i32
}

#[inline]
fn tail_penalty(g: usize) -> i32 {
    (g.min(8) / 2) as i32
}

#[inline]
fn char_score(p: &[u8], i: usize, q: &[u8], j: usize, base_start: usize, has_sep: bool) -> i32 {
    let mut s = BASE;
    if p[i] == q[j] {
        s += EXACT_CASE;
    }
    let prev = if i == 0 { 0 } else { p[i - 1] };
    if i == 0 || is_sep(prev) {
        s += SEG_START;
    } else if is_boundary(prev) {
        s += AFTER_BOUNDARY;
    }
    if !has_sep || i >= base_start {
        s += BASENAME;
    }
    s
}

/// Score one path against a non-empty query. Returns 0 when there is no
/// subsequence match, otherwise a positive score.
fn score_path(p: &[u8], q: &[u8]) -> i32 {
    let qlen = q.len();
    if qlen == 0 {
        return 1; // empty query matches everything with the lowest score
    }
    let plen = p.len();
    if qlen > plen {
        return 0;
    }

    let mut last_sep: isize = -1;
    let mut k = plen;
    while k > 0 {
        k -= 1;
        if is_sep(p[k]) {
            last_sep = k as isize;
            break;
        }
    }
    let has_sep = last_sep >= 0;
    let base_start = if has_sep { last_sep as usize + 1 } else { 0 };

    // Forward pass: leftmost greedy match. This decides *whether* it matches.
    let mut qi = 0usize;
    let mut last: isize = -1;
    let mut first = 0usize;
    let mut acc: i32 = 0;
    let mut matched = false;
    let mut i = 0usize;
    while i < plen {
        if qi < qlen && ascii_lower(p[i]) == ascii_lower(q[qi]) {
            acc += char_score(p, i, q, qi, base_start, has_sep);
            if last >= 0 {
                acc -= gap_penalty(i - last as usize - 1);
            } else {
                first = i;
            }
            last = i as isize;
            qi += 1;
            if qi == qlen {
                matched = true;
                break;
            }
        }
        i += 1;
    }
    if !matched {
        return 0;
    }
    let mut best = acc - lead_penalty(first) - tail_penalty(plen - 1 - last as usize);

    // Backward pass: rightmost greedy match, which tightens the window around
    // the basename and usually scores higher. Keep the better of the two.
    let mut qi = qlen;
    let mut next: isize = -1;
    let mut acc2: i32 = 0;
    let mut i2 = plen;
    while i2 > 0 {
        i2 -= 1;
        if qi > 0 && ascii_lower(p[i2]) == ascii_lower(q[qi - 1]) {
            acc2 += char_score(p, i2, q, qi - 1, base_start, has_sep);
            if next >= 0 {
                acc2 -= gap_penalty(next as usize - i2 - 1);
            } else {
                acc2 -= tail_penalty(plen - 1 - i2);
            }
            next = i2 as isize;
            qi -= 1;
            if qi == 0 {
                let s = acc2 - lead_penalty(i2);
                if s > best {
                    best = s;
                }
                break;
            }
        }
    }

    // Mild preference for shorter paths on ties.
    best -= (plen / 8) as i32;
    if best < 1 {
        best = 1;
    }
    best
}

// ---------------------------------------------------------------------------
// Exported entry point
// ---------------------------------------------------------------------------

/// Score every newline-separated path in `paths` against `query`.
///
/// # Safety
/// All pointers must be valid for the given lengths inside this module's
/// linear memory, `out_cap` must not exceed the `i32` capacity at `out_ptr`,
/// and `paths_len` must be a multiple of the path buffer's byte length.
#[no_mangle]
pub unsafe extern "C" fn score_all(
    paths_ptr: *const u8,
    paths_len: usize,
    query_ptr: *const u8,
    query_len: usize,
    out_ptr: *mut i32,
    out_cap: usize,
) -> usize {
    if out_ptr.is_null() || out_cap == 0 {
        return 0;
    }
    let empty: [u8; 0] = [];
    let paths: &[u8] = if paths_ptr.is_null() || paths_len == 0 {
        &empty
    } else {
        core::slice::from_raw_parts(paths_ptr, paths_len)
    };
    let query: &[u8] = if query_ptr.is_null() || query_len == 0 {
        &empty
    } else {
        core::slice::from_raw_parts(query_ptr, query_len)
    };

    let mut written = 0usize;
    let mut start = 0usize;
    loop {
        if written >= out_cap {
            break;
        }
        let mut end = start;
        while end < paths.len() && paths[end] != b'\n' {
            end += 1;
        }
        let score = score_path(&paths[start..end], query);
        *out_ptr.add(written) = score;
        written += 1;
        if end >= paths.len() {
            break;
        }
        start = end + 1;
    }
    written
}
