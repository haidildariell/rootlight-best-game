// render.js — everything the player sees, drawn on one 1280x720 canvas.
// Soil art is pre-rendered once per level from a seeded rng; roots, grubs,
// menus and HUD are drawn every frame. Buttons register themselves into
// state.uiButtons so main.js click handling stays in one place.
import { LEVELS, DIFFICULTIES, ROOT_TYPES, GRUB_STATS, META_UPGRADES, COLS, ROWS } from './levels.js';
import { tileAt, canGrowOn, rootCount } from './grid.js';
import { mulberry32, clamp } from './rng.js';

export const W = 1280;
export const H = 720;
export const GRID = { ox: 120, oy: 76, tile: 52 };
const TILE = GRID.tile;

const C = {
  bg: '#14101c', panel: '#1e1626', panel2: '#261c30', line: '#3d2f4d',
  text: '#f2e8d5', dim: '#b8a88f', gold: '#ffd76a', amber: '#e8a33d',
  green: '#7dc95e', red: '#e05d5d', cyan: '#6fd3e7', purple: '#b06fd3',
  soilA: '#4a3423', soilB: '#3a2a1e', soilC: '#5a4030', rock: '#2c2333',
};

export function tileFromPoint(x, y) {
  const tx = Math.floor((x - GRID.ox) / TILE);
  const ty = Math.floor((y - GRID.oy) / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return null;
  return { x: tx, y: ty };
}

function tileCenter(t) {
  return { x: GRID.ox + (t.x + 0.5) * TILE, y: GRID.oy + (t.y + 0.5) * TILE };
}

// --- soil pre-render ------------------------------------------------------
let soilCache = { key: '', canvas: null };
function soilCanvas(levelDef) {
  const key = `lv${levelDef.id}`;
  if (soilCache.key === key && soilCache.canvas) return soilCache.canvas;
  const cv = document.createElement('canvas');
  cv.width = COLS * TILE; cv.height = ROWS * TILE;
  const g = cv.getContext('2d');
  const rng = mulberry32(0x5011 + levelDef.id * 7919);
  g.fillStyle = C.soilB;
  g.fillRect(0, 0, cv.width, cv.height);
  // Layered soil blobs.
  for (let i = 0; i < 900; i++) {
    const x = rng() * cv.width, y = rng() * cv.height;
    const r = 3 + rng() * 14;
    g.fillStyle = rng() < 0.5 ? C.soilA : C.soilC;
    g.globalAlpha = 0.25 + rng() * 0.35;
    g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill();
  }
  g.globalAlpha = 1;
  // Pebbles.
  for (let i = 0; i < 260; i++) {
    const x = rng() * cv.width, y = rng() * cv.height;
    g.fillStyle = rng() < 0.5 ? '#6b5138' : '#2e2118';
    g.beginPath(); g.arc(x, y, 1 + rng() * 2.5, 0, 6.29); g.fill();
  }
  // Per-tile features.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = levelDef.map[y][x];
      const px = x * TILE, py = y * TILE;
      if (ch === '#') {
        g.fillStyle = C.rock;
        g.beginPath();
        g.roundRect(px + 3, py + 3, TILE - 6, TILE - 6, 9);
        g.fill();
        g.fillStyle = '#453a55';
        g.beginPath(); g.arc(px + 16, py + 16, 7, 0, 6.29); g.fill();
        g.beginPath(); g.arc(px + 36, py + 34, 5, 0, 6.29); g.fill();
      } else if (ch === 'o') {
        for (let i = 0; i < 7; i++) {
          g.fillStyle = i % 2 ? '#ffd76a' : '#e8a33d';
          g.beginPath();
          g.arc(px + 10 + rng() * 32, py + 10 + rng() * 32, 2.5 + rng() * 2, 0, 6.29);
          g.fill();
        }
      } else if (ch === '~') {
        g.fillStyle = 'rgba(80,160,220,0.35)';
        g.beginPath(); g.roundRect(px + 4, py + 4, TILE - 8, TILE - 8, 10); g.fill();
        g.fillStyle = 'rgba(140,210,255,0.5)';
        g.fillRect(px + 10, py + 14, TILE - 20, 3);
        g.fillRect(px + 14, py + 32, TILE - 28, 3);
      } else if (ch === 'x') {
        g.fillStyle = '#120d18';
        g.beginPath(); g.ellipse(px + TILE / 2, py + TILE / 2, 20, 14, 0, 0, 6.29); g.fill();
        g.strokeStyle = '#4a3423'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(px + TILE / 2, py + TILE / 2, 20, 14, 0, 0, 6.29); g.stroke();
      }
    }
  }
  soilCache = { key, canvas: cv };
  return cv;
}

