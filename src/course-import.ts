import type { Workbook, CellValue } from 'exceljs';

export type CourseImport = {
  course: {
    title: string;
    category: string;
    level: string;
    price: number;
    summary: string;
    description: string;
  };
  modules: { code: string; title: string }[];
  lessons: {
    code: string;
    module: string;
    title: string;
    duration: number;
    video: string;
    body: string;
  }[];
  resources: { lesson: string; title: string; url: string }[];
};
export const IMPORT_LIMIT = 5 * 1024 * 1024;

export function parseCourseWorkbook(book: Workbook): CourseImport {
  function value(v: CellValue, location: string): string {
    if (v == null) return '';
    if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
    if (typeof v === 'object' && 'hyperlink' in v) return v.hyperlink.trim();
    if (typeof v === 'object' && 'richText' in v)
      return v.richText
        .map((p) => p.text)
        .join('')
        .trim();
    throw new Error(`${location}: chỉ nhập văn bản hoặc số, không dùng công thức/ngày tháng.`);
  }
  function rows(sheet: string, headers: string[], limit: number) {
    const ws = book.getWorksheet(sheet);
    if (!ws) throw new Error(`Thiếu sheet ${sheet}. Hãy dùng file mẫu.`);
    if (ws.rowCount > limit + 1 || ws.columnCount > headers.length)
      throw new Error(`${sheet}: vượt số dòng/cột cho phép.`);
    headers.forEach((h, i) => {
      if (ws.getCell(1, i + 1).text.trim() !== h)
        throw new Error(`${sheet}: cột ${i + 1} phải là “${h}”.`);
    });
    const out: { cells: string[]; at: string }[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const at = `${sheet}, dòng ${r}`;
      const cells = headers.map((_, i) => value(ws.getCell(r, i + 1).value, at));
      if (cells.some(Boolean)) out.push({ cells, at });
    }
    return out;
  }
  const required = (s: string, at: string, max = 250) => {
    if (!s || s.length > max) throw new Error(`${at}: cần nội dung từ 1 đến ${max} ký tự.`);
    return s;
  };
  const integer = (s: string, at: string, max: number) => {
    if (!/^\d+$/.test(s) || Number(s) > max)
      throw new Error(`${at}: nhập số nguyên từ 0 đến ${max}, không kèm dấu phân cách.`);
    return Number(s);
  };
  const keys = ['title', 'category', 'level', 'price', 'summary', 'description'];
  const fields: Record<string, string> = {};
  for (const {
    cells: [key, val],
    at,
  } of rows('KhoaHoc', ['Truong', 'GiaTri'], 6)) {
    if (!keys.includes(key) || key in fields)
      throw new Error(`${at}: trường không hợp lệ hoặc bị trùng.`);
    fields[key] = val;
  }
  if (keys.some((k) => !(k in fields))) throw new Error('KhoaHoc: cần đủ 6 trường trong mẫu.');
  if (!['Cơ bản', 'Khá', 'Nâng cao'].includes(fields.level))
    throw new Error('Trình độ phải là Cơ bản, Khá hoặc Nâng cao.');
  const course = {
    title: required(fields.title, 'Tên khóa học'),
    category: required(fields.category, 'Danh mục'),
    level: fields.level,
    price: integer(fields.price, 'Giá', 1000000000),
    summary: fields.summary,
    description: fields.description,
  };
  if (course.summary.length > 2000 || course.description.length > 30000)
    throw new Error('Mô tả quá dài (ngắn: 2.000, chi tiết: 30.000 ký tự).');
  function code(s: string, at: string, seen: Set<string>) {
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(s) || seen.has(s))
      throw new Error(`${at}: mã phải duy nhất, chỉ gồm chữ không dấu, số, _ hoặc -.`);
    seen.add(s);
    return s;
  }
  const moduleCodes = new Set<string>();
  const modules = rows('Chuong', ['MaChuong', 'TenChuong'], 100).map(
    ({ cells: [id, title], at }) => ({
      code: code(id, at, moduleCodes),
      title: required(title, at),
    }),
  );
  const lessonCodes = new Set<string>();
  const lessons = rows(
    'BaiHoc',
    ['MaBai', 'MaChuong', 'TenBai', 'Phut', 'VideoDrive', 'NoiDung'],
    1000,
  ).map(({ cells: [id, module, title, duration, video, body], at }) => {
    if (!moduleCodes.has(module)) throw new Error(`${at}: MaChuong không tồn tại.`);
    if (
      video &&
      !/^https:\/\/drive\.google\.com\/(file\/d\/[\w-]+(?:\/|$)|open\?id=[\w-]+)/.test(video)
    )
      throw new Error(`${at}: cần link video Google Drive.`);
    if (body.length > 30000) throw new Error(`${at}: nội dung tối đa 30.000 ký tự.`);
    return {
      code: code(id, at, lessonCodes),
      module,
      title: required(title, at),
      duration: integer(duration || '0', at, 10000),
      video,
      body,
    };
  });
  const resources = rows('TaiLieu', ['MaBai', 'TenTaiLieu', 'Link'], 2000).map(
    ({ cells: [lesson, title, url], at }) => {
      if (!lessonCodes.has(lesson)) throw new Error(`${at}: MaBai không tồn tại.`);
      if (!/^https:\/\/(drive|docs)\.google\.com\//.test(url))
        throw new Error(`${at}: cần link tài liệu Google Drive hoặc Google Docs.`);
      return { lesson, title: required(title, at), url };
    },
  );
  if (!modules.length || !lessons.length) throw new Error('Cần ít nhất một chương và một bài học.');
  return { course, modules, lessons, resources };
}

export async function readCourseFile(bytes: ArrayBuffer): Promise<CourseImport> {
  if (bytes.byteLength > IMPORT_LIMIT) throw new Error('File tối đa 5 MB.');
  const { default: Excel } = await import('exceljs');
  const book = new Excel.Workbook();
  await book.xlsx.load(bytes);
  return parseCourseWorkbook(book);
}
