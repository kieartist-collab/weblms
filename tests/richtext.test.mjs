import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import ts from 'typescript';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const dom = new JSDOM('');
globalThis.window = dom.window;
globalThis.DOMParser = dom.window.DOMParser;
const dir = await mkdtemp(join(tmpdir(), 'lms-richtext-'));
let source = await readFile(new URL('../src/RichText.tsx', import.meta.url), 'utf8');
source = source.slice(0, source.indexOf('export function RichText('));
source = source.replace(
  "'dompurify'",
  JSON.stringify(pathToFileURL(require.resolve('dompurify')).href),
);
await writeFile(
  join(dir, 'rich.mjs'),
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText,
);
const { cleanHTML, toEditorHTML, encodeRich } = await import(
  pathToFileURL(join(dir, 'rich.mjs')).href
);
after(async () => {
  dom.window.close();
  await rm(dir, { recursive: true, force: true });
});
test('legacy text keeps literal markup and line breaks', () => {
  assert.equal(
    toEditorHTML('Hello <script>\nWorld'),
    '<' + 'p>Hello &lt;script&gt;</p><p>World</p>',
  );
});
test('rich content removes scripts, event handlers, malicious URLs and layout styles', () => {
  const html = cleanHTML(
    '<script>alert(1)</script><p style="position:fixed;text-align:center" onclick="bad()">Safe</p><a href="javascript:bad()">link</a><img src="data:image/svg+xml,bad" onerror="bad()"><iframe src="https://bad.test"></iframe>',
  );
  assert.ok(!/script|onclick|onerror|iframe|position:|data:image|javascript:/i.test(html));
  assert.ok(html.includes('text-align: center'));
});
test('formatting, tables and accordion survive storage round trip', () => {
  const html =
    '<h2>Title</h2><p><strong>Bold</strong></p><ul><li>Item</li></ul><table><tbody><tr><td>Cell</td></tr></tbody></table><details><summary>Question</summary><div data-type="detailsContent"><p>Answer</p></div></details>';
  const result = toEditorHTML(encodeRich(html));
  for (const part of [
    '<strong>Bold</strong>',
    '<li>Item</li>',
    '<td>Cell</td>',
    '<summary>Question</summary>',
    'detailsContent',
  ])
    assert.ok(result.includes(part));
});
test('checklists are non-editable on published pages and external links are isolated', () => {
  const html = cleanHTML(
    '<input type="text"><input type="checkbox" checked><a href="https://example.com" target="_blank">Link</a>',
  );
  assert.ok(!html.includes('type="text"'));
  assert.ok(html.includes('disabled'));
  assert.ok(html.includes('noopener noreferrer'));
});
