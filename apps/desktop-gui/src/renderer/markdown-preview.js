function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHref(rawHref) {
  const trimmed = rawHref.trim().replace(/^<|>$/g, "");
  if (!trimmed) {
    return "#";
  }

  const normalized = trimmed.toLowerCase();
  const isSafeProtocol =
    normalized.startsWith("https://") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("mailto:") ||
    normalized.startsWith("#") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../");

  if (isSafeProtocol) {
    return trimmed;
  }

  if (!normalized.includes(":")) {
    return trimmed;
  }

  return "#";
}

function parseInline(text) {
  let rendered = escapeHtml(text);

  const codeTokens = [];
  rendered = rendered.replace(/`([^`\n]+)`/g, (_match, codeText) => {
    const token = `@@CODE_${codeTokens.length}@@`;
    codeTokens.push(`<code>${codeText}</code>`);
    return token;
  });

  rendered = rendered.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, href) => {
    const safeHref = sanitizeHref(href);
    return `<a href="${safeHref}">${label}</a>`;
  });

  rendered = rendered
    .replace(/\*\*([^*\n][\s\S]*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_\n][\s\S]*?)__/g, "<strong>$1</strong>")
    .replace(/\*([^*\n][\s\S]*?)\*/g, "<em>$1</em>")
    .replace(/_([^_\n][\s\S]*?)_/g, "<em>$1</em>")
    .replace(/~~([^~\n][\s\S]*?)~~/g, "<del>$1</del>");

  rendered = rendered.replace(/@@CODE_(\d+)@@/g, (_match, index) => codeTokens[Number(index)]);

  return rendered.replace(/\n/g, "<br />");
}

function parseList(lines, startIndex) {
  const firstLine = lines[startIndex];
  const ordered = /^\s*\d+[.)]\s+/.test(firstLine);
  const pattern = ordered ? /^\s*\d+[.)]\s+(.*)$/ : /^\s*[-+*]\s+(.*)$/;
  const tag = ordered ? "ol" : "ul";

  let index = startIndex;
  const items = [];

  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(pattern);
    if (!match) {
      break;
    }

    items.push(`<li>${parseInline(match[1])}</li>`);
    index += 1;
  }

  return {
    html: `<${tag}>${items.join("")}</${tag}>`,
    nextIndex: index,
  };
}

function parseCodeBlock(lines, startIndex) {
  const openMatch = lines[startIndex].match(/^```\s*([\w-]+)?\s*$/);
  const language = openMatch?.[1] || "";

  let index = startIndex + 1;
  const codeLines = [];

  while (index < lines.length && !/^```\s*$/.test(lines[index])) {
    codeLines.push(lines[index]);
    index += 1;
  }

  if (index < lines.length) {
    index += 1;
  }

  const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
  return {
    html: `<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
    nextIndex: index,
  };
}

function parseBlockquote(lines, startIndex) {
  let index = startIndex;
  const quoteLines = [];

  while (index < lines.length) {
    const line = lines[index];
    const match = line.match(/^\s*>\s?(.*)$/);
    if (!match) {
      break;
    }

    quoteLines.push(match[1]);
    index += 1;
  }

  return {
    html: `<blockquote><p>${parseInline(quoteLines.join("\n"))}</p></blockquote>`,
    nextIndex: index,
  };
}

