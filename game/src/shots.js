// shots.js — deterministic screenshot scenes for ?shot=<scene>&seed=<n>.
// Each scene builds a fixed state from a seeded rng, steps the simulation a
// fixed number of 1/60 s ticks, renders once and sets window.__shotReady.
// No wall clock, no Math.random in the shot path: the same seed gives the
// same pixels every time.
// Scenes: start (title) · play (level 3 mid-fight) · boss (level 8, Mole
// King) · victory (win screen with stars).
import { startLevel, startWave, stepGame, debugSnapshot } from './main.js';
import { tileAt, canGrowOn } from './grid.js';
import { render } from './render.js';
import { mulberry32 } from './rng.js';

const DT = 1 / 60;

function stepN(state, n) {
  for (let i = 0; i < n; i++) stepGame(state, DT);
}

// Grow a scripted root path: a list of [x, y, tool] steps applied in order.
// Skips steps that are not growable (keeps the scene robust if a map shifts).
function scriptGrow(state, steps) {
  for (const [x, y, tool] of steps) {
    state.tool = tool;
    const tile = tileAt(state.grid, x, y);
    if (tile && canGrowOn(state.grid, tile)) {
      state.sap = Math.max(state.sap, 50); // the script never runs dry
      // Grow directly (bypasses the sap check's audio side effects).
      state.sap -= { tap: 1, feeder: 2, thorn: 3, glow: 2 }[tool];
      tile.root = { type: tool, hp: 10, born: 0 };
      state.rootsGrown++;
    }
  }
}

function sceneStart(ctx, state) {
  state.phase = 'title';
  state.animT = 4.2; // fixed menu clock so the glow sits the same way
  render(ctx, state);
}

function scenePlay(ctx, state, seed) {
  startLevel(state, 2, seed); // level 3: Stone Garden
  // A worked root network: down the middle, feeders on gold, thorns guarding.
  // Chains grow outward from the seed — each step must touch the network.
  // The path stops one tile short of the Heartwell so the bloom never starts.
  scriptGrow(state, [
    [9, 1, 'tap'], [9, 2, 'tap'], [9, 3, 'tap'], [9, 4, 'tap'],
    [8, 4, 'tap'], [8, 5, 'tap'], [8, 6, 'tap'], [8, 7, 'tap'],
    [8, 8, 'tap'], [9, 8, 'tap'],
    [8, 2, 'tap'], [7, 2, 'tap'], [6, 2, 'tap'], [5, 2, 'tap'],
    [4, 2, 'tap'], [3, 2, 'tap'], [2, 2, 'feeder'],
    [10, 2, 'tap'], [11, 2, 'tap'], [12, 2, 'tap'], [13, 2, 'tap'],
    [10, 4, 'tap'], [11, 4, 'tap'], [12, 4, 'tap'], [13, 4, 'tap'],
    [14, 4, 'tap'], [15, 4, 'tap'], [16, 4, 'tap'], [17, 4, 'tap'],
    [17, 3, 'tap'], [17, 2, 'feeder'],
    [9, 5, 'thorn'], [7, 5, 'thorn'], [9, 6, 'glow'], [9, 7, 'glow'],
  ]);
  state.sap = 41;
  state.score = 1240;
  startWave(state);
  stepN(state, 60 * 11); // 11 s of wave 1: grubs mid-map, thorns firing
  render(ctx, state);
}

function sceneBoss(ctx, state, seed) {
  startLevel(state, 7, seed); // level 8: Heart of the Mole King
  scriptGrow(state, [
    [9, 1, 'tap'], [9, 2, 'tap'], [9, 3, 'tap'], [9, 4, 'tap'],
    [9, 5, 'tap'], [9, 6, 'tap'], [9, 7, 'tap'], [9, 8, 'tap'],
    [8, 2, 'tap'], [7, 2, 'tap'],
    [10, 2, 'tap'], [11, 2, 'tap'], [12, 2, 'tap'],
    [10, 4, 'tap'], [11, 4, 'tap'], [12, 4, 'tap'], [13, 4, 'tap'],
    [14, 4, 'tap'], [15, 4, 'tap'], [16, 4, 'tap'], [17, 4, 'tap'],
    [17, 3, 'tap'], [17, 2, 'feeder'],
    [8, 5, 'thorn'], [10, 5, 'thorn'], [8, 7, 'thorn'], [10, 7, 'thorn'],
    [8, 6, 'glow'], [10, 6, 'glow'],
  ]);
  state.sap = 33;
  state.score = 4860;
  // Jump straight to the boss wave: clear the earlier waves by hand.
  state.wave = 4;
  state.waveState = 'build';
  startWave(state);
  stepN(state, 60 * 6); // the Mole King lumbers in from a nest
  render(ctx, state);
}

function sceneVictory(ctx, state) {
  startLevel(state, 0, 7);
  state.phase = 'victory';
  state.banner = null; // no level-intro banner behind the win panel
  state.score = 3420;
  state.kills = 27;
  state.victoryStats = {
    score: 3420, timeBonus: 120, hpBonus: 200, stars: 3, newSpores: 2,
    kills: 27, roots: 31, time: 68, levelName: 'First Sprout', isLast: false,
  };
  state.animT = 2.0;
  render(ctx, state);
}

export function runShot(ctx, state, scene, seed) {
  // Work on the booted state itself and freeze the live loop, or the loop
  // would paint the title screen over the scene before the screenshot.
  state.shotMode = true;
  state.rng = mulberry32(seed);
  // Silence: screenshots must not need a user gesture for audio.
  state.audio.setMuted(true);
  const s = state;
  switch (scene) {
    case 'start': sceneStart(ctx, s); break;
    case 'play': scenePlay(ctx, s, seed); break;
    case 'boss': sceneBoss(ctx, s, seed); break;
    case 'victory': sceneVictory(ctx, s); break;
    default: sceneStart(ctx, s); break;
  }
  window.__shotReady = true;
  window.__rootlightShot = debugSnapshot(s);
}
