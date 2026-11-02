import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { escapeHtml, renderInline } from "./lib/markdown.mjs";
import { findCurrentLesson, loadContent, officialStats } from "./lib/content.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_OUT = path.join(ROOT, "_site");
const REPO = "https://github.com/PanDuroDev/rustpath-for-me-";
const SITE = "https://pandurodev.github.io/rustpath-for-me-/";

const esc = escapeHtml;
const pad = (id) => String(id).padStart(2, "0");
const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

function statusLabel(lesson) {
  if (lesson.draft) return "قيد الإعداد";
  if (lesson.status === "done") return "مكتمل";
  if (lesson.status === "active") return "قيد التعلّم";
  return "لم يبدأ";
}

function statusData(lesson) {
  return lesson.draft ? "draft" : lesson.status;
}

function stageStatus(stage) {
  if (!stage.lessons.length) return "لم تبدأ";
  if (stage.lessons.every((lesson) => lesson.status === "done" && !lesson.draft)) return "مكتملة";
  if (stage.lessons.some((lesson) => lesson.status === "active" && !lesson.draft)) return "قيد التعلّم";
  if (stage.lessons.every((lesson) => lesson.draft)) return "قيد الإعداد";
  if (stage.lessons.some((lesson) => lesson.status === "done" && !lesson.draft)) return "قيد التعلّم";
  return "لم تبدأ";
}

function stageStats(stage) {
  const done = stage.lessons.filter((lesson) => lesson.status === "done" && !lesson.draft).length;
  return { done, total: stage.lessons.length, percent: percent(done, stage.lessons.length) };
}

function quizCount(lesson) {
  return lesson.questions.filter((question) => question.graded).length;
}

function topbar(root) {
  return `<header class="topbar">
  <a class="brand" href="${root}index.html" aria-label="RustPath — الصفحة الرئيسية">
    <span class="brand-mark" aria-hidden="true">R</span>
    <span class="brand-name">Rust<span>Path</span></span>
  </a>
  <nav class="top-actions" aria-label="التنقل الرئيسي">
    <a class="nav-link" href="${root}index.html">لوحة التعلّم</a>
    <a class="nav-link" href="${root}index.html#stages">المراحل</a>
    <a class="nav-link" href="${root}progress.html">سجل التقدم</a>
    <a class="repo-link" href="${REPO}" target="_blank" rel="noreferrer">المستودع ↗</a>
    <button class="theme-toggle" id="theme-toggle" type="button" aria-label="التبديل إلى الوضع الفاتح">الوضع الفاتح</button>
  </nav>
</header>`;
}

function footer(root, mainClass) {
  const classes = mainClass === "learning-shell" ? "site-footer learning-footer" : "site-footer shell";
  return `<footer class="${classes}">
  <a class="footer-brand" href="${root}index.html">RustPath</a>
  <a href="${root}index.html#stages">المراحل</a>
  <a href="${root}progress.html">سجل التقدم</a>
  <a href="${REPO}/blob/main/LICENSE" target="_blank" rel="noreferrer">ترخيص MIT</a>
  <span>منهج تعلّم مفتوح المصدر</span>
</footer>`;
}

function renderPage({ root = "", title, description, main, mainClass = "shell", lessonPage = false, lessonSlug = "", lessonCss = false }) {
  const themeBoot = `<script>
(() => {
  try {
    const saved = localStorage.getItem("rustpath-theme");
    const theme = saved === "light" || saved === "dark" ? saved : (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
  } catch (_) {}
})();
</script>`;
  return `<!doctype html>
<html lang="ar" dir="rtl" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · RustPath</title>
  <meta name="description" content="${esc(description)}">
  <meta name="color-scheme" content="dark light">
  <meta name="theme-color" content="#090909">
  ${themeBoot}
  <link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${root}assets/site.css">
  ${lessonCss ? `<link rel="stylesheet" href="${root}assets/lesson.css">` : ""}
  <link rel="stylesheet" href="${root}assets/blocks.css">
</head>
<body>
  <a class="skip-link" href="#main">تخطَّ إلى المحتوى</a>
  ${topbar(root)}
  <main id="main" class="${mainClass}"${lessonPage ? ` data-lesson-page data-lesson-slug="${esc(lessonSlug)}"` : ""}>${main}</main>
  ${footer(root, mainClass)}
  <script src="${root}assets/site.js" defer></script>
  ${lessonPage ? `<script src="${root}assets/lesson.js" defer></script>` : ""}
</body>
</html>`;
}

