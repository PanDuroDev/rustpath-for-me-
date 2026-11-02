(() => {
  const content = document.getElementById("markdown-content");
  const message = document.getElementById("source-message");
  const updated = document.getElementById("source-updated");
  const status = document.querySelector(".source-status");
  const errorBox = document.getElementById("progress-error");
  const rawUrl = "https://raw.githubusercontent.com/PanDuroDev/rustpath-for-me-/main/LEARNING_PROGRESS.md";

  function t(key) {
    return window.RustPathI18n ? window.RustPathI18n.t(key) : key;
  }
  function showLoading() {
    const paragraph = document.createElement("p");
    paragraph.className = "loading-state";
    paragraph.textContent = t("loadingFile");
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
      wrapper.setAttribute("aria-label", t("progressTable") + " " + (index + 1));
      table.parentNode.insertBefore(wrapper, table);
      wrapper.append(table);
    });
  }
  async function fetchMarkdown(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.text();
  }
  let loadSequence = 0;
  async function loadProgress() {
    const sequence = ++loadSequence;
    message.textContent = t("loadingProgress");
    updated.textContent = "";
    status.classList.remove("is-error", "is-loaded");
    errorBox.hidden = true;
    showLoading();
    try {
      let markdown;
      let sourceLabel;
      try {
        markdown = await fetchMarkdown("./LEARNING_PROGRESS.md");
        sourceLabel = t("sourceLocal");
      } catch (_) {
        markdown = await fetchMarkdown(rawUrl);
        sourceLabel = t("sourceGitHub");
      }
      if (sequence !== loadSequence) return;
      if (!window.marked || !window.DOMPurify) throw new Error("Markdown rendering dependencies could not be loaded.");
      const dateMatch = markdown.match(/^\s*>?\s*Last updated:\s*(\d{4}-\d{2}-\d{2})\s*$/m);
      const date = dateMatch ? dateMatch[1] : (document.documentElement.lang === "en" ? "Not recorded" : "غير محدد");
      const rendered = window.marked.parse(markdown, { gfm: true, breaks: false });
      content.innerHTML = window.DOMPurify.sanitize(rendered);
      prepareRenderedContent();
      message.textContent = sourceLabel;
      updated.textContent = t("lastUpdated") + ": " + date;
      status.classList.add("is-loaded");
      if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
    } catch (error) {
      if (sequence !== loadSequence) return;
      message.textContent = t("progressError");
      status.classList.add("is-error");
      errorBox.hidden = false;
      const heading = document.createElement("h2");
      heading.textContent = t("progressError");
      const detail = document.createElement("p");
      detail.textContent = error.message;
      content.replaceChildren(heading, detail);
    }
  }
  document.getElementById("reload-progress").addEventListener("click", loadProgress);
  window.addEventListener("rustpath:languagechange", loadProgress);
  loadProgress();
})();