// --- buttons --------------------------------------------------------------
function button(state, ctx, x, y, w, h, label, action, opts = {}) {
  const hover = state.mouse.x >= x && state.mouse.x <= x + w && state.mouse.y >= y && state.mouse.y <= y + h;
  const disabled = !!opts.disabled;
  ctx.fillStyle = disabled ? '#2a2133' : hover ? '#3a2c4d' : C.panel2;
  ctx.strokeStyle = opts.accent || C.line;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = disabled ? '#6b5d7a' : (opts.color || C.text);
  ctx.font = `${opts.big ? 'bold 22px' : 'bold 16px'} system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  if (!disabled) state.uiButtons.push({ x, y, w, h, action, label });
  return hover;
}

function panel(ctx, x, y, w, h, alpha = 0.92) {
  ctx.fillStyle = `rgba(20,14,28,${alpha})`;
  ctx.strokeStyle = C.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
}

function title(ctx, text, x, y, size, color) {
  ctx.fillStyle = color || C.text;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function bodyText(ctx, lines, x, y, size, gap, color) {
  ctx.fillStyle = color || C.dim;
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * gap));
}

// --- HUD + toolbar rects (shared with main.js debug handle) ---------------
export function toolButtonRects() {
  const out = [];
  const ids = ['tap', 'feeder', 'thorn', 'glow'];
  ids.forEach((id, i) => out.push({ tool: id, x: 130 + i * 150, y: 662, w: 140, h: 48 }));
  return out;
}

export function hudButtonRects() {
  return [
    { action: 'pause', x: 1150, y: 12, w: 56, h: 40 },
    { action: 'mute', x: 1212, y: 12, w: 56, h: 40 },
  ];
}

// --- main render ----------------------------------------------------------
export function render(ctx, state) {
  state.uiButtons = [];
  ctx.save();
  if (state.save.settings.shake && state.shakeT > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  ctx.fillStyle = C.bg;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  switch (state.phase) {
    case 'title': drawTitle(ctx, state); break;
    case 'levels': drawLevels(ctx, state); break;
    case 'howto': drawHowto(ctx, state); break;
    case 'settings': drawSettings(ctx, state); break;
    case 'shop': drawShop(ctx, state); break;
    case 'paused': drawGame(ctx, state); drawPaused(ctx, state); break;
    case 'victory': drawGame(ctx, state); drawVictory(ctx, state); break;
    case 'defeat': drawGame(ctx, state); drawDefeat(ctx, state); break;
    default: drawGame(ctx, state); break;
  }
  ctx.restore();
}

// --- game board -----------------------------------------------------------
function drawGame(ctx, state) {
  const { grid, levelDef } = state;
  if (!grid || !levelDef) return;
  // Light shaft from the surface crack.
  const shaft = ctx.createLinearGradient(0, 0, 0, H);
  shaft.addColorStop(0, 'rgba(255,214,106,0.10)');
  shaft.addColorStop(0.5, 'rgba(255,214,106,0.03)');
  shaft.addColorStop(1, 'rgba(255,214,106,0)');
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(560, 0); ctx.lineTo(720, 0); ctx.lineTo(860, H); ctx.lineTo(420, H);
  ctx.closePath(); ctx.fill();

  // Soil.
  ctx.drawImage(soilCanvas(levelDef), GRID.ox, GRID.oy);

  // Water shimmer (animated).
  const t = state.animT;
  for (const tile of grid.tiles) {
    if (tile.kind !== '~') continue;
    ctx.fillStyle = `rgba(140,210,255,${0.10 + 0.08 * Math.sin(t * 2 + tile.x)})`;
    ctx.fillRect(GRID.ox + tile.x * TILE + 6, GRID.oy + tile.y * TILE + 6, TILE - 12, TILE - 12);
  }

  // Roots: arms to rooted neighbours first, then nodes.
  ctx.lineCap = 'round';
  for (const tile of grid.tiles) {
    if (!tile.root) continue;
    const c = tileCenter(tile);
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const n = tileAt(grid, tile.x + dx, tile.y + dy);
      if (n && n.root) {
        const nc = tileCenter(n);
        ctx.strokeStyle = ROOT_TYPES[tile.root.type].color;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = tile.root.type === 'tap' ? 7 : 9;
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(nc.x, nc.y); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  for (const tile of grid.tiles) {
    if (!tile.root) continue;
    const c = tileCenter(tile);
    const col = ROOT_TYPES[tile.root.type].color;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(c.x, c.y, tile.root.type === 'tap' ? 8 : 11, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(c.x - 3, c.y - 3, 3, 0, 6.29); ctx.fill();
    if (tile.root.type === 'thorn') {
      ctx.strokeStyle = '#ff8f8f'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(a) * 10, c.y + Math.sin(a) * 10);
        ctx.lineTo(c.x + Math.cos(a) * 17, c.y + Math.sin(a) * 17);
        ctx.stroke();
      }
    }
    if (tile.root.type === 'glow') {
      const g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 46);
      g.addColorStop(0, 'rgba(111,211,231,0.35)');
      g.addColorStop(1, 'rgba(111,211,231,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, 46, 0, 6.29); ctx.fill();
    }
    if (tile.root.type === 'feeder' && tile.kind === 'o') {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', c.x, c.y - 16);
    }
  }

  // Seed sprout.
  const sc = tileCenter(grid.seed);
  const pulse = 1 + 0.08 * Math.sin(t * 3);
  const sg = ctx.createRadialGradient(sc.x, sc.y, 2, sc.x, sc.y, 40 * pulse);
  sg.addColorStop(0, 'rgba(125,201,94,0.5)');
  sg.addColorStop(1, 'rgba(125,201,94,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(sc.x, sc.y, 40 * pulse, 0, 6.29); ctx.fill();
  ctx.strokeStyle = '#7dc95e'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(sc.x, sc.y + 14); ctx.quadraticCurveTo(sc.x, sc.y - 6, sc.x, sc.y - 18); ctx.stroke();
  ctx.fillStyle = '#7dc95e';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sc.x + s * 11, sc.y - 12, 11, 5, s * 0.6, 0, 6.29);
    ctx.fill();
  }

  // Heartwell crystal.
  const hc = tileCenter(grid.heart);
  const hpulse = 1 + 0.12 * Math.sin(t * 2.2);
  const hg = ctx.createRadialGradient(hc.x, hc.y, 4, hc.x, hc.y, 60 * hpulse);
  hg.addColorStop(0, 'rgba(255,215,106,0.55)');
  hg.addColorStop(1, 'rgba(255,215,106,0)');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(hc.x, hc.y, 60 * hpulse, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.moveTo(hc.x, hc.y - 20); ctx.lineTo(hc.x + 13, hc.y); ctx.lineTo(hc.x, hc.y + 20); ctx.lineTo(hc.x - 13, hc.y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.moveTo(hc.x, hc.y - 12); ctx.lineTo(hc.x + 6, hc.y); ctx.lineTo(hc.x, hc.y + 12); ctx.lineTo(hc.x - 6, hc.y);
  ctx.closePath(); ctx.fill();
  if (state.bloom > 0) {
    ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(hc.x, hc.y, 30, -Math.PI / 2, -Math.PI / 2 + (state.bloom / state.bloomNeed) * Math.PI * 2);
    ctx.stroke();
  }

  // Grubs.
  for (const g of state.grubs) drawGrub(ctx, state, g);

  // Particles + floaters.
  for (const p of state.particles) {
    ctx.globalAlpha = clamp(p.t / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.29); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of state.floaters) {
    ctx.globalAlpha = clamp(f.t, 0, 1);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // Hover highlight.
  if (state.phase === 'playing' && state.hover) {
    const tile = tileAt(grid, state.hover.x, state.hover.y);
    if (tile) {
      const ok = canGrowOn(grid, tile) && state.sap >= ROOT_TYPES[state.tool].cost;
      ctx.fillStyle = ok ? 'rgba(125,201,94,0.25)' : 'rgba(224,93,93,0.25)';
      ctx.fillRect(GRID.ox + tile.x * TILE + 2, GRID.oy + tile.y * TILE + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = ok ? '#7dc95e' : '#e05d5d';
      ctx.lineWidth = 2;
      ctx.strokeRect(GRID.ox + tile.x * TILE + 2, GRID.oy + tile.y * TILE + 2, TILE - 4, TILE - 4);
    }
  }

  drawHUD(ctx, state);
  drawToolbar(ctx, state);

  // Banner.
  if (state.banner) {
    ctx.globalAlpha = clamp(state.banner.t, 0, 1);
    ctx.fillStyle = 'rgba(20,14,28,0.85)';
    const bw = 560;
    ctx.beginPath(); ctx.roundRect((W - bw) / 2, 84, bw, 40, 12); ctx.fill();
    ctx.fillStyle = C.gold;
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(state.banner.text, W / 2, 105);
    ctx.globalAlpha = 1;
  }

  // Boss intro bar.
  const boss = state.grubs.find((g) => g.kind === 'moleking');
  if (boss) {
    ctx.fillStyle = 'rgba(20,14,28,0.85)';
    ctx.beginPath(); ctx.roundRect(390, 130, 500, 34, 10); ctx.fill();
    ctx.fillStyle = '#d8b8ff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('MOLE KING', 404, 147);
    ctx.fillStyle = '#3d2f4d';
    ctx.fillRect(520, 138, 340, 16);
    ctx.fillStyle = '#b06fd3';
    ctx.fillRect(520, 138, 340 * clamp(boss.hp / boss.maxHp, 0, 1), 16);
  }
}

function drawGrub(ctx, state, g) {
  const px = GRID.ox + (g.px + 0.5) * TILE;
  const py = GRID.oy + (g.py + 0.5) * TILE;
  const s = GRUB_STATS[g.kind];
  const wob = Math.sin(state.animT * 6 + g.wobble) * 2;
  const r = s.radius * (g.kind === 'moleking' ? 1 : 1);
  ctx.save();
  ctx.translate(px, py + wob * 0.4);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, r * 0.8, r, r * 0.4, 0, 0, 6.29); ctx.fill();
  // Body.
  ctx.fillStyle = g.flash > 0 ? '#ffffff' : s.color;
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.75, 0, 0, 6.29); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.75, 0, 0, 6.29); ctx.stroke();
  // Segments.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  for (const off of [-r * 0.4, 0, r * 0.4]) {
    ctx.beginPath(); ctx.moveTo(off, -r * 0.55); ctx.lineTo(off, r * 0.55); ctx.stroke();
  }
  // Eyes (look toward the seed: up).
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, 3.5, 0, 6.29); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.35, 3.5, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#14101c';
  ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.4, 1.8, 0, 6.29); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.4, 1.8, 0, 6.29); ctx.fill();
  if (g.kind === 'moleking') {
    ctx.fillStyle = '#ffd76a';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12 - 6, -r * 0.7); ctx.lineTo(i * 12, -r * 1.25); ctx.lineTo(i * 12 + 6, -r * 0.7);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  // HP bar when hurt.
  if (g.hp < g.maxHp && g.kind !== 'moleking') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px - 16, py - r - 12, 32, 5);
    ctx.fillStyle = '#e05d5d';
    ctx.fillRect(px - 16, py - r - 12, 32 * clamp(g.hp / g.maxHp, 0, 1), 5);
  }
}

function drawHUD(ctx, state) {
  ctx.fillStyle = 'rgba(20,14,28,0.95)';
  ctx.fillRect(0, 0, W, 64);
  ctx.strokeStyle = C.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 64); ctx.lineTo(W, 64); ctx.stroke();

  const def = state.levelDef;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = C.text;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`${def.id}. ${def.name}`, 16, 24);
  ctx.fillStyle = C.dim;
  ctx.font = '15px system-ui, sans-serif';
  const waveLabel = state.waveState === 'done'
    ? 'All waves cleared'
    : `Wave ${Math.min(state.wave + 1, def.waves.length)}/${def.waves.length}` +
      (state.waveState === 'fighting' ? ' — fighting' : ' — build');
  ctx.fillText(waveLabel, 16, 46);

  // Sap.
  ctx.fillStyle = C.gold;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`◆ ${Math.floor(state.sap)} / ${state.sapCap}`, 300, 32);
  // Seed HP hearts.
  let hx = 470;
  ctx.font = '18px system-ui, sans-serif';
  for (let i = 0; i < state.seedMax; i++) {
    ctx.fillStyle = i < state.seedHp ? '#ff6b81' : '#3d2f4d';
    ctx.fillText('♥', hx, 32);
    hx += 22;
  }
  // Score + time.
  ctx.fillStyle = C.text;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(`Score ${state.score}`, 700, 24);
  ctx.fillStyle = C.dim;
  ctx.font = '15px system-ui, sans-serif';
  const mm = String(Math.floor(state.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(state.time % 60)).padStart(2, '0');
  ctx.fillText(`${mm}:${ss}  •  ${state.grubs.length} grubs  •  ${rootCount(state.grid)} roots`, 700, 46);

  // Spores + pause/mute.
  ctx.fillStyle = C.cyan;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`✦ ${state.save.spores}`, 1130, 32);
  ctx.textAlign = 'center';
  for (const b of hudButtonRects()) {
    button(state, ctx, b.x, b.y, b.w, b.h,
      b.action === 'pause' ? 'II' : (state.save.settings.muted ? 'MUTE' : 'SND'), b.action);
  }
}

function drawToolbar(ctx, state) {
  ctx.fillStyle = 'rgba(20,14,28,0.95)';
  ctx.fillRect(0, 656, W, 64);
  ctx.strokeStyle = C.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 656); ctx.lineTo(W, 656); ctx.stroke();

  const ids = ['tap', 'feeder', 'thorn', 'glow'];
  ids.forEach((id, i) => {
    const r = toolButtonRects()[i];
    const rt = ROOT_TYPES[id];
    const afford = state.sap >= rt.cost;
    const selected = state.tool === id;
    ctx.fillStyle = selected ? '#3a2c4d' : C.panel2;
    ctx.strokeStyle = selected ? rt.color : C.line;
    ctx.lineWidth = selected ? 3 : 2;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = afford ? rt.color : '#6b5d7a';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`[${rt.key}] ${rt.name}`, r.x + 10, r.y + 16);
    ctx.fillStyle = C.dim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`◆ ${rt.cost} sap`, r.x + 10, r.y + 34);
    state.uiButtons.push({ x: r.x, y: r.y, w: r.w, h: r.h, action: `tool:${id}`, label: rt.name });
  });

  // Wave button.
  const def = state.levelDef;
  const wx = 780, wy = 662, ww = 220, wh = 48;
  if (state.waveState === 'build' && state.wave < def.waves.length) {
    button(state, ctx, wx, wy, ww, wh, `▶ Start Wave ${state.wave + 1}`, 'start-wave', { accent: C.gold, color: C.gold });
  } else if (state.waveState === 'fighting') {
    ctx.fillStyle = C.panel2;
    ctx.beginPath(); ctx.roundRect(wx, wy, ww, wh, 10); ctx.fill();
    ctx.fillStyle = C.red;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`Wave ${state.wave + 1} — ${state.grubs.length} grubs`, wx + ww / 2, wy + wh / 2 + 1);
  } else {
    ctx.fillStyle = C.panel2;
    ctx.beginPath(); ctx.roundRect(wx, wy, ww, wh, 10); ctx.fill();
    ctx.fillStyle = C.green;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('All waves cleared ✓', wx + ww / 2, wy + wh / 2 + 1);
  }
  ctx.fillStyle = C.dim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('Click soil by a root to grow · 1-4 · Space', 1020, 686);
}

// --- menus ----------------------------------------------------------------
function drawTitle(ctx, state) {
  const t = state.animT;
  // Decorative glowing roots across the dark.
  ctx.strokeStyle = 'rgba(232,163,61,0.25)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    const x0 = 120 + i * 260;
    ctx.beginPath();
    ctx.moveTo(x0, 690);
    ctx.bezierCurveTo(x0 - 40, 480, x0 + 60, 380, x0 + (i % 2 ? -30 : 40), 220 + Math.sin(t + i) * 8);
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(640, 300, 10, 640, 300, 420);
  glow.addColorStop(0, 'rgba(255,215,106,0.14)');
  glow.addColorStop(1, 'rgba(255,215,106,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  title(ctx, 'ROOTLIGHT', 640, 190, 84, C.gold);
  ctx.fillStyle = C.dim;
  ctx.font = '21px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Grow a living root network through the deep soil.', 640, 250);
  ctx.fillText('Reach the Heartwell. Keep the grubs from your seed.', 640, 280);

  button(state, ctx, 540, 330, 200, 54, '▶  Play', 'play', { big: true, accent: C.gold, color: C.gold });
  button(state, ctx, 540, 396, 200, 46, 'How to play', 'howto');
  button(state, ctx, 540, 452, 200, 46, 'Settings', 'settings');

  // Difficulty selector.
  ctx.fillStyle = C.dim;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('Difficulty', 640, 530);
  DIFFICULTIES.forEach((d, i) => {
    const x = 440 + i * 140;
    const sel = state.save.difficulty === d.id;
    button(state, ctx, x, 548, 126, 40, d.name, `diff:${d.id}`,
      { accent: sel ? C.gold : C.line, color: sel ? C.gold : C.text });
  });
  ctx.fillStyle = C.dim;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(DIFFICULTIES.find((d) => d.id === state.save.difficulty).desc, 640, 610);
  ctx.fillText(`Best score ${state.save.bestScore}  •  ${state.save.spores} spores  •  8 levels, one boss`, 640, 636);
  ctx.fillText('An original game for make.fun best-game-01 — no network, no libraries, all art and sound made in code.', 640, 668);
}

function drawLevels(ctx, state) {
  title(ctx, 'Choose a level', 640, 70, 40);
  ctx.fillStyle = C.dim;
  ctx.font = '17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Spores ✦ ${state.save.spores} — spend them in the Shop. Stars earn spores.`, 640, 108);

  LEVELS.forEach((lv, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 110 + col * 280, y = 150 + row * 210;
    const locked = lv.id > state.save.unlocked;
    const stars = state.save.stars[lv.id] || 0;
    panel(ctx, x, y, 260, 180);
    ctx.fillStyle = locked ? '#6b5d7a' : C.text;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${lv.id}. ${lv.name}`, x + 16, y + 30);
    ctx.fillStyle = locked ? '#5a4d68' : C.dim;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(locked ? 'Locked — finish the level before it.' : lv.sub, x + 16, y + 58);
    ctx.fillText(`${lv.waves.length} waves · par ${lv.par}s`, x + 16, y + 82);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = C.gold;
    ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), x + 16, y + 116);
    if (!locked) {
      state.uiButtons.push({ x, y, w: 260, h: 180, action: `level:${i}`, label: lv.name });
    }
  });

  button(state, ctx, 440, 600, 160, 48, 'Shop', 'shop', { accent: C.cyan, color: C.cyan });
  button(state, ctx, 620, 600, 160, 48, '←  Title', 'back-title');
  button(state, ctx, 800, 600, 160, 48, 'How to play', 'howto');
}

function drawHowto(ctx, state) {
  panel(ctx, 240, 70, 800, 580);
  title(ctx, 'How to play', 640, 120, 34);
  bodyText(ctx, [
    'You are a seed-spirit, deep underground. Grow roots tile by tile',
    'until they touch the Heartwell — then hold the connection while it blooms.',
    '',
    'CLICK soil next to any root to grow the selected root (costs sap):',
    '  [1] Taproot ◆1 — cheap path    [2] Feeder ◆2 — drinks nutrients for sap',
    '  [3] Thornroot ◆3 — stings grubs    [4] Glowbulb ◆2 — light slows grubs',
    '',
    'Grubs crawl from their nests toward your seed and EAT your roots.',
    'Thorns kill them. Glow slows them. If they reach the seed, it loses hearts.',
    'Lose all hearts and the run ends.',
    '',
    'SPACE starts the next wave. Between waves, grow and repair.',
    'Nutrient pockets (gold) and water veins (blue) feed your sap.',
    'Finish a level to earn stars and spores — spend spores in the Shop.',
    'Level 8 hides the Mole King. Bring thorns.',
    '',
    'Keys: 1-4 tools · Space start wave · P pause · M mute · R restart',
  ], 640, 170, 17, 27);
  button(state, ctx, 560, 590, 160, 46, 'Got it', 'back');
}

function drawSettings(ctx, state) {
  const s = state.save.settings;
  panel(ctx, 390, 110, 500, 460);
  title(ctx, 'Settings', 640, 160, 32);
  ctx.fillStyle = C.dim;
  ctx.font = '17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Volume  ${Math.round(s.volume * 100)}%`, 640, 220);
  button(state, ctx, 520, 240, 60, 40, '−', 'vol:0');
  button(state, ctx, 700, 240, 60, 40, '+', 'vol:1');
  // Fine volume steps via two more buttons.
  button(state, ctx, 590, 240, 50, 40, '25%', 'vol:0.25');
  button(state, ctx, 645, 240, 50, 40, '50%', 'vol:0.5');
  button(state, ctx, 520, 300, 260, 44, s.muted ? '🔇  Sound: OFF  (M)' : '🔊  Sound: ON  (M)', 'mute');
  button(state, ctx, 520, 356, 260, 44, s.shake ? 'Screen shake: ON' : 'Screen shake: OFF', 'toggle-shake');
  ctx.fillStyle = C.dim;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Quality: high (fixed for this build)', 640, 430);
  ctx.fillText('Progress saves in this browser.', 640, 460);
  button(state, ctx, 560, 500, 160, 46, '←  Back', 'back');
}