function renderStats(stats, stages) {
  return `<div class="stats">
  <div class="stat-card"><span class="stat-icon" aria-hidden="true">✓</span><div><span class="stat-label">الدروس المكتملة</span><strong>${stats.done}<small> / ${stats.total}</small></strong></div></div>
  <div class="stat-card"><span class="stat-icon" aria-hidden="true">▤</span><div><span class="stat-label">الدروس المتاحة</span><strong>${stats.available}<small> درسًا</small></strong></div></div>
  <div class="stat-card"><span class="stat-icon" aria-hidden="true">◈</span><div><span class="stat-label">المراحل</span><strong>${stages.length}<small> مراحل</small></strong></div></div>
</div>`;
}

function renderCurrent(lesson, lessons, stages) {
  if (!lesson) {
    return `<div class="next-step-card"><span class="next-step-icon" aria-hidden="true">✓</span><div class="next-step-copy"><span>لا يوجد درس نشط</span><h3>كل الدروس المتاحة مكتملة</h3><p>يمكنك مراجعة المراحل أو البدء في إضافة الدروس القادمة عبر Markdown.</p></div><a class="lesson-open-link" href="index.html#stages">استعرض المراحل</a></div>`;
  }
  const stage = stages.find((item) => item.id === lesson.stage);
  const stats = officialStats(lessons);
  const pct = percent(stats.done, stats.total);
  const count = quizCount(lesson);
  return `<article class="current-card${lesson.status === "done" ? " is-complete" : ""}">
  <div class="current-main">
    <span class="lesson-number">${pad(lesson.id)}</span>
    <div class="current-copy">
      <span class="phase-label">المرحلة ${lesson.stage}${stage ? ` · ${esc(stage.title)}` : ""}</span>
      <h3>${esc(lesson.title)}</h3>
      <p>${esc(lesson.summary)}</p>
      <p class="current-meta">${lesson.minutes ? `${lesson.minutes} دقيقة` : "درس قصير"}${count ? ` · ${count} أسئلة` : ""}</p>
      <a class="lesson-open-link" href="${lesson.url}">افتح الدرس ←</a>
    </div>
  </div>
  <div class="progress-panel">
    <div class="progress-head"><span>تقدم المنهج</span><strong>${pct}%</strong></div>
    <div class="progress-track"><span style="width:${pct}%"></span></div>
    <span class="progress-foot">${stats.done} من ${stats.total} دروس مكتملة</span>
  </div>
</article>`;
}

function renderStageCard(stage) {
  const stats = stageStats(stage);
  const current = stage.lessons.some((lesson) => lesson.status === "active" && !lesson.draft);
  const topics = stage.lessons
    .map(
      (lesson) =>
        `<a class="topic-item" href="${lesson.url}" data-status="${statusData(lesson)}"><span class="topic-name">${pad(lesson.id)} — ${esc(lesson.title)}</span><span class="topic-status">${statusLabel(lesson)}</span></a>`,
    )
    .join("");
  return `<article class="phase-card${current ? " phase-current" : ""}">
  <div class="phase-head">
    <span class="phase-icon" aria-hidden="true">${pad(stage.id)}</span>
    <div class="phase-title"><span>المرحلة ${stage.id}</span><h3>${esc(stage.title)}</h3></div>
    <span class="phase-status">${stageStatus(stage)}</span>
  </div>
  <p>${esc(stage.summary)}</p>
  <div class="stage-progress"><div class="progress-track"><span style="width:${stats.percent}%"></span></div><span class="subtle-count">${stats.done}/${stats.total}</span></div>
  <div class="topic-list">${topics}</div>
  <a class="lesson-open-link" href="stages/${stage.id}.html">افتح المرحلة ←</a>
</article>`;
}

