// Applies the saved theme before first paint (a separate file because the CSP blocks inline scripts).
// "veyra.prefs" = STORAGE_PREFIX + "prefs" (shared/config.ts).
(function () {
  var t = "system";
  try { t = (JSON.parse(localStorage.getItem("veyra.prefs") || "{}").theme) || "system"; } catch (e) {}
  var dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", dark ? "#11131E" : "#ECEEF7");
})();
