// RustPath dashboard interactions. The Markdown file remains the canonical record.
(() => {
  const completed = 3, total = 4, percent = Math.round(completed / total * 100);
  const byId = (id) => document.getElementById(id);
  byId("completed-count").textContent = String(completed);
  byId("lesson-count").textContent = String(total);
  byId("progress-percent").innerHTML = percent + "<small>%</small>";
  byId("progress-fill").style.width = percent + "%";
  byId("progress-caption").textContent = percent + "%";
  document.querySelector('[role="progressbar"]').setAttribute("aria-valuenow", String(completed));

  const root = document.documentElement, themeButton = byId("theme-toggle");
  function applyTheme(theme) {
    const light = theme === "light";
    root.dataset.theme = light ? "light" : "dark";
    themeButton.innerHTML = light
      ? '<i data-lucide="moon" aria-hidden="true"></i><span class="theme-label">الوضع الداكن</span>'
      : '<i data-lucide="sun" aria-hidden="true"></i><span class="theme-label">الوضع الفاتح</span>';
    themeButton.setAttribute("aria-label", light ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع الفاتح");
    themeButton.title = light ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع الفاتح";
    if (window.lucide) window.lucide.createIcons();
  }
  let savedTheme = "dark";
  try { savedTheme = localStorage.getItem("rustpath-theme") || "dark"; } catch (_) {}
  applyTheme(savedTheme);
  themeButton.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
    try { localStorage.setItem("rustpath-theme", next); } catch (_) {}
  });

  const filters = [...document.querySelectorAll(".filter-button")];
  const lessons = [...document.querySelectorAll(".lesson-list .lesson")];
  const feedback = byId("filter-feedback");
  const messages = {all:"تعرض جميع دروس المرحلة الحالية.",done:"تعرض الدروس التي اجتازت التقييم فقط.",active:"تعرض الدرس الذي نعمل عليه الآن.",upcoming:"لا توجد دروس تالية داخل المرحلة الحالية."};
  filters.forEach((button) => button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filters.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    lessons.forEach((lesson) => { lesson.hidden = !(filter === "all" || lesson.classList.contains(filter)); });
    feedback.textContent = messages[filter];
  }));

  const phases = [...document.querySelectorAll(".phase-card")];
  phases.forEach((phase, index) => {
    const heading = phase.querySelector(".phase-head"), topics = phase.querySelector(".topic-list");
    if (!heading || !topics) return;
    const button = document.createElement("button");
    button.type = "button"; button.className = "phase-expand";
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-label", "إظهار أو إخفاء موضوعات المرحلة " + (index + 1));
    button.innerHTML = '<i data-lucide="chevron-up" aria-hidden="true"></i>';
    heading.append(button);
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded)); topics.hidden = expanded;
      button.innerHTML = expanded ? '<i data-lucide="chevron-down" aria-hidden="true"></i>' : '<i data-lucide="chevron-up" aria-hidden="true"></i>';
      if (window.lucide) window.lucide.createIcons();
    });
  });
  let expanded = true;
  byId("expand-phases").addEventListener("click", (event) => {
    expanded = !expanded;
    phases.forEach((phase) => {
      const button = phase.querySelector(".phase-expand"), topics = phase.querySelector(".topic-list");
      if (!button || !topics) return;
      button.setAttribute("aria-expanded", String(expanded)); topics.hidden = !expanded;
      button.innerHTML = expanded ? '<i data-lucide="chevron-up" aria-hidden="true"></i>' : '<i data-lucide="chevron-down" aria-hidden="true"></i>';
    });
    event.currentTarget.textContent = expanded ? "طي كل المراحل" : "فتح كل المراحل";
    if (window.lucide) window.lucide.createIcons();
  });
  if (window.lucide) window.lucide.createIcons();
})();