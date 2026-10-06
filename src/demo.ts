import type { Course, Module, Lesson } from './types';
export const demoCourses: Course[] = [
  {
    id: 'unreal',
    slug: 'unreal-engine-khong-gian-kien-truc',
    title: 'Unreal Engine 5: Từ ý tưởng đến không gian sống động',
    summary: 'Xây dựng không gian kiến trúc, làm chủ ánh sáng và kể câu chuyện bằng hình ảnh.',
    description:
      'Nội dung mẫu để bạn trải nghiệm giao diện.\n\nLộ trình thực hành từ thiết lập dự án, dựng không gian, vật liệu đến ánh sáng và xuất phim. Bạn sẽ hoàn thiện một cảnh kiến trúc theo từng bước. Thay nội dung này bằng chương trình giảng dạy của bạn trong trang quản trị.',
    instructor: 'Học viện Online',
    category: '3D & Kiến trúc',
    level: 'Từ cơ bản',
    price: 599000,
    thumbnail_url: '/images/architecture.jpg',
    published: true,
    created_at: '2026-10-04',
  },
  {
    id: 'design',
    slug: 'tu-duy-thiet-ke-hinh-anh',
    title: 'Tư duy thiết kế: Biến ý tưởng thành hình ảnh',
    summary: 'Bố cục, màu sắc và typography qua những bài tập thiết kế thực tế.',
    description:
      'Khóa học mẫu. Làm quen với ngôn ngữ thị giác và xây dựng một bộ thiết kế của riêng bạn.',
    instructor: 'Học viện Online',
    category: 'Thiết kế',
    level: 'Cho người mới',
    price: 399000,
    thumbnail_url: '',
    published: true,
    created_at: '2026-10-04',
  },
  {
    id: 'film',
    slug: 'ke-chuyen-bang-video',
    title: 'Kể chuyện bằng video: Những thước phim đầu tiên',
    summary: 'Từ kịch bản đến dựng phim, tạo nên những câu chuyện có nhịp điệu và cảm xúc.',
    description:
      'Khóa học mẫu. Thực hành lên ý tưởng, chọn cảnh, dựng nhịp và hoàn thiện một video ngắn.',
    instructor: 'Học viện Online',
    category: 'Video & Sáng tạo',
    level: 'Từ cơ bản',
    price: 499000,
    thumbnail_url: '/images/film.jpg',
    published: true,
    created_at: '2026-10-04',
  },
];
export const demoModules: Module[] = [
  { id: 'm1', course_id: 'unreal', title: 'Bắt đầu với Unreal Engine', position: 0 },
  { id: 'm2', course_id: 'unreal', title: 'Không gian, vật liệu và ánh sáng', position: 1 },
];
export const demoLessons: Lesson[] = [
  {
    id: 'l1',
    module_id: 'm1',
    title: 'Làm quen với hành trình học',
    duration_minutes: 8,
    position: 0,
  },
  {
    id: 'l2',
    module_id: 'm1',
    title: 'Thiết lập dự án đầu tiên',
    duration_minutes: 15,
    position: 1,
  },
  {
    id: 'l3',
    module_id: 'm2',
    title: 'Xây dựng không gian kiến trúc',
    duration_minutes: 24,
    position: 0,
  },
  {
    id: 'l4',
    module_id: 'm2',
    title: 'Ánh sáng tạo nên cảm xúc',
    duration_minutes: 20,
    position: 1,
  },
];
