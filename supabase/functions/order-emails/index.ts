import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { emailContent } from './templates.ts';

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('ORDER_EMAIL_SECRET');
  if (!secret || req.headers.get('x-order-email-secret') !== secret) return new Response('Unauthorized', { status: 401 });
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('ORDER_EMAIL_FROM');
  const site = Deno.env.get('SITE_URL');
  const brand = Deno.env.get('ORDER_EMAIL_BRAND') || 'Zuno';
  if (!apiKey || !from || !site || !/^https:\/\//.test(site)) return new Response('Missing email configuration', { status: 503 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: jobs, error } = await db.rpc('claim_order_emails');
  if (error) return new Response('Cannot claim emails', { status: 500 });
  let sent = 0;
  for (const job of jobs || []) {
    let permanent = false;
    try {
      // Re-check permission immediately before sending a queued administrator notification.
      if (job.audience === 'admin') {
        const { data: profile, error: roleError } = await db.from('profiles').select('is_admin').eq('id', job.recipient_id).maybeSingle();
        if (roleError) throw new Error('Cannot check administrator role');
        if (!profile?.is_admin) {
          const { error: skipError } = await db.from('order_emails').update({ status: 'skipped', last_error: 'Đã thu hồi quyền admin.' }).eq('id', job.id).eq('lock_token', job.lock_token).eq('status', 'processing');
          if (skipError) throw new Error('Cannot save skipped status');
          continue;
        }
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-email/${job.id}` },
        body: JSON.stringify({ from, to: [job.recipient], ...emailContent(job, site, brand) }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        permanent = response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status);
        throw new Error(`Email provider HTTP ${response.status}`);
      }
      const result = await response.json();
      if (!result.id) throw new Error('Missing provider message ID');
      const { error: saveError } = await db.from('order_emails').update({status: 'sent', sent_at: new Date().toISOString(), provider_id: result.id, last_error: null}).eq('id', job.id).eq('lock_token', job.lock_token).eq('status', 'processing');
      if (saveError) throw new Error('Cannot save send result');
      sent++;
    } catch (error) {
      const { error: saveError } = await db.from('order_emails').update({
        status: permanent || job.attempts >= 8 ? 'failed' : 'pending',
        last_error: error instanceof Error ? error.message : 'Send failed',
        next_attempt_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** job.attempts) * 1000).toISOString(),
      }).eq('id', job.id).eq('lock_token', job.lock_token).eq('status', 'processing');
      if (saveError) console.error('Cannot save email retry status', job.id);
    }
    // Keep request rate modest; provider 429 errors are retried through the queue.
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return Response.json({ claimed: jobs?.length || 0, sent });
});
