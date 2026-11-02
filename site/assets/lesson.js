(() => {
  const page = document.querySelector("[data-lesson-page]");
  if (!page) return;
  const slug = page.dataset.lessonSlug;
  if (!slug) return;

  const STORE = `rustpath:lesson:${slug}`;
  const emptyState = () => ({ answers: {}, results: {}, groups: {}, notes: {}, checklists: {}, long: {}, longChecks: {}, revealed: {} });

  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "null");
      return saved && typeof saved === "object" ? { ...emptyState(), ...saved } : emptyState();
    } catch (_) {
      return emptyState();
    }
  };

  const state = load();
  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch (_) {}
  };

  const questions = [...page.querySelectorAll(".quiz-question[data-qid]")];
  const graded = questions.filter((question) => question.dataset.graded === "true");
  const heads = [...page.querySelectorAll(".quiz-head[data-quiz-group]")];
  const groups = heads
    .map((head) => ({
      id: head.dataset.quizGroup,
      pass: Number(head.dataset.quizPass) || 70,
      head,
      questions: graded.filter((question) => question.dataset.group === head.dataset.quizGroup),
    }))
    .filter((group) => group.questions.length > 0);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const summary = page.querySelector("[data-quiz-summary]");
  const finish = page.querySelector("#lesson-finish");
  const progressLabel = page.querySelector("#lesson-quiz-label");
  const progressFill = page.querySelector("#lesson-quiz-fill");

  const escapeValue = (value) => (window.CSS && CSS.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&"));

  const normalize = (value, caseSensitive) => {
    let text = String(value ?? "").trim().replace(/\s+/g, " ");
    if (!caseSensitive) text = text.toLowerCase();
    return text.replace(/[\u064B-\u0652\u0670\u0640]/g, "");
  };

  const readAnswer = (question) => {
    const type = question.dataset.type;
    if (type === "single" || type === "truefalse") {
      const input = question.querySelector('input[type="radio"]:checked');
      return input ? input.value : null;
    }
    if (type === "multiple") {
      const values = [...question.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
      return values.length ? values : null;
    }
    if (type === "short") {
      const input = question.querySelector(".short-input");
      const value = input ? input.value.trim() : "";
      return value || null;
    }
    return null;
  };

  const hasAnswer = (answer) => answer !== null && (!Array.isArray(answer) || answer.length > 0);

  const isCorrect = (question, answer) => {
    const type = question.dataset.type;
    if (type === "single" || type === "truefalse") {
      const input = question.querySelector(`input[value="${escapeValue(answer)}"]`);
      return Boolean(input && input.dataset.correct === "true");
    }
    if (type === "multiple") {
      const correct = [...question.querySelectorAll('input[type="checkbox"]')]
        .filter((input) => input.dataset.correct === "true")
        .map((input) => input.value)
        .sort();
      const selected = [...answer].sort();
      return correct.length === selected.length && correct.every((value, index) => value === selected[index]);
    }
    if (type === "short") {
      const input = question.querySelector(".short-input");
      if (!input) return false;
      const answers = JSON.parse(input.dataset.answers || "[]");
      const caseSensitive = input.dataset.caseSensitive === "true";
      const value = normalize(answer, caseSensitive);
      return answers.some((item) => normalize(item, caseSensitive) === value);
    }
    return false;
  };

  const showResult = (question, correct) => {
    question.classList.remove("is-correct", "is-wrong", "is-missing");
    question.classList.add(correct ? "is-correct" : "is-wrong");
    const feedback = question.querySelector(".quiz-feedback-item");
    if (!feedback) return;
    feedback.hidden = false;
    feedback.dataset.correct = String(correct);
    const label = feedback.querySelector(".feedback-label");
    if (label) label.textContent = correct ? "إجابة صحيحة" : "إجابة غير صحيحة";
  };

  const hideResult = (question) => {
    question.classList.remove("is-correct", "is-wrong", "is-missing");
    const feedback = question.querySelector(".quiz-feedback-item");
    if (feedback) feedback.hidden = true;
  };

  const updateGroupScore = (group) => {
    const result = state.groups[group.id];
    const element = group.head.querySelector("[data-quiz-score]");
    if (!element) return;
    if (!result) {
      element.hidden = true;
      element.textContent = "";
      element.classList.remove("is-passed", "is-failed");
      return;
    }
    element.hidden = false;
    element.textContent = `${result.score}/${result.total} · ${result.percent}%`;
    element.classList.toggle("is-passed", result.passed);
    element.classList.toggle("is-failed", !result.passed);
  };

  const updateProgress = () => {
    const passed = groups.filter((group) => state.groups[group.id]?.passed).length;
    if (progressLabel) progressLabel.textContent = `${passed} / ${groups.length}`;
    if (progressFill) progressFill.style.width = `${groups.length ? (passed / groups.length) * 100 : 0}%`;
    const allPassed = groups.length > 0 && passed === groups.length;
    if (finish) finish.hidden = !allPassed;
    if (allPassed && finish) {
      const score = graded.filter((question) => state.results[question.dataset.qid] === "correct").length;
      const status = finish.querySelector("[data-finish-status]");
      if (status) status.textContent = `النتيجة: ${score} من ${graded.length} (${Math.round((score / graded.length) * 100)}%)`;
    }
  };

  const storeAnswer = (question) => {
    const id = question.dataset.qid;
    const answer = readAnswer(question);
    if (answer === null) delete state.answers[id];
    else state.answers[id] = answer;
  };

  const clearGroupResult = (group) => {
    if (!group) return;
    delete state.groups[group.id];
    updateGroupScore(group);
    updateProgress();
  };

  const grade = () => {
    if (!graded.length) return;
    const missing = graded.filter((question) => !hasAnswer(readAnswer(question)));
    if (missing.length) {
      graded.forEach((question) => question.classList.toggle("is-missing", missing.includes(question)));
      if (summary) {
        summary.hidden = false;
        summary.textContent = "أكمل جميع الأسئلة أولًا، ثم اضغط تحقق من الإجابات.";
      }
      missing[0].scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    graded.forEach((question) => {
      question.classList.remove("is-missing");
      const correct = isCorrect(question, readAnswer(question));
      state.results[question.dataset.qid] = correct ? "correct" : "wrong";
      showResult(question, correct);
    });

    groups.forEach((group) => {
      const total = group.questions.length;
      const score = group.questions.filter((question) => state.results[question.dataset.qid] === "correct").length;
      const percent = Math.round((score / total) * 100);
      state.groups[group.id] = { score, total, percent, passed: percent >= group.pass };
      updateGroupScore(group);
    });

    updateProgress();
    if (summary) {
      const score = graded.filter((question) => state.results[question.dataset.qid] === "correct").length;
      const percent = Math.round((score / graded.length) * 100);
      summary.hidden = false;
      summary.innerHTML = `<strong>نتيجتك: ${score} من ${graded.length} (${percent}%)</strong><br>${percent >= 70 ? "أداء جيد. راجع الأسئلة التي أخطأت فيها ثم انتقل إلى الدرس التالي." : "راجع الشرح والأمثلة ثم أعد المحاولة."}`;
    }
    save();
    if (finish && !finish.hidden) finish.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const revealLong = (question, show) => {
    const model = question.querySelector(".model-answer");
    const button = question.querySelector("[data-reveal]");
    if (!model || !button) return;
    model.hidden = !show;
    button.textContent = show ? "إخفاء الإجابة النموذجية" : "اعرض الإجابة النموذجية";
  };

  questions.forEach((question) => {
    const id = question.dataset.qid;
    const saved = state.answers[id];
    const type = question.dataset.type;

    if (saved !== undefined && saved !== null) {
      if (type === "single" || type === "truefalse") {
        const input = question.querySelector(`input[value="${escapeValue(saved)}"]`);
        if (input) input.checked = true;
      } else if (type === "multiple" && Array.isArray(saved)) {
        question.querySelectorAll('input[type="checkbox"]').forEach((input) => {
          input.checked = saved.includes(input.value);
        });
      } else if (type === "short") {
        const input = question.querySelector(".short-input");
        if (input) input.value = saved;
      }
    }

    if (state.results[id]) showResult(question, state.results[id] === "correct");

    if (type === "long") {
      const textarea = question.querySelector(".long-input");
      if (textarea && state.long[id]) textarea.value = state.long[id];
      const checks = [...question.querySelectorAll('.self-checks input[type="checkbox"]')];
      const savedChecks = Array.isArray(state.longChecks[id]) ? state.longChecks[id] : [];
      checks.forEach((box, index) => {
        box.checked = Boolean(savedChecks[index]);
        box.addEventListener("change", () => {
          state.longChecks[id] = checks.map((item) => item.checked);
          save();
        });
      });
      if (textarea) {
        textarea.addEventListener("input", () => {
          state.long[id] = textarea.value;
          save();
        });
      }
      if (state.revealed[id]) revealLong(question, true);
      question.querySelectorAll("[data-reveal]").forEach((button) => {
        button.addEventListener("click", () => {
          const model = question.querySelector(".model-answer");
          const show = Boolean(model && model.hidden);
          revealLong(question, show);
          state.revealed[id] = show;
          save();
        });
      });
    }

    const group = groupById.get(question.dataset.group);
    const clear = () => {
      hideResult(question);
      delete state.results[id];
      clearGroupResult(group);
      if (summary) {
        summary.hidden = true;
        summary.textContent = "";
      }
      storeAnswer(question);
      save();
    };

    if (type === "short") {
      const input = question.querySelector(".short-input");
      if (input) input.addEventListener("input", clear);
    } else if (type === "single" || type === "truefalse" || type === "multiple") {
      question.addEventListener("change", clear);
    }
  });

  groups.forEach(updateGroupScore);

  page.querySelectorAll('[data-block-type="notes"]').forEach((block) => {
    const id = block.dataset.blockId;
    const textarea = block.querySelector(".notes-input");
    if (!textarea) return;
    if (state.notes[id]) textarea.value = state.notes[id];
    textarea.addEventListener("input", () => {
      state.notes[id] = textarea.value;
      save();
    });
  });

  page.querySelectorAll('[data-block-type="checklist"]').forEach((block) => {
    const id = block.dataset.blockId;
    const boxes = [...block.querySelectorAll("input[data-check]")];
    const saved = Array.isArray(state.checklists[id]) ? state.checklists[id] : [];
    boxes.forEach((box, index) => {
      box.checked = Boolean(saved[index]);
      box.addEventListener("change", () => {
        state.checklists[id] = boxes.map((item) => item.checked);
        save();
      });
    });
  });

  page.querySelectorAll("[data-quiz-submit]").forEach((button) => button.addEventListener("click", grade));
  page.querySelectorAll("[data-quiz-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!window.confirm("هل تريد مسح إجاباتك وملاحظاتك لهذا الدرس؟")) return;
      try {
        localStorage.removeItem(STORE);
      } catch (_) {}
      window.location.reload();
    });
  });

  updateProgress();
})();
