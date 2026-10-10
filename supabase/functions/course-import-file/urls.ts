export function exportUrl(input: string) {
  const u = new URL(input);
  if (u.protocol !== 'https:' || u.username || u.password || u.port)
    throw new Error('Link Google Drive không hợp lệ.');
  const sheet =
    u.hostname === 'docs.google.com' && u.pathname.match(/^\/spreadsheets\/d\/([\w-]+)(?:\/|$)/);
  if (sheet && sheet[1] !== 'e')
    return `https://docs.google.com/spreadsheets/d/${sheet[1]}/export?format=xlsx`;
  if (u.hostname === 'drive.google.com') {
    const id =
      u.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] ||
      (['/open', '/uc'].includes(u.pathname) ? u.searchParams.get('id') : null);
    if (id && /^[\w-]+$/.test(id)) return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  throw new Error('Chỉ nhận link file Excel trên Drive hoặc Google Sheets.');
}
export function allowedDownload(url: string) {
  const u = new URL(url);
  return (
    u.protocol === 'https:' &&
    !u.username &&
    !u.password &&
    !u.port &&
    (['drive.google.com', 'docs.google.com', 'drive.usercontent.google.com'].includes(u.hostname) ||
      u.hostname.endsWith('.googleusercontent.com'))
  );
}
