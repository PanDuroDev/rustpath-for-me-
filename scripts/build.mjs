import { createHash } from "node:crypto";
import { access, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { escapeHtml, renderInline } from "./lib/markdown.mjs";
import { findCurrentLesson, loadContent, officialStats } from "./lib/content.mjs";
import { imageSize } from "./lib/images.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_OUT = path.join(ROOT, "_site");
const REPO = "https://github.com/PanDuroDev/rustpath-for-me-";
const SITE = "https://pandurodev.github.io/rustpath-for-me-/";

// Filled by buildSite so link tags get a content hash without threading a map through every page.
let assetVersions = new Map();
const assetUrl = (name) => `assets/${name}${assetVersions.has(name) ? `?v=${assetVersions.get(name)}` : ""}`;
const hasCodeBlocks = (html) => html.includes('class="code-block"');

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

function icon(name, className = "") {
  return `<iconify-icon${className ? ` class="${className}"` : ""} icon="${name}" aria-hidden="true"></iconify-icon>`;
}

function addHeadingAnchors(html) {
  return html.replace(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g, (_, id, inner) => {
    const label = inner.replace(/<[^>]+>/g, "").trim();
    return `<h2 id="${id}">${inner}<a class="heading-anchor" href="#${id}" data-copy-anchor aria-label="نسخ رابط القسم: ${escapeHtml(label)}">${icon("mingcute:link-fill")}</a></h2>`;
  });
}

function topbar(root, active = "") {
  const current = (name) => (active === name ? ' aria-current="page"' : "");
  return `<header class="topbar">
  <a class="brand" href="${root}index.html" aria-label="RustPath — الصفحة الرئيسية">
    <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false"><path d="M17 12h19c9.4 0 15 4.7 15 12 0 6.2-3.6 10.4-9.7 11.8L52 52H41L30.2 36H26v16h-9V12Zm9 8v8h9.4c3.9 0 6.2-1.4 6.2-4s-2.3-4-6.2-4H26Z" fill="currentColor"/></svg></span>
    <span class="brand-name">Rust<span>Path</span></span>
  </a>
  <nav class="top-actions" aria-label="التنقل الرئيسي">
    <a class="nav-link" href="${root}index.html"${current("home")}>${icon("mingcute:home-4-fill")}<span>لوحة التعلّم</span></a>
    <a class="nav-link" href="${root}index.html#stages"${current("stages")}>${icon("mingcute:layers-fill")}<span>المراحل</span></a>
    <a class="nav-link" href="${root}progress.html"${current("progress")}>${icon("mingcute:chart-bar-fill")}<span>سجل التقدم</span></a>
    <a class="repo-link" href="${REPO}" target="_blank" rel="noreferrer">${icon("mingcute:github-fill")}<span>المستودع</span></a>
    <button class="theme-toggle" id="theme-toggle" type="button" aria-label="التبديل إلى الوضع الفاتح">${icon("mingcute:sun-fill", "theme-icon")}<span class="theme-label">الوضع الفاتح</span></button>
  </nav>
</header>`;
}

function footer(root, mainClass) {
  const year = new Date().getFullYear();
  const classes = mainClass === "learning-shell" ? "site-footer shell learning-footer" : "site-footer shell";
  return `<footer class="${classes}">
  <div class="footer-top">
    <div class="footer-about">
      <a class="footer-brand" href="${root}index.html">RustPath</a>
      <p>مسار عربي مفتوح لتعلّم Rust من الأساسيات إلى المشاريع، بدروس تُبنى من Markdown.</p>
    </div>
    <nav class="footer-links" aria-label="روابط التذييل">
      <a href="${root}index.html">${icon("mingcute:home-4-fill")} لوحة التعلّم</a>
      <a href="${root}index.html#stages">${icon("mingcute:layers-fill")} المراحل</a>
      <a href="${root}progress.html">${icon("mingcute:chart-bar-fill")} سجل التقدم</a>
      <a href="${REPO}" target="_blank" rel="noreferrer">${icon("mingcute:github-fill")} المستودع</a>
      <a href="${REPO}/blob/main/LICENSE" target="_blank" rel="noreferrer">${icon("mingcute:document-fill")} ترخيص MIT</a>
    </nav>
  </div>
  <div class="footer-bottom">
    <span>© ${year} RustPath</span>
    <span>مبني من Markdown · GitHub Pages</span>
  </div>
</footer>`;
}

function renderPage({
  root = "",
  title,
  description,
  main,
  mainClass = "shell",
  activeNav = "",
  lessonPage = false,
  lessonSlug = "",
  lessonCss = false,
  canonical = "",
  ogType = "website",
  jsonLd = "",
  hasCode = false,
  imageSizes = new Map(),
}) {
  const themeBoot = `<script>
(() => {
  try {
    const saved = localStorage.getItem("rustpath-theme");
    const theme = saved === "light" || saved === "dark" ? saved : (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
  } catch (_) {}
})();
</script>`;
  const social = canonical
    ? `  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="RustPath">
  <meta property="og:locale" content="ar_AR">
  <meta property="og:title" content="${esc(title)} · RustPath">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(title)} · RustPath">
  <meta name="twitter:description" content="${esc(description)}">`
    : `  <meta name="robots" content="noindex">`;
  const prism = hasCode
    ? `  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-rust.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-powershell.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-toml.min.js" defer></script>`
    : "";
  const sizedMain = main.replace(/<img src="images\/([^"]+)" /g, (match, name) => {
    const size = imageSizes.get(name);
    return size ? match.replace("<img ", `<img width="${size.width}" height="${size.height}" `) : match;
  });
  return `<!doctype html>
<html lang="ar" dir="rtl" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · RustPath</title>
  <meta name="description" content="${esc(description)}">
  <meta name="color-scheme" content="dark light">
  <meta name="theme-color" content="#090909">
${social}
${themeBoot}
  <link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${root}${assetUrl("site.css")}">
  ${lessonCss ? `<link rel="stylesheet" href="${root}${assetUrl("lesson.css")}">` : ""}
  <link rel="stylesheet" href="${root}${assetUrl("blocks.css")}">
  <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js" defer></script>
${prism}${jsonLd ? `\n  <script type="application/ld+json">${jsonLd}</script>` : ""}
</head>
<body>
  <a class="skip-link" href="#main">تخطَّ إلى المحتوى</a>
  ${topbar(root, activeNav)}
  <main id="main" class="${mainClass}"${lessonPage ? ` data-lesson-page data-lesson-slug="${esc(lessonSlug)}"` : ""}>${sizedMain.replaceAll('src="images/', `src="${root}images/`)}</main>
  ${footer(root, mainClass)}
  <button class="to-top" type="button" data-to-top aria-label="العودة إلى أعلى الصفحة">${icon("mingcute:arrow-up-fill")}</button>
  <script src="${root}${assetUrl("site.js")}" defer></script>
  ${lessonPage ? `<script src="${root}${assetUrl("lesson.js")}" defer></script>` : ""}
