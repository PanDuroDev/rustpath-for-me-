(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById("theme-toggle");
  function applyTheme(theme) {
    const light = theme === "light";
    root.dataset.theme = light ? "light" : "dark";
    themeButton.innerHTML = light
      ? '<i data-lucide="moon" aria-hidden="true"></i><span class="theme-label">الوضع الداكن</span>'
      : '<i data-lucide="sun" aria-hidden="true"></i><span class="theme-label">الوضع الفاتح</span>';
    themeButton.setAttribute("aria-label", light ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع الفاتح");
    if (window.lucide) window.lucide.createIcons();
  }
  let theme = "dark";
  try { theme = localStorage.getItem("rustpath-theme") || "dark"; } catch (_) {}
  applyTheme(theme);
  themeButton.addEventListener("click", () => {
    theme = root.dataset.theme === "light" ? "dark" : "light";
    applyTheme(theme);
    try { localStorage.setItem("rustpath-theme", theme); } catch (_) {}
  });

  const source = "https://raw.githubusercontent.com/PanDuroDev/rustpath-for-me-/main/LEARNING_PROGRESS.md";
  const content = document.getElementById("markdown-content");
  const status = document.querySelector(".source-status");
  const message = document.getElementById("source-message");
  const updated = document.getElementById("source-updated");
  async function loadProgress() {
    message.textContent = "جارٍ تحميل سجل التقدم…";
    status.classList.remove("is-error", "is-loaded");
    content.innerHTML = '<div class="loading-state"><span class="loading-spinner"></span><p>جارٍ جلب الملف من GitHub…</p></div>';
    try {
      const response = await fetch(source, {cache:"no-store"});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const markdown = await response.text();
      if (!window.marked || !window.DOMPurify) throw new Error("تعذر تحميل أدوات عرض Markdown");
      const rendered = window.marked.parse(markdown, {gfm:true, breaks:false});
      content.innerHTML = window.DOMPurify.sanitize(rendered);
      message.textContent = "تم تحميل أحدث نسخة من GitHub";
      status.classList.add("is-loaded");
      updated.textContent = "آخر تحديث: " + new Date().toLocaleString("ar");
    } catch (error) {
      message.textContent = "تعذر تحميل الملف";
      status.classList.add("is-error");
      content.innerHTML = '<div class="error-state"><div><h2>لم نتمكن من عرض سجل التقدم</h2><p>قد يكون GitHub غير متاح مؤقتاً أو فشل تحميل مكتبة العرض.</p><a href="https://github.com/PanDuroDev/rustpath-for-me-/blob/main/LEARNING_PROGRESS.md" target="_blank" rel="noreferrer">افتح الملف مباشرة على GitHub</a></div></div>';
    }
  }
  document.getElementById("reload-progress").addEventListener("click", loadProgress);
  if (window.lucide) window.lucide.createIcons();
  loadProgress();
})();