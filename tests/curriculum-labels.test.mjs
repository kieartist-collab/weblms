import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/curriculum-labels.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { curriculumLabels, numberedTitle } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
test('lesson numbering spans chapters and follows moves without duplicating old prefixes', () => {
  const chapters = [{id:'a',title:'Chương 1 - Maya'}, {id:'b',title:'ZBrush'}];
  const lessons = [{id:'1',module_id:'a',title:'Bài 9: Mở đầu'}, {id:'2',module_id:'a',title:'Công cụ'}, {id:'3',module_id:'b',title:'Điêu khắc'}];
  assert.equal(curriculumLabels(chapters,lessons).lessons.get('3'), 'Bài 3: Điêu khắc');
  assert.equal(curriculumLabels(chapters,lessons).lessons.get('1'), 'Bài 1: Mở đầu');
  assert.equal(curriculumLabels([...chapters].reverse(),lessons).lessons.get('3'), 'Bài 1: Điêu khắc');
  assert.equal(curriculumLabels(chapters,lessons).chapters.get('a'), 'Chương 1: Maya');
  assert.equal(numberedTitle('Bài',4,'Bài 2'),'Bài 4');
  assert.equal(numberedTitle('Bài',2,'Bài toán ánh sáng'),'Bài 2: Bài toán ánh sáng');
});
