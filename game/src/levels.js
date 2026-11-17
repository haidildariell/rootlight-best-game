// levels.js — the campaign: 8 hand-built soil maps + wave schedules.
// Map legend (20 cols x 11 rows, every row exactly 20 chars):
//   '.' soil   '#' rock (blocked)   'o' nutrient pocket   '~' water vein
//   'S' seed (start)   'H' Heartwell (goal)   'x' grub nest (spawn point)
// Grub kinds: mite (fast, frail), grub (steady), brute (slow, tough).
// The last level adds the Mole King boss.

export const COLS = 20;
export const ROWS = 11;

export const LEVELS = [
  {
    id: 1, name: 'First Sprout', sub: 'Learn to grow. Reach the Heartwell.',
    par: 75, spores: 1,
    waves: [
      { count: 3, kinds: ['grub'], interval: 2.2 },
      { count: 4, kinds: ['grub', 'mite'], interval: 1.9 },
    ],
    map: [
      '....#....S.....#....',
      '....................',
      '..o.............o...',
      '.....##....##.......',
      '....................',
      '.......#....#.......',
      '....................',
      '..x.............x...',
      '.....##....##.......',
      '....................',
      '....#....H....#.....',
    ],
  },
  {
    id: 2, name: 'Twin Veins', sub: 'Water veins feed sap. Guard them.',
    par: 90, spores: 1,
    waves: [
      { count: 4, kinds: ['grub', 'mite'], interval: 2.0 },
      { count: 5, kinds: ['grub', 'mite'], interval: 1.8 },
      { count: 5, kinds: ['mite', 'mite', 'grub'], interval: 1.6 },
    ],
    map: [
      '...#....S....#......',
      '........~~..........',
      '..o....~~..~~....o..',
      '.....##........##...',
      '....................',
      '..x...#..~~..#...x..',
      '....................',
      '.....##........##...',
      '..o...........o.....',
      '........~~..........',
      '....#....H....#.....',
    ],
  },
  {
    id: 3, name: 'Stone Garden', sub: 'Rock forces long roots. Plan ahead.',
    par: 105, spores: 2,
    waves: [
      { count: 5, kinds: ['grub', 'mite'], interval: 1.9 },
      { count: 6, kinds: ['grub', 'grub', 'mite'], interval: 1.7 },
      { count: 6, kinds: ['mite', 'brute'], interval: 1.8 },
    ],
    map: [
      '....##...S...##.....',
      '....................',
      '..o..#........#..o..',
      '....####..~~..####..',
      '....................',
      '..x....#......#...x.',
      '.......~~..~~.......',
      '....#..........#....',
      '..o...##....##...o..',
      '....................',
      '....#....H....#.....',
    ],
  },
  {
    id: 4, name: 'The Dry Deep', sub: 'Little food down here. Spend sap well.',
    par: 120, spores: 2,
    waves: [
      { count: 5, kinds: ['grub', 'mite'], interval: 1.8 },
      { count: 6, kinds: ['grub', 'brute'], interval: 1.7 },
      { count: 7, kinds: ['mite', 'mite', 'grub'], interval: 1.5 },
      { count: 6, kinds: ['brute', 'grub'], interval: 1.6 },
    ],
    map: [
      '.....#...S...#......',
      '....................',
      '.......~~..~~.......',
      '..o..####....####o..',
      '....................',
      '..x.....#..#.....x..',
      '.......~~..~~.......',
      '....##........##....',
      '....................',
      '..o.............o...',
      '....#....H....#.....',
    ],
  },
  {
    id: 5, name: 'Grub Warren', sub: 'Three nests. They will not stop coming.',
    par: 135, spores: 2,
    waves: [
      { count: 6, kinds: ['grub', 'mite'], interval: 1.7 },
      { count: 7, kinds: ['mite', 'grub', 'brute'], interval: 1.6 },
      { count: 8, kinds: ['mite', 'mite', 'grub'], interval: 1.4 },
      { count: 7, kinds: ['brute', 'brute', 'grub'], interval: 1.6 },
    ],
    map: [
      '....#....S....#.....',
      '....................',
      '..x..o........o..x..',
      '.....##..~~..##.....',
      '....................',
      '..x....#....#....x..',
      '.......~~..~~.......',
      '....##........##....',
      '..o.............o...',
      '..x.................',
      '....#....H....#.....',
    ],
  },
  {
    id: 6, name: 'Crystal Hollow', sub: 'Rich soil, fast jaws. Grow thorns.',
    par: 150, spores: 3,
    waves: [
      { count: 7, kinds: ['mite', 'mite', 'grub'], interval: 1.5 },
      { count: 8, kinds: ['grub', 'brute', 'mite'], interval: 1.4 },
      { count: 8, kinds: ['mite', 'mite', 'mite', 'brute'], interval: 1.3 },
      { count: 9, kinds: ['grub', 'brute'], interval: 1.4 },
      { count: 8, kinds: ['brute', 'brute', 'mite'], interval: 1.5 },
    ],
    map: [
      '...##....S....##....',
      '....................',
      '..o..~~......~~..o..',
      '....####....####....',
      '....................',
      '..x...#..~~..#...x..',
      '.......~~..~~.......',
      '..o..####....####o..',
      '....................',
      '..x.............x...',
      '....#....H....#.....',
    ],
  },
  {
    id: 7, name: 'The Long Dark', sub: 'A maze of stone. The dark is hungry.',
    par: 165, spores: 3,
    waves: [
      { count: 8, kinds: ['grub', 'mite', 'brute'], interval: 1.5 },
      { count: 9, kinds: ['mite', 'mite', 'grub'], interval: 1.3 },
      { count: 9, kinds: ['brute', 'grub', 'mite'], interval: 1.4 },
      { count: 10, kinds: ['mite', 'brute', 'brute'], interval: 1.3 },
      { count: 9, kinds: ['grub', 'grub', 'brute'], interval: 1.2 },
    ],
    map: [
      '....#....S....#.....',
      '..####..####..####..',
      '....................',
      '..o..#..~~..#..o....',
      '....####....####....',
      '..x......##......x..',
      '....#..~~..~~..#....',
      '..o..####....####o..',
      '....................',
      '..x..##......##..x..',
      '....#....H....#.....',
    ],
  },
  {
    id: 8, name: 'Heart of the Mole King', sub: 'Something huge gnaws below. End it.',
    par: 210, spores: 5, boss: true,
    waves: [
      { count: 8, kinds: ['grub', 'mite'], interval: 1.5 },
      { count: 9, kinds: ['mite', 'brute', 'grub'], interval: 1.4 },
      { count: 10, kinds: ['brute', 'grub', 'mite'], interval: 1.3 },
      { count: 6, kinds: ['brute', 'brute'], interval: 1.5 },
      { count: 1, kinds: ['moleking'], interval: 1.0 },
      { count: 8, kinds: ['mite', 'mite', 'grub'], interval: 1.2 },
    ],
    map: [
      '...###...S...###....',
      '....................',
      '..o...#......#...o..',
      '....####.~~.####....',
      '....................',
      '..x....#....#....x..',
      '......~~....~~......',
      '..o..###....###..o..',
      '....................',
      '..x.............x...',
      '....#....H....#.....',
    ],
  },
];