function dashboardPage({ stages, lessons }) {
  const stats = officialStats(lessons);
  const current = findCurrentLesson(lessons);
  const currentStage = current ? stages.find((stage) => stage.id === current.stage) : null;
  const lead = "مسار عربي منظّم لتعلّم Rust من الأساسيات إلى المشاريع. كل درس ملف Markdown، والموقع يبني الصفحات والاختبارات تلقائيًا.";
  const main = `<section class="hero">
  <div class="hero-copy">
    <p class="eyebrow"><span class="eyebrow-line"></span> مسار تعلّم Rust بالعربية</p>
    <h1>تعلّم Rust <span>خطوة بخطوة.</span></h1>
    <p class="lead">${lead}</p>
    <a class="primary-link" href="${current ? current.url : "#stages"}">${current ? `تابع من الدرس ${pad(current.id)}` : "استعرض المراحل"} ←</a>
  </div>
  <div class="hero-art" aria-hidden="true">
    <span class="orbit orbit-one"></span><span class="orbit orbit-two"></span>
    <span class="core-mark">R</span>
    <span class="code-chip chip-top">fn main()</span>
    <span class="code-chip chip-bottom">println!("Rust");</span>
  </div>
</section>

<section class="page-section" aria-label="إحصاءات المنهج">
  ${renderStats(stats, stages)}
</section>

<section class="page-section" id="current" aria-labelledby="current-title">
  <div class="section-heading">
    <div><p class="eyebrow"><span class="eyebrow-line"></span> الآن</p><h2 id="current-title">الدرس الحالي</h2></div>
    <span class="subtle-count">${currentStage ? `المرحلة ${currentStage.id} من ${stages.length}` : `${stats.done} من ${stats.total}`}</span>
  </div>
  ${renderCurrent(current, lessons, stages)}
</section>

<section class="page-section" id="stages" aria-labelledby="stages-title">
  <div class="section-heading">
    <div><p class="eyebrow"><span class="eyebrow-line"></span> المنهج</p><h2 id="stages-title">المراحل والدروس</h2><p class="section-description">افتح أي مرحلة لترى دروسها، ثم ابدأ من الدرس الذي يناسبك.</p></div>
    <span class="subtle-count">${stats.available} درسًا متاحًا</span>
  </div>
  <div class="roadmap-list">${stages.map(renderStageCard).join("\n")}</div>
</section>

<section class="page-section" aria-label="كيف يعمل الموقع">
  <div class="principles">
    <span class="principle-icon" aria-hidden="true">✦</span>
    <div><h2>صفحات تُبنى من Markdown</h2><p>أضف الدرس كملف نصي في مجلد <code dir="ltr">content/lessons</code>، واكتب الشرح ثم كتلة <code dir="ltr">:::quiz</code>. يتولى GitHub Actions بناء الصفحة ونشرها. <a href="${REPO}/blob/main/content/README.md" target="_blank" rel="noreferrer">دليل إضافة الدروس ↗</a></p></div>
  </div>
</section>`;
  return renderPage({
    title: "لوحة التعلّم",
    description: lead,
    main,
  });
}

function stagePage(stage, stages) {
  const stats = stageStats(stage);
  const index = stages.findIndex((item) => item.id === stage.id);
  const previous = stages[index - 1];
  const next = stages[index + 1];
  const rows = stage.lessons.map((lesson) => renderLessonRow(lesson, "../")).join("\n");
  const main = `<div class="lesson-topline"><a class="back-link" href="../index.html">← لوحة التعلّم</a><span class="lesson-live-status">${stageStatus(stage)}</span></div>
<header class="lesson-heading">
  <span class="lesson-kicker">مرحلة ${stage.id} من ${stages.length}</span>
  <h1>${esc(stage.title)}</h1>
  <p class="lesson-intro">${esc(stage.summary)}</p>
  <div class="stage-overview"><div class="progress-track"><span style="width:${stats.percent}%"></span></div><span class="quiet-label">${stats.done} من ${stats.total} دروس مكتملة</span></div>
</header>
${stage.bodyHtml ? `<section class="lesson-content-section"><div class="lesson-prose">${stage.bodyHtml}</div></section>` : ""}
<section class="lesson-content-section" aria-labelledby="stage-lessons">
  <div class="lesson-section-heading"><div><span class="panel-kicker">الدروس</span><h2 id="stage-lessons">دروس المرحلة</h2></div><span class="quiet-label">${stage.lessons.length} دروس</span></div>
  <div class="lesson-list">${rows}</div>
</section>
<nav class="journey-pager" aria-label="التنقل بين المراحل">
  ${previous ? `<a class="secondary-action" href="${previous.id}.html">السابق: ${esc(previous.title)}</a>` : "<span></span>"}
  ${next ? `<a class="lesson-open-link" href="${next.id}.html">التالي: ${esc(next.title)}</a>` : `<a class="lesson-open-link" href="../index.html">العودة إلى لوحة التعلّم</a>`}
</nav>`;
  return renderPage({
    root: "../",
    title: `المرحلة ${stage.id}: ${stage.title}`,
    description: stage.summary,
    main,
    lessonCss: true,
  });
}

