// Sound engine with selectable sounds per game moment.
//   - Built-in sounds are synthesised with the Web Audio API (no files to host).
//   - Hosts can upload their own audio files; they are stored in this browser (IndexedDB),
//     so they work on the free Firebase plan and never leave the host's computer.
//   - Choices and volume are saved in localStorage.
// Browsers only allow audio after a user gesture, so call unlock() from a click handler.

const SETTINGS_KEY = "quizlive:sounds";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

// slot → whether it loops, its built-in presets, and the default choice.
export const SLOTS = {
  lobby:  { loop: true, presets: ["breeze", "arcade", "lofi"], def: "breeze" },
  think:  { loop: true, presets: ["pulse", "clock", "suspense"], def: "pulse" },
  intro:  { presets: ["rise", "chime"], def: "rise" },
  tick:   { presets: ["beep", "wood"], def: "beep" },
  timeUp: { presets: ["gong", "buzzer"], def: "gong" },
  reveal: { presets: ["sparkle", "drumroll"], def: "sparkle" },
  join:   { presets: ["pop", "bell"], def: "pop" },
  podium: { presets: ["fanfare", "applause"], def: "fanfare" },
};
export const SLOT_IDS = Object.keys(SLOTS);

// ---------------------------------------------------------------- audio graph

let ctx = null;
let master = null;   // game sounds (affected by mute)
let preview = null;  // previews in the settings panel (ignore mute)
let settings = loadSettings();
let muted = localStorage.getItem("quizlive:muted") === "1";
const listeners = new Set();

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (s && typeof s === "object") return { volume: 0.6, slots: {}, ...s };
  } catch { /* corrupt or blocked */ }
  return { volume: 0.6, slots: {} };
}
function saveSettings(notify = true) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  if (notify) listeners.forEach((fn) => fn());
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    preview = ctx.createGain();
    master.connect(ctx.destination);
    preview.connect(ctx.destination);
    applyGain();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
function applyGain() {
  if (!master) return;
  master.gain.value = muted ? 0 : settings.volume;
  preview.gain.value = settings.volume;
}
const live = () => ctx && ctx.state === "running";

// ---------------------------------------------------------------- synth primitives

function tone(dest, freq, t0, dur, { type = "square", gain = 0.12, slide = 0 } = {}) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(dest);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

let noiseBuffer = null;
function noise(dest, t0, dur, { gain = 0.1, freq = 2000, q = 1, type = "bandpass" } = {}) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = noiseBuffer;
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(dest);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const seq = (dest, t0, freqs, step, opts) =>
  freqs.forEach((f, i) => f && tone(dest, f, t0 + i * step, step * 0.9, opts));

// ---------------------------------------------------------------- built-in sounds

// One-shots: (dest, t) => void
const SHOTS = {
  "intro.rise": (d, t) => seq(d, t, [392, 523, 659], 0.09, { type: "triangle", gain: 0.12 }),
  "intro.chime": (d, t) => { tone(d, 1047, t, 0.7, { type: "sine", gain: 0.12 }); tone(d, 1568, t + 0.12, 0.8, { type: "sine", gain: 0.08 }); },
  "tick.beep": (d, t) => tone(d, 1500, t, 0.08, { type: "square", gain: 0.08 }),
  "tick.wood": (d, t) => { noise(d, t, 0.05, { gain: 0.35, freq: 1800, q: 6 }); tone(d, 820, t, 0.05, { type: "sine", gain: 0.12 }); },
  "timeUp.gong": (d, t) => { tone(d, 196, t, 1.2, { type: "sine", gain: 0.25, slide: 0.98 }); tone(d, 392, t, 0.8, { type: "triangle", gain: 0.08 }); },
  "timeUp.buzzer": (d, t) => { tone(d, 140, t, 0.6, { type: "sawtooth", gain: 0.1 }); tone(d, 147, t, 0.6, { type: "sawtooth", gain: 0.08 }); },
  "reveal.sparkle": (d, t) => seq(d, t, [523, 659, 784, 1047], 0.08, { type: "square", gain: 0.08 }),
  "reveal.drumroll": (d, t) => {
    for (let i = 0; i < 14; i++) noise(d, t + i * 0.05, 0.06, { gain: 0.08 + i * 0.012, freq: 900, q: 0.7 });
    tone(d, 98, t + 0.72, 0.5, { type: "sine", gain: 0.3 });
    noise(d, t + 0.72, 0.6, { gain: 0.18, freq: 5000, q: 0.5, type: "highpass" });
  },
  "join.pop": (d, t) => seq(d, t, [660, 880], 0.07, { type: "triangle", gain: 0.1 }),
  "join.bell": (d, t) => { tone(d, 1318, t, 0.45, { type: "sine", gain: 0.1 }); tone(d, 2637, t, 0.25, { type: "sine", gain: 0.03 }); },
  "podium.fanfare": (d, t) => {
    seq(d, t, [523, 523, 523, 659, 0, 523, 659, 784], 0.13, { type: "square", gain: 0.1 });
    tone(d, 1047, t + 1.1, 0.9, { type: "triangle", gain: 0.12 });
  },
  "podium.applause": (d, t) => {
    for (let i = 0; i < 90; i++) {
      const at = t + Math.random() * 2.6;
      noise(d, at, 0.04 + Math.random() * 0.05, { gain: 0.05 + Math.random() * 0.08, freq: 1200 + Math.random() * 2500, q: 1.2 });
    }
  },
};