function drawShop(ctx, state) {
  title(ctx, 'Spore Shop', 640, 70, 38);
  ctx.fillStyle = C.cyan;
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`You have ✦ ${state.save.spores} spores`, 640, 108);
  META_UPGRADES.forEach((up, i) => {
    const y = 140 + i * 84;
    const lvl = state.save.meta[up.id] || 0;
    const maxed = lvl >= up.max;
    const cost = maxed ? null : up.cost[lvl];
    const afford = !maxed && state.save.spores >= cost;
    panel(ctx, 340, y, 600, 72);
    ctx.fillStyle = C.text;
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(up.name, 360, y + 24);
    ctx.fillStyle = C.dim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(up.desc, 360, y + 50);
    ctx.fillStyle = C.gold;
    ctx.font = '18px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('●'.repeat(lvl) + '○'.repeat(up.max - lvl), 920, y + 24);
    button(state, ctx, 800, y + 16, 120, 40,
      maxed ? 'MAX' : `Buy ✦${cost}`, `buy:${up.id}`, { disabled: maxed || !afford });
  });
  button(state, ctx, 560, 600, 160, 48, '←  Back', 'shop-back');
}

function drawPaused(ctx, state) {
  ctx.fillStyle = 'rgba(10,6,16,0.72)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 440, 190, 400, 330);
  title(ctx, 'Paused', 640, 240, 36);
  bodyText(ctx, [
    `${state.levelDef.name} — Wave ${state.wave + 1}/${state.levelDef.waves.length}`,
    `Score ${state.score} · ${state.kills} grubs slain`,
  ], 640, 290, 16, 26);
  button(state, ctx, 540, 340, 200, 48, '▶  Resume', 'resume', { big: true, accent: C.gold, color: C.gold });
  button(state, ctx, 540, 400, 200, 44, '↻  Restart level', 'restart-level');
  button(state, ctx, 540, 454, 200, 44, '←  Quit to title', 'quit-title');
}

