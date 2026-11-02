(() => {
  const root = document.documentElement;
  const button = document.getElementById("theme-toggle");
  const labels = { dark: "الوضع الفاتح", light: "الوضع الداكن" };

  const syncTheme = () => {
    const theme = root.dataset.theme === "light" ? "light" : "dark";
    if (!button) return;
    button.textContent = labels[theme];
    button.setAttribute("aria-label", labels[theme]);
  };

  syncTheme();

  if (button) {
    button.addEventListener("click", () => {
      const next = root.dataset.theme === "light" ? "dark" : "light";
      root.dataset.theme = next;
      try {
        localStorage.setItem("rustpath-theme", next);
      } catch (_) {}
      syncTheme();
    });
  }

  document.querySelectorAll("[data-copy]").forEach((copyButton) => {
    copyButton.addEventListener("click", async () => {
      const block = copyButton.closest(".code-block");
      const code = block?.querySelector("pre code");
      if (!code) return;
      const text = code.textContent;
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        selection.removeAllRanges();
      }
      copyButton.textContent = "تم النسخ";
      setTimeout(() => {
        copyButton.textContent = "نسخ";
      }, 1500);
    });
  });
})();
