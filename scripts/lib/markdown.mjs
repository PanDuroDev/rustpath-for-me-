// Dependency-free Markdown + lesson blocks for RustPath.
// Content is trusted repository text, but every value is HTML-escaped so a
// typo can never inject markup into the generated site.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const CALLOUTS = {
  note: { key: "note", label: "ملاحظة", icon: "mingcute:information-fill" },
  tip: { key: "tip", label: "تلميح", icon: "mingcute:bulb-fill" },
  warning: { key: "warning", label: "تحذير", icon: "mingcute:alert-fill" },
};

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export function slugify(value) {
  const text = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return text || "section";
}

function parseScalar(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).replace(/\\([\\"'\n])/g, (_, char) => (char === "n" ? "\n" : char));
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((part) => parseScalar(part))
      .filter((part) => part !== "");
  }
  return value;
}

function parseKeyValueLines(lines, file) {
  const fields = {};
  const options = [];

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const checkbox = raw.match(/^\s*-\s*\[([ xX])\]\s*(.*)$/);
    if (checkbox) {
      options.push({ text: checkbox[2].trim(), correct: checkbox[1].toLowerCase() === "x" });
      continue;
    }

    const plainItem = raw.match(/^\s*-\s+(.*)$/);
    if (plainItem) {
      options.push({ text: plainItem[1].trim(), correct: null });
      continue;
    }

    const pair = raw.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!pair) {
      throw new Error(`${file}:${i + 1}: cannot parse line "${raw.trim()}"`);
    }

    const key = pair[1];
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      throw new Error(`${file}:${i + 1}: duplicate field "${key}"`);
    }

    const value = pair[2].trim();

    if (value === "|" || value === ">") {
      const baseIndent = raw.match(/^\s*/)[0].length;
      const parts = [];
      i += 1;
      while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) {
          parts.push("");
          i += 1;
          continue;
        }
        const indent = line.match(/^\s*/)[0].length;
        if (indent <= baseIndent) break;
        parts.push(line.slice(Math.min(indent, baseIndent + 2)));
        i += 1;
      }
      i -= 1;
      fields[key] = value === ">" ? parts.join(" ").trim() : parts.join("\n").trim();
      continue;
    }

    if (value === "") {
      const list = [];
      i += 1;
      while (i < lines.length) {
        const item = lines[i].match(/^\s*-\s+(.*)$/);
        if (!item) break;
        list.push(parseScalar(item[1]));
        i += 1;
      }
      i -= 1;
      fields[key] = list;
      continue;
    }

    fields[key] = parseScalar(value);
  }

  return { fields, options };
}

