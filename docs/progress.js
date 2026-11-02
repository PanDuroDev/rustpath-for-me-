(() => {
  const content = document.getElementById("markdown-content");
  const message = document.getElementById("source-message");
  const updated = document.getElementById("source-updated");
  const status = document.querySelector(".source-status");
  const errorBox = document.getElementById("progress-error");
  const rawUrl = "https://raw.githubusercontent.com/PanDuroDev/rustpath-for-me-/main/LEARNING_PROGRESS.md";

  function showLoading() {
    const paragraph = document.createElement("p");
    paragraph.className = "loading-state";
    paragraph.textContent = "جارٍ تحميل السجل…";
    content.replaceChildren(paragraph);
  }

  function prepareRenderedContent() {
    content.querySelectorAll("h1, h2, h3, h4, p, li, ul, ol, blockquote, th, td").forEach((node) => {
      node.setAttribute("dir", "auto");
    });
    content.querySelectorAll("table").forEach((table, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "table-scroll";
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("tabindex", "0");
      wrapper.setAttribute("aria-label", "جدول سجل التقدم " + (index + 1));
      table.parentNode.insertBefore(wrapper, table);
      wrapper.append(table);
    });
  }

  async function fetchMarkdown(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.text();
  }

  async function loadProgress() {
    message.textContent = "جارٍ تحميل سجل التقدم…";
    updated.textContent = "";
    status.classList.remove("is-error", "is-loaded");
    errorBox.hidden = true;
    showLoading();

    try {
      let markdown;
      let sourceLabel;
      try {
        markdown = await fetchMarkdown("./LEARNING_PROGRESS.md");
        sourceLabel = "تم تحميل نسخة النشر المحلية";
      } catch (_) {
        markdown = await fetchMarkdown(rawUrl);
        sourceLabel = "تم تحميل النسخة من GitHub";
      }

      if (!window.marked || !window.DOMPurify) throw new Error("تعذر تحميل مكتبات عرض Markdown");
      const dateMatch = markdown.match(/^\s*>?\s*Last updated:\s*(\d{4}-\d{2}-\d{2})\s*$/m);
      const date = dateMatch ? dateMatch[1] : "غير محدد";
      const rendered = window.marked.parse(markdown, { gfm: true, breaks: false });
      const sanitized = window.DOMPurify.sanitize(rendered);
      content.innerHTML = sanitized;
      prepareRenderedContent();
      message.textContent = sourceLabel;
      updated.textContent = "آخر تحديث: " + date;
      status.classList.add("is-loaded");
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    } catch (error) {
      message.textContent = "تعذر تحميل سجل التقدم";
      status.classList.add("is-error");
      errorBox.hidden = false;
      const heading = document.createElement("h2");
      heading.textContent = "لم نتمكن من عرض سجل التقدم";
      const detail = document.createElement("p");
      detail.textContent = "سبب الخطأ: " + error.message;
      content.replaceChildren(heading, detail);
    }
  }

  document.getElementById("reload-progress").addEventListener("click", loadProgress);
  loadProgress();
})();
