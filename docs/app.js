// Dashboard progress and appearance preferences.
(() => {
  const completed = 3;
  const total = 4;
  const percent = Math.round((completed / total) * 100);

  document.getElementById("completed-count").textContent = String(completed);
  document.getElementById("lesson-count").textContent = String(total);
  document.getElementById("progress-percent").innerHTML = percent + "<small>%</small>";
  document.getElementById("progress-fill").style.width = percent + "%";
  document.getElementById("progress-caption").textContent = percent + "%";
  document.querySelector('[role="progressbar"]').setAttribute("aria-valuenow", String(completed));

  const root = document.documentElement;
  const themeButton = document.getElementById("theme-toggle");

  function applyTheme(theme) {
    const isLight = theme === "light";
    root.dataset.theme = isLight ? "light" : "dark";
    themeButton.innerHTML = isLight
      ? '<i data-lucide="moon" aria-hidden="true"></i><span class="theme-label">الوضع الداكن</span>'
      : '<i data-lucide="sun" aria-hidden="true"></i><span class="theme-label">الوضع الفاتح</span>';
    themeButton.setAttribute("aria-label", isLight ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع الفاتح");
    themeButton.title = isLight ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع الفاتح";
    if (window.lucide) window.lucide.createIcons();
  }

  let savedTheme = "dark";
  try {
    savedTheme = localStorage.getItem("rustpath-theme") || "dark";
  } catch (_) {}
  applyTheme(savedTheme);

  themeButton.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
    try {
      localStorage.setItem("rustpath-theme", nextTheme);
    } catch (_) {}
  });

  if (window.lucide) window.lucide.createIcons();
})();