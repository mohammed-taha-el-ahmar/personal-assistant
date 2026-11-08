// Ready-made quizzes (templates/*.json): list, load, and copy into the host's account.
import { fs } from "./firebase.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const cache = new Map();

async function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then((r) => {
      if (!r.ok) throw new Error(`template ${path}: ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(path);
}

export const listTemplates = () => getJSON("templates/index.json");

export async function loadTemplate(id) {
  if (!/^[a-z0-9-]{3,60}$/.test(id)) throw new Error("bad template id");
  return getJSON(`templates/${id}.json`);
}

// Copies a template into quizzes/ for this user and returns the new quiz id.
export async function importTemplate(id, uid) {
  const tpl = await loadTemplate(id);
  const ref = await addDoc(collection(fs, "quizzes"), {
    ownerUid: uid,
    title: tpl.title,
    description: tpl.description || "",
    questions: tpl.questions,
    source: { template: tpl.id, lang: tpl.lang },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
