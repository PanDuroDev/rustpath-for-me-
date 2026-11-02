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
      clearTimeout(copyButton.copyTimer);
      copyButton.copyTimer = setTimeout(() => {
        if (label) label.textContent = "نسخ";
        else copyButton.textContent = "نسخ";
        if (copyIcon) copyIcon.setAttribute("icon", "mingcute:copy-2-fill");
        delete copyButton.dataset.copied;
      }, 1500);
    });
  });

  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const targets = document.querySelectorAll(
      ".stat-card, .current-card, .phase-card, .topic-item, .lesson, .lesson-prose > *, .principles, .journey-pager, .site-footer .footer-top, .site-footer .footer-bottom",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    targets.forEach((element) => {
      const index = [...element.parentElement.children].indexOf(element);
      element.classList.add("reveal");
      element.style.setProperty("--reveal-delay", `${Math.min(index, 4) * 60}ms`);
      observer.observe(element);
    });
    // Fallback so above-the-fold content never stays hidden if the observer is late.
    setTimeout(() => {
      targets.forEach((element) => {
        if (element.getBoundingClientRect().top < innerHeight) element.classList.add("is-visible");
      });
    }, 600);
  }
  const search = document.getElementById("lesson-search");
  const searchIndex = document.getElementById("lesson-search-index");
  const searchResults = document.getElementById("search-results");
  if (search && searchIndex && searchResults) {
    const normalize = (value) => value.replace(/[\u064B-\u0652]/g, "").toLowerCase().trim();
    const lessons = JSON.parse(searchIndex.textContent);

    search.addEventListener("input", () => {
      const query = normalize(search.value);
      searchResults.replaceChildren();
      if (query.length < 2) {
        searchResults.hidden = true;
        return;
      }
      const matches = lessons
        .filter((lesson) => normalize(`${lesson.title} ${lesson.summary} ${lesson.stageTitle}`).includes(query))
        .slice(0, 8);
      searchResults.hidden = false;
      if (!matches.length) {
        const empty = document.createElement("li");
        empty.className = "search-empty";
        empty.textContent = "لا توجد دروس مطابقة.";
        searchResults.append(empty);
        return;
      }
      for (const lesson of matches) {
        const link = document.createElement("a");
        link.href = lesson.url;
        const title = document.createElement("span");
        title.className = "result-title";
        title.textContent = lesson.title;
        const meta = document.createElement("span");
        meta.className = "result-meta";
        meta.textContent = `المرحلة ${lesson.stage} · الدرس ${String(lesson.id).padStart(2, "0")}`;
        link.append(title, meta);
        const item = document.createElement("li");
        item.append(link);
        searchResults.append(item);
      }
    });
  }
  const toTop = document.querySelector("[data-to-top]");
  if (toTop) {
    const syncToTop = () => toTop.classList.toggle("is-visible", scrollY > 600);
    syncToTop();
    addEventListener("scroll", syncToTop, { passive: true });
    toTop.addEventListener("click", () => scrollTo({ top: 0 }));
  }

  const lessonPage = document.querySelector("[data-lesson-page]");
  if (lessonPage) {
    const positionKey = `rustpath-pos-${lessonPage.dataset.lessonSlug}`;
    try {
      const saved = Number(localStorage.getItem(positionKey));
      if (saved > 300 && !location.hash) requestAnimationFrame(() => scrollTo({ top: saved }));
    } catch (_) {}
    let saveTimer;
    addEventListener("scroll", () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(positionKey, String(Math.round(scrollY)));
        } catch (_) {}
      }, 250);
    }, { passive: true });
  }

  document.querySelectorAll("[data-slug]").forEach((row) => {
    try {
      if (localStorage.getItem(`rustpath:done:${row.dataset.slug}`)) row.classList.add("is-done-local");
    } catch (_) {}
  });

  // Rust runs on several free public services; the first successful result wins.
  const providers = [
    async (code) => {
      const response = await fetch("https://play.rust-lang.org/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          channel: "stable",
          mode: "debug",
          edition: "2021",
          crateType: "bin",
          tests: false,
          code,
          backtrace: false,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.success
        ? { ok: true, text: (data.stdout || "").trim() }
        : { ok: false, text: (data.stderr || "").trim() || "فشل التنفيذ." };
    },
    async (code) => {
      const response = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ source_code: code, language_id: 73, stdin: "" }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.status && data.status.id === 3
        ? { ok: true, text: (data.stdout || "").trim() }
        : { ok: false, text: (data.compile_output || data.stderr || "").trim() || "فشل التنفيذ." };
    },
    async (code) => {
      const response = await fetch("https://wandbox.org/api/compile.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ compiler: "rust-1.82.0", code }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.status === "0"
        ? { ok: true, text: (data.program_output || "").trim() }
        : { ok: false, text: (data.compiler_error || data.program_error || "").trim() || "فشل التنفيذ." };
    },
  ];

  const runRust = (code) =>
    new Promise((resolve) => {
      let pending = providers.length;
      let failure = null;
      let settled = false;
      const fail = (result) => {
        if (!failure && result) failure = result;
        pending -= 1;
        if (!pending && !settled) {
          settled = true;
          resolve(failure || { ok: false, text: "تعذر الوصول إلى خدمة التشغيل. تحقق من الاتصال ثم حاول مرة أخرى." });
        }
      };
      providers.forEach((provider) => {
        provider(code)
          .then((result) => {
            if (settled) return;
            if (result.ok) {
              settled = true;
              resolve(result);
              return;
            }
            fail(result);
          })
          .catch(() => fail(null));
      });
    });

  document.querySelectorAll("[data-run]").forEach((button) => {
    button.addEventListener("click", async () => {
      const block = button.closest(".code-block");
      const code = block.querySelector("pre code").textContent;
      const label = button.querySelector(".run-label");
      const original = label.textContent;
      let output = block.querySelector(".code-output");
      if (!output) {
        output = document.createElement("div");
        output.className = "code-output";
        output.setAttribute("role", "status");
        output.innerHTML = '<pre dir="ltr"></pre>';
        block.append(output);
      }
      const pre = output.querySelector("pre");
      label.textContent = "جارٍ التنفيذ…";
      button.disabled = true;
      output.dataset.state = "pending";
      pre.textContent = "…";
      try {
        const result = await runRust(code);
        pre.textContent = result.text || (result.ok ? "(لا يوجد ناتج)" : "فشل التنفيذ.");
        output.dataset.state = result.ok ? "ok" : "error";
      } catch (_) {
        pre.textContent = "تعذر تنفيذ الكود. تحقق من الاتصال ثم حاول مرة أخرى.";
        output.dataset.state = "error";
      } finally {
        label.textContent = original;
        button.disabled = false;
      }
    });
  });
})();
