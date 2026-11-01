// Synthesised sound effects (Web Audio API): no audio files to host.
// Browsers only allow audio after a user gesture, so call unlock() from a click handler.

let ctx = null;
let master = null;
let loopTimer = null;
let muted = localStorage.getItem("quizlive:muted") === "1";

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, at = 0, dur = 0.15, { type = "square", gain = 0.12, slide = 0 } = {}) {
  const ac = audio();
  // Skip while the context is locked: queued notes would all burst out on unlock.
  if (!ac || muted || ac.state !== "running") return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const notes = (seq, step, opts) => seq.forEach((f, i) => f && tone(f, i * step, step * 0.9, opts));

export const sound = {
  unlock() { return audio()?.resume(); },
  isMuted: () => muted,
  setMuted(value) {
    muted = value;
    localStorage.setItem("quizlive:muted", value ? "1" : "0");
    if (master) master.gain.value = value ? 0 : 0.5;
    if (value) this.stopLoop();
  },

  join() { notes([660, 880], 0.07, { type: "triangle", gain: 0.1 }); },
  tick() { tone(1200, 0, 0.05, { type: "square", gain: 0.05 }); },
  urgent() { tone(1500, 0, 0.08, { type: "square", gain: 0.09 }); },
  intro() { notes([392, 523, 659], 0.09, { type: "triangle", gain: 0.12 }); },
  gong() { tone(196, 0, 1.2, { type: "sine", gain: 0.25, slide: 0.98 }); tone(392, 0, 0.8, { type: "triangle", gain: 0.08 }); },
  reveal() { notes([523, 659, 784, 1047], 0.08, { type: "square", gain: 0.08 }); },
  correct() { notes([784, 1047], 0.09, { type: "triangle", gain: 0.12 }); },
  wrong() { tone(220, 0, 0.35, { type: "sawtooth", gain: 0.08, slide: 0.7 }); },
  fanfare() {
    notes([523, 523, 523, 659, 0, 523, 659, 784], 0.13, { type: "square", gain: 0.1 });
    tone(1047, 1.1, 0.9, { type: "triangle", gain: 0.12 });
  },

  // Looping background patterns: "lobby" (relaxed) and "think" (tense).
  startLoop(kind) {
    this.stopLoop();
    if (muted) return;
    const pattern = kind === "think"
      ? { seq: [110, 0, 110, 131, 0, 110, 0, 147], step: 0.18, opts: { type: "triangle", gain: 0.09 } }
      : { seq: [262, 330, 392, 330, 294, 349, 440, 349], step: 0.25, opts: { type: "sine", gain: 0.07 } };
    const play = () => notes(pattern.seq, pattern.step, pattern.opts);
    play();
    loopTimer = setInterval(play, pattern.seq.length * pattern.step * 1000);
  },
  stopLoop() { clearInterval(loopTimer); loopTimer = null; },
};
