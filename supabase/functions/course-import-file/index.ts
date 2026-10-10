import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { exportUrl, allowedDownload } from './urls.ts';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Chỉ hỗ trợ POST.' }, 405);
  try {
    const auth = req.headers.get('Authorization') || '';
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return json({ error: 'Vui lòng đăng nhập.' }, 401);
    const { data: profile } = await client
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!profile?.is_admin) return json({ error: 'Chỉ quản trị viên được nhập file.' }, 403);
    const raw = await req.text();
    if (raw.length > 4000) return json({ error: 'Link quá dài.' }, 400);
    const body = JSON.parse(raw);
    if (typeof body.url !== 'string') return json({ error: 'Thiếu link file.' }, 400);
    let url = exportUrl(body.url);
    let response: Response | undefined;
    const signal = AbortSignal.timeout(20000);
    for (let i = 0; i < 6; i++) {
      if (!allowedDownload(url))
        throw new Error('File chưa chia sẻ để đọc hoặc link chuyển hướng không được hỗ trợ.');
      response = await fetch(url, { redirect: 'manual', signal });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new Error('Không đọc được link chuyển hướng.');
        url = new URL(location, url).href;
        response = undefined;
        continue;
      }
      break;
    }
    if (!response?.ok || !response.body)
      throw new Error(
        'Không tải được file. Kiểm tra quyền chia sẻ Người xem cho bất kỳ ai có link.',
      );
    const limit = 5 * 1024 * 1024;
    if (Number(response.headers.get('content-length')) > limit) {
      await response.body.cancel();
      throw new Error('File tối đa 5 MB.');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error('File tối đa 5 MB.');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b)
      throw new Error(
        'Link không trả về file Excel. Hãy kiểm tra quyền chia sẻ hoặc tải .xlsx về máy.',
      );
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768)
      binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return json({ base64: btoa(binary) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Không đọc được file.' }, 400);
  }
});