function renderLessonRow(lesson, root, details = false) {
  const count = quizCount(lesson);
  const meta = [lesson.minutes ? `${lesson.minutes} دقيقة` : "", count ? `${count} أسئلة` : ""].filter(Boolean).join(" · ");
  const evidence = details && lesson.evidence ? `<small class="lesson-evidence">الدليل: ${esc(lesson.evidence)}</small>` : "";
  const remaining = details && lesson.remaining ? `<small>المتبقي: ${esc(lesson.remaining)}</small>` : "";
  return `<a class="lesson" href="${root}${lesson.url}" data-status="${statusData(lesson)}">
  <span class="lesson-index">${pad(lesson.id)}</span>
  <span class="lesson-icon" aria-hidden="true">${lesson.kind === "project" ? "▣" : "▸"}</span>
  <div class="lesson-copy">
    <div class="lesson-title-row"><h3>${esc(lesson.title)}</h3>${lesson.kind === "project" ? '<span class="kind-badge">مشروع</span>' : ""}${lesson.draft ? '<span class="kind-badge">مسودة</span>' : ""}</div>
    <p>${esc(lesson.summary)}</p>
    ${meta ? `<small>${meta}</small>` : ""}
    ${evidence}${remaining}
  </div>
  <span class="lesson-state">${statusLabel(lesson)}</span>
</a>`;
}

function lessonPage(lesson, lessons, stages) {
  const stage = stages.find((item) => item.id === lesson.stage);
  const index = lessons.findIndex((item) => item.id === lesson.id);
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  const groups = lesson.groups;
  const hasQuizzes = groups.length > 0;
  const objectives = lesson.objectives.length
    ? `<section class="objectives-panel" aria-labelledby="objectives-title"><div><span class="panel-kicker">الأهداف</span><h2 id="objectives-title">ما ستتعلمه</h2></div><ul class="objectives-list">${lesson.objectives.map((objective) => `<li>${renderInline(objective)}</li>`).join("")}</ul></section>`
    : "";
  const draftNotice = lesson.draft
    ? `<div class="draft-notice"><strong>هذا الدرس قيد الإعداد.</strong><p>الشرح والأمثلة والاختبار سيُضافون عبر ملف Markdown. يمكنك متابعة الدروس الجاهزة الآن، أو المساهمة في كتابة هذا الدرس من المستودع.</p></div>`
    : "";
  const quizProgress = hasQuizzes
    ? `<div class="lesson-quiz-progress" id="lesson-quiz-progress"><div class="lesson-progress-line"><span>تقدم الاختبارات</span><strong id="lesson-quiz-label">0 / ${groups.length}</strong></div><div class="lesson-progress-track"><span id="lesson-quiz-fill"></span></div><small class="quiet-label">محفوظ في متصفحك فقط، ولا يغيّر حالة الدرس الرسمية.</small></div>`
    : "";
  const quizActions = hasQuizzes
    ? `<div class="quiz-actions" data-quiz-actions><button class="primary-link" type="button" data-quiz-submit>تحقق من الإجابات</button><button class="secondary-action" type="button" data-quiz-reset>أعد تعيين الدرس</button></div><div class="quiz-feedback" data-quiz-summary hidden></div>`
    : "";
  const finish = hasQuizzes
    ? `<section class="lesson-finish" id="lesson-finish" hidden><div class="finish-copy"><span class="panel-kicker">إنجاز</span><h2>أكملت اختبارات هذا الدرس</h2><p>أجبت عن الأسئلة بنجاح. يمكنك مراجعة الشرح أو الانتقال إلى الدرس التالي.</p><p class="finish-status" data-finish-status></p></div><div class="finish-actions"><button class="secondary-action" type="button" data-quiz-reset>أعد تعيين الإجابات</button><a class="primary-link" href="${next ? `../${next.url}` : "../index.html"}">${next ? "الدرس التالي ←" : "العودة إلى لوحة التعلّم ←"}</a></div></section>`
    : "";
  const pager = `<nav class="journey-pager" aria-label="التنقل بين الدروس">${previous ? `<a class="secondary-action" href="../${previous.url}">السابق: ${esc(previous.title)}</a>` : "<span></span>"}${next ? `<a class="lesson-open-link" href="../${next.url}">التالي: ${esc(next.title)}</a>` : `<a class="lesson-open-link" href="../index.html">العودة إلى لوحة التعلّم</a>`}</nav>`;
  const main = `<div class="lesson-topline"><a class="back-link" href="../stages/${lesson.stage}.html">← ${esc(stage ? stage.title : "المرحلة")}</a><span class="lesson-live-status">${statusLabel(lesson)}</span></div>
<header class="lesson-heading">
  <span class="lesson-kicker">المرحلة ${lesson.stage} · الدرس ${pad(lesson.id)}</span>
  <h1>${esc(lesson.title)}</h1>
  <p class="lesson-intro">${esc(lesson.summary)}</p>
  <div class="lesson-meta">${lesson.minutes ? `<span>≈ ${lesson.minutes} دقيقة</span>` : ""}${lesson.kind === "project" ? '<span class="kind-badge">مشروع</span>' : ""}${lesson.draft ? '<span class="kind-badge">مسودة</span>' : ""}</div>
  ${quizProgress}
</header>
${objectives}
<section class="lesson-content-section" aria-labelledby="lesson-content">
  <div class="lesson-section-heading"><div><span class="panel-kicker">الشرح والأمثلة</span><h2 id="lesson-content">محتوى الدرس</h2></div><span class="quiet-label">${lesson.headings.length ? `${lesson.headings.length} أقسام` : "درس"}</span></div>
  ${draftNotice}
  <div class="lesson-prose">${lesson.bodyHtml}</div>
  ${quizActions}
</section>
${finish}
${pager}`;
  return renderPage({
    root: "../",
    title: `الدرس ${pad(lesson.id)}: ${lesson.title}`,
    description: lesson.summary,
    main,
    mainClass: "learning-shell",
    lessonPage: true,
    lessonSlug: lesson.slug,
    lessonCss: true,
  });
}

