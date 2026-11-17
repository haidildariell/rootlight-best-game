// grid.js — the soil grid: tiles, root growth, pathfinding, income.
// Tiles are plain objects so the renderer and the enemy AI read one source.
// A tile is soil ('.'), rock ('#'), nutrient ('o'), water ('~'),
// seed ('S'), heartwell ('H') or nest ('x'). Roots live ON tiles:
// root = null | { type: 'tap'|'feeder'|'thorn'|'glow', hp }.
import { COLS, ROWS, ROOT_TYPES } from './levels.js';

export const TILE = { SOIL: '.', ROCK: '#', NUTRIENT: 'o', WATER: '~', SEED: 'S', HEART: 'H', NEST: 'x' };

export function buildGrid(levelDef) {
  const tiles = [];
  let seed = null;
  let heart = null;
  const nests = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = levelDef.map[y][x];
      const tile = { x, y, kind: ch, root: null, grubHere: 0, eaten: 0 };
      tiles.push(tile);
      if (ch === 'S') seed = tile;
      if (ch === 'H') heart = tile;
      if (ch === 'x') nests.push(tile);
    }
  }
  return { tiles, seed, heart, nests };
}

export function tileAt(grid, x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
  return grid.tiles[y * COLS + x];
}

export function isDiggable(tile) {
  return tile && (tile.kind === '.' || tile.kind === 'o' || tile.kind === '~' || tile.kind === 'x');
}

export function neighbors4(grid, tile) {
  const out = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const t = tileAt(grid, tile.x + dx, tile.y + dy);
    if (t) out.push(t);
  }
  return out;
}

// A tile can take a root if it is diggable, has no root yet, and touches the
// living network (a root tile, the seed, or the heartwell's edge).
export function canGrowOn(grid, tile) {
  if (!isDiggable(tile) || tile.root) return false;
  return neighbors4(grid, tile).some(
    (n) => n.root || n.kind === 'S' || n.kind === 'H',
  );
}

export function growRoot(grid, tile, type) {
  tile.root = { type, hp: 10, born: 0 };
  return tile.root;
}

// Breadth-first distance (in tiles) from every tile to the seed, walking
// only through diggable tiles. Grubs follow falling distance numbers.
export function distancesToSeed(grid) {
  const dist = new Array(COLS * ROWS).fill(-1);
  const queue = [grid.seed];
  dist[grid.seed.y * COLS + grid.seed.x] = 0;
  while (queue.length) {
    const t = queue.shift();
    const d = dist[t.y * COLS + t.x];
    for (const n of neighbors4(grid, t)) {
      if (dist[n.y * COLS + n.x] !== -1) continue;
      if (n.kind === '#') continue;
      dist[n.y * COLS + n.x] = d + 1;
      queue.push(n);
    }
  }
  return dist;
}

// Is the Heartwell connected to the seed through roots? Win check.
export function heartConnected(grid) {
  return neighbors4(grid, grid.heart).some((n) => n.root || n.kind === 'S');
}

// Sap income per second from the network: feeders on nutrients, water tiles
// with any root, and a slow trickle from the seed itself.
export function sapPerSecond(grid, meta) {
  let income = 0.6; // the seed always weeps a little sap
  const feederMul = 1 + 0.5 * (meta.feeder || 0);
  for (const t of grid.tiles) {
    if (!t.root) continue;
    if (t.root.type === 'feeder' && t.kind === 'o') income += 1.2 * feederMul;
    if (t.kind === '~') income += 0.5;
  }
  return income;
}

export function rootCount(grid) {
  let n = 0;
  for (const t of grid.tiles) if (t.root) n++;
  return n;
}

export function rootCost(type, meta) {
  void meta;
  return ROOT_TYPES[type].cost;
}
