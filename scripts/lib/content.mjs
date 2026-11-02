import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter, renderLesson, renderMarkdown } from "./markdown.mjs";

const STATUSES = new Set(["done", "active", "upcoming"]);
const KINDS = new Set(["lesson", "project"]);

async function markdownFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    throw new Error(`content directory not found: ${dir}`);
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function textField(data, key) {
  return String(data[key] ?? "").trim();
}

function integerField(data, key) {
  const value = Number(data[key]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function pushIf(errors, condition, message) {
  if (condition) errors.push(message);
}

export async function loadContent(contentDir) {
  const errors = [];
  const stages = [];
  const lessons = [];
  const stageIds = new Set();
  const lessonIds = new Set();
  const slugs = new Set();

  for (const file of await markdownFiles(path.join(contentDir, "stages"))) {
    const label = `content/stages/${path.basename(file)}`;
    let parsed;
    try {
      parsed = parseFrontmatter(await readFile(file, "utf8"), label);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const { data, body } = parsed;
    const id = integerField(data, "id");
    const title = textField(data, "title");
    const summary = textField(data, "summary");
    pushIf(errors, !id, `${label}: "id" must be a positive integer`);
    pushIf(errors, !title, `${label}: "title" is required`);
    pushIf(errors, !summary, `${label}: "summary" is required`);
    if (id) pushIf(errors, stageIds.has(id), `${label}: duplicate stage id ${id}`);
    if (id) stageIds.add(id);

    let bodyHtml = "";
    try {
      bodyHtml = renderMarkdown(body).html;
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }

    if (id && title && summary) {
      stages.push({ id, title, summary, body: body.trim(), bodyHtml, lessons: [] });
    }
  }

  for (const file of await markdownFiles(path.join(contentDir, "lessons"))) {
    const label = `content/lessons/${path.basename(file)}`;
    let parsed;
    try {
      parsed = parseFrontmatter(await readFile(file, "utf8"), label);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const { data, body } = parsed;
    const id = integerField(data, "id");
    const stage = integerField(data, "stage");
    const slug = textField(data, "slug");
    const title = textField(data, "title");
    const summary = textField(data, "summary");
    const status = textField(data, "status");
    const kind = textField(data, "kind") || "lesson";
    const draft = data.draft === true;
    const minutes = data.minutes === undefined ? 0 : Number(data.minutes);
    const objectives = data.objectives === undefined ? [] : data.objectives;
    const evidence = textField(data, "evidence");
    const remaining = textField(data, "remaining");

    pushIf(errors, !id, `${label}: "id" must be a positive integer`);
    pushIf(errors, !stage, `${label}: "stage" must be a positive integer`);
    pushIf(errors, !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug), `${label}: "slug" must contain lowercase letters, numbers and hyphens`);
    pushIf(errors, !title, `${label}: "title" is required`);
    pushIf(errors, !summary, `${label}: "summary" is required`);
    pushIf(errors, !STATUSES.has(status), `${label}: "status" must be done, active or upcoming`);
    pushIf(errors, !KINDS.has(kind), `${label}: "kind" must be lesson or project`);
    pushIf(errors, !Number.isFinite(minutes) || minutes < 0, `${label}: "minutes" must be a non-negative number`);
    pushIf(errors, !Array.isArray(objectives), `${label}: "objectives" must be a list`);
    if (id) pushIf(errors, lessonIds.has(id), `${label}: duplicate lesson id ${id}`);
    if (id) lessonIds.add(id);
    if (slug) pushIf(errors, slugs.has(slug), `${label}: duplicate slug "${slug}"`);
    if (slug) slugs.add(slug);
    if (draft) {
      pushIf(errors, status === "active", `${label}: an active lesson cannot be a draft`);
      pushIf(errors, status === "done", `${label}: a completed lesson cannot be a draft`);
    }

    let rendered;
    try {
      rendered = renderLesson(body, { file: label });
    } catch (error) {
      errors.push(error.message);
      rendered = { html: "", headings: [], groups: [], questions: [] };
    }

    if (id && stage && slug && title && summary && STATUSES.has(status)) {
      lessons.push({
        id,
        stage,
        slug,
        title,
        summary,
        status,
        kind,
        draft,
        minutes,
        objectives: Array.isArray(objectives) ? objectives.map((item) => String(item)) : [],
        evidence,
        remaining,
        body: body.trim(),
        bodyHtml: rendered.html,
        groups: rendered.groups,
        questions: rendered.questions,
        headings: rendered.headings,
        url: `lessons/${String(id).padStart(2, "0")}-${slug}.html`,
      });
    }
  }

  lessons.sort((a, b) => a.id - b.id);
  stages.sort((a, b) => a.id - b.id);

  const stageMap = new Map(stages.map((stage) => [stage.id, stage]));
  for (const lesson of lessons) {
    const stage = stageMap.get(lesson.stage);
    if (!stage) {
      errors.push(`content/lessons/${String(lesson.id).padStart(2, "0")}-${lesson.slug}.md: unknown stage ${lesson.stage}`);
      continue;
    }
    lesson.stageTitle = stage.title;
    stage.lessons.push(lesson);
  }

  for (const stage of stages) stage.lessons.sort((a, b) => a.id - b.id);

  const active = lessons.filter((lesson) => lesson.status === "active" && !lesson.draft);
  pushIf(errors, active.length > 1, `content: only one active lesson is allowed, found ${active.length}`);
  if (active.length === 1) {
    const index = lessons.indexOf(active[0]);
    const laterDone = lessons.slice(index + 1).filter((lesson) => lesson.status === "done");
    pushIf(errors, laterDone.length > 0, `content: lesson ${active[0].id} is active but a later lesson is already done`);
  }

  if (errors.length) throw new Error(errors.join("\n"));

  return { stages, lessons };
}

export function findCurrentLesson(lessons) {
  return (
    lessons.find((lesson) => lesson.status === "active" && !lesson.draft) ||
    lessons.find((lesson) => !lesson.draft && lesson.status !== "done") ||
    lessons.find((lesson) => !lesson.draft) ||
    null
  );
}

export function officialStats(lessons) {
  const available = lessons.filter((lesson) => !lesson.draft);
  const done = lessons.filter((lesson) => lesson.status === "done").length;
  return {
    total: lessons.length,
    available: available.length,
    done,
    active: lessons.filter((lesson) => lesson.status === "active" && !lesson.draft).length,
    stages: new Set(lessons.map((lesson) => lesson.stage)).size,
  };
}
