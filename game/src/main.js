// main.js — ROOTLIGHT: grow a living root network through the deep soil,
// reach the Heartwell, and keep the grubs from eating your seed.
// State machine: title | levels | howto | settings | playing | paused |
// shop | victory | defeat. Fixed 1/60 s simulation step; all randomness
// flows through the state's seeded rng, so a level replays from its seed.
import { LEVELS, DIFFICULTIES, ROOT_TYPES, GRUB_STATS, META_UPGRADES, COLS, ROWS } from './levels.js';
import { buildGrid, tileAt, canGrowOn, growRoot, distancesToSeed, heartConnected, sapPerSecond, rootCount } from './grid.js';
import { makeGrub, stepGrub, rootDefenses, makeSpawner, stepSpawner } from './enemies.js';
import { mulberry32, hashString, clamp } from './rng.js';
import { makeAudio } from './audio.js';
import { render, tileFromPoint, GRID } from './render.js';

export const SAVE_KEY = 'rootlight-save-v1';

export function defaultSave() {
  return {
    stars: {}, unlocked: 1, spores: 0,
    meta: { sapcap: 0, thorn: 0, seedhp: 0, feeder: 0, glow: 0 },
    difficulty: 'deep',
    settings: { volume: 0.7, muted: false, shake: true, quality: 'high' },
    bestScore: 0,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const s = JSON.parse(raw);
    return { ...defaultSave(), ...s, settings: { ...defaultSave().settings, ...(s.settings || {}) } };
  } catch { return defaultSave(); }
}

export function storeSave(save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* private mode */ }
}

// --- game state ---------------------------------------------------------
export function newState() {
  const save = loadSave();
  return {
    save,
    phase: 'title',
    prevPhase: 'title',
    levelIndex: 0,
    levelDef: null,
    grid: null,
    dist: null,
    rng: mulberry32(1),
    sap: 0, sapCap: 60,
    seedHp: 10, seedMax: 10,
    score: 0, time: 0,
    tool: 'tap',
    grubs: [],
    spawner: null,
    wave: 0, waveState: 'build', // build | fighting | done
    waveClearTimer: 0,
    bloom: 0, bloomNeed: 4,
    particles: [], floaters: [],
    shake: 0, shakeT: 0,
    banner: null,
    hover: null, // {x, y} tile
    mouse: { x: 0, y: 0, down: false },
    uiButtons: [], // rebuilt each render: {x,y,w,h,action,label}
    audio: makeAudio(),
    victoryStats: null, defeatReason: '',
    shopReturn: 'levels',
    animT: 0, // menu animation clock (seconds)
    kills: 0, rootsGrown: 0, wavesCleared: 0,
    shotMode: false,
    debug: {},
  };
}

export function difficultyOf(state) {
  return DIFFICULTIES.find((d) => d.id === state.save.difficulty) || DIFFICULTIES[1];
}

export function startLevel(state, index, seedOverride) {
  const def = LEVELS[index];
  const diff = difficultyOf(state);
  const seed = seedOverride ?? hashString(`rootlight-${def.id}-${state.save.difficulty}`);
  state.levelDef = def;
  state.levelIndex = index;
  state.grid = buildGrid(def);
  state.dist = distancesToSeed(state.grid);
  state.rng = mulberry32(seed);
  state.sapCap = 60 + 30 * (state.save.meta.sapcap || 0);
  state.sap = 24 + diff.sapBonus;
  state.seedMax = 10 + 4 * (state.save.meta.seedhp || 0);
  state.seedHp = state.seedMax;
  state.score = 0;
  state.time = 0;
  state.tool = 'tap';
  state.grubs = [];
  state.spawner = makeSpawner(def, state.grid.nests, state.rng, diff.hpMul);
  state.wave = 0;
  state.waveState = 'build';
  state.waveClearTimer = 0;
  state.bloom = 0;
  state.particles = [];
  state.floaters = [];
  state.kills = 0; state.rootsGrown = 0; state.wavesCleared = 0;
  state.phase = 'playing';
  state.banner = { text: `${def.name} — ${def.sub}`, t: 3.2 };
  state.audio.unlock();
}

export function startWave(state) {
  if (state.waveState !== 'build') return;
  if (state.wave >= state.levelDef.waves.length) return;
  state.spawner.waveIndex = state.wave;
  if (!state.spawner.startWave()) return;
  state.waveState = 'fighting';
  state.banner = { text: `Wave ${state.wave + 1} — they come!`, t: 2.2 };
  state.audio.waveHorn();
}

