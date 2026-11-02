import { readFile } from "node:fs/promises";
const source = new URL("../lessons/lesson-04-terminal-and-paths.json", import.meta.url);
const errors = [];
const fail = message => errors.push(message);
const bilingual = (item, label) => {
  if (!item || typeof item !== "object" || typeof item.ar !== "string" || !item.ar.trim() || typeof item.en !== "string" || !item.en.trim()) fail(label + " needs Arabic and English text.");
};
let lesson;
try { lesson = JSON.parse(await readFile(source, "utf8")); }
catch (error) { console.error("FAIL: " + error.message); process.exit(1); }
if (lesson.version !== 1 || lesson.id !== 4 || lesson.slug !== "terminal-and-paths") fail("Lesson identity or schema version is invalid.");
bilingual(lesson.title, "title"); bilingual(lesson.intro, "intro");
if (!Array.isArray(lesson.objectives) || lesson.objectives.length < 3) fail("At least three learning objectives are required.");
else lesson.objectives.forEach((item, i) => bilingual(item, "objective " + (i + 1)));
if (!Array.isArray(lesson.sections) || lesson.sections.length < 5) fail("At least five explanation sections are required.");
else lesson.sections.forEach(section => {
  bilingual(section.title, "section " + section.id + " title");
  if (!section.paragraphs?.length) fail("Section " + section.id + " needs paragraphs.");
  else section.paragraphs.forEach(item => bilingual(item, "section " + section.id + " paragraph"));
  if (!section.bullets?.length) fail("Section " + section.id + " needs key points.");
  else section.bullets.forEach(item => bilingual(item, "section " + section.id + " bullet"));
  if (!section.example?.command?.trim?.()) fail("Section " + section.id + " needs a command example.");
  else bilingual(section.example.explanation, "section " + section.id + " example");
});
if (!lesson.simulator?.initialPath || !Array.isArray(lesson.simulator.initialDirectories)) fail("Simulator configuration is incomplete.");
else ["title","description","challengeTitle","challengeText","completed","incomplete","help"].forEach(key => bilingual(lesson.simulator[key], "simulator " + key));
if (lesson.challengeSteps?.length !== 5) fail("The practical challenge must contain five steps.");
else lesson.challengeSteps.forEach((step, i) => bilingual(step, "challenge step " + (i + 1)));
if (!Array.isArray(lesson.quiz) || lesson.quiz.length !== 5) fail("Lesson 4 must contain five quiz questions.");
else {
 const ids = new Set();
 lesson.quiz.forEach((q, i) => {
  if (!q.id || ids.has(q.id)) fail("Question " + (i + 1) + " has a missing or duplicate id.");
  ids.add(q.id); bilingual(q.prompt,"question "+q.id+" prompt"); bilingual(q.feedback,"question "+q.id+" feedback"); bilingual(q.hint,"question "+q.id+" hint");
  if (!Array.isArray(q.options) || q.options.length !== 4) { fail("Question " + q.id + " must have four options."); return; }
  const optionIds = q.options.map(x => x.id);
  if (new Set(optionIds).size !== 4) fail("Question " + q.id + " has duplicate option ids.");
  q.options.forEach((option,j) => bilingual(option.text,"question "+q.id+" option "+(j+1)));
  if (optionIds.filter(id => id === q.answer).length !== 1) fail("Question " + q.id + " must have exactly one answer key.");
 });
}
if (errors.length) { console.error("Lesson validation failed ("+errors.length+" issues):"); errors.forEach(x=>console.error("- "+x)); process.exit(1); }
console.log("Lesson 4 validated: "+lesson.sections.length+" sections, five practical steps, and five quiz questions.");