// Loops: (dest, t) => bar duration in seconds
const BARS = {
  "lobby.breeze": (d, t) => { seq(d, t, [262, 330, 392, 330, 294, 349, 440, 349], 0.25, { type: "sine", gain: 0.07 }); return 2; },
  "lobby.arcade": (d, t) => {
    seq(d, t, [523, 659, 784, 659, 587, 698, 880, 698], 0.14, { type: "square", gain: 0.04 });
    tone(d, 131, t, 0.5, { type: "triangle", gain: 0.1 });
    tone(d, 147, t + 0.56, 0.5, { type: "triangle", gain: 0.1 });
    return 1.12;
  },
  "lobby.lofi": (d, t) => {
    [220, 277, 330].forEach((f) => tone(d, f, t, 1.5, { type: "sine", gain: 0.035 }));
    [196, 247, 294].forEach((f) => tone(d, f, t + 1.6, 1.5, { type: "sine", gain: 0.035 }));
    for (let i = 0; i < 8; i++) noise(d, t + i * 0.4, 0.05, { gain: 0.03, freq: 7000, q: 0.8, type: "highpass" });
    return 3.2;
  },
  "think.pulse": (d, t) => { seq(d, t, [110, 0, 110, 131, 0, 110, 0, 147], 0.18, { type: "triangle", gain: 0.09 }); return 1.44; },
  "think.clock": (d, t) => {
    noise(d, t, 0.04, { gain: 0.3, freq: 2600, q: 8 }); tone(d, 1000, t, 0.04, { type: "sine", gain: 0.06 });
    noise(d, t + 0.5, 0.04, { gain: 0.3, freq: 2000, q: 8 }); tone(d, 800, t + 0.5, 0.04, { type: "sine", gain: 0.06 });
    return 1;
  },
  "think.suspense": (d, t) => {
    tone(d, 55, t, 2, { type: "sine", gain: 0.12 });
    tone(d, 82.4, t, 2, { type: "sine", gain: 0.05 });
    tone(d, 65, t, 0.18, { type: "sine", gain: 0.25 });
    tone(d, 60, t + 0.26, 0.18, { type: "sine", gain: 0.2 });
    return 2;
  },
};

// ---------------------------------------------------------------- custom files (IndexedDB)

