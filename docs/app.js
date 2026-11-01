// Values mirror the verified state in LEARNING_PROGRESS.md.
// This static dashboard never marks lessons complete automatically.
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

  if (window.lucide) {
    window.lucide.createIcons();
  }
})();