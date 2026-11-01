// Dashboard values are intentionally mirrored from LEARNING_PROGRESS.md.
// This is a static GitHub Pages site; browser interactions do not write to GitHub.
(() => {
  const completed = 3;
  const total = 4;
  const percent = Math.round((completed / total) * 100);
  document.getElementById("completed-count").textContent = String(completed);
  document.getElementById("lesson-count").textContent = String(total);
  document.getElementById("progress-fill").style.width = percent + "%";
  document.querySelector('[role="progressbar"]').setAttribute("aria-valuenow", String(completed));
  document.getElementById("progress-caption").textContent = percent + "% من دروس المرحلة الأولى مكتملة";
})();