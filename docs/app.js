(() => {
  const byId = (id) => document.getElementById(id);
  const labels = {
    done: "مكتمل",
    active: "قيد التنفيذ",
    upcoming: "قادم"
  };
  const filters = [
    { id: "all", label: "الكل" },
    { id: "done", label: "مكتمل" },
    { id: "active", label: "قيد التنفيذ" },
    { id: "upcoming", label: "قادم" }
  ];
  let progressData = null;
  let selectedPhaseId = null;
  let selectedFilter = "all";

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function icon(name, className = "") {
    const wrapper = element("span", className);
    wrapper.setAttribute("aria-hidden", "true");
    const glyph = document.createElement("i");
    glyph.dataset.lucide = name;
    wrapper.append(glyph);
    return wrapper;
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons();
  }

  function allItems() {
    return progressData.phases.flatMap((phase) => phase.items.map((item) => ({ ...item, phaseId: phase.id, phaseTitle: phase.title })));
  }

  function statusText(status) {
    return labels[status] || "حالة غير معروفة";
  }

  function renderStats(currentPhase) {
    const items = allItems();
    const completed = items.filter((item) => item.status === "done").length;
    const phaseCompleted = currentPhase.items.filter((item) => item.status === "done").length;
    const overallPercent = items.length ? Math.round((completed / items.length) * 100) : 0;
    const phasePercent = currentPhase.items.length ? Math.round((phaseCompleted / currentPhase.items.length) * 100) : 0;
    byId("completed-count").textContent = String(completed);
    byId("total-count").textContent = String(items.length);
    byId("overall-percent").textContent = String(overallPercent) + "%";
    byId("phase-percent").textContent = String(phasePercent) + "%";
  }

  function renderCurrent(activeItem, currentPhase) {
    const card = byId("current-card");
    card.replaceChildren();
    const main = element("div", "current-main");
    const number = element("div", "lesson-number", String(activeItem.id).padStart(2, "0"));
    const copy = element("div", "current-copy");
    copy.append(element("span", "phase-label", "المرحلة " + currentPhase.id + " · " + currentPhase.title));
    copy.append(element("h3", "", activeItem.title));
    copy.append(element("p", "", activeItem.desc));
    copy.append(element("p", "current-meta", "المتبقي: " + (activeItem.remaining || "لا توجد متطلبات متبقية مسجلة.")));
    main.append(number, copy);

    const panel = element("div", "progress-panel");
    const completed = currentPhase.items.filter((item) => item.status === "done").length;
    const percentage = currentPhase.items.length ? Math.round((completed / currentPhase.items.length) * 100) : 0;
    const head = element("div", "progress-head");
    head.append(element("span", "", "تقدم المرحلة"), element("strong", "", String(percentage) + "%"));
    const track = element("div", "progress-track");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", "تقدم المرحلة " + currentPhase.id);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", String(currentPhase.items.length));
    track.setAttribute("aria-valuenow", String(completed));
    const fill = element("span", "");
    fill.style.width = String(percentage) + "%";
    track.append(fill);
    panel.append(head, track, element("span", "progress-foot", completed + " من " + currentPhase.items.length + " عناصر مكتملة"));
    card.append(main, panel);
    byId("current-status").textContent = statusText(activeItem.status);
  }

  function renderNextStep() {
    const next = allItems().find((item) => item.status === "upcoming");
    const title = byId("next-step-title");
    const description = byId("next-step-description");
    if (!next) {
      title.textContent = "اكتملت جميع عناصر المنهج";
      description.textContent = "لا توجد عناصر قادمة مسجلة حالياً.";
      return;
    }
    title.textContent = next.id + ". " + next.title;
    description.textContent = next.phaseTitle + " · " + next.desc;
  }

  function renderTabs() {
    const host = byId("phase-tabs");
    host.replaceChildren();
    progressData.phases.forEach((phase) => {
      const button = element("button", "phase-tab", "المرحلة " + phase.id);
      button.type = "button";
      button.dataset.phaseId = String(phase.id);
      button.setAttribute("aria-pressed", String(phase.id === selectedPhaseId));
      button.addEventListener("click", () => {
        selectedPhaseId = phase.id;
        selectedFilter = "all";
        renderTabs();
        renderLessons();
      });
      host.append(button);
    });
  }

  function renderFilters(phase) {
    const host = byId("lesson-filters");
    host.replaceChildren();
    filters.forEach((filter) => {
      const count = filter.id === "all"
        ? phase.items.length
        : phase.items.filter((item) => item.status === filter.id).length;
      const button = element("button", "filter-button" + (selectedFilter === filter.id ? " is-active" : ""));
      button.type = "button";
      button.dataset.filter = filter.id;
      button.setAttribute("aria-pressed", String(selectedFilter === filter.id));
      button.append(document.createTextNode(filter.label), element("span", "", count));
      button.addEventListener("click", () => {
        selectedFilter = filter.id;
        renderLessons();
      });
      host.append(button);
    });
  }

  function renderLessonItem(item, options = {}) {
    const article = element("article", "lesson " + item.status);
    const number = element("span", "lesson-index", String(item.id).padStart(2, "0"));
    const lessonIcon = icon(item.icon || (item.kind === "project" ? "rocket" : "book-open"), "lesson-icon");
    const copy = element("div", "lesson-copy");
    const titleRow = element("div", "lesson-title-row");
    titleRow.append(element("h3", "", item.title));
    if (item.kind === "project") titleRow.append(element("span", "kind-badge", "مشروع"));
    copy.append(titleRow, element("p", "", item.desc));
    if (item.evidence) copy.append(element("small", "lesson-evidence", "الدليل: " + item.evidence));
    if (item.remaining) copy.append(element("small", "lesson-evidence", "المتبقي: " + item.remaining));
    if (options.note) copy.append(element("small", "lesson-evidence", options.note));
    const state = element("span", "lesson-state", statusText(item.status));
    state.setAttribute("aria-label", statusText(item.status));
    article.append(number, lessonIcon, copy, state);
    return article;
  }

  function renderLessons() {
    const phase = progressData.phases.find((item) => item.id === selectedPhaseId);
    if (!phase) return;
    byId("selected-phase-count").textContent = phase.items.length + " عناصر";
    renderFilters(phase);
    const host = byId("lesson-list");
    host.replaceChildren();
    const visible = selectedFilter === "all"
      ? phase.items
      : phase.items.filter((item) => item.status === selectedFilter);

    if (selectedFilter === "upcoming" && visible.length === 0) {
      const next = allItems().find((item) => item.status === "upcoming");
      if (next) {
        host.append(element("p", "filter-note", "لا توجد عناصر قادمة أخرى داخل هذه المرحلة؛ هذه أول خطوة قادمة في المنهج كله."));
        host.append(renderLessonItem(next, { note: "الخطوة التالية · " + next.phaseTitle }));
        byId("filter-feedback").textContent = "تعرض أول عنصر قادم بعد المرحلة المختارة.";
        refreshIcons();
        return;
      }
    }

    if (visible.length === 0) {
      host.append(element("p", "empty-state", "لا توجد عناصر بهذه الحالة في المرحلة المختارة."));
    } else {
      visible.forEach((item) => host.append(renderLessonItem(item)));
    }
    const filterLabel = filters.find((item) => item.id === selectedFilter)?.label || "الكل";
    byId("filter-feedback").textContent = selectedFilter === "all"
      ? "تعرض جميع عناصر " + phase.title + "."
      : "تعرض " + filterLabel + " في " + phase.title + ".";
    refreshIcons();
  }

  function phaseStatus(phase) {
    if (phase.items.every((item) => item.status === "done")) return "مكتملة";
    if (phase.items.some((item) => item.status === "active")) return "قيد التنفيذ";
    return "قادمة";
  }

  function updateExpandLabel() {
    const button = byId("expand-phases");
    const disclosureButtons = [...document.querySelectorAll(".phase-expand")];
    const allExpanded = disclosureButtons.length > 0 && disclosureButtons.every((item) => item.getAttribute("aria-expanded") === "true");
    button.textContent = allExpanded ? "طي كل المراحل" : "فتح كل المراحل";
    button.setAttribute("aria-expanded", String(allExpanded));
  }

  function renderRoadmap(currentPhaseId) {
    const host = byId("roadmap-list");
    host.replaceChildren();
    progressData.phases.forEach((phase) => {
      const card = element("article", "phase-card" + (phase.id === currentPhaseId ? " phase-current" : ""));
      const heading = element("div", "phase-head");
      heading.append(icon(phase.icon, "phase-icon"));
      const title = element("div", "phase-title");
      title.append(element("span", "", "المرحلة " + String(phase.id).padStart(2, "0")));
      title.append(element("h3", "", phase.title));
      const statusCode = phase.items.every((item) => item.status === "done") ? "done" : phase.items.some((item) => item.status === "active") ? "active" : "upcoming";
      heading.append(title, element("span", "phase-status phase-" + statusCode, phaseStatus(phase)));
      const expanded = phase.id === currentPhaseId;
      const controlId = "phase-items-" + phase.id;
      const toggle = element("button", "phase-expand", expanded ? "طي الموضوعات" : "عرض الموضوعات");
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-controls", controlId);
      toggle.setAttribute("aria-label", (expanded ? "طي" : "فتح") + " عناصر المرحلة " + phase.id);
      heading.append(toggle);

      const summary = element("p", "", phase.summary);
      const details = element("div", "topic-list");
      details.id = controlId;
      details.hidden = !expanded;
      phase.items.forEach((item) => {
        const topic = element("div", "topic-item");
        const topicName = element("span", "topic-name", item.title);
        const topicState = element("span", "topic-status status-" + item.status, statusText(item.status));
        topic.append(topicName, topicState);
        if (item.kind === "project") topic.append(element("span", "kind-badge", "مشروع"));
        details.append(topic);
      });

      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(open));
        details.hidden = !open;
        toggle.textContent = open ? "طي الموضوعات" : "عرض الموضوعات";
        toggle.setAttribute("aria-label", (open ? "طي" : "فتح") + " عناصر المرحلة " + phase.id);
        updateExpandLabel();
      });
      card.append(heading, summary, details);
      host.append(card);
    });
    updateExpandLabel();
    refreshIcons();
  }

  function bindGlobalExpand() {
    byId("expand-phases").addEventListener("click", () => {
      const buttons = [...document.querySelectorAll(".phase-expand")];
      const allExpanded = buttons.length > 0 && buttons.every((button) => button.getAttribute("aria-expanded") === "true");
      const shouldExpand = !allExpanded;
      buttons.forEach((button) => {
        const controlId = button.getAttribute("aria-controls");
        const details = document.getElementById(controlId);
        button.setAttribute("aria-expanded", String(shouldExpand));
        button.textContent = shouldExpand ? "طي الموضوعات" : "عرض الموضوعات";
        const phaseId = controlId.replace("phase-items-", "");
        button.setAttribute("aria-label", (shouldExpand ? "طي" : "فتح") + " عناصر المرحلة " + phaseId);
        if (details) details.hidden = !shouldExpand;
      });
      updateExpandLabel();
    });
  }

  async function start() {
    try {
      const response = await fetch("./progress.json", { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      progressData = await response.json();
      if (!progressData || !Array.isArray(progressData.phases)) throw new Error("ملف التقدم لا يحتوي على قائمة مراحل صحيحة.");
      const phases = progressData.phases;
      const currentPhase = phases.find((phase) => phase.items.some((item) => item.status === "active"));
      const activeItem = currentPhase?.items.find((item) => item.status === "active");
      if (!currentPhase || !activeItem) throw new Error("لم يتم العثور على عنصر قيد التنفيذ.");
      selectedPhaseId = currentPhase.id;
      renderStats(currentPhase);
      renderCurrent(activeItem, currentPhase);
      renderNextStep();
      renderTabs();
      renderLessons();
      renderRoadmap(currentPhase.id);
      bindGlobalExpand();
      refreshIcons();
    } catch (error) {
      const alert = byId("load-error");
      alert.hidden = false;
      alert.append(document.createTextNode(" تفاصيل الخطأ: " + error.message));
      byId("current-card").replaceChildren(element("p", "error-placeholder", "تعذر عرض الدرس الحالي بسبب فشل تحميل مصدر التقدم."));
      byId("lesson-list").replaceChildren(element("p", "error-placeholder", "تعذر تحميل قائمة الدروس والمشاريع."));
      byId("next-step-title").textContent = "تعذر تحديد الخطوة التالية";
      byId("next-step-description").textContent = "افتح سجل التقدم أو أعد تحميل الصفحة بعد التحقق من الاتصال.";
    }
  }

  start();
})();