function progressPage({ stages, lessons }) {
  const stats = officialStats(lessons);
  const sections = stages
    .map((stage) => {
      const stageOverview = stageStats(stage);
      return `<section class="page-section" aria-labelledby="stage-${stage.id}-title">
  <div class="section-heading"><div><p class="eyebrow"><span class="eyebrow-line"></span> المرحلة ${stage.id}</p><h2 id="stage-${stage.id}-title">${esc(stage.title)}</h2><p class="section-description">${esc(stage.summary)}</p></div><span class="subtle-count">${stageOverview.done}/${stageOverview.total}</span></div>
  <div class="lesson-list">${stage.lessons.map((lesson) => renderLessonRow(lesson, "", true)).join("\n")}</div>
</section>`;
    })
    .join("\n");
  const main = `<header class="page-hero"><p class="eyebrow"><span class="eyebrow-line"></span> المتابعة</p><h1>سجل التقدم</h1><p class="lead">هذه هي الحالة الرسمية للدروس كما هي مكتوبة في ملفات المحتوى. تقدمك في اختبارات كل درس يُحفظ في متصفحك فقط.</p></header>
<section class="page-section" aria-label="إحصاءات التقدم">${renderStats(stats, stages)}</section>
${sections}
<section class="page-section"><div class="principles"><span class="principle-icon" aria-hidden="true">↻</span><div><h2>كيف تتحدث هذه الصفحة؟</h2><p>عدّل حالة الدرس في أعلى ملف Markdown ثم ارفع التغيير إلى GitHub. سيعيد GitHub Actions بناء الموقع تلقائيًا. لا تحتاج إلى تشغيل أي أمر على جهازك.</p></div></div></section>`;
  return renderPage({
    title: "سجل التقدم",
    description: "حالة الدروس والمراحل في مسار RustPath.",
    main,
  });
}

export async function buildSite({ outDir = DEFAULT_OUT, contentDir = path.join(ROOT, "content"), siteDir = path.join(ROOT, "site") } = {}) {
  const { stages, lessons } = await loadContent(contentDir);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, "stages"), { recursive: true });
  await mkdir(path.join(outDir, "lessons"), { recursive: true });
  await cp(path.join(siteDir, "assets"), path.join(outDir, "assets"), { recursive: true });
  await cp(path.join(siteDir, "favicon.svg"), path.join(outDir, "favicon.svg"));
  await writeFile(path.join(outDir, ".nojekyll"), "");

  await writeFile(path.join(outDir, "index.html"), dashboardPage({ stages, lessons }));
  await writeFile(path.join(outDir, "progress.html"), progressPage({ stages, lessons }));

  for (const stage of stages) {
    await writeFile(path.join(outDir, "stages", `${stage.id}.html`), stagePage(stage, stages));
  }

  for (const lesson of lessons) {
    await writeFile(path.join(outDir, lesson.url), lessonPage(lesson, lessons, stages));
  }

  return { outDir, stages, lessons };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  buildSite()
    .then(({ outDir, stages, lessons }) => {
      console.log(`Built ${stages.length} stages and ${lessons.length} lessons into ${outDir}`);
      console.log(`Site: ${SITE}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