function drawVictory(ctx, state) {
  const v = state.victoryStats;
  ctx.fillStyle = 'rgba(10,6,16,0.66)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 380, 110, 520, 500);
  title(ctx, v.isLast ? 'THE HEARTWELL BLOOMS!' : 'Level complete!', 640, 160, 32, C.gold);
  ctx.fillStyle = C.gold;
  ctx.font = '34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★'.repeat(v.stars) + '☆'.repeat(3 - v.stars), 640, 215);
  bodyText(ctx, [
    `${v.levelName} — finished in ${Math.floor(v.time / 60)}:${String(Math.floor(v.time % 60)).padStart(2, '0')}`,
    `Score ${v.score}  (time +${v.timeBonus}, seed +${v.hpBonus})`,
    `${v.kills} grubs slain · ${v.roots} roots grown`,
    v.newSpores > 0 ? `+${v.newSpores} spores earned!` : 'No new spores — beat your star count to earn more.',
  ], 640, 265, 17, 30);
  button(state, ctx, 480, 430, 320, 50, v.isLast ? 'Play again' : '▶  Next level', 'next-level', { big: true, accent: C.gold, color: C.gold });
  button(state, ctx, 480, 492, 155, 44, '↻  Replay', 'retry');
  button(state, ctx, 645, 492, 155, 44, 'Shop', 'shop');
  button(state, ctx, 480, 548, 320, 44, 'Levels', 'levels');
}

function drawDefeat(ctx, state) {
  ctx.fillStyle = 'rgba(10,6,16,0.72)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 400, 180, 480, 340);
  title(ctx, 'The seed is gone…', 640, 230, 32, C.red);
  bodyText(ctx, [
    state.defeatReason,
    `${state.levelDef.name} — Wave ${state.wave + 1}, ${state.kills} grubs slain.`,
    'Tip: thornroots kill grubs that come close.',
    'Glowbulbs slow them. Grow feeders on gold pockets.',
  ], 640, 290, 17, 30);
  button(state, ctx, 490, 400, 300, 50, '↻  Try again  (R)', 'retry', { big: true, accent: C.red, color: C.red });
  button(state, ctx, 490, 462, 300, 44, '←  Level select', 'levels');
}