function parseParagraph(lines, startIndex) {
  let index = startIndex;
  const paragraphLines = [];

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      break;
    }

    if (/^```/.test(line) || /^\s*>\s?/.test(line) || /^\s*#{1,6}\s+/.test(line) || /^\s*[-+*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line) || /^\s*([-*_])\1{2,}\s*$/.test(line)) {
      break;
    }

    paragraphLines.push(line);
    index += 1;
  }

  return {
    html: `<p>${parseInline(paragraphLines.join("\n"))}</p>`,
    nextIndex: index,
  };
}

export function renderMarkdown(markdownText) {
  const normalized = String(markdownText || "").replace(/\r\n?/g, "\n");
  if (!normalized.trim()) {
    return "";
  }

  const lines = normalized.split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const codeBlock = parseCodeBlock(lines, index);
      blocks.push(codeBlock.html);
      index = codeBlock.nextIndex;
      continue;
    }

    const headingMatch = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${parseInline(headingMatch[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push("<hr />");
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const blockquote = parseBlockquote(lines, index);
      blocks.push(blockquote.html);
      index = blockquote.nextIndex;
      continue;
    }

    if (/^\s*[-+*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const list = parseList(lines, index);
      blocks.push(list.html);
      index = list.nextIndex;
      continue;
    }

    const paragraph = parseParagraph(lines, index);
    blocks.push(paragraph.html);
    index = paragraph.nextIndex;
  }

  return blocks.join("\n");
}

export function markdownStats(markdownText) {
  const normalized = String(markdownText || "").replace(/\r\n?/g, "\n");
  if (!normalized) {
    return {
      lines: 0,
      words: 0,
      characters: 0,
    };
  }

  const words = normalized.trim() ? normalized.trim().split(/\s+/).length : 0;
  return {
    lines: normalized.split("\n").length,
    words,
    characters: normalized.length,
  };
}

function normalizeText(text, preserveWhitespace = false) {
  const normalized = String(text || "").replace(/\u00a0/g, " ");
  if (preserveWhitespace) {
    return normalized;
  }

  return normalized.replace(/\s+/g, " ");
}

function isBlockTag(tagName) {
  return (
    tagName === "P" ||
    tagName === "DIV" ||
    tagName === "UL" ||
    tagName === "OL" ||
    tagName === "LI" ||
    tagName === "BLOCKQUOTE" ||
    tagName === "PRE" ||
    tagName === "HR" ||
    /^H[1-6]$/.test(tagName)
  );
}

function serializeInline(node, preserveWhitespace = false) {
  if (node.nodeType === 3) {
    return normalizeText(node.nodeValue, preserveWhitespace);
  }

  if (node.nodeType !== 1) {
    return "";
  }

  const element = node;
  const tag = element.tagName;

  if (tag === "BR") {
    return "\n";
  }

  if (tag === "CODE" && element.parentElement?.tagName !== "PRE") {
    const text = normalizeText(element.textContent, true).trim();
    return text ? `\`${text}\`` : "";
  }

  const children = Array.from(element.childNodes)
    .map((child) => serializeInline(child, preserveWhitespace || tag === "PRE" || tag === "CODE"))
    .join("");

  if (tag === "STRONG" || tag === "B") {
    return children.trim() ? `**${children.trim()}**` : "";
  }

  if (tag === "EM" || tag === "I") {
    return children.trim() ? `*${children.trim()}*` : "";
  }

  if (tag === "DEL" || tag === "S") {
    return children.trim() ? `~~${children.trim()}~~` : "";
  }

  if (tag === "A") {
    const label = children.trim() || normalizeText(element.textContent).trim() || "link";
    const href = sanitizeHref(element.getAttribute("href") || "");
    return `[${label}](${href})`;
  }

  if (isBlockTag(tag)) {
    return children;
  }

  return children;
}

function serializeList(listElement, listDepth = 0) {
  const ordered = listElement.tagName === "OL";
  const items = [];

  const listItems = Array.from(listElement.children).filter((child) => child.tagName === "LI");
  for (let index = 0; index < listItems.length; index += 1) {
    const item = listItems[index];
    const marker = ordered ? `${index + 1}. ` : "- ";
    const indent = "  ".repeat(listDepth);
    const nestedBlocks = [];
    let inlineText = "";

    for (const child of Array.from(item.childNodes)) {
      if (child.nodeType === 1 && (child.tagName === "UL" || child.tagName === "OL")) {
        nestedBlocks.push(serializeList(child, listDepth + 1));
        continue;
      }

      inlineText += serializeInline(child);
    }

    const normalizedInline = inlineText.trim();
    if (normalizedInline) {
      items.push(`${indent}${marker}${normalizedInline}`);
    }

    if (nestedBlocks.length > 0) {
      items.push(nestedBlocks.join("\n"));
    }
  }

  return items.join("\n");
}

function serializeBlock(node) {
  if (node.nodeType === 3) {
    const text = normalizeText(node.nodeValue).trim();
    return text ? `${text}\n\n` : "";
  }

  if (node.nodeType !== 1) {
    return "";
  }

  const element = node;
  const tag = element.tagName;

  if (/^H[1-6]$/.test(tag)) {
    const level = Number(tag.slice(1));
    const text = serializeInline(element).trim();
    return text ? `${"#".repeat(level)} ${text}\n\n` : "";
  }

  if (tag === "P" || tag === "DIV") {
    const text = serializeInline(element).trim();
    return text ? `${text}\n\n` : "";
  }

  if (tag === "UL" || tag === "OL") {
    const list = serializeList(element).trim();
    return list ? `${list}\n\n` : "";
  }

  if (tag === "BLOCKQUOTE") {
    const content = Array.from(element.childNodes)
      .map((child) => {
        if (child.nodeType === 1 && isBlockTag(child.tagName)) {
          return serializeBlock(child).trim();
        }

        return serializeInline(child).trim();
      })
      .filter(Boolean)
      .join("\n")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");

    return content ? `${content}\n\n` : "";
  }

  if (tag === "PRE") {
    const codeChild = element.querySelector("code");
    const codeText = normalizeText(codeChild ? codeChild.textContent : element.textContent, true).replace(/\n+$/, "");
    return `\`\`\`\n${codeText}\n\`\`\`\n\n`;
  }

  if (tag === "HR") {
    return "---\n\n";
  }

  const text = serializeInline(element).trim();
  return text ? `${text}\n\n` : "";
}

export function richTextToMarkdown(htmlText) {
  const html = String(htmlText || "").trim();
  if (!html) {
    return "";
  }

  if (typeof DOMParser === "undefined") {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n?/g, "\n")
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks = Array.from(doc.body.childNodes).map((node) => serializeBlock(node));

  return blocks
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
