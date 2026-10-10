import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
let client: SupabaseClient | null = null;
let configurationError = '';
export const demo = !url && !key;
if (!demo) {
  try {
    if (!url || !key)
      throw new Error('Cần điền đủ VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local.');
    client = createClient(url, key);
  } catch {
    configurationError =
      'Cấu hình Supabase chưa hợp lệ. Kiểm tra Project URL và publishable/anon key trong .env.local rồi khởi động lại website.';
  }
}
export const supabase = client;
export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(value) + ' VNĐ';
export const date = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));
export const orderLabels = {
  pending: 'Chờ chuyển khoản',
  reported: 'Chờ kiểm tra',
  paid: 'Chờ chia sẻ Drive',
  fulfilled: 'Đã cấp quyền',
  cancelled: 'Đã hủy',
};
export function db() {
  if (!supabase)
    throw new Error(configurationError || 'Cần kết nối Supabase để sử dụng tính năng này.');
  return supabase;
}
export function check<T extends { data: unknown; error: { message: string } | null }>(
  result: T,
): T['data'] {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
}
export function driveId(value: string): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.hostname !== 'drive.google.com') return null;
    return (
      u.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1] ??
      (u.pathname === '/open' ? (u.searchParams.get('id')?.match(/^[\w-]+$/)?.[0] ?? null) : null)
    );
  } catch {
    return null;
  }
}
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.href : undefined;
  } catch {
    return undefined;
  }
}
export function validDrive(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(u.hostname);
  } catch {
    return false;
  }
}