function waveCleared(state) {
  state.wavesCleared++;
  state.wave++;
  const bonus = 8 + state.wave * 2;
  state.sap = Math.min(state.sapCap, state.sap + bonus);
  state.score += 100 * state.wave;
  state.banner = { text: `Wave cleared! +${bonus} sap`, t: 2.4 };
  state.audio.heart();
  if (state.wave >= state.levelDef.waves.length) {
    state.waveState = 'done';
    state.banner = { text: 'No more waves — reach the Heartwell!', t: 3.0 };
  } else {
    state.waveState = 'build';
  }
}

function levelVictory(state) {
  const def = state.levelDef;
  const timeBonus = Math.max(0, Math.round((def.par - state.time) * 2));
  const hpBonus = state.seedHp * 20;
  const diffMul = difficultyOf(state).scoreMul;
  const total = Math.round((state.score + timeBonus + hpBonus) * diffMul);
  const stars = state.seedHp >= state.seedMax * 0.8 && state.time <= def.par ? 3
    : state.seedHp >= state.seedMax * 0.5 ? 2 : 1;
  const save = state.save;
  const prevStars = save.stars[def.id] || 0;
  const newSpores = stars > prevStars ? (stars - prevStars) * def.spores : 0;
  save.stars[def.id] = Math.max(prevStars, stars);
  save.spores += newSpores;
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, def.id + 1));
  save.bestScore = Math.max(save.bestScore, total);
  storeSave(save);
  state.victoryStats = {
    score: total, timeBonus, hpBonus, stars, newSpores,
    kills: state.kills, roots: state.rootsGrown, time: state.time,
    levelName: def.name, isLast: def.id === LEVELS.length,
  };
  state.phase = 'victory';
  state.audio.heart();
}

function levelDefeat(state, reason) {
  state.defeatReason = reason;
  state.phase = 'defeat';
  state.audio.lose();
}

function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color: color || '#fff', t: 1.1 });
}

function burst(state, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = state.rng() * Math.PI * 2;
    const s = (speed || 60) * (0.4 + state.rng() * 0.8);
    state.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20,
      t: 0.5 + state.rng() * 0.5, max: 1, color, size: 2 + state.rng() * 3,
    });
  }
}

// --- player actions -----------------------------------------------------
export function tryGrow(state, tile) {
  if (state.phase !== 'playing') return false;
  if (!tile || !canGrowOn(state.grid, tile)) {
    if (tile && state.phase === 'playing') state.audio.denied();
    return false;
  }
  const type = state.tool;
  const cost = ROOT_TYPES[type].cost;
  if (state.sap < cost) { state.audio.denied(); return false; }
  state.sap -= cost;
  growRoot(state.grid, tile, type);
  state.rootsGrown++;
  state.score += 2;
  const px = GRID.ox + (tile.x + 0.5) * GRID.tile;
  const py = GRID.oy + (tile.y + 0.5) * GRID.tile;
  burst(state, px, py, ROOT_TYPES[type].color, 6, 50);
  state.audio.grow();
  return true;
}

export function clickTool(state, toolId) {
  if (ROOT_TYPES[toolId]) {
    state.tool = toolId;
    state.audio.click();
  }
}

// --- fixed-step simulation ----------------------------------------------
const DT = 1 / 60;