let dbPromise = null;
function idb() {
  dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open("quizlive-sounds", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
async function store(mode, fn) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode);
    const req = fn(tx.objectStore("files"));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

const buffers = new Map(); // custom id → AudioBuffer

async function bufferFor(id) {
  if (buffers.has(id)) return buffers.get(id);
  const rec = await store("readonly", (s) => s.get(id)).catch(() => null);
  if (!rec) return null;
  const ac = audio();
  if (!ac) return null;
  const buf = await ac.decodeAudioData(await rec.blob.arrayBuffer());
  buffers.set(id, buf);
  return buf;
}

function playBuffer(dest, buf, { loop = false } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  src.connect(dest);
  src.start();
  return src;
}

// ---------------------------------------------------------------- playback

// A running loop; returns { stop() }.
function runLoop(choice, dest) {
  let stopped = false;
  if (choice.startsWith("custom:")) {
    let src = null;
    bufferFor(choice.slice(7)).then((buf) => {
      if (buf && !stopped) src = playBuffer(dest, buf, { loop: true });
    });
    return { stop() { stopped = true; try { src?.stop(); } catch { /* already stopped */ } } };
  }
  const bar = BARS[choice.replace("preset:", "")];
  if (!bar) return { stop() {} };
  // Look-ahead scheduler: steadier than setInterval on its own.
  let next = ctx.currentTime + 0.05;
  const timer = setInterval(() => {
    while (!stopped && next < ctx.currentTime + 0.4) next += bar(dest, next);
  }, 100);
  return { stop() { stopped = true; clearInterval(timer); } };
}

function fire(slot, choice, dest) {
  if (!choice || choice === "off") return;
  if (choice.startsWith("custom:")) {
    bufferFor(choice.slice(7)).then((buf) => { if (buf) playBuffer(dest, buf); });
    return;
  }
  SHOTS[choice.replace("preset:", "")]?.(dest, ctx.currentTime + 0.01);
}

let gameLoop = null;
let previewing = null;

export const sound = {
  unlock() { return audio()?.resume(); },

  isMuted: () => muted,
  setMuted(value) {
    muted = value;
    localStorage.setItem("quizlive:muted", value ? "1" : "0");
    applyGain();
    if (value) this.stopLoop();
  },

  getVolume: () => settings.volume,
  setVolume(v) {
    settings.volume = Math.min(1, Math.max(0, v));
    applyGain();
    saveSettings(false); // volume changes don't need to restart loops
  },

  // "preset:<name>" | "custom:<id>" | "off"
  getChoice(slot) {
    const c = settings.slots[slot];
    return c || `preset:${slot}.${SLOTS[slot].def}`;
  },
  setChoice(slot, choice) {
    settings.slots[slot] = choice;
    saveSettings();
  },
  resetAll() {
    settings = { volume: 0.6, slots: {} };
    applyGain();
    saveSettings();
  },
  onChange(fn) { listeners.add(fn); },

  play(slot) {
    if (!SLOTS[slot] || !audio() || !live() || muted) return;
    fire(slot, this.getChoice(slot), master);
  },
  startLoop(slot) {
    this.stopLoop();
    if (!audio() || !live() || muted) return;
    const choice = this.getChoice(slot);
    if (choice !== "off") gameLoop = runLoop(choice, master);
  },
  stopLoop() { gameLoop?.stop(); gameLoop = null; },

  // Preview from the settings panel: loops play for 6 seconds.
  async preview(slot, choice = this.getChoice(slot)) {
    this.stopPreview();
    if (!audio()) return;
    await ctx.resume();
    if (choice === "off") return;
    if (SLOTS[slot].loop) {
      const loop = runLoop(choice, preview);
      const timer = setTimeout(() => this.stopPreview(), 6000);
      previewing = { stop() { clearTimeout(timer); loop.stop(); } };
    } else {
      fire(slot, choice, preview);
    }
  },
  stopPreview() { previewing?.stop(); previewing = null; },

  // ---- custom files
  MAX_FILE_BYTES,
  async listCustom(slot) {
    const all = (await store("readonly", (s) => s.getAll()).catch(() => [])) || [];
    return all.filter((r) => !slot || r.slot === slot)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(({ id, slot: s, name }) => ({ id, slot: s, name }));
  },
  async addCustom(slot, file) {
    if (!file.type.startsWith("audio/")) throw new Error("not-audio");
    if (file.size > MAX_FILE_BYTES) throw new Error("too-big");
    const blob = file.slice(0, file.size, file.type);
    const ac = audio();
    // Decode first so broken or unsupported files are rejected up front.
    const buf = await ac.decodeAudioData(await blob.arrayBuffer()).catch(() => { throw new Error("cant-decode"); });
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    await store("readwrite", (s) => s.put({ id, slot, name: file.name.replace(/\.[^.]+$/, "").slice(0, 40), blob, createdAt: Date.now() }));
    buffers.set(id, buf);
    return id;
  },
  async removeCustom(id) {
    await store("readwrite", (s) => s.delete(id));
    buffers.delete(id);
    for (const slot of SLOT_IDS) if (settings.slots[slot] === `custom:${id}`) delete settings.slots[slot];
    saveSettings();
  },
};
