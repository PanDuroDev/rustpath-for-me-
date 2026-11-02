(() => {
  const root = document.documentElement;
  const button = document.getElementById("theme-toggle");
  const labels = { dark: "الوضع الفاتح", light: "الوضع الداكن" };
  // Static icons avoid replaying the Line MD animation on every page load.
  const icons = { dark: "mingcute:sun-fill", light: "mingcute:moon-fill" };
  const animatedIcons = { dark: "line-md:sunny-outline-to-moon-transition", light: "line-md:moon-to-sunny-outline-transition" };
  let iconTimer;

  const syncTheme = () => {
    const theme = root.dataset.theme === "light" ? "light" : "dark";
    if (!button) return;
    const label = button.querySelector(".theme-label");
    const icon = button.querySelector(".theme-icon");
    if (label) label.textContent = labels[theme];
    else button.textContent = labels[theme];
    if (icon) icon.setAttribute("icon", icons[theme]);
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
      const icon = button.querySelector(".theme-icon");
      if (!icon) return;
      icon.setAttribute("icon", animatedIcons[next]);
      clearTimeout(iconTimer);
      iconTimer = setTimeout(() => icon.setAttribute("icon", icons[next]), 700);
    });
  }

  document.querySelectorAll("[data-phase-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const target = document.getElementById(toggle.dataset.phaseToggle);
      if (!target) return;
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      target.hidden = expanded;
      toggle.setAttribute("aria-expanded", String(!expanded));
      const label = toggle.querySelector(".phase-toggle-label");
      const text = expanded ? toggle.dataset.expandLabel : toggle.dataset.collapseLabel;
      if (label) label.textContent = text;
      else toggle.textContent = text;
    });
  });

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
      const label = copyButton.querySelector(".copy-label");
      const copyIcon = copyButton.querySelector(".copy-icon");
      if (label) label.textContent = "تم النسخ";
      else copyButton.textContent = "تم النسخ";
      if (copyIcon) copyIcon.setAttribute("icon", "line-md:clipboard-to-clipboard-check-transition");
      copyButton.dataset.copied = "true";
      setTimeout(() => {
        if (label) label.textContent = "نسخ";
        else copyButton.textContent = "نسخ";
        if (copyIcon) copyIcon.setAttribute("icon", "mingcute:copy-2-fill");
        delete copyButton.dataset.copied;
      }, 1500);
    });
  });
})();
