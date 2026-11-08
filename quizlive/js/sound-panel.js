// Sound settings dialog: pick a sound for each game moment, preview it, or upload your own.
import { sound, SLOTS, SLOT_IDS } from "./sound.js";
import { t, onLangChange } from "./i18n.js";
import { escapeHTML, toast } from "./utils.js";

let dialog = null;

export function mountSoundButton(container) {
  const btn = document.createElement("button");
  btn.className = "icon-btn";
  btn.type = "button";
  const sync = () => {
    btn.textContent = `♪ ${t("sound.button")}`;
    btn.setAttribute("aria-haspopup", "dialog");
  };
  sync();
  onLangChange(sync);
  btn.addEventListener("click", openSoundPanel);
  container.append(btn);
  return btn;
}

export async function openSoundPanel() {
  await sound.unlock();
  if (!dialog) build();
  await render();
  dialog.showModal();
}

function build() {
  dialog = document.createElement("dialog");
  dialog.className = "sheet";
  dialog.setAttribute("aria-labelledby", "snd-title");
  dialog.addEventListener("close", () => sound.stopPreview());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); }); // backdrop
  document.body.append(dialog);
  onLangChange(() => { if (dialog.open) render(); });

  dialog.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.matches("[data-volume]")) return;
    if (el.matches("select[data-slot]")) {
      const slot = el.dataset.slot;
      if (el.value === "__upload") {
        el.value = sound.getChoice(slot);
        dialog.querySelector(`input[type=file][data-slot="${slot}"]`).click();
        return;
      }
      sound.setChoice(slot, el.value);
      syncRemove(slot);
      sound.preview(slot, el.value);
    }
    if (el.matches("input[type=file][data-slot]")) {
      const slot = el.dataset.slot;
      const file = el.files[0];
      el.value = "";
      if (!file) return;
      try {
        const id = await sound.addCustom(slot, file);
        sound.setChoice(slot, `custom:${id}`);
        await render();
        sound.preview(slot);
        toast(t("sound.added", { name: file.name }));
      } catch (err) {
        console.error(err);
        const known = ["not-audio", "too-big", "cant-decode"].includes(err.message);
        toast(t(known ? `sound.err.${err.message}` : "sound.err.generic", { mb: sound.MAX_FILE_BYTES / 1048576 }));
      }
    }
  });

  dialog.addEventListener("input", (e) => {
    if (e.target.matches("[data-volume]")) sound.setVolume(Number(e.target.value) / 100);
  });

  dialog.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const slot = btn.dataset.slot;
    if (btn.dataset.act === "close") dialog.close();
    if (btn.dataset.act === "play") sound.preview(slot);
    if (btn.dataset.act === "remove") {
      const id = sound.getChoice(slot).slice(7);
      await sound.removeCustom(id);
      await render();
    }
    if (btn.dataset.act === "reset" && confirm(t("sound.confirmReset"))) {
      sound.resetAll();
      await render();
    }
  });
}

function syncRemove(slot) {
  const custom = sound.getChoice(slot).startsWith("custom:");
  dialog.querySelector(`button[data-act="remove"][data-slot="${slot}"]`).hidden = !custom;
}

async function render() {
  const customs = await sound.listCustom();
  const rows = SLOT_IDS.map((slot) => {
    const choice = sound.getChoice(slot);
    const mine = customs.filter((c) => c.slot === slot);
    const options = [
      ...SLOTS[slot].presets.map((p) => [`preset:${slot}.${p}`, t(`sound.preset.${p}`)]),
      ...mine.map((c) => [`custom:${c.id}`, `${t("sound.mine")}: ${c.name}`]),
      ["off", t("sound.off")],
    ];
    return `
      <div class="snd-row">
        <div class="snd-label">
          <label for="snd-${slot}">${t(`sound.slot.${slot}`)}</label>
          <small>${t(`sound.hint.${slot}`)}</small>
        </div>
        <div class="snd-controls">
          <select id="snd-${slot}" data-slot="${slot}">
            ${options.map(([v, l]) => `<option value="${v}" ${v === choice ? "selected" : ""}>${escapeHTML(l)}</option>`).join("")}
            <option value="__upload">${t("sound.upload")}</option>
          </select>
          <button type="button" class="btn small ghost" data-act="play" data-slot="${slot}"
            aria-label="${t("sound.preview", { name: t(`sound.slot.${slot}`) })}">▶</button>
          <button type="button" class="btn small ghost" data-act="remove" data-slot="${slot}"
            ${choice.startsWith("custom:") ? "" : "hidden"}
            aria-label="${t("sound.remove")}" title="${t("sound.remove")}">✕</button>
          <input type="file" accept="audio/*" data-slot="${slot}" hidden>
        </div>
      </div>`;
  }).join("");

  dialog.innerHTML = `
    <div class="sheet-head">
      <h2 id="snd-title">${t("sound.title")}</h2>
      <button type="button" class="btn small ghost" data-act="close">${t("common.close")}</button>
    </div>
    <div class="snd-row">
      <div class="snd-label"><label for="snd-volume">${t("sound.volume")}</label></div>
      <input id="snd-volume" type="range" min="0" max="100" step="5" data-volume value="${Math.round(sound.getVolume() * 100)}">
    </div>
    ${rows}
    <p class="sheet-note">${t("sound.note", { mb: sound.MAX_FILE_BYTES / 1048576 })}</p>
    <div class="sheet-foot">
      <button type="button" class="linklike" data-act="reset">${t("sound.reset")}</button>
      <button type="button" class="btn" data-act="close">${t("common.done")}</button>
    </div>`;
}
