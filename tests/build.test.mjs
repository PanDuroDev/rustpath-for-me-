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
  await writeFile(path.join(contentDir, "images", "shot.png"), "png");

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

    const stage = await readFile(path.join(outDir, "stages", "1.html"), "utf8");
    assert.match(stage, /درس تجريبي/);
    assert.match(stage, /href="\.\.\/index.html#stages" aria-current="page"/);
    assert.match(index, /data-phase-toggle="phase-more-1"/);
    assert.match(index, /id="phase-more-1" hidden/);

    const lesson = await readFile(path.join(outDir, "lessons", "01-demo.html"), "utf8");
    assert.match(lesson, /data-lesson-slug="demo"/);
    assert.match(lesson, /data-quiz-group="demo"/);
    assert.match(lesson, /data-quiz-submit/);
    assert.match(lesson, /src="\.\.\/images\/shot\.png"/);
    assert.equal(await readFile(path.join(outDir, "images", "shot.png"), "utf8"), "png");

    const progress = await readFile(path.join(outDir, "progress.html"), "utf8");
    assert.match(progress, /سجل التقدم/);
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
