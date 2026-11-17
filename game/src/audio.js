// audio.js — all sound is synthesized with WebAudio. No audio files.
// A low earth-drone hums under everything; a slow pentatonic pluck melody
// wanders on top; actions get short blips. Volume and mute live in settings.
import { mulberry32 } from './rng.js';

export function makeAudio() {
  const audio = {
    ctx: null, master: null, musicGain: null, sfxGain: null,
    volume: 0.7, muted: false, started: false, melodyTimer: 0,
    rng: mulberry32(0x5eed),
    melodyNotes: [220, 261.63, 293.66, 329.63, 392, 440, 523.25],
    melodyStep: 0,
  };

  function ensure() {
    if (audio.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : audio.volume;
      audio.master.connect(audio.ctx.destination);
      audio.musicGain = audio.ctx.createGain();
      audio.musicGain.gain.value = 0.35;
      audio.musicGain.connect(audio.master);
      audio.sfxGain = audio.ctx.createGain();
      audio.sfxGain.gain.value = 0.9;
      audio.sfxGain.connect(audio.master);
      startDrone(audio);
      audio.started = true;
      return true;
    } catch {
      return false;
    }
  }

  function startDrone(a) {
    // Two detuned low sines + a filtered noise "earth rumble".
    for (const [freq, gain] of [[55, 0.05], [55.7, 0.04], [110.3, 0.02]]) {
      const o = a.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = a.ctx.createGain();
      g.gain.value = gain;
      o.connect(g).connect(a.musicGain);
      o.start();
    }
    const len = a.ctx.sampleRate * 2;
    const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown-ish
      data[i] = last * 3;
    }
    const src = a.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = a.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 220;
    const g = a.ctx.createGain();
    g.gain.value = 0.12;
    src.connect(lp).connect(g).connect(a.musicGain);
    src.start();
  }

  function blip(a, freq, dur, type, vol, slideTo) {
    if (!a.ctx) return;
    const t = a.ctx.currentTime;
    const o = a.ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  audio.unlock = () => ensure();
  audio.setVolume = (v) => {
    audio.volume = v;
    if (audio.master) audio.master.gain.value = audio.muted ? 0 : v;
  };
  audio.setMuted = (m) => {
    audio.muted = m;
    if (audio.master) audio.master.gain.value = m ? 0 : audio.volume;
  };
  audio.grow = () => blip(audio, 320, 0.12, 'sine', 0.18, 520);
  audio.denied = () => blip(audio, 140, 0.15, 'square', 0.08, 90);
  audio.chomp = () => blip(audio, 90, 0.09, 'sawtooth', 0.07, 60);
  audio.thorn = () => blip(audio, 700, 0.06, 'triangle', 0.1, 900);
  audio.grubDie = () => { blip(audio, 500, 0.18, 'triangle', 0.14, 120); };
  audio.waveHorn = () => {
    blip(audio, 196, 0.5, 'sawtooth', 0.1, 196);
    setTimeout(() => blip(audio, 262, 0.5, 'sawtooth', 0.09, 262), 180);
  };
  audio.heart = () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      setTimeout(() => blip(audio, f, 0.5, 'sine', 0.16), i * 110));
  };
  audio.lose = () => {
    [392, 329.63, 261.63, 196].forEach((f, i) =>
      setTimeout(() => blip(audio, f, 0.4, 'triangle', 0.13), i * 160));
  };
  audio.click = () => blip(audio, 600, 0.05, 'square', 0.06, 700);

  // Generative melody: one soft pluck every ~0.9s, wandering the scale.
  // Called from the game loop with dt; silent until the context exists.
  audio.stepMusic = (dt) => {
    if (!audio.ctx || audio.muted) return;
    audio.melodyTimer -= dt;
    if (audio.melodyTimer > 0) return;
    audio.melodyTimer = 0.85 + audio.rng() * 0.5;
    const r = audio.rng();
    audio.melodyStep += r < 0.3 ? -1 : r < 0.8 ? 1 : 2;
    const idx = ((audio.melodyStep % 7) + 7) % 7;
    const f = audio.melodyNotes[idx];
    const t = audio.ctx.currentTime;
    const o = audio.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = audio.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(g).connect(audio.musicGain);
    o.start(t); o.stop(t + 1.5);
  };

  return audio;
}
