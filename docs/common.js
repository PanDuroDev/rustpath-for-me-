(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById("theme-toggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const descriptionMeta = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  const isProgressPage = location.pathname.endsWith("progress.html");

  const strings = {
    ar: {
      skip:"انتقل إلى المحتوى",nav:"روابط رئيسية",light:"الوضع الفاتح",dark:"الوضع الداكن",
      dashboard:"لوحة التعلّم",progress:"سجل التقدم",roadmap:"خطة التعلّم",repository:"المستودع",
      heroEyebrow:"منهج تعلّم من الصفر",heroTitleOne:"اكتب أقل تخميناً.",heroTitleTwo:"وافهم أكثر.",
      heroLead:"رحلة منظّمة لتعلّم Rust، تبدأ من فهم البرمجة نفسها وتنتهي ببناء مشاريع حقيقية. لا قفز فوق الأساسيات، ولا يُعتبر الدرس مكتملاً قبل إثبات فهمه.",
      continue:"تابع من حيث توقفت",loadError:"تعذر تحميل خطة التقدم من progress.json. تحقق من اتصالك ثم أعد تحميل الصفحة، أو افتح",
      stats:"ملخص التقدم",completed:"العناصر المكتملة",overall:"التقدم العام",phaseProgress:"تقدم المرحلة الحالية",
      currentEyebrow:"نقطة الاستئناف",currentTitle:"أكمل الدرس الحالي",active:"قيد التنفيذ",
      lessonsEyebrow:"الخطة بالتفصيل",lessonsTitle:"الدروس والمشاريع",lessonsDescription:"اختر المرحلة ثم صفِّ عناصرها حسب حالة التقدم.",
      phaseTabs:"اختيار المرحلة",filterLabel:"تصفية العناصر",all:"الكل",done:"مكتمل",upcoming:"قادم",project:"مشروع",
      nextEyebrow:"الخطوة التالية في المنهج",nextPending:"جارٍ تحديد الخطوة التالية…",nextFallback:"تُشتق الخطوة التالية من أول عنصر قادم في سجل التقدم.",
      nextWait:"تُفتح بعد إكمال المتطلبات",allComplete:"اكتملت جميع عناصر المنهج",noUpcoming:"لا توجد عناصر قادمة مسجلة حالياً.",
      roadmapEyebrow:"الصورة الكاملة",roadmapTitle:"مراحل المنهج",roadmapDescription:"ست مراحل متدرجة تضم 43 درساً ومشروعاً، وحالة كل عنصر معروضة من مصدر التقدم نفسه.",
      roadmapHint:"يمكنك فتح موضوعات كل مرحلة أو إخفاؤها بشكل مستقل.",expandAll:"فتح كل المراحل",collapseAll:"طي كل المراحل",
      showTopics:"عرض الموضوعات",hideTopics:"طي الموضوعات",items:"عناصر",lessonsIn:"تعرض جميع عناصر",filterIn:"تعرض",
      emptyState:"لا توجد عناصر بهذه الحالة في المرحلة المختارة.",emptyUpcoming:"لا توجد عناصر قادمة داخل هذه المرحلة. الخطوة التالية للمنهج موضحة في البطاقة أسفل القائمة.",
      filterFeedback:"تعرض جميع عناصر المرحلة الحالية.",loadFailedCurrent:"تعذر عرض الدرس الحالي بسبب فشل تحميل مصدر التقدم.",
      loadFailedItems:"تعذر تحميل قائمة الدروس والمشاريع.",loadFailedTitle:"تعذر تحديد الخطوة التالية",
      loadFailedDescription:"تعذر تحميل مصدر التقدم. أعد تحميل الصفحة بعد التحقق من الاتصال.",
      evidence:"الدليل",remaining:"المتبقي",phaseDone:"مكتملة",phaseActive:"قيد التنفيذ",phaseUpcoming:"قادمة",
      principleTitle:"التقدم يُثبت، لا يُفترض.",principleBody:"لن ننتقل من درس إلى آخر لمجرد قراءة الشرح. ستنفذ تطبيقاً قصيراً وتجيب عن اختبار، وبعدها فقط يتغير سجل التقدم.",
      footerProgress:"عرض سجل التقدم",footerLicense:"ترخيص MIT",footerOpen:"منهج تعلّم مفتوح المصدر",
      pageHomeTitle:"RustPath — تعلّم Rust من الصفر",pageHomeDescription:"مسار عملي ومنظم لتعلّم لغة Rust من الصفر مع متابعة تقدم موثّقة.",
      pageProgressTitle:"سجل التقدم — RustPath",pageProgressDescription:"سجل التقدم المعتمد في منهج RustPath، مع عرض واضح لحالة الدروس والمشاريع.",
      progressEyebrow:"سجل المنهج المعتمد",progressTitle:"سجل",progressTitleEnd:"التقدم",
      progressDescription:"نسخة مقروءة من ملف LEARNING_PROGRESS.md الموجود في المستودع، مع تاريخ التحديث المسجل داخل الملف نفسه.",
      reload:"تحديث",rawMarkdown:"Markdown الخام",loading:"جارٍ تحميل سجل التقدم…",loadingProgress:"جارٍ تحميل سجل التقدم…",
      loadingFile:"جارٍ تحميل السجل…",sourceLocal:"تم تحميل نسخة النشر المحلية",sourceGitHub:"تم تحميل النسخة من GitHub",
      lastUpdated:"آخر تحديث",progressError:"تعذر تحميل سجل التقدم من النسخة المنشورة أو من GitHub.",
      openGitHub:"افتح الملف مباشرة على GitHub",progressContent:"محتوى سجل التقدم",progressFooter:"العودة إلى لوحة التعلّم",
      progressSource:"المصدر: PanDuroDev/rustpath-for-me-",languageButton:"English",languageAction:"التبديل إلى الواجهة الإنجليزية",
      progressTable:"جدول سجل التقدم"
    },
    en: {
      skip:"Skip to content",nav:"Main navigation",light:"Light mode",dark:"Dark mode",
      dashboard:"Dashboard",progress:"Progress log",roadmap:"Learning plan",repository:"Repository",
      heroEyebrow:"A beginner-friendly learning path",heroTitleOne:"Guess less.",heroTitleTwo:"Understand more.",
      heroLead:"A structured journey through Rust, starting with programming fundamentals and ending with practical projects. No skipped foundations, and no lesson is complete without demonstrated understanding.",
      continue:"Continue where you left off",loadError:"The learning plan could not be loaded from progress.json. Check your connection and reload the page, or open",
      stats:"Progress overview",completed:"Completed items",overall:"Overall progress",phaseProgress:"Current phase progress",
      currentEyebrow:"Resume learning",currentTitle:"Continue the current lesson",active:"In progress",
      lessonsEyebrow:"The curriculum",lessonsTitle:"Lessons and projects",lessonsDescription:"Choose a phase, then filter its items by progress status.",
      phaseTabs:"Choose a phase",filterLabel:"Filter items",all:"All",done:"Completed",upcoming:"Upcoming",project:"Project",
      nextEyebrow:"Next in the curriculum",nextPending:"Finding the next step…",nextFallback:"The next step is derived from the first upcoming item in the progress record.",
      nextWait:"Available after prerequisites are completed",allComplete:"All curriculum items are complete",noUpcoming:"There are no upcoming items recorded.",
      roadmapEyebrow:"The full picture",roadmapTitle:"Curriculum phases",roadmapDescription:"Six progressive phases containing 43 lessons and projects. Every status comes from the same progress source.",
      roadmapHint:"Expand or collapse the topics in each phase independently.",expandAll:"Expand all phases",collapseAll:"Collapse all phases",
      showTopics:"Show topics",hideTopics:"Hide topics",items:"items",lessonsIn:"Showing all items in",filterIn:"Showing",
      emptyState:"There are no items with this status in the selected phase.",emptyUpcoming:"There are no upcoming items in this phase. The next curriculum step is shown in the card below.",
      filterFeedback:"Showing all items in the selected phase.",loadFailedCurrent:"The current lesson could not be displayed because the progress source failed to load.",
      loadFailedItems:"The lessons and projects could not be loaded.",loadFailedTitle:"The next step is unavailable",
      loadFailedDescription:"The progress source could not be loaded. Check your connection and reload the page.",
      evidence:"Evidence",remaining:"Remaining",phaseDone:"Complete",phaseActive:"In progress",phaseUpcoming:"Upcoming",
      principleTitle:"Progress is demonstrated, not assumed.",principleBody:"We will not move on just because a lesson was read. Complete a short exercise and answer a quiz before the progress record changes.",
      footerProgress:"View progress log",footerLicense:"MIT License",footerOpen:"Open learning curriculum",
      pageHomeTitle:"RustPath — Learn Rust from Zero",pageHomeDescription:"A structured, practical path to learn Rust from the ground up with verified progress tracking.",
      pageProgressTitle:"Progress Log — RustPath",pageProgressDescription:"The verified learning record for the RustPath curriculum, with lesson and project statuses.",
      progressEyebrow:"Canonical curriculum record",progressTitle:"Progress",progressTitleEnd:"log",
      progressDescription:"A readable view of LEARNING_PROGRESS.md in the repository. The update date is read from the file itself.",
      reload:"Reload",rawMarkdown:"Raw Markdown",loading:"Loading progress log…",loadingProgress:"Loading progress log…",
      loadingFile:"Loading the record…",sourceLocal:"Loaded the published local copy",sourceGitHub:"Loaded the copy from GitHub",
      lastUpdated:"Last updated",progressError:"The progress log could not be loaded from the published copy or GitHub.",
      openGitHub:"Open the file directly on GitHub",progressContent:"Progress log content",progressFooter:"Back to the learning dashboard",
      progressSource:"Source: PanDuroDev/rustpath-for-me-",languageButton:"العربية",languageAction:"Switch interface to Arabic",
      progressTable:"Progress table"
    }
  };

  let language = "ar";
  let languageButton = null;
  function t(key) { return strings[language][key] || strings.en[key] || strings.ar[key] || key; }
  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }
  function setLastTextNode(selector, value) {
    const node = document.querySelector(selector);
    if (!node) return;
    const nodes = [...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE);
    if (nodes.length) nodes[nodes.length - 1].nodeValue = " " + value;
  }
  function setSpanText(selector, value) {
    const node = document.querySelector(selector);
    if (!node) return;
    const span = node.querySelector("span");
    if (span) span.textContent = value;
    else setLastTextNode(selector, value);
  }

  function applyStaticText() {
    const home = !isProgressPage;
    document.title = t(home ? "pageHomeTitle" : "pageProgressTitle");
    if (descriptionMeta) descriptionMeta.content = t(home ? "pageHomeDescription" : "pageProgressDescription");
    if (ogTitle) ogTitle.content = document.title;
    if (ogDescription) ogDescription.content = t(home ? "heroLead" : "progressDescription");
    if (ogLocale) ogLocale.content = language === "en" ? "en_US" : "ar_AR";

    setText(".skip-link", t("skip"));
    const nav = document.querySelector(".top-actions");
    if (nav) nav.setAttribute("aria-label", t("nav"));
    const brand = document.querySelector(".brand");
    if (brand) brand.setAttribute("aria-label", language === "en" ? "RustPath home page" : "RustPath الصفحة الرئيسية");

    if (themeButton) {
      const isLight = root.dataset.theme === "light";
      const icon = document.createElement("i");
      icon.dataset.lucide = isLight ? "moon" : "sun";
      icon.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "theme-label";
      label.textContent = t(isLight ? "dark" : "light");
      themeButton.replaceChildren(icon, label);
      themeButton.setAttribute("aria-label", t(isLight ? "dark" : "light"));
      themeButton.title = t(isLight ? "dark" : "light");
    }
    if (languageButton) {
      languageButton.textContent = t("languageButton");
      languageButton.setAttribute("aria-label", t("languageAction"));
      languageButton.title = t("languageAction");
    }

    const navLinks = [...document.querySelectorAll(".top-actions .nav-link")];
    if (home) {
      setSpanText(".repo-link", t("repository"));
      if (navLinks[0]) setSpanText(".top-actions .nav-link:nth-of-type(1)", t("progress"));
      if (navLinks[1]) setSpanText(".top-actions .nav-link:nth-of-type(2)", t("roadmap"));
      setLastTextNode(".hero .eyebrow", t("heroEyebrow"));
      const heading = document.querySelector(".hero h1");
      if (heading) {
        if (heading.firstChild && heading.firstChild.nodeType === Node.TEXT_NODE) heading.firstChild.nodeValue = t("heroTitleOne");
        const second = heading.querySelector("span");
        if (second) second.textContent = t("heroTitleTwo");
      }
      setText(".hero .lead", t("heroLead"));
      setLastTextNode(".hero .primary-link", t("continue"));
      const statLabels = [...document.querySelectorAll(".stat-label")];
      ["completed", "overall", "phaseProgress"].forEach((key, index) => { if (statLabels[index]) statLabels[index].textContent = t(key); });
      const stats = document.querySelector(".stats");
      if (stats) stats.setAttribute("aria-label", t("stats"));
      setText("#current-lesson .section-heading .eyebrow", t("currentEyebrow"));
      setText("#current-heading", t("currentTitle"));
      setText("#current-status", t("active"));
      setText("#lessons .section-heading .eyebrow", t("lessonsEyebrow"));
      setText("#lessons-heading", t("lessonsTitle"));
      setText("#lessons .section-description", t("lessonsDescription"));
      const tabs = document.getElementById("phase-tabs");
      if (tabs) tabs.setAttribute("aria-label", t("phaseTabs"));
      const filters = document.getElementById("lesson-filters");
      if (filters) filters.setAttribute("aria-label", t("filterLabel"));
      setText("#filter-feedback", t("filterFeedback"));
      setText("#next-step .next-step-copy > span", t("nextEyebrow"));
      setText("#next-step-title", t("nextPending"));
      setText("#next-step-description", t("nextFallback"));
      setText("#next-step .next-step-state", t("nextWait"));
      setText("#roadmap .section-heading .eyebrow", t("roadmapEyebrow"));
      setText("#roadmap-heading", t("roadmapTitle"));
      setText("#roadmap .section-description", t("roadmapDescription"));
      setText(".roadmap-tools > span", t("roadmapHint"));
      setText("#expand-phases", t("expandAll"));
      setText("#principles-heading", t("principleTitle"));
      setText(".principles p", t("principleBody"));
      const footerLinks = document.querySelectorAll(".site-footer a");
      if (footerLinks[1]) setLastTextNode(".site-footer a:nth-of-type(2)", t("footerProgress"));
      if (footerLinks[2]) footerLinks[2].textContent = t("footerLicense");
      setText(".site-footer > span", t("footerOpen"));
      const error = document.getElementById("load-error");
      if (error && error.firstChild?.nodeType === Node.TEXT_NODE) error.firstChild.nodeValue = t("loadError") + " ";
      const errorLink = error?.querySelector("a");
      if (errorLink) errorLink.textContent = t("progress");
    } else {
      setLastTextNode(".progress-page-head .eyebrow", t("progressEyebrow"));
      const heading = document.querySelector(".progress-page-head h1");
      if (heading) {
        if (heading.firstChild?.nodeType === Node.TEXT_NODE) heading.firstChild.nodeValue = t("progressTitle") + " ";
        const end = heading.querySelector("span");
        if (end) end.textContent = t("progressTitleEnd");
      }
      setText(".progress-page-head p", t("progressDescription"));
      setLastTextNode("#reload-progress", t("reload"));
      setLastTextNode(".progress-page-actions a", t("rawMarkdown"));
      if (navLinks[0]) setSpanText(".top-actions .nav-link", t("dashboard"));
      setSpanText(".repo-link", t("progress"));
      const content = document.getElementById("markdown-content");
      if (content) content.setAttribute("aria-label", t("progressContent"));
      setText("#source-message", t("loading"));
      setLastTextNode(".progress-footer a", t("progressFooter"));
      setText(".progress-footer > span", t("progressSource"));
      const error = document.getElementById("progress-error");
      if (error) {
        if (error.firstChild?.nodeType === Node.TEXT_NODE) error.firstChild.nodeValue = t("progressError") + " ";
        const link = error.querySelector("a");
        if (link) link.textContent = t("openGitHub");
      }
    }
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  function applyLanguage(next, persist = false) {
    language = next === "en" ? "en" : "ar";
    root.lang = language;
    root.dir = language === "en" ? "ltr" : "rtl";
    applyStaticText();
    if (persist) {
      try { localStorage.setItem("rustpath-language", language); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent("rustpath:languagechange", { detail: { language } }));
  }

  function applyTheme(next, persist = false) {
    root.dataset.theme = next === "light" ? "light" : "dark";
    if (themeMeta) themeMeta.content = root.dataset.theme === "light" ? "#ffffff" : "#090909";
    if (persist) {
      try { localStorage.setItem("rustpath-theme", root.dataset.theme); } catch (_) {}
    }
    applyStaticText();
  }

  try {
    const saved = localStorage.getItem("rustpath-language");
    if (saved === "ar" || saved === "en") language = saved;
  } catch (_) {}
  root.lang = language;
  root.dir = language === "en" ? "ltr" : "rtl";

  if (themeButton) {
    languageButton = document.createElement("button");
    languageButton.type = "button";
    languageButton.className = "language-toggle";
    themeButton.insertAdjacentElement("afterend", languageButton);
    languageButton.addEventListener("click", () => applyLanguage(language === "ar" ? "en" : "ar", true));
    themeButton.addEventListener("click", () => applyTheme(root.dataset.theme === "light" ? "dark" : "light", true));
  }

  applyStaticText();
  window.RustPathI18n = {
    t,
    get language() { return language; },
    localize(item, field) {
      if (!item) return "";
      return language === "en" && item[field + "_en"] ? item[field + "_en"] : (item[field] || "");
    }
  };
})();