</body>
</html>`;
}

function renderStats(stats, stages) {
  return `<div class="stats">
  <div class="stat-card"><span class="stat-icon" aria-hidden="true">${icon("mingcute:check-circle-fill")}</span><div><span class="stat-label">الدروس المكتملة</span><strong>${stats.done}<small> / ${stats.total}</small></strong></div></div>
  <div class="stat-card"><span class="stat-icon" aria-hidden="true">${icon("mingcute:book-2-fill")}</span><div><span class="stat-label">الدروس المتاحة</span><strong>${stats.available}<small> درسًا</small></strong></div></div>
  <div class="stat-card"><span class="stat-icon" aria-hidden="true">${icon("mingcute:layers-fill")}</span><div><span class="stat-label">المراحل</span><strong>${stages.length}<small> مراحل</small></strong></div></div>
</div>`;
}

function renderCurrent(lesson, lessons, stages) {
  if (!lesson) {
    return `<div class="next-step-card"><span class="next-step-icon" aria-hidden="true">${icon("mingcute:check-circle-fill")}</span><div class="next-step-copy"><span>لا يوجد درس نشط</span><h3>كل الدروس المتاحة مكتملة</h3><p>يمكنك مراجعة المراحل أو البدء في إضافة الدروس القادمة عبر Markdown.</p></div><a class="lesson-open-link" href="index.html#stages">استعرض المراحل</a></div>`;
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
      <a class="lesson-open-link" href="${lesson.url}">افتح الدرس ${icon("mingcute:arrow-left-fill")}</a>
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
  const topic = (lesson) =>
    `<a class="topic-item" href="${lesson.url}" data-slug="${lesson.slug}" data-status="${statusData(lesson)}"><span class="topic-name">${pad(lesson.id)} — ${esc(lesson.title)}</span><span class="topic-status">${statusLabel(lesson)}</span></a>`;
  const visible = stage.lessons.slice(0, 4);
  const rest = stage.lessons.slice(4);
  const topics = visible.map(topic).join("");
  const more = rest.length
    ? `<div class="topic-more" id="phase-more-${stage.id}" hidden>${rest.map(topic).join("")}</div>`
    : "";
  const toggle = rest.length
    ? `<button class="phase-toggle" type="button" data-phase-toggle="phase-more-${stage.id}" aria-expanded="false" aria-controls="phase-more-${stage.id}" data-expand-label="عرض بقية الدروس (${rest.length})" data-collapse-label="تقليل الدروس">${icon("mingcute:down-fill")}<span class="phase-toggle-label">عرض بقية الدروس (${rest.length})</span></button>`
    : "";
  return `<article class="phase-card${current ? " phase-current" : ""}">
  <div class="phase-head">
    <span class="phase-icon" aria-hidden="true">${pad(stage.id)}</span>
    <div class="phase-title"><span>المرحلة ${stage.id}</span><h3>${esc(stage.title)}</h3></div>
    <span class="phase-status">${stageStatus(stage)}</span>
  </div>
  <p>${esc(stage.summary)}</p>
  <div class="stage-progress"><div class="progress-track"><span style="width:${stats.percent}%"></span></div><span class="subtle-count">${stats.done}/${stats.total}</span></div>
  <div class="topic-list">${topics}${more}</div>
  <div class="phase-actions">
    ${toggle}
    <a class="lesson-open-link" href="stages/${stage.id}.html">افتح المرحلة ${icon("mingcute:arrow-left-fill")}</a>
  </div>
