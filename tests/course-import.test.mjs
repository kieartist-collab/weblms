import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import Excel from 'exceljs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const loadTs = async (file) =>
  import(
    'data:text/javascript;base64,' +
      Buffer.from(
        ts.transpile(
          (await readFile(new URL(file, import.meta.url), 'utf8')).replace(
            "import('exceljs')",
            `import(${JSON.stringify(pathToFileURL(require.resolve('exceljs')).href)})`,
          ),
          {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        ),
      ).toString('base64')
  );
const { parseCourseWorkbook, readCourseFile } = await loadTs('../src/course-import.ts');
const { exportUrl, allowedDownload } = await loadTs(
  '../supabase/functions/course-import-file/urls.ts',
);
async function template() {
  const b = new Excel.Workbook();
  await b.xlsx.load(await readFile(new URL('../public/templates/khoa-hoc.xlsx', import.meta.url)));
  return b;
}
test('real template imports course and ordered curriculum', async () => {
  const bytes = await readFile(new URL('../public/templates/khoa-hoc.xlsx', import.meta.url));
  assert.equal(
    (
      await readCourseFile(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      )
    ).course.price,
    200000,
  );
  const b = await template();
  const p = parseCourseWorkbook(b);
  assert.equal(p.course.price, 200000);
  assert.deepEqual(
    p.modules.map((m) => m.code),
    ['C1', 'C2'],
  );
  assert.equal(p.lessons[1].module, 'C2');
  assert.equal(p.resources.length, 0);
  b.getWorksheet('BaiHoc').getCell('E2').value = {
    text: 'Video',
    hyperlink: 'https://drive.google.com/file/d/VIDEO/view',
  };
  assert.match(parseCourseWorkbook(b).lessons[0].video, /VIDEO/);
});
test('bad rows and formulas fail rather than partially import', async () => {
  for (const [sheet, cell, value, pattern] of [
    ['BaiHoc', 'B2', 'missing', /MaChuong/],
    ['Chuong', 'A3', 'C1', /duy nhất/],
    ['KhoaHoc', 'B5', '200.000', /số nguyên/],
    ['BaiHoc', 'D2', -1, /số nguyên/],
    ['BaiHoc', 'E2', 'https://evil.test/', /Google Drive/],
    ['BaiHoc', 'A2', { formula: '1+1', result: 2 }, /công thức/],
  ]) {
    const b = await template();
    b.getWorksheet(sheet).getCell(cell).value = value;
    assert.throws(() => parseCourseWorkbook(b), pattern);
  }
});
test('Drive URL conversion and redirect allowlist reject arbitrary destinations', () => {
  assert.equal(
    exportUrl('https://docs.google.com/spreadsheets/d/ABC/edit?usp=sharing'),
    'https://docs.google.com/spreadsheets/d/ABC/export?format=xlsx',
  );
  assert.equal(
    exportUrl('https://drive.google.com/file/d/ABC/view'),
    'https://drive.google.com/uc?export=download&id=ABC',
  );
  for (const u of [
    'https://evil.test/',
    'https://drive.google.com.evil.test/file/d/a',
    'http://drive.google.com/file/d/a',
    'https://x@drive.google.com/file/d/a',
    'https://docs.google.com/spreadsheets/d/e/ABC/pub',
  ])
    assert.throws(() => exportUrl(u));
  for (const u of [
    'http://127.0.0.1',
    'https://accounts.google.com',
    'https://evilgoogleusercontent.com',
    'https://docs.google.com:99/file',
    'https://user@docs.google.com/file',
  ])
    assert.equal(allowedDownload(u), false);
  assert.equal(allowedDownload('https://doc-abc.googleusercontent.com/export'), true);
});
