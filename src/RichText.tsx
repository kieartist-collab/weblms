import DOMPurify from 'dompurify';
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'style') {
    const match = data.attrValue.match(
      /(?:^|;)\s*text-align:\s*(left|center|right|justify)\s*(?:;|$)/i,
    );
    data.attrValue = match ? `text-align: ${match[1]}` : '';
  }
  if (data.attrName === 'src' && !/^https:\/\//i.test(data.attrValue)) data.keepAttr = false;
});
const marker = '<!--lms-rich-v1-->';
export function cleanHTML(html: string) {
  const safe = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'blockquote',
      'hr',
      'a',
      'img',
      'table',
      'tbody',
      'thead',
      'tr',
      'td',
      'th',
      'details',
      'summary',
      'div',
      'label',
      'input',
      'span',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'src',
      'alt',
      'title',
      'width',
      'colspan',
      'rowspan',
      'open',
      'data-type',
      'data-checked',
      'type',
      'checked',
      'disabled',
      'style',
    ],
    ALLOW_DATA_ATTR: false,
  });
  const doc = new DOMParser().parseFromString(safe, 'text/html');
  doc.querySelectorAll('input').forEach((input) => {
    if (input.type !== 'checkbox') input.remove();
    else input.disabled = true;
  });
  doc
    .querySelectorAll('a[target="_blank"]')
    .forEach((a) => a.setAttribute('rel', 'noopener noreferrer'));
  return doc.body.innerHTML;
}
export function toEditorHTML(value: string) {
  if (value.startsWith(marker)) return cleanHTML(value.slice(marker.length));
  return value
    .split(/\r?\n/)
    .map(
      (line) =>
        `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '<br>'}</p>`,
    )
    .join('');
}
export const encodeRich = (html: string) => marker + cleanHTML(html);
export function RichText({ value, className = '' }: { value: string; className?: string }) {
  return value.startsWith(marker) ? (
    <div
      className={`rich-content ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHTML(value.slice(marker.length)) }}
    />
  ) : (
    <div className={`rich-content legacy-text ${className}`}>{value}</div>
  );
}