</article>`;
}

function searchBlock(lessons) {
  const index = JSON.stringify(lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, summary: lesson.summary, url: lesson.url, stage: lesson.stage, stageTitle: lesson.stageTitle }))).replaceAll("<", "\\u003c");
  return `<div class="lesson-search">
    <input id="lesson-search" type="search" aria-label="ابحث في الدروس" placeholder="ابحث باسم الدرس أو المرحلة…" autocomplete="off">
    <ul class="search-results" id="search-results" aria-live="polite" hidden></ul>
  </div>
  <script type="application/json" id="lesson-search-index">${index}</script>`;
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
    <a class="primary-link" href="${current ? current.url : "#stages"}">${current ? `تابع من الدرس ${pad(current.id)}` : "استعرض المراحل"} ${icon("mingcute:arrow-left-fill")}</a>
    <p class="hero-meta"><span>${stages.length} مراحل</span><span>${stats.total} درسًا</span><span>تمارين تفاعلية</span></p>
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
  ${searchBlock(lessons)}
  <div class="roadmap-list">${stages.map(renderStageCard).join("\n")}</div>
</section>

<section class="page-section" aria-label="كيف يعمل الموقع">
  <div class="principles">
    <span class="principle-icon" aria-hidden="true">${icon("mingcute:bulb-fill")}</span>
    <div><h2>صفحات تُبنى من Markdown</h2><p>أضف الدرس كملف نصي في مجلد <code dir="ltr">content/lessons</code>، واكتب الشرح ثم كتلة <code dir="ltr">:::quiz</code>. يتولى GitHub Actions بناء الصفحة ونشرها. <a href="${REPO}/blob/main/content/README.md" target="_blank" rel="noreferrer">دليل إضافة الدروس ${icon("mingcute:external-link-fill")}</a></p></div>
  </div>
</section>`;
  return renderPage({
    title: "لوحة التعلّم",
    description: lead,
    main,
    activeNav: "home",
    canonical: SITE,
  });
}

