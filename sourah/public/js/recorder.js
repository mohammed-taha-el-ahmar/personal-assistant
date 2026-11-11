// Recitation recording: MediaRecorder (opus, low bitrate) + local storage in IndexedDB.
const DB_NAME = 'sourah-rec', STORE = 'recordings', KEEP = 40;
export const MAX_SECONDS = 240;   // 4 min: enough for one page, small enough to share

function pickMime() {
  const types = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder === 'undefined') return null;
  return types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
}
export const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined');

export class Recorder {
  constructor(onTick) { this.onTick = onTick || (() => {}); this.rec = null; this.chunks = []; this.t0 = 0; this.timer = null; }
  get recording() { return !!(this.rec && this.rec.state === 'recording'); }
  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const mimeType = pickMime();
    this.rec = new MediaRecorder(stream, Object.assign({ audioBitsPerSecond: 24000 }, mimeType ? { mimeType } : {}));
    this.chunks = [];
    this.rec.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.rec.start(1000);
    this.t0 = Date.now();
    this.timer = setInterval(() => {
      const s = Math.floor((Date.now() - this.t0) / 1000);
      this.onTick(s);
      if (s >= MAX_SECONDS) this.stop();
    }, 500);
  }
  stop() {
    return new Promise(resolve => {
      if (!this.rec) return resolve(null);
      clearInterval(this.timer);
      const rec = this.rec;
      rec.onstop = () => {
        rec.stream.getTracks().forEach(tr => tr.stop());
        const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
        const duration = Math.max(1, Math.floor((Date.now() - this.t0) / 1000));
        this.rec = null; this.chunks = [];
        resolve({ blob, duration, mime: blob.type });
      };
      if (rec.state !== 'inactive') rec.stop(); else rec.onstop();
    });
  }
  cancel() { if (this.rec) { clearInterval(this.timer); try { this.rec.stop(); this.rec.stream.getTracks().forEach(tr => tr.stop()); } catch (e) {} this.rec = null; } }
}

// ---------- IndexedDB ----------
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath: 'id' }); s.createIndex('page', 'page'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const out = fn(t.objectStore(STORE)); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };

export async function saveRecording(rec) {
  await tx('readwrite', s => s.put(rec));
  const all = await listRecordings();
  if (all.length > KEEP) await Promise.all(all.slice(KEEP).map(r => deleteRecording(r.id)));
  return rec;
}
export async function listRecordings(page) {
  const all = await tx('readonly', s => s.getAll());
  return (all || []).filter(r => page == null || r.page === page).sort((a, b) => b.createdAt - a.createdAt);
}
export const deleteRecording = id => tx('readwrite', s => s.delete(id));
export async function clearRecordings() { await tx('readwrite', s => s.clear()); }

// ---------- blob <-> base64 chunks (for sharing through Firestore, 1 MiB per document) ----------
export const CHUNK = 700 * 1024;
export async function blobToChunks(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  const b64 = btoa(bin), out = [];
  for (let i = 0; i < b64.length; i += CHUNK) out.push(b64.slice(i, i + CHUNK));
  return out;
}
export function chunksToBlob(chunks, mime) {
  const bin = atob(chunks.join(''));
  const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime || 'audio/webm' });
}
export const fmtDuration = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
