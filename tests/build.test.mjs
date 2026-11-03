import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite } from "../scripts/build.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

test("build generates dashboard, stage, lesson and progress pages from Markdown", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "rustpath-test-"));
  const contentDir = path.join(temp, "content");
  const outDir = path.join(temp, "out");
  const lessonsDir = path.join(contentDir, "lessons");
  const stagesDir = path.join(contentDir, "stages");
  await mkdir(lessonsDir, { recursive: true });
  await mkdir(stagesDir, { recursive: true });
  await mkdir(path.join(contentDir, "images"), { recursive: true });
  await writeFile(
    path.join(contentDir, "images", "shot.png"),
    Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5f0000000049454e44ae426082", "hex"),
  );

  await writeFile(
    path.join(stagesDir, "1.md"),
    `---
id: 1
title: أساسيات
summary: مرحلة تجريبية قصيرة.
---
`,
  );

  await writeFile(
    path.join(lessonsDir, "01-demo.md"),
    `---
id: 1
stage: 1
slug: demo
title: درس تجريبي
summary: ملخص تجريبي.
status: active
minutes: 10
objectives:
  - هدف أول
---
## الشرح

![لقطة](images/shot.png)

\`\`\`rust
fn main() {}
\`\`\`

:::quiz
id: demo
title: اختبر فهمك
:::

:::single
id: q1
group: demo
prompt: هل يعمل البناء؟
- [x] نعم
- [ ] لا
explanation: لأن الاختبار يتحقق من ذلك.
:::
`,
  );

  for (let id = 2; id <= 6; id += 1) {
    await writeFile(
      path.join(lessonsDir, `0${id}-demo-${id}.md`),
      `---
id: ${id}
stage: 1
slug: demo-${id}
title: درس ${id}
summary: ملخص ${id}.
status: upcoming
draft: true
---
`,
    );
  }

  try {
    await buildSite({ contentDir, outDir, siteDir: path.join(ROOT, "site") });

    const index = await readFile(path.join(outDir, "index.html"), "utf8");
    assert.match(index, /درس تجريبي/);
    assert.match(index, /المرحلة 1/);
    assert.match(index, /class="nav-link" href="index.html" aria-current="page"/);
    assert.match(index, /class="footer-top"/);
    assert.match(index, /id="lesson-search"/);
    assert.match(index, /id="lesson-search-index"/);
    assert.match(index, /data-to-top/);
    assert.match(index, /assets\/site\.css\?v=[a-f0-9]{8}/);
    assert.match(index, /<link rel="canonical" href="https:\/\/pandurodev\.github\.io\/rustpath-for-me-\/">/);
    assert.match(index, /property="og:title" content="لوحة التعلّم · RustPath"/);
    assert.match(index, /name="twitter:card" content="summary"/);
    assert.doesNotMatch(index, /prismjs/);

    const stage = await readFile(path.join(outDir, "stages", "1.html"), "utf8");
    assert.match(stage, /درس تجريبي/);
    assert.match(stage, /href="\.\.\/index.html#stages" aria-current="page"/);
    assert.doesNotMatch(stage, /prismjs/);
    assert.match(index, /data-phase-toggle="phase-more-1"/);
    assert.match(index, /id="phase-more-1" hidden/);
    assert.match(index, /data-slug="demo"/);

    const lesson = await readFile(path.join(outDir, "lessons", "01-demo.html"), "utf8");
    assert.match(lesson, /data-lesson-slug="demo"/);
    assert.match(lesson, /data-quiz-group="demo"/);
    assert.match(lesson, /data-quiz-submit/);
    assert.match(lesson, /src="\.\.\/images\/shot\.png"/);
    assert.match(lesson, /width="1" height="1"/);
    assert.match(lesson, /prism-rust/);
    assert.match(lesson, /"@type":"LearningResource"/);
    assert.match(lesson, /property="og:type" content="article"/);
    assert.match(lesson, /class="breadcrumbs"/);
    assert.match(lesson, /data-copy-anchor/);
    assert.match(lesson, /class="heading-anchor"/);
    assert.match(await readFile(path.join(outDir, "images", "shot.png"), "hex"), /^89504e47/);

    const notFound = await readFile(path.join(outDir, "404.html"), "utf8");
    assert.match(notFound, /الصفحة غير موجودة/);
    assert.match(notFound, /class="not-found-actions"/);
    assert.match(notFound, /href="index.html"/);
    assert.match(notFound, /name="robots" content="noindex"/);
    assert.match(notFound, /id="lesson-search"/);
    assert.match(notFound, /id="lesson-search-index"/);

    const sitemap = await readFile(path.join(outDir, "sitemap.xml"), "utf8");
    assert.match(sitemap, /<loc>https:\/\/pandurodev\.github\.io\/rustpath-for-me-\/lessons\/01-demo\.html<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/pandurodev\.github\.io\/rustpath-for-me-\/stages\/1\.html<\/loc>/);

    const robots = await readFile(path.join(outDir, "robots.txt"), "utf8");
    assert.match(robots, /Sitemap: https:\/\/pandurodev\.github\.io\/rustpath-for-me-\/sitemap\.xml/);

    const progress = await readFile(path.join(outDir, "progress.html"), "utf8");
    assert.match(progress, /سجل التقدم/);

    const apiIndex = JSON.parse(await readFile(path.join(outDir, "api", "index.json"), "utf8"));
    assert.equal(apiIndex.counts.lessons, 6);
    assert.equal(apiIndex.access.write, "none");
    assert.equal(apiIndex.lessons[0].slug, "demo");

    const apiLesson = JSON.parse(await readFile(path.join(outDir, "api", "lessons", "demo.json"), "utf8"));
    assert.equal(apiLesson.slug, "demo");
    assert.equal(apiLesson.questions[0].prompt, "هل يعمل البناء؟");
    assert.match(apiLesson.markdown, /الشرح/);

    const llms = await readFile(path.join(outDir, "llms.txt"), "utf8");
    assert.match(llms, /RustPath/);
    assert.match(llms, /api\/index\.json/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("build fails with the missing image name", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "rustpath-img-"));
  const contentDir = path.join(temp, "content");
  await mkdir(path.join(contentDir, "lessons"), { recursive: true });
  await mkdir(path.join(contentDir, "stages"), { recursive: true });
  await writeFile(path.join(contentDir, "stages", "1.md"), "---\nid: 1\ntitle: مرحلة\nsummary: ملخص.\n---\n");
  await writeFile(
    path.join(contentDir, "lessons", "01-demo.md"),
    "---\nid: 1\nstage: 1\nslug: demo\ntitle: درس\nsummary: ملخص.\nstatus: active\n---\n![x](images/gone.png)\n",
  );
  try {
    await assert.rejects(
      () => buildSite({ contentDir, outDir: path.join(temp, "out"), siteDir: path.join(ROOT, "site") }),
      /images\/gone\.png/,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
