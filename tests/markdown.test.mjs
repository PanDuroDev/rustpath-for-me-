import test from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, renderLesson, renderMarkdown } from "../scripts/lib/markdown.mjs";

test("frontmatter reads strings, numbers, booleans, lists and multiline values", () => {
  const { data, body } = parseFrontmatter(`---
id: 4
status: active
draft: false
minutes: 25
objectives:
  - الأول
  - "الثاني"
summary: |
  سطر أول
  سطر ثاني
---
## الشرح`);
  assert.equal(data.id, 4);
  assert.equal(data.status, "active");
  assert.equal(data.draft, false);
  assert.equal(data.minutes, 25);
  assert.deepEqual(data.objectives, ["الأول", "الثاني"]);
  assert.equal(data.summary, "سطر أول\nسطر ثاني");
  assert.equal(body, "## الشرح");
});

test("markdown escapes raw HTML and blocks javascript links", () => {
  const { html } = renderMarkdown(`<script>alert(1)</script> [اضغط](javascript:alert(1)) [آمن](https://example.com)`);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("javascript:"));
  assert.ok(html.includes('href="https://example.com"'));
});

test("markdown renders headings, code fences, tables and task lists", () => {
  const { html, headings } = renderMarkdown(`## ما هي البرمجة؟

نص.

\`\`\`rust
fn main() {}
\`\`\`

| أ | ب |
| --- | --- |
| 1 | 2 |

- [x] منجز
- [ ] متبقٍ`);
  assert.equal(headings.length, 1);
  assert.ok(headings[0].id.length > 0);
  assert.ok(html.includes('class="code-block"'));
  assert.ok(html.includes("language-rust"));
  assert.ok(html.includes("<table>"));
  assert.ok(html.includes("task-item"));
});

test("lesson blocks collect quizzes, questions and groups", () => {
  const result = renderLesson(`:::quiz
id: g1
title: اختبار
pass: 70
:::

:::single
id: q1
group: g1
prompt: سؤال؟
- [ ] خطأ
- [x] صح
explanation: لأنها صح
:::

:::multiple
id: q2
group: g1
prompt: اختر
- [x] أ
- [x] ب
- [ ] ج
:::

:::short
id: q3
group: g1
prompt: اكتب
answers: rust | Rust
:::

:::long
id: q4
group: g1
prompt: اشرح
model: |
  **نموذج**
- [ ] نقطة
:::

:::notes
id: n1
title: ملاحظات
:::

:::checklist
id: c1
title: قائمة
- [ ] مهمة
:::`);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].id, "g1");
  assert.equal(result.groups[0].gradedCount, 3);
  assert.equal(result.questions.length, 4);
  assert.ok(result.html.includes('data-type="long"'));
  assert.ok(result.html.includes('data-block-type="notes"'));
  assert.ok(result.html.includes('data-block-type="checklist"'));
});

test("a question without a quiz header gets a default group", () => {
  const result = renderLesson(`:::single
id: q1
prompt: سؤال؟
- [x] صح
- [ ] خطأ
:::`);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].declared, false);
  assert.ok(result.html.includes("quiz-head"));
});

test("aliases and the generic question block work", () => {
  const result = renderLesson(`:::question
type: radio
id: q1
prompt: سؤال؟
- [x] صح
- [ ] خطأ
:::`);
  assert.equal(result.questions[0].type, "single");
});

test("invalid single choice and unclosed directives fail clearly", () => {
  assert.throws(
    () =>
      renderLesson(`:::single
id: q1
prompt: سؤال؟
- [x] أ
- [x] ب
:::`),
    /exactly one/,
  );
  assert.throws(() => renderLesson(":::notes\nid: n1\n"), /not closed/);
  assert.throws(
    () =>
      renderLesson(`:::single
id: q1
prompt: سؤال؟
oops: قيمة
- [x] أ
- [ ] ب
:::`),
    /unknown field/,
  );
});

test("a quiz header must come before its questions", () => {
  assert.throws(
    () =>
      renderLesson(`:::single
id: q1
group: g1
prompt: سؤال؟
- [x] أ
- [ ] ب
:::

:::quiz
id: g1
:::`),
    /must appear before/,
  );
});

test("nested lists, table alignment, code titles and figure captions render", () => {
  const { html } = renderMarkdown(`- one
  - two
- three

| a | b |
| :--- | ---: |
| 1 | 2 |

\`\`\`rust [main.rs]
fn main() {}
\`\`\`

![demo](images/demo.png)`);
  assert.match(html, /<li>one<ul><li>two<\/li><\/ul><\/li>/);
  assert.match(html, /<th class="align-start">a<\/th><th class="align-end">b<\/th>/);
  assert.match(html, /<span class="code-title" dir="ltr">main\.rs<\/span>/);
  assert.match(html, /<figure class="md-figure"><img src="images\/demo\.png"/);
  assert.match(html, /<figcaption>demo<\/figcaption>/);
});

test("callouts render in markdown and inside lessons, unknown names fail", () => {
  const md = ":::warning\nbe careful\n:::\n";
  assert.match(renderMarkdown(md).html, /<aside class="callout callout-warning">/);
  assert.match(renderMarkdown(md).html, /mingcute:alert-fill/);
  assert.match(renderLesson(md).html, /callout-warning/);
  assert.throws(() => renderMarkdown(":::danger\nx\n:::"), /Only :::note, :::tip, :::warning and :::details/);
});

test("details block renders a collapsible section", () => {
  const md = ":::details لماذا؟\n**جواب**\n:::";
  const { html } = renderMarkdown(md);
  assert.match(html, /<details class="md-details">/);
  assert.match(html, /<summary class="md-details-summary">[\s\S]*لماذا؟/);
  assert.match(html, /<div class="md-details-body"><p><strong>جواب<\/strong><\/p><\/div>/);
  assert.match(renderLesson(md).html, /md-details/);
});

test("highlighted text and hard line breaks render", () => {
  assert.match(renderMarkdown("هذا ==نص مهم== عادي").html, /<mark class="md-mark">نص مهم<\/mark>/);
  assert.match(renderMarkdown("سطر أول  \nسطر ثانٍ").html, /<p>سطر أول<br>سطر ثانٍ<\/p>/);
});
