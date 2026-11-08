// Legal pages: each page holds one <article data-lang="…"> per language; show the one matching the UI.
// The French version prevails (stated on every page).
import { $, $$ } from "./utils.js";
import { initI18n, mountLangToggle, onLangChange, getLang } from "./i18n.js";

initI18n();
mountLangToggle($("#controls"));

function show() {
  const lang = getLang();
  const articles = $$("article[data-lang]");
  const target = articles.some((a) => a.dataset.lang === lang) ? lang : "fr";
  articles.forEach((a) => { a.hidden = a.dataset.lang !== target; });
}
show();
onLangChange(show);
