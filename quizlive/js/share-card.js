// Shareable result card (1080×1350 PNG, Instagram/WhatsApp friendly), drawn on a canvas.
import { SHAPES } from "./utils.js";

const W = 1080, H = 1350;
const C = { stage: "#2340d8", deep: "#1a2fa8", paper: "#f5f6fa", ink: "#141b3d", sun: "#ffc83d",
  shapes: ["#d14b05", "#0a7f76", "#7432c4", "#c92a64"] };
const FONT = '"Bricolage Grotesque", "IBM Plex Sans Arabic", system-ui, sans-serif';
const PATHS = SHAPES.map((svg) => new Path2D(svg.match(/ d="([^"]+)"/)[1]));

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, "")}…`;
  }
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// data: { dir, place, outOf, score, scoreLabel, correct, correctLabel, nickname, quizTitle, footer }
export async function drawResultCard(data) {
  try {
    await Promise.all([`800 100px ${FONT}`, `600 40px ${FONT}`].map((f) => document.fonts.load(f, data.quizTitle + data.place)));
  } catch { /* fonts unavailable: fall back to system fonts */ }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.direction = data.dir === "rtl" ? "rtl" : "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = C.stage;
  ctx.fillRect(0, 0, W, H);

  // The four answer shapes, as the brand mark.
  PATHS.forEach((p, i) => {
    const x = W / 2 - 2 * 92 + i * 92 + 6;
    ctx.save();
    roundRect(ctx, x, 90, 80, 80, 20);
    ctx.fillStyle = C.shapes[i];
    ctx.fill();
    ctx.translate(x + 12, 102);
    ctx.scale(1.4, 1.4);
    ctx.fillStyle = "#fff";
    ctx.fill(p);
    ctx.restore();
  });

  // Wordmark "Quiz • Live", the on-air dot between the two words as in the site logo.
  ctx.font = `800 64px ${FONT}`;
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  const quizW = ctx.measureText("Quiz").width, liveW = ctx.measureText("Live").width, dotGap = 34;
  const x0 = W / 2 - (quizW + dotGap + liveW) / 2;
  ctx.fillStyle = "#fff";
  ctx.fillText("Quiz", x0, 262);
  ctx.fillText("Live", x0 + quizW + dotGap, 262);
  ctx.beginPath();
  ctx.arc(x0 + quizW + dotGap / 2, 242, 9, 0, Math.PI * 2);
  ctx.fillStyle = C.sun;
  ctx.fill();
  ctx.textAlign = "center";
  ctx.direction = data.dir === "rtl" ? "rtl" : "ltr";

  // Quiz title.
  ctx.font = `600 46px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,.85)";
  wrap(ctx, data.quizTitle, W - 200, 2).forEach((l, i) => ctx.fillText(l, W / 2, 360 + i * 58));

  // Place, the hero of the card.
  ctx.font = `800 ${data.place.length > 6 ? 200 : 280}px ${FONT}`;
  ctx.fillStyle = C.sun;
  ctx.fillText(data.place, W / 2, 740);
  ctx.font = `600 52px ${FONT}`;
  ctx.fillStyle = "#fff";
  ctx.fillText(data.outOf, W / 2, 830);

  // Score and correct answers.
  const boxY = 900, boxW = 380, boxH = 170, gap = 40;
  [[data.score, data.scoreLabel], [data.correct, data.correctLabel]].forEach(([value, label], i) => {
    const x = W / 2 - boxW - gap / 2 + i * (boxW + gap);
    roundRect(ctx, x, boxY, boxW, boxH, 28);
    ctx.fillStyle = C.deep;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `800 76px ${FONT}`;
    ctx.fillText(String(value), x + boxW / 2, boxY + 92);
    ctx.font = `600 34px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillText(label, x + boxW / 2, boxY + 140);
  });

  // Nickname and invitation.
  ctx.font = `700 48px ${FONT}`;
  ctx.fillStyle = "#fff";
  ctx.fillText(data.nickname, W / 2, 1160);
  roundRect(ctx, 90, 1210, W - 180, 86, 43);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.font = `700 36px ${FONT}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(data.footer, W / 2, 1266);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// Opens the phone's share sheet with the image, or downloads it where sharing files isn't supported.
export async function shareResult(blob, text) {
  const file = new File([blob], "quizlive-result.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (err) {
      if (err.name === "AbortError") return "cancelled";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return "downloaded";
}
