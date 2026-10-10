// Numbering is derived from curriculum order, never stored in editable titles.
export function titleWithoutNumber(title: string, kind: 'Chương' | 'Bài') {
  return title.replace(new RegExp(`^\\s*${kind}\\s+\\d+(?=\\s|[:.：–—-]|$)\\s*[:.：–—-]?\\s*`, 'iu'), '').trim();
}

export function numberedTitle(kind: 'Chương' | 'Bài', number: number, title: string) {
  const name = titleWithoutNumber(title, kind);
  return `${kind} ${number}${name ? `: ${name}` : ''}`;
}

export function curriculumLabels(
  modules: { id: string; title: string }[],
  lessons: { id: string; module_id: string; title: string }[],
) {
  const chapters = new Map<string, string>();
  const titles = new Map<string, string>();
  let number = 0;
  modules.forEach((module, index) => {
    chapters.set(module.id, numberedTitle('Chương', index + 1, module.title));
    lessons.filter((lesson) => lesson.module_id === module.id).forEach((lesson) => {
      titles.set(lesson.id, numberedTitle('Bài', ++number, lesson.title));
    });
  });
  return { chapters, lessons: titles };
}