export function stepGame(state, dt) {
  state.animT += dt;
  if (state.banner) {
    state.banner.t -= dt;
    if (state.banner.t <= 0) state.banner = null;
  }
  if (state.shakeT > 0) state.shakeT -= dt;
  for (const p of state.particles) {
    p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
  }
  state.particles = state.particles.filter((p) => p.t > 0);
  for (const f of state.floaters) { f.t -= dt; f.y -= 24 * dt; }
  state.floaters = state.floaters.filter((f) => f.t > 0);
  state.audio.stepMusic(dt);

  if (state.phase !== 'playing') return;
  state.time += dt;

  // Sap income.
  state.sap = Math.min(state.sapCap, state.sap + sapPerSecond(state.grid, state.save.meta) * dt);

  // Spawner.
  if (state.waveState === 'fighting') {
    const born = stepSpawner(state.spawner, dt, {
      onSpawn: () => {},
    });
    for (const g of born) state.grubs.push(g);
    if (state.spawner.queue.length === 0 && state.grubs.length === 0) {
      waveCleared(state);
    }
  }

  // Root defenses (thorns sting, glow slows).
  rootDefenses(state.grid, state.grubs, dt, state.save.meta);

  // Grubs move / eat.
  const ctx = { speedMul: 1 };
  const dead = [];
  for (const g of state.grubs) {
    const events = stepGrub(state.grid, state.dist, g, dt, ctx);
    for (const ev of events) {
      if (ev.ate) {
        state.audio.chomp();
        const px = GRID.ox + (ev.ate.x + 0.5) * GRID.tile;
        const py = GRID.oy + (ev.ate.y + 0.5) * GRID.tile;
        burst(state, px, py, '#8a5a3b', 8, 70);
        addFloater(state, px, py - 10, 'eaten!', '#e05d5d');
        state.dist = distancesToSeed(state.grid);
      }
      if (ev.reachedSeed) {
        state.seedHp -= ev.damage;
        state.shake = 6; state.shakeT = 0.3;
        state.audio.chomp();
        addFloater(state, GRID.ox + (state.grid.seed.x + 0.5) * GRID.tile,
          GRID.oy + (state.grid.seed.y - 0.5) * GRID.tile, `-${ev.damage} seed`, '#ff6b6b');
        if (state.seedHp <= 0) {
          state.seedHp = 0;
          levelDefeat(state, 'The grubs ate your seed.');
          return;
        }
      }
    }
    if (g.hp <= 0) dead.push(g);
  }
  for (const g of dead) {
    state.grubs = state.grubs.filter((x) => x !== g);
    state.kills++;
    state.score += Math.round(g.score * difficultyOf(state).scoreMul);
    const px = GRID.ox + (g.px + 0.5) * GRID.tile;
    const py = GRID.oy + (g.py + 0.5) * GRID.tile;
    burst(state, px, py, GRUB_STATS[g.kind].color, 10, 90);
    addFloater(state, px, py - 12, `+${g.score}`, '#ffd76a');
    state.audio.grubDie();
    if (g.kind === 'moleking') {
      state.banner = { text: 'The Mole King is dead!', t: 3 };
      state.score += 250;
    }
  }

  // Heartwell bloom: connected roots charge the win.
  if (heartConnected(state.grid)) {
    state.bloom += dt;
    if (state.bloom >= state.bloomNeed) {
      levelVictory(state);
      return;
    }
  } else {
    state.bloom = 0;
  }
}

// --- input ---------------------------------------------------------------
export function handleClick(state, x, y) {
  state.audio.unlock();
  // UI buttons first (menus, HUD, toolbar).
  for (const b of state.uiButtons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      doAction(state, b.action, b);
      return;
    }
  }
  if (state.phase === 'playing') {
    const pt = tileFromPoint(x, y);
    // tileFromPoint returns grid coords; tryGrow needs the grid tile object.
    const tile = pt ? tileAt(state.grid, pt.x, pt.y) : null;
    if (tile) tryGrow(state, tile);
  }
}

export function handleKey(state, key) {
  state.audio.unlock();
  const k = key.toLowerCase();
  if (k === 'm') {
    state.save.settings.muted = !state.save.settings.muted;
    state.audio.setMuted(state.save.settings.muted);
    storeSave(state.save);
    return;
  }
  if (state.phase === 'playing') {
    if (k === '1' || k === '2' || k === '3' || k === '4') {
      clickTool(state, ['tap', 'feeder', 'thorn', 'glow'][Number(k) - 1]);
    } else if (k === ' ' || k === 'enter') {
      if (state.waveState === 'build') startWave(state);
    } else if (k === 'p' || k === 'escape') {
      state.prevPhase = 'playing';
      state.phase = 'paused';
    } else if (k === 'r') {
      startLevel(state, state.levelIndex);
    }
  } else if (state.phase === 'paused') {
    if (k === 'p' || k === 'escape' || k === ' ') state.phase = 'playing';
    else if (k === 'r') startLevel(state, state.levelIndex);
  } else if (state.phase === 'title') {
    if (k === 'enter') state.phase = 'levels';
  } else if (state.phase === 'victory' || state.phase === 'defeat') {
    if (k === 'enter' || k === 'r') startLevel(state, state.levelIndex);
  }
}