function stagePage(stage, stages, imageSizes) {
  const stats = stageStats(stage);
  const index = stages.findIndex((item) => item.id === stage.id);
  const previous = stages[index - 1];
  const next = stages[index + 1];
  const rows = stage.lessons.map((lesson) => renderLessonRow(lesson, "../")).join("\n");
  const main = `<div class="lesson-topline"><a class="back-link" href="../index.html">${icon("mingcute:arrow-right-fill")} لوحة التعلّم</a><span class="lesson-live-status">${stageStatus(stage)}</span></div>
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
    activeNav: "stages",
    lessonCss: true,
    canonical: `${SITE}stages/${stage.id}.html`,
    hasCode: hasCodeBlocks(stage.bodyHtml || ""),
    imageSizes,
  });
}

function renderLessonRow(lesson, root, details = false) {
  const count = quizCount(lesson);
  const meta = [lesson.minutes ? `${lesson.minutes} دقيقة` : "", count ? `${count} أسئلة` : ""].filter(Boolean).join(" · ");
  const evidence = details && lesson.evidence ? `<small class="lesson-evidence">الدليل: ${esc(lesson.evidence)}</small>` : "";
  const remaining = details && lesson.remaining ? `<small>المتبقي: ${esc(lesson.remaining)}</small>` : "";
  return `<a class="lesson" href="${root}${lesson.url}" data-slug="${lesson.slug}" data-status="${statusData(lesson)}">
  <span class="lesson-index">${pad(lesson.id)}</span>
  <span class="lesson-icon" aria-hidden="true">${icon(lesson.kind === "project" ? "mingcute:rocket-fill" : lesson.draft ? "mingcute:document-fill" : "mingcute:code-fill")}</span>
  <div class="lesson-copy">
    <div class="lesson-title-row"><h3>${esc(lesson.title)}</h3>${lesson.kind === "project" ? '<span class="kind-badge">مشروع</span>' : ""}${lesson.draft ? '<span class="kind-badge">مسودة</span>' : ""}</div>
    <p>${esc(lesson.summary)}</p>
    ${meta ? `<small>${meta}</small>` : ""}
    ${evidence}${remaining}
  </div>
  <span class="lesson-state">${statusLabel(lesson)}</span>
</a>`;
}

function lessonPage(lesson, lessons, imageSizes) {
  const index = lessons.findIndex((item) => item.id === lesson.id);
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  const groups = lesson.groups;
  const hasQuizzes = groups.length > 0;
  const objectives = lesson.objectives.length
    ? `<section class="objectives-panel" aria-labelledby="objectives-title"><div><span class="panel-kicker">الأهداف</span><h2 id="objectives-title">ما ستتعلمه</h2></div><ul class="objectives-list">${lesson.objectives.map((objective) => `<li>${renderInline(objective)}</li>`).join("")}</ul></section>`
    : "";
  const toc = lesson.headings.length >= 3
    ? `<nav class="lesson-toc" aria-label="محتويات الدرس"><p class="toc-title">في هذه الصفحة</p><ul>${lesson.headings.map((heading) => `<li class="toc-level-${heading.level}"><a href="#${heading.id}">${esc(heading.text)}</a></li>`).join("")}</ul></nav>`
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
    ? `<section class="lesson-finish" id="lesson-finish" hidden><div class="finish-copy"><span class="panel-kicker">إنجاز</span><h2>أكملت اختبارات هذا الدرس</h2><p>أجبت عن الأسئلة بنجاح. يمكنك مراجعة الشرح أو الانتقال إلى الدرس التالي.</p><p class="finish-status" data-finish-status></p></div><div class="finish-actions"><button class="secondary-action" type="button" data-quiz-reset>أعد تعيين الإجابات</button><a class="primary-link" href="${next ? `../${next.url}` : "../index.html"}">${next ? "الدرس التالي" : "العودة إلى لوحة التعلّم"} ${icon("mingcute:arrow-left-fill")}</a></div></section>`
    : "";
  const pager = `<nav class="journey-pager" aria-label="التنقل بين الدروس">${previous ? `<a class="secondary-action" href="../${previous.url}">${icon("mingcute:arrow-right-fill")} السابق: ${esc(previous.title)}</a>` : "<span></span>"}${next ? `<a class="lesson-open-link" href="../${next.url}">التالي: ${esc(next.title)} ${icon("mingcute:arrow-left-fill")}</a>` : `<a class="lesson-open-link" href="../index.html">العودة إلى لوحة التعلّم ${icon("mingcute:arrow-left-fill")}</a>`}</nav>`;
  const breadcrumbs = `<nav class="breadcrumbs" aria-label="مسار التنقل"><a href="../index.html">الرئيسية</a><span aria-hidden="true">/</span><a href="../stages/${lesson.stage}.html">المرحلة ${lesson.stage}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(lesson.title)}</span></nav>`;
  const main = `<div class="lesson-topline">${breadcrumbs}<span class="lesson-live-status">${statusLabel(lesson)}</span></div><header class="lesson-heading">
  <span class="lesson-kicker">المرحلة ${lesson.stage} · الدرس ${pad(lesson.id)}</span>
  <h1>${esc(lesson.title)}</h1>
  <p class="lesson-intro">${esc(lesson.summary)}</p>
  <div class="lesson-meta">${lesson.minutes ? `<span>≈ ${lesson.minutes} دقيقة</span>` : ""}${lesson.kind === "project" ? '<span class="kind-badge">مشروع</span>' : ""}${lesson.draft ? '<span class="kind-badge">مسودة</span>' : ""}</div>
  ${quizProgress}