export function parseFrontmatter(source, file = "content") {
  const text = String(source ?? "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  if (lines[0] !== "---") return { data: {}, body: text };

  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error(`${file}: frontmatter is not closed with ---`);

  const { fields } = parseKeyValueLines(lines.slice(1, end), file);
  const body = lines.slice(end + 1).join("\n").replace(/^\n+/, "");
  return { data: fields, body };
}

function safeUrl(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (/^(https?:|mailto:)/i.test(value)) return value;
  if (/^[#/]/.test(value)) return value;
  if (/^\.{1,2}\//.test(value)) return value;
  if (!value.includes(":") && /^[\w./?&=%#-]+$/.test(value)) return value;
  return "";
}

export function renderInline(raw) {
  let value = escapeHtml(raw);

  const codes = [];
  value = value.replace(/`([^`]+)`/g, (_, code) => {
    const token = `\u0000C${codes.length}\u0000`;
    codes.push(`<code dir="ltr">${code}</code>`);
    return token;
  });

  value = value.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => {
    const url = safeUrl(src);
    if (!url) return alt;
    return `<img src="${url}" alt="${alt}" loading="lazy" decoding="async"${title ? ` title="${title}"` : ""}>`;
  });

  value = value.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href, title) => {
    const url = safeUrl(href);
    if (!url) return label;
    const external = /^(https?:|mailto:)/i.test(url);
    return `<a href="${url}"${title ? ` title="${title}"` : ""}${external ? ' target="_blank" rel="noreferrer"' : ""}>${label}</a>`;
  });

  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  value = value.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  value = value.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  value = value.replace(/==([^=]+)==/g, '<mark class="md-mark">$1</mark>');
  value = value.replace(/\u0000C(\d+)\u0000/g, (_, index) => codes[Number(index)]);
  return value;
}

function plainHeading(raw) {
  return raw
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}

function isBlockStart(line) {
  return /^(#{2,4}\s|```|:::|\s*>|\s*[-*+]\s+|\s*\d+\.\s+|(?:---|\*\*\*|___)\s*$)/.test(line);
}

function isTableStart(lines, index) {
  const head = lines[index];
  const separator = lines[index + 1];
  if (!head || !head.includes("|") || !separator || !separator.includes("|")) return false;
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(separator);
}

function splitRow(line) {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  return value.split("|").map((cell) => cell.trim());
}

function renderListItem(item, nested = "") {
  const task = item.match(/^\[([ xX])\]\s+(.*)$/);
  if (task) {
    const checked = task[1].toLowerCase() === "x";
    return `<li class="task-item"><span class="task-box" aria-hidden="true">${checked ? "✓" : "☐"}</span><span>${renderInline(task[2])}</span>${nested}</li>`;
  }
  return `<li>${renderInline(item)}${nested}</li>`;
}

function listMatch(line) {
  const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
  if (!match) return null;
  return {
    indent: match[1].replace(/\t/g, "  ").length,
    ordered: /^\d/.test(match[2]),
    number: /^\d/.test(match[2]) ? Number(match[2].slice(0, -1)) : 1,
    text: match[3],
  };
}

// Lists nest by indentation; one blank line between items is allowed.
function renderList(lines, start) {
  const first = listMatch(lines[start]);
  const baseIndent = first.indent;
  const ordered = first.ordered;
  const items = [];
  let i = start;

  while (i < lines.length) {
    const match = listMatch(lines[i]);
    if (!match || match.indent !== baseIndent || match.ordered !== ordered) break;

    let text = match.text;
    let nested = "";
    i += 1;

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        let next = i + 1;
        while (next < lines.length && !lines[next].trim()) next += 1;
        const after = next < lines.length ? listMatch(lines[next]) : null;
        if (after && after.indent >= baseIndent) {
          i = next;
          continue;
        }
        break;
      }

      const child = listMatch(line);
      if (child && child.indent > baseIndent) {
        const inner = renderList(lines, i);
        nested += inner.html;
        i = inner.next;
        continue;
      }

      const indent = line.match(/^\s*/)[0].length;
      if (child || isBlockStart(line) || indent <= baseIndent) break;

      text += ` ${line.trim()}`;
      i += 1;
    }

    items.push({ text, nested });
  }

  const tag = ordered ? "ol" : "ul";
  const attrs = ordered && first.number !== 1 ? ` start="${first.number}"` : "";
  return {
    html: `<${tag}${attrs}>${items.map((item) => renderListItem(item.text, item.nested)).join("")}</${tag}>`,
    next: i,
  };
}

function alignClass(cell) {
  const value = String(cell ?? "").trim();
  if (/^:-+:$/.test(value)) return "align-center";
  if (/^:-+$/.test(value)) return "align-start";
  if (/^-+:$/.test(value)) return "align-end";
  return "";
}

function renderCallout(info, inner) {
  return `<aside class="callout callout-${info.key}"><p class="callout-title"><iconify-icon icon="${info.icon}" aria-hidden="true"></iconify-icon>${info.label}</p><div class="callout-body">${inner}</div></aside>`;
}

function renderDetails(title, inner) {
  return `<details class="md-details"><summary class="md-details-summary"><iconify-icon icon="mingcute:down-fill" aria-hidden="true"></iconify-icon><span>${renderInline(title || "تفاصيل")}</span></summary><div class="md-details-body">${inner}</div></details>`;
}

function renderBlocks(lines, options = {}) {
  const headingPrefix = options.headingPrefix || "";
  const html = [];
  const headings = [];
  const usedIds = new Set();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const directive = line.trimStart().match(/^:::([A-Za-z][\w-]*)[ \t]*(.*)$/);
    if (directive) {
      const name = directive[1].toLowerCase();
      const title = directive[2].trim();
      const info = CALLOUTS[name];
      if (!info && name !== "details") {
        throw new Error("Only :::note, :::tip, :::warning and :::details are supported in general Markdown.");
      }
      const body = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      if (i >= lines.length) throw new Error(`:::${directive[1]} is not closed with :::`);
      i += 1;
      const inner = renderBlocks(body, { headingPrefix });
      headings.push(...inner.headings);
      html.push(name === "details" ? renderDetails(title, inner.html) : renderCallout(info, inner.html));
      continue;
    }

    if (line.trimStart().startsWith(":::")) {
      throw new Error("Directives are only supported in lesson blocks, not inside general Markdown.");
    }

    const fence = line.match(/^```\s*([\w+#.-]*)\s*(?:\[([^\]]+)\]|title="([^"]*)")?\s*$/);
    if (fence) {
      const language = fence[1];
      const title = (fence[2] || fence[3] || "").trim();
      const code = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      html.push(
        `<div class="code-block"><div class="code-head"><span class="code-lang">${escapeHtml(language || "code")}</span>${title ? `<span class="code-title" dir="ltr">${escapeHtml(title)}</span>` : ""}<button class="copy-code" type="button" data-copy><iconify-icon class="copy-icon" icon="mingcute:copy-2-fill" aria-hidden="true"></iconify-icon><span class="copy-label" aria-live="polite">نسخ</span></button></div><pre dir="ltr"><code${language ? ` class="language-${escapeHtml(language)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre></div>`,
      );
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const rawText = heading[2].trim();
      const text = plainHeading(rawText);
      const base = slugify(`${headingPrefix} ${text}`);
      let id = base;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);
      html.push(`<h${level} id="${id}">${renderInline(rawText)}</h${level}>`);
      headings.push({ level, text, id });
      i += 1;
      continue;
    }

    if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) {
      html.push("<hr>");
      i += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      const inner = renderBlocks(quote, { headingPrefix });
      headings.push(...inner.headings);
      html.push(`<blockquote>${inner.html}</blockquote>`);
      continue;
    }

    if (isTableStart(lines, i)) {
      const head = splitRow(lines[i]);
      const aligns = splitRow(lines[i + 1]).map(alignClass);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      const cell = (tag, text, index) =>
        `<${tag}${aligns[index] ? ` class="${aligns[index]}"` : ""}>${renderInline(text)}</${tag}>`;
      html.push(
        `<div class="table-wrap"><table><thead><tr>${head.map((text, index) => cell("th", text, index)).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((text, index) => cell("td", text, index)).join("")}</tr>`).join("")}</tbody></table></div>`,
      );
      continue;
    }

    if (listMatch(line)) {
      const list = renderList(lines, i);
      html.push(list.html);
      i = list.next;
      continue;
    }

    const paragraph = [];
    while (i < lines.length) {
      const current = lines[i];
      if (!current.trim() || isBlockStart(current) || isTableStart(lines, i)) break;
      paragraph.push(current.trimStart());
      i += 1;
    }
    if (paragraph.length) {
      const text = paragraph
        .map((line) => (/ {2,}$|\\$/.test(line) ? `${line.replace(/ {2,}$|\\$/, "")}\u0000B\u0000` : line))
        .join(" ")
        .replace(/\u0000B\u0000 /g, "\u0000B\u0000");
      const image = text.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
      const url = image ? safeUrl(image[2]) : "";
      if (image && url) {
        const caption = image[1] ? `<figcaption>${escapeHtml(image[1])}</figcaption>` : "";
        html.push(
          `<figure class="md-figure"><img src="${url}" alt="${image[1]}" loading="lazy" decoding="async"${image[3] ? ` title="${image[3]}"` : ""}>${caption}</figure>`,
        );
      } else {
        html.push(`<p>${renderInline(text).replaceAll("\u0000B\u0000", "<br>")}</p>`);
      }
    }
  }

  return { html: html.join("\n"), headings };
}

export function renderMarkdown(source, options = {}) {
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  return renderBlocks(lines, options);
}

const QUESTION_TYPES = new Set(["single", "radio", "multiple", "checkbox", "truefalse", "boolean", "short", "text"]);
const LONG_TYPES = new Set(["long", "essay"]);
const ALLOWED_FIELDS = {
  quiz: ["id", "title", "description", "pass"],
  single: ["id", "group", "prompt", "hint", "explanation"],
  multiple: ["id", "group", "prompt", "hint", "explanation"],
  truefalse: ["id", "group", "prompt", "hint", "explanation", "answer"],
  short: ["id", "group", "prompt", "hint", "explanation", "answers", "case_sensitive", "placeholder"],
  long: ["id", "group", "prompt", "hint", "explanation", "model", "rows"],
  notes: ["id", "title", "prompt", "placeholder", "rows"],
  checklist: ["id", "title", "prompt"],
};

function normalizeType(name, fields) {
  let type = name.toLowerCase();
  if (type === "question") {
    type = String(fields.type || "").toLowerCase();
    if (!type) throw new Error(":::question needs a type field");
  }
  return type;
}

const TYPE_ALIASES = { radio: "single", checkbox: "multiple", boolean: "truefalse", text: "short", essay: "long" };

function allowedFor(name, type) {
  const base = ALLOWED_FIELDS[TYPE_ALIASES[type] || type] || [];
  return name === "question" ? [...base, "type"] : base;
}

function ensureKnownFields(name, type, fields, file, line) {
  const allowed = allowedFor(name, type);
  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) {
      throw new Error(`${file}:${line}: unknown field "${key}" in :::${name}`);
    }
  }
}

function requiredString(fields, key, file, line) {
  const value = String(fields[key] ?? "").trim();
  if (!value) throw new Error(`${file}:${line}: "${key}" is required`);
  return value;
}

function normalizeAnswers(value, file, line) {
  const list = Array.isArray(value) ? value : String(value ?? "").split("|");
  const answers = list.map((item) => String(item).trim()).filter(Boolean);
  if (!answers.length) throw new Error(`${file}:${line}: "answers" is required`);
  return answers;
}

function normalizePass(value, file, line) {
  if (value === undefined || value === "") return 70;
  const pass = Number(value);
  if (!Number.isFinite(pass) || pass < 0 || pass > 100) {
    throw new Error(`${file}:${line}: "pass" must be a number from 0 to 100`);
  }
  return pass;
}

function renderQuizHeader(group) {
  return `<header class="quiz-head" data-quiz-group="${escapeHtml(group.id)}" data-quiz-pass="${group.pass}"><div class="lesson-section-heading"><div><span class="panel-kicker">اختبار</span><h2>${renderInline(group.title)}</h2></div><span class="quiz-score" data-quiz-score hidden></span></div>${group.description ? `<p class="quiz-intro">${renderInline(group.description)}</p>` : ""}</header>`;
}

function renderFeedback(explanation) {
  return `<div class="quiz-feedback-item" hidden><strong class="feedback-label"></strong><span class="feedback-text">${explanation ? renderInline(explanation) : ""}</span></div>`;
}

function renderSingle(fields, options, file, line) {
  if (options.length < 2) throw new Error(`${file}:${line}: single choice needs at least two options`);
  const correct = options.filter((option) => option.correct === true).length;
  if (correct !== 1) throw new Error(`${file}:${line}: single choice needs exactly one option marked [x]`);
  const id = requiredString(fields, "id", file, line);
  const group = String(fields.group || "default").trim() || "default";
  const prompt = requiredString(fields, "prompt", file, line);
  const hint = fields.hint ? String(fields.hint) : "";
  const optionsHtml = options
    .map(
      (option, index) =>
        `<label class="quiz-option"><input type="radio" name="${escapeHtml(id)}" value="${index}" data-correct="${option.correct === true}"><span>${renderInline(option.text)}</span></label>`,
    )
    .join("");
  return {
    html: `<fieldset class="quiz-question" data-qid="${escapeHtml(id)}" data-type="single" data-group="${escapeHtml(group)}" data-graded="true"><legend>${renderInline(prompt)}</legend><div class="quiz-options">${optionsHtml}</div>${hint ? `<details class="quiz-hint"><summary><iconify-icon class="hint-icon" icon="mingcute:bulb-fill" aria-hidden="true"></iconify-icon>تلميح<iconify-icon class="hint-chevron" icon="mingcute:down-fill" aria-hidden="true"></iconify-icon></summary><p>${renderInline(hint)}</p></details>` : ""}${renderFeedback(fields.explanation)}</fieldset>`,
    meta: { id, type: "single", group, graded: true, line },
  };
}

function renderMultiple(fields, options, file, line) {
  if (options.length < 2) throw new Error(`${file}:${line}: multiple choice needs at least two options`);
  if (!options.some((option) => option.correct === true)) {
    throw new Error(`${file}:${line}: multiple choice needs at least one option marked [x]`);
  }
  const id = requiredString(fields, "id", file, line);
  const group = String(fields.group || "default").trim() || "default";
  const prompt = requiredString(fields, "prompt", file, line);
  const hint = fields.hint ? String(fields.hint) : "";
  const optionsHtml = options
    .map(
      (option, index) =>
        `<label class="quiz-option"><input type="checkbox" name="${escapeHtml(id)}" value="${index}" data-correct="${option.correct === true}"><span>${renderInline(option.text)}</span></label>`,
    )
    .join("");
  return {
    html: `<fieldset class="quiz-question" data-qid="${escapeHtml(id)}" data-type="multiple" data-group="${escapeHtml(group)}" data-graded="true"><legend>${renderInline(prompt)}</legend><div class="quiz-options">${optionsHtml}</div>${hint ? `<details class="quiz-hint"><summary><iconify-icon class="hint-icon" icon="mingcute:bulb-fill" aria-hidden="true"></iconify-icon>تلميح<iconify-icon class="hint-chevron" icon="mingcute:down-fill" aria-hidden="true"></iconify-icon></summary><p>${renderInline(hint)}</p></details>` : ""}${renderFeedback(fields.explanation)}</fieldset>`,
    meta: { id, type: "multiple", group, graded: true, line },
  };
}

function renderTrueFalse(fields, file, line) {
  if (fields.answer === undefined) throw new Error(`${file}:${line}: true/false needs an answer field`);
  const raw = String(fields.answer).toLowerCase();
  if (raw !== "true" && raw !== "false") throw new Error(`${file}:${line}: true/false answer must be true or false`);
  const answer = raw === "true";
  const id = requiredString(fields, "id", file, line);
  const group = String(fields.group || "default").trim() || "default";
  const prompt = requiredString(fields, "prompt", file, line);
  const hint = fields.hint ? String(fields.hint) : "";
  const optionsHtml = [
    { label: "صحيح", value: "true", correct: answer },
    { label: "خطأ", value: "false", correct: !answer },
  ]
    .map(
      (option) =>
        `<label class="quiz-option"><input type="radio" name="${escapeHtml(id)}" value="${option.value}" data-correct="${option.correct}"><span>${option.label}</span></label>`,
    )
    .join("");
  return {
    html: `<fieldset class="quiz-question" data-qid="${escapeHtml(id)}" data-type="truefalse" data-group="${escapeHtml(group)}" data-graded="true"><legend>${renderInline(prompt)}</legend><div class="quiz-options">${optionsHtml}</div>${hint ? `<details class="quiz-hint"><summary><iconify-icon class="hint-icon" icon="mingcute:bulb-fill" aria-hidden="true"></iconify-icon>تلميح<iconify-icon class="hint-chevron" icon="mingcute:down-fill" aria-hidden="true"></iconify-icon></summary><p>${renderInline(hint)}</p></details>` : ""}${renderFeedback(fields.explanation)}</fieldset>`,
    meta: { id, type: "truefalse", group, graded: true, line },
  };
}

function renderShort(fields, file, line) {
  const answers = normalizeAnswers(fields.answers, file, line);
  const id = requiredString(fields, "id", file, line);
  const group = String(fields.group || "default").trim() || "default";
  const prompt = requiredString(fields, "prompt", file, line);
  const hint = fields.hint ? String(fields.hint) : "";
  const placeholder = fields.placeholder ? String(fields.placeholder) : "اكتب إجابتك هنا";
  const caseSensitive = fields.case_sensitive === true;
  const answersJson = escapeHtml(JSON.stringify(answers));
  return {
    html: `<fieldset class="quiz-question" data-qid="${escapeHtml(id)}" data-type="short" data-group="${escapeHtml(group)}" data-graded="true"><legend>${renderInline(prompt)}</legend><input class="short-input" type="text" autocomplete="off" placeholder="${escapeHtml(placeholder)}" data-answers="${answersJson}" data-case-sensitive="${caseSensitive}">${hint ? `<details class="quiz-hint"><summary><iconify-icon class="hint-icon" icon="mingcute:bulb-fill" aria-hidden="true"></iconify-icon>تلميح<iconify-icon class="hint-chevron" icon="mingcute:down-fill" aria-hidden="true"></iconify-icon></summary><p>${renderInline(hint)}</p></details>` : ""}${renderFeedback(fields.explanation)}</fieldset>`,
    meta: { id, type: "short", group, graded: true, line },
  };
}

function renderLong(fields, options, file, line) {
  const id = requiredString(fields, "id", file, line);
  const group = String(fields.group || "default").trim() || "default";
  const prompt = requiredString(fields, "prompt", file, line);
  const rows = Math.min(20, Math.max(3, Number(fields.rows) || 6));
  const model = fields.model ? String(fields.model) : "";
  const checks = options.map((option) => option.text).filter(Boolean);
  const checksHtml = checks.length
    ? `<div class="self-checks"><p class="model-label">راجع إجابتك:</p>${checks.map((check) => `<label class="check-item"><input type="checkbox" data-check><span>${renderInline(check)}</span></label>`).join("")}</div>`
    : "";
  const hint = fields.hint ? `<details class="quiz-hint"><summary><iconify-icon class="hint-icon" icon="mingcute:bulb-fill" aria-hidden="true"></iconify-icon>تلميح<iconify-icon class="hint-chevron" icon="mingcute:down-fill" aria-hidden="true"></iconify-icon></summary><p>${renderInline(fields.hint)}</p></details>` : "";
  return {
    html: `<fieldset class="quiz-question" data-qid="${escapeHtml(id)}" data-type="long" data-group="${escapeHtml(group)}" data-graded="false"><legend>${renderInline(prompt)}</legend><textarea class="long-input" rows="${rows}" placeholder="اكتب إجابتك هنا..."></textarea>${hint}<div class="long-actions"><button class="quiz-submit" type="button" data-reveal>اعرض الإجابة النموذجية</button></div><div class="model-answer" hidden>${model ? `<p class="model-label">إجابة نموذجية</p>${renderMarkdown(model).html}` : ""}${checksHtml}</div></fieldset>`,
    meta: { id, type: "long", group, graded: false, line },
  };
}

function renderNotes(fields, file, line) {
  const id = String(fields.id || `notes-${line}`).trim();
  const title = fields.title ? String(fields.title) : "ملاحظاتي";
  const prompt = fields.prompt ? String(fields.prompt) : "";
  const placeholder = fields.placeholder ? String(fields.placeholder) : "اكتب ملاحظاتك هنا...";
  const rows = Math.min(20, Math.max(3, Number(fields.rows) || 6));
  return {
    html: `<fieldset class="quiz-question notes-block" data-block-id="${escapeHtml(id)}" data-block-type="notes"><legend>${renderInline(title)}</legend>${prompt ? `<p class="block-prompt">${renderInline(prompt)}</p>` : ""}<textarea class="notes-input" rows="${rows}" placeholder="${escapeHtml(placeholder)}"></textarea></fieldset>`,
    meta: null,
  };
}

function renderChecklist(fields, options, file, line) {
  if (!options.length) throw new Error(`${file}:${line}: checklist needs at least one item`);
  const id = String(fields.id || `checklist-${line}`).trim();
  const title = fields.title ? String(fields.title) : "قائمة المهام";
  const prompt = fields.prompt ? String(fields.prompt) : "";
  const items = options.map((option) => option.text).filter(Boolean);
  if (!items.length) throw new Error(`${file}:${line}: checklist needs at least one item`);
  return {
    html: `<fieldset class="quiz-question checklist-block" data-block-id="${escapeHtml(id)}" data-block-type="checklist"><legend>${renderInline(title)}</legend>${prompt ? `<p class="block-prompt">${renderInline(prompt)}</p>` : ""}<div class="checklist">${items.map((item, index) => `<label class="check-item"><input type="checkbox" data-check="${index}"><span>${renderInline(item)}</span></label>`).join("")}</div></fieldset>`,
    meta: null,
  };
}

export function renderLesson(source, options = {}) {
  const file = options.file || "lesson";
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let buffer = [];
  let i = 0;

  const flush = () => {
    if (buffer.some((line) => line.trim())) {
      blocks.push({ type: "markdown", text: buffer.join("\n") });
    }
    buffer = [];
  };

  while (i < lines.length) {
    const directive = lines[i].match(/^:::([A-Za-z][\w-]*)[ \t]*(.*)$/);
    if (!directive) {
      buffer.push(lines[i]);
      i += 1;
      continue;
    }

    flush();
    const name = directive[1];
    const arg = directive[2].trim();
    const startLine = i + 1;
    const body = [];
    i += 1;
    let closed = false;
    while (i < lines.length) {
      if (lines[i].trim() === ":::") {
        closed = true;
        i += 1;
        break;
      }
      body.push(lines[i]);
      i += 1;
    }
    if (!closed) throw new Error(`${file}:${startLine}: :::${name} is not closed with :::`);
    const key = name.toLowerCase();
    const callout = CALLOUTS[key];
    if (callout || key === "details") {
      blocks.push({ type: "directive", name, body: body.join("\n"), callout, details: key === "details", title: arg, line: startLine });
      continue;
    }
    const parsed = parseKeyValueLines(body, `${file}:${startLine}`);
    blocks.push({ type: "directive", name, parsed, line: startLine });
  }
  flush();

  const parsedBlocks = blocks.map((block) => {
    if (block.type !== "directive") return block;
    if (block.details) return { ...block, type: "details" };
    if (block.callout) return { ...block, type: "callout" };
    const type = normalizeType(block.name, block.parsed.fields);
    return { ...block, type };
  });

  const declarations = new Map();
  const firstQuestion = new Map();
  const seenBlockIds = new Set();

  parsedBlocks.forEach((block, index) => {
    if (block.type === "markdown") return;
    if (block.type === "quiz") {
      const id = requiredString(block.parsed.fields, "id", file, block.line);
      if (declarations.has(id)) throw new Error(`${file}:${block.line}: duplicate quiz group "${id}"`);
      declarations.set(id, { index, block, id });
      return;
    }
    if (QUESTION_TYPES.has(block.type) || LONG_TYPES.has(block.type)) {
      const group = String(block.parsed.fields.group || "default").trim() || "default";
      if (!firstQuestion.has(group)) firstQuestion.set(group, index);
      return;
    }
    if (block.type === "notes" || block.type === "checklist") {
      const id = String(block.parsed.fields.id || `${block.type}-${block.line}`).trim();
      if (seenBlockIds.has(id)) throw new Error(`${file}:${block.line}: duplicate block id "${id}"`);
      seenBlockIds.add(id);
    }
  });

  for (const [id, declaration] of declarations) {
    const first = firstQuestion.get(id);
    if (first === undefined) throw new Error(`${file}:${declaration.block.line}: quiz "${id}" has no questions`);
    if (first < declaration.index) {
      throw new Error(`${file}:${declaration.block.line}: quiz "${id}" must appear before its questions`);
    }
  }

  const groups = new Map();
  const questions = [];
  const questionIds = new Set();
  const autoHeaders = new Set();
  const html = [];
  const headings = [];

  for (const block of parsedBlocks) {
    if (block.type === "markdown") {
      const rendered = renderMarkdown(block.text);
      html.push(rendered.html);
      headings.push(...rendered.headings);
      continue;
    }

    const { name, parsed, line } = block;
    const type = block.type;

    if (type === "details") {
      const rendered = renderMarkdown(block.body);
      html.push(renderDetails(block.title, rendered.html));
      headings.push(...rendered.headings);
      continue;
    }

    if (type === "callout") {
      const rendered = renderMarkdown(block.body);
      html.push(renderCallout(block.callout, rendered.html));
      headings.push(...rendered.headings);
      continue;
    }

    if (type === "quiz") {
      ensureKnownFields(name, type, parsed.fields, file, line);
      if (parsed.options.length) throw new Error(`${file}:${line}: :::quiz does not take list items`);
      const id = requiredString(parsed.fields, "id", file, line);
      const group = {
        id,
        title: parsed.fields.title ? String(parsed.fields.title) : "اختبر فهمك",
        description: parsed.fields.description ? String(parsed.fields.description) : "",
        pass: normalizePass(parsed.fields.pass, file, line),
        declared: true,
        gradedCount: 0,
      };
      groups.set(id, group);
      html.push(renderQuizHeader(group));
      continue;
    }

    if (QUESTION_TYPES.has(type)) {
      ensureKnownFields(name, type, parsed.fields, file, line);
      if (["single", "radio", "multiple", "checkbox"].includes(type) && parsed.options.length === 0) {
        throw new Error(`${file}:${line}: :::${name} needs options`);
      }
      const id = requiredString(parsed.fields, "id", file, line);
      if (questionIds.has(id)) throw new Error(`${file}:${line}: duplicate question id "${id}"`);
      questionIds.add(id);
      const groupId = String(parsed.fields.group || "default").trim() || "default";
      if (!groups.has(groupId)) {
        const group = {
          id: groupId,
          title: "اختبر فهمك",
          description: "",
          pass: 70,
          declared: false,
          gradedCount: 0,
        };
        groups.set(groupId, group);
        if (!autoHeaders.has(groupId)) {
          html.push(renderQuizHeader(group));
          autoHeaders.add(groupId);
        }
      }
      const rendered =
        type === "single" || type === "radio"
          ? renderSingle(parsed.fields, parsed.options, file, line)
          : type === "multiple" || type === "checkbox"
            ? renderMultiple(parsed.fields, parsed.options, file, line)
            : type === "truefalse" || type === "boolean"
              ? renderTrueFalse(parsed.fields, file, line)
              : renderShort(parsed.fields, file, line);
      html.push(rendered.html);
      questions.push(rendered.meta);
      continue;
    }

    if (LONG_TYPES.has(type)) {
      ensureKnownFields(name, type, parsed.fields, file, line);
      const id = requiredString(parsed.fields, "id", file, line);
      if (questionIds.has(id)) throw new Error(`${file}:${line}: duplicate question id "${id}"`);
      questionIds.add(id);
      const rendered = renderLong(parsed.fields, parsed.options, file, line);
      html.push(rendered.html);
      questions.push(rendered.meta);
      continue;
    }

    if (type === "notes") {
      ensureKnownFields(name, type, parsed.fields, file, line);
      if (parsed.options.length) throw new Error(`${file}:${line}: :::notes does not take list items`);
      const rendered = renderNotes(parsed.fields, file, line);
      html.push(rendered.html);
      continue;
    }

    if (type === "checklist") {
      ensureKnownFields(name, type, parsed.fields, file, line);
      const rendered = renderChecklist(parsed.fields, parsed.options, file, line);
      html.push(rendered.html);
      continue;
    }

    throw new Error(`${file}:${line}: unknown block type :::${name}`);
  }

  for (const question of questions) {
    if (!question.graded) continue;
    const group = groups.get(question.group);
    if (group) group.gradedCount += 1;
  }

  for (const [id, group] of groups) {
    if (group.declared && group.gradedCount === 0) {
      throw new Error(`${file}: quiz "${id}" needs at least one graded question`);
    }
  }

  const groupList = [...groups.values()].filter((group) => group.gradedCount > 0);
  return {
    html: html.join("\n"),
    headings,
    groups: groupList,
    questions,
  };
}
