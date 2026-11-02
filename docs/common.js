(() => {
  const root = document.documentElement;
  const button = document.getElementById("theme-toggle");
  const meta = document.querySelector('meta[name="theme-color"]');

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function applyTheme(theme, persist = false) {
    const selected = theme === "light" ? "light" : "dark";
    root.dataset.theme = selected;
    if (meta) meta.content = selected === "light" ? "#ffffff" : "#090909";
    if (button) {
      const light = selected === "light";
      const icon = document.createElement("i");
      icon.setAttribute("aria-hidden", "true");
      icon.dataset.lucide = light ? "moon" : "sun";
      const label = document.createElement("span");
      label.className = "theme-label";
      label.textContent = light ? "الوضع الداكن" : "الوضع الفاتح";
      button.replaceChildren(icon, label);
      button.setAttribute("aria-label", light ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع الفاتح");
      button.title = light ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع الفاتح";
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    }
    if (persist) {
      try { localStorage.setItem("rustpath-theme", selected); } catch (_) { /* Storage may be unavailable. */ }
    }
  }

  let initialTheme = root.dataset.theme || systemTheme();
  try {
    const saved = localStorage.getItem("rustpath-theme");
    if (saved === "light" || saved === "dark") initialTheme = saved;
  } catch (_) { /* Keep the theme selected before first paint. */ }
  applyTheme(initialTheme);

  if (button) {
    button.addEventListener("click", () => {
      applyTheme(root.dataset.theme === "light" ? "dark" : "light", true);
    });
  }
})();
