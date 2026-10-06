export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  summary: string;
  instructor: string;
  category: string;
  level: string;
  price: number;
  thumbnail_url: string;
  published: boolean;
  created_at: string;
};
export type Module = { id: string; course_id: string; title: string; position: number };
export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  duration_minutes: number;
  position: number;
};
export type LessonContent = { lesson_id: string; body: string; video_url: string };
export type Resource = { id: string; lesson_id: string; title: string; url: string };
export type Profile = { id: string; email: string; full_name: string; is_admin: boolean };
export type OrderStatus = 'pending' | 'reported' | 'paid' | 'fulfilled' | 'cancelled';
export type Order = {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  transfer_code: string;
  status: OrderStatus;
  created_at: string;
};
export type Enrollment = {
  user_id: string;
  course_id: string;
  active: boolean;
  drive_status: 'shared' | 'revoke_pending' | 'revoked';
  drive_email: string;
  granted_at: string;
};
export type Progress = {
  user_id: string;
  lesson_id: string;
  completed: boolean;
  last_seen_at: string;
};
export type Settings = {
  id: number;
  bank_name: string;
  bank_account: string;
  bank_owner: string;
  bank_qr_url: string;
};
export type Audit = {
  id: string;
  actor_id: string;
  action: string;
  target_id: string;
  created_at: string;
};