</header>
${objectives}
${toc}
<section class="lesson-content-section" aria-labelledby="lesson-content">
  <div class="lesson-section-heading"><div><span class="panel-kicker">الشرح والأمثلة</span><h2 id="lesson-content">محتوى الدرس</h2></div><span class="quiet-label">${lesson.headings.length ? `${lesson.headings.length} أقسام` : "درس"}</span></div>
  ${draftNotice}
  <div class="lesson-prose">${addHeadingAnchors(lesson.bodyHtml)}</div>
  ${quizActions}
</section>
${finish}
${pager}`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: lesson.title,
    description: lesson.summary,
    url: `${SITE}${lesson.url}`,
    inLanguage: "ar",
    learningResourceType: "lesson",
    isPartOf: { "@type": "Course", name: "RustPath", url: SITE },
  }).replaceAll("<", "\\u003c");
  return renderPage({
    root: "../",
    title: `الدرس ${pad(lesson.id)}: ${lesson.title}`,
    description: lesson.summary,
    main,
    mainClass: "learning-shell",
    activeNav: "stages",
    lessonPage: true,
    lessonSlug: lesson.slug,
    lessonCss: true,
    canonical: `${SITE}${lesson.url}`,
    ogType: "article",
    jsonLd,
    hasCode: hasCodeBlocks(lesson.bodyHtml),
    imageSizes,
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
<section class="page-section"><div class="principles"><span class="principle-icon" aria-hidden="true">${icon("mingcute:refresh-2-fill")}</span><div><h2>كيف تتحدث هذه الصفحة؟</h2><p>عدّل حالة الدرس في أعلى ملف Markdown ثم ارفع التغيير إلى GitHub. سيعيد GitHub Actions بناء الموقع تلقائيًا. لا تحتاج إلى تشغيل أي أمر على جهازك.</p></div></div></section>`;
  return renderPage({
    title: "سجل التقدم",
    description: "حالة الدروس والمراحل في مسار RustPath.",
    main,
    activeNav: "progress",
    canonical: `${SITE}progress.html`,
  });
}

