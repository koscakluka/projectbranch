import test from "node:test";
import assert from "node:assert/strict";

import { markdownStats, renderMarkdown, richTextToMarkdown } from "../src/renderer/markdown-preview.js";

test("renderMarkdown supports common markdown blocks", () => {
  const html = renderMarkdown(`# Plan\n\n- one\n- two\n\n> note\n\nA **bold** move.`);

  assert.match(html, /<h1>Plan<\/h1>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<blockquote><p>note<\/p><\/blockquote>/);
  assert.match(html, /<strong>bold<\/strong>/);
});

test("renderMarkdown escapes HTML and rejects unsafe protocols", () => {
  const html = renderMarkdown("<script>alert(1)</script> [x](javascript:alert(1)) [ok](https://example.com)");

  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /href="#">x<\/a>/);
  assert.match(html, /href="https:\/\/example.com">ok<\/a>/);
});

test("renderMarkdown keeps fenced code literal", () => {
  const html = renderMarkdown("```js\nconst msg = '**not bold**';\n```");

  assert.match(html, /<pre><code class="language-js">/);
  assert.match(html, /\*\*not bold\*\*/);
});

test("markdownStats returns words lines and characters", () => {
  const stats = markdownStats("One two\nthree");

  assert.deepEqual(stats, {
    lines: 2,
    words: 3,
    characters: 13,
  });
});

test("richTextToMarkdown fallback strips tags and keeps text", () => {
  const markdown = richTextToMarkdown("<h2>Plan</h2><p>Hello <strong>world</strong></p>");

  assert.equal(markdown, "PlanHello world");
});
