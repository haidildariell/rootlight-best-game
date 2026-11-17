// enemies.js — grubs: spawn, crawl toward the seed, eat roots.
// Movement is tile-based: a grub sits on a tile, picks the neighbouring tile
// with the lowest distance-to-seed, and walks there. Eating a root takes
// time; thorns sting back; glow light slows them.
import { GRUB_STATS, COLS } from './levels.js';
import { tileAt, neighbors4 } from './grid.js';
import { clamp } from './rng.js';

let nextId = 1;

export function makeGrub(kind, tile, hpMul) {
  const s = GRUB_STATS[kind];
  return {
    id: nextId++,
    kind,
    x: tile.x, y: tile.y, // tile coords (float while walking)
    px: tile.x, py: tile.y, // precise position in tile units
    hp: s.hp * hpMul,
    maxHp: s.hp * hpMul,
    speed: s.speed,
    eat: s.eat,
    damage: s.damage,
    radius: s.radius,
    score: s.score,
    eating: null, // tile being eaten, if any
    eatProgress: 0,
    flash: 0, // hit flash timer
    slow: 0, // glow slow timer
    wobble: (nextId * 2.39996) % 6.283, // deterministic visual phase
  };
}

// Pick the next tile: the neighbour (or current tile) with the smallest
// distance to the seed. Roots are preferred food: if standing on a root,
// eat it instead of moving.
export function grubNextTile(grid, dist, grub) {
  const cur = tileAt(grid, Math.round(grub.px), Math.round(grub.py));
  if (!cur) return null;
  let best = cur;
  let bestD = dist[cur.y * COLS + cur.x];
  if (bestD === -1) bestD = 999;
  for (const n of neighbors4(grid, cur)) {
    const d = dist[n.y * COLS + n.x];
    if (d === -1) continue;
    // Prefer tiles with roots: food first, path second.
    const bonus = n.root ? -0.6 : 0;
    if (d + bonus < bestD) { bestD = d + bonus; best = n; }
  }
  return best;
}

// One fixed step (dt seconds) for a single grub. Returns events:
// { ate: tile } when a root tile is fully eaten, { reachedSeed: true }
// when it bites the seed.
export function stepGrub(grid, dist, grub, dt, ctx) {
  const events = [];
  if (grub.flash > 0) grub.flash -= dt;
  if (grub.slow > 0) grub.slow -= dt;

  const cur = tileAt(grid, Math.round(grub.px), Math.round(grub.py));
  if (!cur) return events;

  // Standing on a root? Eat it.
  if (cur.root) {
    if (grub.eating !== cur) { grub.eating = cur; grub.eatProgress = 0; }
    const rate = grub.eat * (grub.kind === 'moleking' ? 2 : 1);
    grub.eatProgress += rate * dt;
    if (grub.eatProgress >= cur.root.hp) {
      events.push({ ate: cur });
      cur.root = null;
      grub.eating = null;
      grub.eatProgress = 0;
    }
    return events;
  }
  grub.eating = null;

  // Biting the seed itself.
  if (cur.kind === 'S') {
    grub.eatProgress += grub.eat * dt;
    if (grub.eatProgress >= 4) {
      grub.eatProgress = 0;
      events.push({ reachedSeed: true, damage: grub.damage });
    }
    return events;
  }

  // Walk toward the next tile.
  const next = grubNextTile(grid, dist, grub);
  if (!next || next === cur) return events;
  const speed = grub.speed * (grub.slow > 0 ? 0.45 : 1) * ctx.speedMul;
  const dx = next.x - grub.px;
  const dy = next.y - grub.py;
  const len = Math.hypot(dx, dy) || 1;
  const step = speed * dt;
  if (step >= len) {
    grub.px = next.x; grub.py = next.y;
  } else {
    grub.px += (dx / len) * step;
    grub.py += (dy / len) * step;
  }
  return events;
}

// Thorns sting grubs standing next to a thorn root; glow light slows grubs
// within radius. Returns damage events for floating numbers / particles.
export function rootDefenses(grid, grubs, dt, meta) {
  const hits = [];
  const thornDmg = 2 + (meta.thorn || 0);
  const glowR = 1.6 + (meta.glow || 0);
  for (const t of grid.tiles) {
    if (!t.root) continue;
    const cx = t.x, cy = t.y;
    for (const g of grubs) {
      const d = Math.hypot(g.px - cx, g.py - cy);
      if (t.root.type === 'thorn' && d < 1.35) {
        g.hp -= thornDmg * dt;
        g.flash = 0.12;
        hits.push({ grub: g, dmg: thornDmg * dt, kind: 'thorn' });
      }
      if (t.root.type === 'glow' && d < glowR) {
        g.slow = 0.5;
      }
    }
  }
  return hits;
}

export function clampGrubHp(g) {
  g.hp = clamp(g.hp, 0, g.maxHp);
}

// Wave spawner: holds the queue of grubs to release for the current wave.
export function makeSpawner(levelDef, nests, rng, hpMul) {
  return {
    waveIndex: 0,
    queue: [],
    timer: 1.2, // first grub after a short breath
    betweenWaves: 0,
    hpMul,
    nests,
    rng,
    levelDef,
    startWave() {
      const w = this.levelDef.waves[this.waveIndex];
      if (!w) return false;
      this.queue = [];
      for (let i = 0; i < w.count; i++) {
        this.queue.push(w.kinds[i % w.kinds.length]);
      }
      this.timer = 0.8;
      this.interval = w.interval;
      return true;
    },
  };
}

// Step the spawner; returns freshly spawned grubs (already placed on nests).
export function stepSpawner(sp, dt, ctx) {
  const out = [];
  if (sp.queue.length === 0) return out;
  sp.timer -= dt;
  if (sp.timer <= 0) {
    sp.timer = sp.interval;
    const kind = sp.queue.shift();
    const nest = sp.nests[Math.floor(sp.rng() * sp.nests.length)] || sp.nests[0];
    out.push(makeGrub(kind, nest, sp.hpMul));
    ctx.onSpawn(kind);
  }
  return out;
}