function notFoundPage(lessons) {
  const main = `<header class="page-hero"><p class="eyebrow"><span class="eyebrow-line"></span> 404</p><h1>الصفحة غير موجودة</h1><p class="lead">الرابط الذي فتحته غير صحيح أو أن الصفحة نُقلت. ابحث عن الدرس الذي تريده أو ارجع إلى لوحة التعلّم.</p>${searchBlock(lessons)}<p class="not-found-actions"><a class="primary-link" href="index.html">العودة إلى لوحة التعلّم ${icon("mingcute:arrow-left-fill")}</a><a class="secondary-action" href="progress.html">سجل التقدم</a></p></header>`;
  return renderPage({ title: "الصفحة غير موجودة", description: "هذا الرابط غير موجود في RustPath.", main, activeNav: "" });
}

const API_BASE = "https://pandurodev.github.io/rustpath-for-me-";

function apiIndex(stages, lessons) {
  return `${JSON.stringify(
    {
      schema: 1,
      site: { name: "RustPath", url: API_BASE, language: "ar", direction: "rtl" },
      access: {
        read: "public",
        write: "none",
        note: "المحتوى للقراءة فقط. التقدم محلي في المتصفح ويمكن قراءته عبر window.RustPath.getProgress().",
      },
      counts: { stages: stages.length, lessons: lessons.length },
      stages: stages.map((stage) => ({
        id: stage.id,
        title: stage.title,
        summary: stage.summary,
        lessonCount: stage.lessons.length,
        url: `${API_BASE}/stages/${stage.id}.html`,
        markdown: stage.body,
      })),
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        summary: lesson.summary,
        status: lesson.status,
        kind: lesson.kind,
        draft: lesson.draft,
        minutes: lesson.minutes,
        stage: lesson.stage,
        stageTitle: lesson.stageTitle,
        url: `${API_BASE}/${lesson.url}`,
        api: `${API_BASE}/api/lessons/${lesson.slug}.json`,
      })),
    },
    null,
    2,
  )}\n`;
}

function apiLesson(lesson) {
  return `${JSON.stringify(
    {
      schema: 1,
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      stage: lesson.stage,
      stageTitle: lesson.stageTitle,
      status: lesson.status,
      kind: lesson.kind,
      draft: lesson.draft,
      minutes: lesson.minutes,
      url: `${API_BASE}/${lesson.url}`,
      objectives: lesson.objectives,
      headings: lesson.headings,
      markdown: lesson.body,
      html: lesson.bodyHtml,
      quizzes: lesson.groups,
      questions: lesson.questions,
    },
    null,
    2,
  )}\n`;
}

