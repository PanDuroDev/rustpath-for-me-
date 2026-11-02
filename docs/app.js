(() => {
  const byId = (id) => document.getElementById(id);
  const labels = { done: "done", active: "active", upcoming: "upcoming" };
  const filters = [
    { id: "all", key: "all" },
    { id: "done", key: "done" },
    { id: "active", key: "active" },
    { id: "upcoming", key: "upcoming" }
  ];
  let progressData = null;
  let selectedPhaseId = null;
  let selectedFilter = "all";
  const expandedPhaseIds = new Set();

  function t(key) {
    return window.RustPathI18n ? window.RustPathI18n.t(key) : key;
  }
  function language() {
    return window.RustPathI18n ? window.RustPathI18n.language : document.documentElement.lang;
  }
  function localize(item, field) {
    return window.RustPathI18n ? window.RustPathI18n.localize(item, field) : (item[field] || "");
  }
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
    return progressData.phases.flatMap((phase) => phase.items.map((item) => ({
      ...item, phaseId: phase.id, phaseTitle: phase.title, phaseTitle_en: phase.title_en
    })));
  }
  function statusText(status) {
    return t(labels[status] || "upcoming");
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
    card.classList.remove("is-complete");
    card.replaceChildren();
    const main = element("div", "current-main");
    const number = element("div", "lesson-number", String(activeItem.id).padStart(2, "0"));
    const copy = element("div", "current-copy");
    const phaseTitle = localize(currentPhase, "title");
    const phaseLabel = language() === "en"
      ? "Phase " + currentPhase.id + " · " + phaseTitle
      : "المرحلة " + currentPhase.id + " · " + phaseTitle;
    copy.append(element("span", "phase-label", phaseLabel));
    copy.append(element("h3", "", localize(activeItem, "title")));
    copy.append(element("p", "", localize(activeItem, "desc")));
    const remaining = localize(activeItem, "remaining");
    if (remaining) copy.append(element("p", "current-meta", t("remaining") + ": " + remaining));
    main.append(number, copy);

    const panel = element("div", "progress-panel");
    const completed = currentPhase.items.filter((item) => item.status === "done").length;
    const percentage = currentPhase.items.length ? Math.round((completed / currentPhase.items.length) * 100) : 0;
    const head = element("div", "progress-head");
    head.append(element("span", "", language() === "en" ? "Phase progress" : "تقدم المرحلة"));
    head.append(element("strong", "", String(percentage) + "%"));
    const track = element("div", "progress-track");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", (language() === "en" ? "Phase " : "تقدم المرحلة ") + currentPhase.id);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", String(currentPhase.items.length));
    track.setAttribute("aria-valuenow", String(completed));
    const fill = element("span", "");
    fill.style.width = String(percentage) + "%";
    track.append(fill);
    const foot = language() === "en"
      ? completed + " of " + currentPhase.items.length + " items completed"
      : completed + " من " + currentPhase.items.length + " عناصر مكتملة";
    panel.append(head, track, element("span", "progress-foot", foot));
    card.append(main, panel);
    byId("current-status").textContent = statusText(activeItem.status);
  }
  function renderCompleted() {
    const card = byId("current-card");
    card.classList.add("is-complete");
    card.replaceChildren();

    const main = element("div", "current-main");
    const copy = element("div", "current-copy");
    copy.append(element("span", "phase-label", t("phaseDone")));
    copy.append(element("h3", "", t("allComplete")));
    copy.append(element("p", "", t("noUpcoming")));
    main.append(icon("check-circle-2", "lesson-icon"), copy);
    card.append(main);
    byId("current-status").textContent = t("done");
  }

  function renderNextStep() {
    const next = allItems().find((item) => item.status === "upcoming");
    if (!next) {
      byId("next-step-title").textContent = t("allComplete");
      byId("next-step-description").textContent = t("noUpcoming");
      return;
    }
    byId("next-step-title").textContent = next.id + ". " + localize(next, "title");
    byId("next-step-description").textContent = localize(next, "phaseTitle") + " · " + localize(next, "desc");
  }
  function renderTabs() {
    const host = byId("phase-tabs");
    host.replaceChildren();
    progressData.phases.forEach((phase) => {
      const button = element("button", "phase-tab", (language() === "en" ? "Phase " : "المرحلة ") + phase.id);
      button.type = "button";
      button.dataset.phaseId = String(phase.id);
      button.setAttribute("aria-pressed", String(phase.id === selectedPhaseId));
      button.addEventListener("click", () => {
        selectedPhaseId = phase.id;
        selectedFilter = "all";
        renderTabs();
        renderLessons();
        host.querySelector('[data-phase-id="' + phase.id + '"]')?.focus();
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
      button.append(document.createTextNode(t(filter.key)), element("span", "", count));
      button.addEventListener("click", () => {
        selectedFilter = filter.id;
        renderLessons();
        host.querySelector('[data-filter="' + filter.id + '"]')?.focus();
      });
      host.append(button);
    });
  }
  function renderLessonItem(item) {
    const article = element("article", "lesson " + item.status);
    const number = element("span", "lesson-index", String(item.id).padStart(2, "0"));
    const lessonIcon = icon(item.icon || (item.kind === "project" ? "rocket" : "book-open"), "lesson-icon");
    const copy = element("div", "lesson-copy");
    const titleRow = element("div", "lesson-title-row");
    titleRow.append(element("h3", "", localize(item, "title")));
    if (item.kind === "project") titleRow.append(element("span", "kind-badge", t("project")));
    copy.append(titleRow, element("p", "", localize(item, "desc")));
    const evidence = localize(item, "evidence");
    const remaining = localize(item, "remaining");
    if (evidence) copy.append(element("small", "lesson-evidence", t("evidence") + ": " + evidence));
    if (remaining) copy.append(element("small", "lesson-evidence", t("remaining") + ": " + remaining));
    const state = element("span", "lesson-state", statusText(item.status));
    state.setAttribute("aria-label", statusText(item.status));
    article.append(number, lessonIcon, copy, state);
    return article;
  }
  function renderLessons() {
    const phase = progressData.phases.find((item) => item.id === selectedPhaseId);
    if (!phase) return;
    byId("selected-phase-count").textContent = phase.items.length + " " + t("items");
    renderFilters(phase);
    const host = byId("lesson-list");
    host.replaceChildren();
    const visible = selectedFilter === "all"
      ? phase.items
      : phase.items.filter((item) => item.status === selectedFilter);
    if (visible.length === 0) {
      host.append(element("p", "empty-state", selectedFilter === "upcoming" ? t("emptyUpcoming") : t("emptyState")));
    } else {
      visible.forEach((item) => host.append(renderLessonItem(item)));
    }
    byId("filter-feedback").textContent = selectedFilter === "all"
      ? t("lessonsIn") + " " + localize(phase, "title") + "."
      : t("filterIn") + " " + t(selectedFilter) + " · " + localize(phase, "title") + ".";
    refreshIcons();
  }
  function phaseStatus(phase) {
    if (phase.items.every((item) => item.status === "done")) return t("phaseDone");
    if (phase.items.some((item) => item.status === "active")) return t("phaseActive");
    return t("phaseUpcoming");
  }
  function updateExpandLabel() {
    const button = byId("expand-phases");
    const disclosureButtons = [...document.querySelectorAll(".phase-expand")];
    const allExpanded = disclosureButtons.length > 0 && disclosureButtons.every((item) => item.getAttribute("aria-expanded") === "true");
    button.textContent = allExpanded ? t("collapseAll") : t("expandAll");
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
      const phaseName = language() === "en" ? "Phase " : "المرحلة ";
      title.append(element("span", "", phaseName + String(phase.id).padStart(2, "0")));
      title.append(element("h3", "", localize(phase, "title")));
      const statusCode = phase.items.every((item) => item.status === "done") ? "done" : phase.items.some((item) => item.status === "active") ? "active" : "upcoming";
      heading.append(title, element("span", "phase-status phase-" + statusCode, phaseStatus(phase)));
      const expanded = expandedPhaseIds.has(phase.id);
      const controlId = "phase-items-" + phase.id;
      const toggle = element("button", "phase-expand", expanded ? t("hideTopics") : t("showTopics"));
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-controls", controlId);
      toggle.setAttribute("aria-label", (expanded ? t("hideTopics") : t("showTopics")) + " · " + phaseName + phase.id);
      const summary = element("p", "", localize(phase, "summary"));
      const details = element("div", "topic-list");
      details.id = controlId;
      details.hidden = !expanded;
      phase.items.forEach((item) => {
        const topic = element("div", "topic-item");
        const topicName = element("span", "topic-name", localize(item, "title"));
        const topicState = element("span", "topic-status status-" + item.status, statusText(item.status));
        topic.append(topicName, topicState);
        if (item.kind === "project") topic.append(element("span", "kind-badge", t("project")));
        details.append(topic);
      });
      toggle.addEventListener("click", () => {
        const open = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(open));
        if (open) expandedPhaseIds.add(phase.id); else expandedPhaseIds.delete(phase.id);
        details.hidden = !open;
        toggle.textContent = open ? t("hideTopics") : t("showTopics");
        toggle.setAttribute("aria-label", (open ? t("hideTopics") : t("showTopics")) + " · " + phaseName + phase.id);
        updateExpandLabel();
      });
      heading.append(toggle);
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
        button.textContent = shouldExpand ? t("hideTopics") : t("showTopics");
        const phaseId = Number(controlId.replace("phase-items-", ""));
        if (shouldExpand) expandedPhaseIds.add(phaseId); else expandedPhaseIds.delete(phaseId);
        const phaseName = language() === "en" ? "Phase " : "المرحلة ";
        button.setAttribute("aria-label", (shouldExpand ? t("hideTopics") : t("showTopics")) + " · " + phaseName + phaseId);
        if (details) details.hidden = !shouldExpand;
      });
      updateExpandLabel();
    });
  }
  function renderAll() {
    if (!progressData) return;
    const items = allItems();
    const isComplete = items.length > 0 && items.every((item) => item.status === "done");
    const currentPhase = progressData.phases.find((phase) => phase.items.some((item) => item.status === "active"))
      || (isComplete ? progressData.phases[progressData.phases.length - 1] : null);
    const activeItem = currentPhase?.items.find((item) => item.status === "active");
    if (!currentPhase) return;
    if (!progressData.phases.some((phase) => phase.id === selectedPhaseId)) selectedPhaseId = currentPhase.id;
    renderStats(currentPhase);
    if (activeItem) renderCurrent(activeItem, currentPhase);
    else renderCompleted();
    renderNextStep();
    renderTabs();
    renderLessons();
    renderRoadmap(currentPhase.id);
  }
  async function loadProgressData() {
    const version = "20261102-1";
    const sources = [
      new URL("./progress.json?v=" + version, document.baseURI).href,
      "https://raw.githubusercontent.com/PanDuroDev/rustpath-for-me-/main/docs/progress.json"
    ];
    const failures = [];

    for (const source of sources) {
      try {
        const response = await fetch(source, { cache: "no-store" });
        if (!response.ok) throw new Error(source + " returned HTTP " + response.status);
        const data = await response.json();
        if (!data || !Array.isArray(data.phases)) {
          throw new Error(source + " did not return a valid progress document.");
        }
        return data;
      } catch (error) {
        failures.push(error && error.message ? error.message : String(error));
      }
    }

    throw new Error("Could not load progress data. " + failures.join(" | "));
  }

  async function start() {
    try {
      progressData = await loadProgressData();
      const items = allItems();
      const activeItems = items.filter((item) => item.status === "active");
      const isComplete = items.length > 0 && activeItems.length === 0 && items.every((item) => item.status === "done");
      if (activeItems.length !== 1 && !isComplete) throw new Error("The curriculum must have exactly one active item unless every item is complete.");
      const currentPhase = progressData.phases.find((phase) => phase.items.some((item) => item.status === "active"))
        || (isComplete ? progressData.phases[progressData.phases.length - 1] : null);
      if (!currentPhase) throw new Error("No current or completed curriculum phase was found.");
      selectedPhaseId = currentPhase.id;
      expandedPhaseIds.add(currentPhase.id);
      bindGlobalExpand();
      renderAll();
    } catch (error) {
      console.error("RustPath dashboard failed to initialize:", error);
      const alert = byId("load-error");
      alert.hidden = false;
      alert.append(document.createTextNode(" " + error.message));
      byId("current-card").replaceChildren(element("p", "error-placeholder", t("loadFailedCurrent")));
      byId("lesson-list").replaceChildren(element("p", "error-placeholder", t("loadFailedItems")));
      byId("next-step-title").textContent = t("loadFailedTitle");
      byId("next-step-description").textContent = t("loadFailedDescription");
    }
  }
  window.addEventListener("rustpath:languagechange", renderAll);
  start();
})();