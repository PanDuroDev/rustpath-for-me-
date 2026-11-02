import { readFile } from "node:fs/promises";

const progressPath = new URL("../docs/progress.json", import.meta.url);
const markdownPath = new URL("../LEARNING_PROGRESS.md", import.meta.url);
const errors = [];
const validKinds = new Set(["lesson", "project"]);
const validStatuses = new Map([["done", 0], ["active", 1], ["upcoming", 2]]);

function fail(message) {
  errors.push(message);
}

let progress;
let markdown;

try {
  progress = JSON.parse(await readFile(progressPath, "utf8"));
} catch (error) {
  console.error("FAIL: تعذر قراءة أو تحليل docs/progress.json: " + error.message);
  process.exit(1);
}

try {
  markdown = await readFile(markdownPath, "utf8");
} catch (error) {
  console.error("FAIL: تعذر قراءة LEARNING_PROGRESS.md: " + error.message);
  process.exit(1);
}

if (!Array.isArray(progress.phases)) {
  fail("progress.json: الحقل phases يجب أن يكون مصفوفة.");
}

const items = [];
if (Array.isArray(progress.phases)) {
  for (const phase of progress.phases) {
    if (!Array.isArray(phase.items)) {
      fail("المرحلة " + (phase.id ?? "؟") + ": الحقل items يجب أن يكون مصفوفة.");
      continue;
    }
    if (typeof phase.title_en !== "string" || !phase.title_en.trim() || typeof phase.summary_en !== "string" || !phase.summary_en.trim()) {
      fail("المرحلة " + (phase.id ?? "؟") + ": title_en وsummary_en مطلوبان للواجهة الإنجليزية.");
    }
    for (const item of phase.items) items.push(item);
  }
}

let activeCount = 0;
let previousStatusRank = -1;
const doneItems = [];

items.forEach((item, index) => {
  const expectedId = index + 1;
  if (item.id !== expectedId) {
    fail("ترقيم العناصر غير متسلسل: المتوقع " + expectedId + " لكن وُجد " + item.id + ".");
  }
  if (!validKinds.has(item.kind)) {
    fail("العنصر " + item.id + ": kind غير صالح (" + item.kind + ").");
  }
  if (typeof item.title_en !== "string" || !item.title_en.trim() || typeof item.desc_en !== "string" || !item.desc_en.trim()) {
    fail("العنصر " + item.id + ": title_en وdesc_en مطلوبان للواجهة الإنجليزية.");
  }
  if (!validStatuses.has(item.status)) {
    fail("العنصر " + item.id + ": status غير صالح (" + item.status + ").");
    return;
  }

  const rank = validStatuses.get(item.status);
  if (rank < previousStatusRank) {
    fail("ترتيب الحالات غير صحيح عند العنصر " + item.id + ": المطلوب done ثم active ثم upcoming.");
  }
  previousStatusRank = rank;

  if (item.status === "done") {
    doneItems.push(item);
    if (typeof item.evidence !== "string" || item.evidence.trim() === "") {
      fail("العنصر " + item.id + ": الحالة done تتطلب evidence غير فارغ.");
    }
    if (typeof item.evidence_en !== "string" || item.evidence_en.trim() === "") {
      fail("العنصر " + item.id + ": الحالة done تتطلب evidence_en للواجهة الإنجليزية.");
    }
  }
  if (item.status === "active") {
    activeCount += 1;
    if (typeof item.remaining !== "string" || item.remaining.trim() === "") {
      fail("العنصر " + item.id + ": الحالة active تتطلب remaining غير فارغ.");
    }
    if (typeof item.remaining_en !== "string" || item.remaining_en.trim() === "") {
      fail("العنصر " + item.id + ": الحالة active تتطلب remaining_en للواجهة الإنجليزية.");
    }
  }
});

if (activeCount !== 1) {
  fail("عدد العناصر active هو " + activeCount + "؛ يجب وجود عنصر واحد بالضبط.");
}
if (items.length !== 43) {
  fail("عدد العناصر " + items.length + "؛ المطلوب 43 عنصراً بالضبط.");
}