function llmsText(stages, lessons) {
  const lines = [
    "# RustPath",
    "",
    "> مسار عربي منظّم لتعلّم Rust من الأساسيات إلى المشاريع، مبني من ملفات Markdown.",
    "",
    "المحتوى عام ومتاح للقراءة فقط. تقدم المتعلم محلي في المتصفح ولا يُخزَّن على الخادم.",
    "",
    "## API",
    "",
    `- [فهرس المنهج](${API_BASE}/api/index.json): المراحل والدروس وروابطها.`,
    `- [API كل درس](${API_BASE}/api/lessons/): بيانات الدرس والمحتوى والأسئلة.`,
    "",
    "## المراحل",
    "",
    ...stages.map((stage) => `- [المرحلة ${stage.id}: ${stage.title}](${API_BASE}/stages/${stage.id}.html): ${stage.summary}`),
    "",
    "## الدروس",
    "",
    ...lessons.map((lesson) => `- [${String(lesson.id).padStart(2, "0")} — ${lesson.title}](${API_BASE}/${lesson.url}): ${lesson.summary}`),
    "",
  ];
  return lines.join("\n");
}

function sitemap(stages, lessons) {
  const pages = ["", "progress.html", ...stages.map((stage) => `stages/${stage.id}.html`), ...lessons.map((lesson) => lesson.url)];
  const urls = pages.map((page) => `  <url><loc>${SITE}${page}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`;

export async function buildSite({ outDir = DEFAULT_OUT, contentDir = path.join(ROOT, "content"), siteDir = path.join(ROOT, "site") } = {}) {
  const { stages, lessons } = await loadContent(contentDir);
  const imagesDir = path.join(contentDir, "images");

  const imageRefs = new Set();
  for (const item of [...stages, ...lessons]) {
    for (const match of item.bodyHtml.matchAll(/src="images\/([^"]+)"/g)) imageRefs.add(match[1]);
  }
  const missingImages = [];
  const imageSizes = new Map();
  for (const name of imageRefs) {
    try {
      await access(path.join(imagesDir, name));
    } catch (_) {
      missingImages.push(`images/${name}`);
      continue;
    }
    const size = await imageSize(path.join(imagesDir, name));
    if (size) imageSizes.set(name, size);
  }
  if (missingImages.length) {
    throw new Error(`missing image files:\n${missingImages.join("\n")}`);
  }

  assetVersions = new Map();
  for (const name of await readdir(path.join(siteDir, "assets"))) {
    assetVersions.set(name, createHash("sha256").update(await readFile(path.join(siteDir, "assets", name))).digest("hex").slice(0, 8));
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, "stages"), { recursive: true });
  await mkdir(path.join(outDir, "lessons"), { recursive: true });
  try {
    await access(imagesDir);
    await cp(imagesDir, path.join(outDir, "images"), { recursive: true });
  } catch (_) {}
  await cp(path.join(siteDir, "assets"), path.join(outDir, "assets"), { recursive: true });
  await cp(path.join(siteDir, "favicon.svg"), path.join(outDir, "favicon.svg"));
  await writeFile(path.join(outDir, ".nojekyll"), "");

  await writeFile(path.join(outDir, "index.html"), dashboardPage({ stages, lessons }));
  await writeFile(path.join(outDir, "progress.html"), progressPage({ stages, lessons }));
  await writeFile(path.join(outDir, "404.html"), notFoundPage(lessons));

  await mkdir(path.join(outDir, "api", "lessons"), { recursive: true });
  await writeFile(path.join(outDir, "api", "index.json"), apiIndex(stages, lessons));
  for (const lesson of lessons) {
    await writeFile(path.join(outDir, "api", "lessons", `${lesson.slug}.json`), apiLesson(lesson));
  }
  await writeFile(path.join(outDir, "llms.txt"), llmsText(stages, lessons));
  await writeFile(path.join(outDir, "sitemap.xml"), sitemap(stages, lessons));
  await writeFile(path.join(outDir, "robots.txt"), robots);

  for (const stage of stages) {
    await writeFile(path.join(outDir, "stages", `${stage.id}.html`), stagePage(stage, stages, imageSizes));
  }

  for (const lesson of lessons) {
    await writeFile(path.join(outDir, lesson.url), lessonPage(lesson, lessons, imageSizes));
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
