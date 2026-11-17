// rng.js — deterministic seeded random (mulberry32) + small helpers.
// Every random choice in the game flows through one of these, so a level or a
// screenshot scene replays exactly from its seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Pick an element with the seeded rng.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Integer in [min, max).
export function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min));
}

// Clamp helper used across the game.
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Smooth ease for menu / banner animation (pure function of t).
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}