const nextLessonMatch = markdown.match(/^\s*- \*\*Next lesson:\*\* Phase \d+, Lesson (\d+) — (.+)$/m);
if (!nextLessonMatch) {
  fail('لم يُعثر على سطر Next lesson بصيغة Phase N, Lesson N — title.');
} else {
  const nextId = Number(nextLessonMatch[1]);
  const nextItem = items.find((item) => item.id === nextId);
  if (!nextItem || nextItem.status !== "upcoming") {
    fail("الدرس التالي في Markdown لا يشير إلى عنصر upcoming صالح في JSON.");
  } else if (nextLessonMatch[2].trim() !== nextItem.title_en) {
    fail("عنوان Next lesson في Markdown لا يطابق title_en للعنصر " + nextId + " في JSON.");
  }
}

const currentMatch = markdown.match(/^\s*- \*\*Current lesson:\*\* Lesson (\d+)\b/m);
if (!currentMatch) {
  fail('لم يُعثر على سطر "- **Current lesson:** Lesson N" في LEARNING_PROGRESS.md.');
} else {
  const currentId = Number(currentMatch[1]);
  const activeItem = items.find((item) => item.status === "active");
  if (!activeItem || activeItem.id !== currentId) {
    fail("رقم الدرس الحالي في Markdown هو " + currentId + " ولا يطابق العنصر active في JSON" +
      (activeItem ? " (" + activeItem.id + ")" : " (لا يوجد عنصر active)") + ".");
  }
}

const completedRows = [];
for (const line of markdown.split(/\r?\n/)) {
  const match = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*Complete\s*\|\s*$/);
  if (match) completedRows.push({ id: Number(match[1]), title: match[2].trim(), evidence: match[3].trim() });
}

const doneIds = doneItems.map((item) => item.id);
const tableIds = completedRows.map((row) => row.id);
if (JSON.stringify(tableIds) !== JSON.stringify(doneIds)) {
  fail("صفوف Complete في جدول Markdown (" + (tableIds.join(", ") || "لا شيء") +
    ") لا تطابق عناصر done في JSON (" + (doneIds.join(", ") || "لا شيء") + ").");
}
for (const row of completedRows) {
  const item = doneItems.find((entry) => entry.id === row.id);
  if (item && row.title !== item.title_en) {
    fail("عنوان العنصر " + row.id + " في جدول Markdown لا يطابق title_en في progress.json.");
  }
  if (item && row.evidence !== item.evidence) {
    fail("دليل العنصر " + row.id + " في جدول Markdown لا يطابق evidence في progress.json.");
  }
}

const curriculumCheckboxes = [];
for (const line of markdown.split(/\r?\n/)) {
  const match = line.match(/^\s*- \[([ xX])\] (\d+)\. /);
  if (match) curriculumCheckboxes.push({ id: Number(match[2]), checked: match[1].toLowerCase() === "x" });
}
if (curriculumCheckboxes.length !== items.length) {
  fail("عدد عناصر checkboxes في Upcoming curriculum (" + curriculumCheckboxes.length + ") لا يطابق عدد عناصر JSON (" + items.length + ").");
}
curriculumCheckboxes.forEach((row, index) => {
  const expectedId = index + 1;
  if (row.id !== expectedId) {
    fail("ترتيب checkboxes غير متسلسل: المتوقع العنصر " + expectedId + " لكن وُجد " + row.id + ".");
  }
  const item = items.find((entry) => entry.id === row.id);
  if (!item) {
    fail("عنصر المنهج رقم " + row.id + " في checkboxes غير موجود في JSON.");
  } else {
    if (row.title !== item.title_en) {
      fail("عنوان checkbox للعنصر " + row.id + " لا يطابق title_en في progress.json.");
    }
    if (row.checked !== (item.status === "done")) {
      fail("حالة checkbox للعنصر " + row.id + " لا تطابق status في progress.json.");
    }
  }
});

if (typeof progress.updated !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(progress.updated)) {
  fail("الحقل updated في progress.json مفقود أو ليس بصيغة YYYY-MM-DD.");
}
const dateMatch = markdown.match(/^\s*>\s*Last updated:\s*(\d{4}-\d{2}-\d{2})\s*$/m);
if (!dateMatch) {
  fail('التاريخ "Last updated: YYYY-MM-DD" مفقود من LEARNING_PROGRESS.md.');
} else if (dateMatch[1] !== progress.updated) {
  fail("تاريخ updated في JSON (" + progress.updated + ") لا يطابق Last updated في Markdown (" + dateMatch[1] + ").");
}

if (errors.length) {
  console.error("فشل التحقق من التقدم (" + errors.length + " مشكلة):");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("نجح التحقق: " + items.length + " عنصراً، " + doneItems.length +
  " مكتملة، عنصر واحد قيد التنفيذ، والتواريخ والأدلة متطابقة.");
