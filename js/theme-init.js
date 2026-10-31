// Runs synchronously in <head> (classic script, not a module) so the saved theme
// is applied before first paint — no light/dark flash.
(function () {
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch {
    /* storage unavailable — follow the OS setting */
  }
})();