export function doAction(state, action, btn) {
  state.audio.click();
  switch (action) {
    case 'play': state.phase = 'levels'; break;
    case 'levels': state.phase = 'levels'; break;
    case 'howto': state.prevPhase = state.phase; state.phase = 'howto'; break;
    case 'settings': state.prevPhase = state.phase; state.phase = 'settings'; break;
    case 'back': state.phase = state.prevPhase === 'playing' ? 'paused' : (state.prevPhase || 'title'); break;
    case 'back-title': state.phase = 'title'; break;
    case 'resume': state.phase = 'playing'; break;
    case 'restart-level': startLevel(state, state.levelIndex); break;
    case 'quit-title': state.phase = 'title'; break;
    case 'next-level':
      if (state.levelIndex + 1 < LEVELS.length) startLevel(state, state.levelIndex + 1);
      else state.phase = 'levels';
      break;
    case 'retry': startLevel(state, state.levelIndex); break;
    case 'shop': state.shopReturn = state.phase === 'victory' ? 'victory' : 'levels'; state.phase = 'shop'; break;
    case 'shop-back': state.phase = state.shopReturn === 'victory' ? 'victory' : 'levels'; break;
    case 'start-wave': startWave(state); break;
    case 'pause': state.prevPhase = 'playing'; state.phase = 'paused'; break;
    case 'mute': {
      state.save.settings.muted = !state.save.settings.muted;
      state.audio.setMuted(state.save.settings.muted);
      storeSave(state.save);
      break;
    }
    default:
      if (action.startsWith('level:')) {
        const idx = Number(action.slice(6));
        if (idx < state.save.unlocked) startLevel(state, idx);
      } else if (action.startsWith('tool:')) {
        clickTool(state, action.slice(5));
      } else if (action.startsWith('diff:')) {
        state.save.difficulty = action.slice(5);
        storeSave(state.save);
      } else if (action.startsWith('buy:')) {
        buyMeta(state, action.slice(4));
      } else if (action.startsWith('vol:')) {
        state.save.settings.volume = Number(action.slice(4));
        state.audio.setVolume(state.save.settings.volume);
        storeSave(state.save);
      } else if (action === 'toggle-shake') {
        state.save.settings.shake = !state.save.settings.shake;
        storeSave(state.save);
      }
      break;
  }
}

function buyMeta(state, id) {
  const up = META_UPGRADES.find((u) => u.id === id);
  if (!up) return;
  const lvl = state.save.meta[id] || 0;
  if (lvl >= up.max) return;
  const cost = up.cost[lvl];
  if (state.save.spores < cost) { state.audio.denied(); return; }
  state.save.spores -= cost;
  state.save.meta[id] = lvl + 1;
  storeSave(state.save);
  state.audio.heart();
}

// --- debug handle for play-testing --------------------------------------
export function debugSnapshot(state) {
  return {
    phase: state.phase,
    level: state.levelDef ? state.levelDef.id : null,
    wave: state.wave + 1,
    waveState: state.waveState,
    sap: Math.round(state.sap),
    seedHp: state.seedHp,
    score: state.score,
    grubs: state.grubs.length,
    roots: state.grid ? rootCount(state.grid) : 0,
    bloom: Math.round(state.bloom * 10) / 10,
    kills: state.kills,
    time: Math.round(state.time),
  };
}

// --- boot ----------------------------------------------------------------
export function boot(canvas) {
  const state = newState();
  const ctx = canvas.getContext('2d');
  state.audio.setVolume(state.save.settings.volume);
  state.audio.setMuted(state.save.settings.muted);

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    state.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    state.hover = state.phase === 'playing' ? tileFromPoint(state.mouse.x, state.mouse.y) : null;
  });
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    handleClick(state, x, y);
  });
  window.addEventListener('keydown', (e) => {
    if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    handleKey(state, e.key);
  });

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    let n = 0;
    // A render/step fault must never freeze the game: the loop keeps going
    // and the error surfaces in the console for debugging.
    try {
      while (acc >= DT && n < 5) { stepGame(state, DT); acc -= DT; n++; }
      if (n === 5) acc = 0;
      if (!state.shotMode) render(ctx, state);
    } catch (err) {
      console.error('ROOTLIGHT frame fault:', err);
      acc = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__rootlight = {
    get state() { return debugSnapshot(state); },
    _state: state,
    startLevel: (i) => startLevel(state, i),
    startWave: () => startWave(state),
    grow: (x, y, tool) => {
      if (tool) state.tool = tool;
      return tryGrow(state, tileAt(state.grid, x, y));
    },
  };
  return state;
}
