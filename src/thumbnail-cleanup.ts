import type { SupabaseClient } from '@supabase/supabase-js';

// Only files in this project's own public thumbnail bucket may be removed.
export function thumbnailPath(value: string, projectUrl: string): string | null {
  try {
    const image = new URL(value);
    const project = new URL(projectUrl);
    const prefix = '/storage/v1/object/public/course-thumbnails/';
    if (image.origin !== project.origin || !image.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(image.pathname.slice(prefix.length));
    if (!path || path.split('/').some((part) => !part || part === '.' || part === '..')) return null;
    return path;
  } catch {
    return null;
  }
}

export async function cleanupOldThumbnail(client: SupabaseClient, oldUrl: string, newUrl: string) {
  const bucket = client.storage.from('course-thumbnails');
  const projectUrl = bucket.getPublicUrl('probe').data.publicUrl;
  const path = thumbnailPath(oldUrl, projectUrl);
  if (!path || path === thumbnailPath(newUrl, projectUrl)) return;
  const [courses, settings] = await Promise.all([
    client.from('courses').select('thumbnail_url'),
    client.from('settings').select('bank_qr_url'),
  ]);
  // A failed reference check must never lead to deleting a potentially shared image.
  if (courses.error) throw new Error(courses.error.message);
  if (settings.error) throw new Error(settings.error.message);
  const references = [
    ...(courses.data || []).map((course) => course.thumbnail_url),
    ...(settings.data || []).map((setting) => setting.bank_qr_url),
  ];
  if (references.some((value) => thumbnailPath(value, projectUrl) === path)) return;
  const result = await bucket.remove([path]);
  if (result.error) throw new Error(result.error.message);
}
