// Ayah-by-ayah player: plays a passage, repeating each ayah N times, with a basmala before ayah 1 (except surahs 1 and 9).
import { AUDIO_URL } from './config.js';

const pad = n => String(n).padStart(3, '0');
export const ayahUrl = (reciter, s, a) => AUDIO_URL.replace('{r}', reciter).replace('{sss}', pad(s)).replace('{aaa}', pad(a));

export class Player {
  constructor(onState) {
    this.el = new Audio();
    this.el.preload = 'auto';
    this.onState = onState || (() => {});
    this.queue = []; this.i = 0; this.playing = false;
    this.el.addEventListener('ended', () => this.next());
    this.el.addEventListener('error', () => { this.stop(); this.onState({ error: true }); });
  }
  /** ayahs: [[s, a, text]], opts: {reciter, repeat, rate, loop} */
  load(ayahs, opts) {
    this.stop();
    this.opts = opts;
    const q = [];
    ayahs.forEach(([s, a], idx) => {
      if (a === 1 && s !== 1 && s !== 9) q.push({ s: 1, a: 1, idx, basmala: true });
      const rep = opts.repeat === 0 ? 1 : opts.repeat;
      for (let r = 0; r < rep; r++) q.push({ s, a, idx });
    });
    this.queue = q; this.i = 0;
  }
  play() {
    if (!this.queue.length) return;
    const it = this.queue[this.i];
    const url = ayahUrl(this.opts.reciter, it.s, it.a);
    if (this.el.src !== url) this.el.src = url;
    this.el.playbackRate = this.opts.rate || 1;
    this.playing = true;
    const p = this.el.play();
    if (p && p.catch) p.catch(() => { this.playing = false; this.onState({ error: true }); });
    this.onState({ playing: true, idx: it.idx });
    // warm the next file
    const nx = this.queue[this.i + 1];
    if (nx) { const l = new Audio(); l.preload = 'auto'; l.src = ayahUrl(this.opts.reciter, nx.s, nx.a); }
  }
  next() {
    this.i++;
    if (this.i >= this.queue.length) {
      if (this.opts.repeat === 0) { this.i = 0; return this.play(); } // loop the whole passage
      this.stop(); this.i = 0; return;
    }
    this.play();
  }
  pause() { this.el.pause(); this.playing = false; this.onState({ playing: false, idx: this.queue[this.i] && this.queue[this.i].idx }); }
  toggle() { this.playing ? this.pause() : this.play(); }
  setRate(r) { this.opts.rate = r; this.el.playbackRate = r; }
  stop() { this.el.pause(); this.playing = false; this.onState({ playing: false, idx: null }); }
}