// Validate every map at import time: exact size, one seed, one heartwell.
for (const lv of LEVELS) {
  if (lv.map.length !== ROWS) throw new Error(`level ${lv.id}: ${lv.map.length} rows, want ${ROWS}`);
  for (const row of lv.map) {
    if (row.length !== COLS) throw new Error(`level ${lv.id}: row "${row}" is ${row.length} chars, want ${COLS}`);
  }
  const flat = lv.map.join('');
  const count = (ch) => [...flat].filter((c) => c === ch).length;
  if (count('S') !== 1 || count('H') !== 1) {
    throw new Error(`level ${lv.id}: need exactly one S and one H`);
  }
}

export const DIFFICULTIES = [
  { id: 'sprout', name: 'Sprout', desc: 'Gentle. For first roots.', hpMul: 0.8, sapBonus: 12, scoreMul: 1 },
  { id: 'deep', name: 'Deep', desc: 'The intended climb.', hpMul: 1.0, sapBonus: 0, scoreMul: 1.25 },
  { id: 'abyss', name: 'Abyss', desc: 'Hungry dark. No mercy.', hpMul: 1.35, sapBonus: -6, scoreMul: 1.6 },
];

// Root types: what the player grows. Cost in sap.
export const ROOT_TYPES = {
  tap: { id: 'tap', name: 'Taproot', key: '1', cost: 1, color: '#e8a33d', desc: 'Cheap path. Grows anywhere.' },
  feeder: { id: 'feeder', name: 'Feeder', key: '2', cost: 2, color: '#7dc95e', desc: 'Drinks nutrients: +sap over time.' },
  thorn: { id: 'thorn', name: 'Thornroot', key: '3', cost: 3, color: '#e05d5d', desc: 'Stings grubs that come close.' },
  glow: { id: 'glow', name: 'Glowbulb', key: '4', cost: 2, color: '#6fd3e7', desc: 'Light slows grubs nearby.' },
};

export const GRUB_STATS = {
  mite: { hp: 3, speed: 1.55, eat: 0.9, damage: 1, radius: 9, color: '#b06fd3', score: 10 },
  grub: { hp: 7, speed: 1.0, eat: 1.4, damage: 1, radius: 12, color: '#8a5a3b', score: 15 },
  brute: { hp: 20, speed: 0.55, eat: 2.6, damage: 2, radius: 17, color: '#5d4a8a', score: 30 },
  moleking: { hp: 150, speed: 0.4, eat: 5.0, damage: 3, radius: 30, color: '#3d2b4d', score: 500 },
};

// Meta-upgrades bought with spores between levels.
export const META_UPGRADES = [
  { id: 'sapcap', name: 'Deep Reservoir', desc: '+30 max sap', max: 3, cost: [1, 2, 3] },
  { id: 'thorn', name: 'Sharper Thorns', desc: '+1 thorn damage', max: 3, cost: [2, 3, 4] },
  { id: 'seedhp', name: 'Iron Husk', desc: '+4 seed health', max: 3, cost: [1, 2, 3] },
  { id: 'feeder', name: 'Rich Feeders', desc: 'Feeders give +50% sap', max: 2, cost: [2, 3] },
  { id: 'glow', name: 'Wide Glow', desc: '+1 glow radius', max: 2, cost: [2, 3] },
];
