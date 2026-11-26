// Utilidades sin dependencias: texto, fechas con zona horaria, identificadores y hashes.
import { createHash, randomBytes } from 'node:crypto';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Slug legible: minúsculas, sin acentos, guiones. */
export function slugify(text, max = 48) {
  const s = String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
  return s || 'meetup';
}

export const newKey = () => randomBytes(18).toString('base64url');
export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
export const shortId = (n = 5) => randomBytes(n).toString('base64url').replace(/[-_]/g, '').slice(0, n).toLowerCase();

/** Diferencia en ms entre la hora local de `tz` y UTC para el instante `ms`. */
export function tzOffset(ms, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** "2026-12-05T17:00" en la zona `tz` → milisegundos UTC. */
export function zonedToUtc(local, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(local || ''));
  if (!m) return NaN;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let utc = guess - tzOffset(guess, tz);
  utc = guess - tzOffset(utc, tz); // corrige cambios de horario
  return utc;
}

/** Milisegundos UTC → "2026-12-05T17:00" en la zona `tz` (para rellenar formularios). */
export function utcToLocalInput(ms, tz) {
  const d = new Date(ms + tzOffset(ms, tz));
  return d.toISOString().slice(0, 16);
}

export function validTz(tz) {
  try {
    new Intl.DateTimeFormat('es', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sábado 5 de diciembre" */
export function fmtDay(ms, tz) {
  return cap(new Intl.DateTimeFormat('es-MX', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(ms));
}

/** "5:00 p. m." → "5:00 pm" */
export function fmtTime(ms, tz) {
  return new Intl.DateTimeFormat('es-MX', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(ms)
    .replace(/\s*a\.\s*m\./, ' am')
    .replace(/\s*p\.\s*m\./, ' pm')
    .replace(/ /g, ' ');
}

/** "SÁB 5 DIC" */
export function fmtShort(ms, tz) {
  const f = new Intl.DateTimeFormat('es-MX', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(ms);
  const g = (t) => (f.find((p) => p.type === t)?.value || '').replace('.', '');
  return `${g('weekday')} ${g('day')} ${g('month')}`.toUpperCase();
}

/** Día (YYYY-MM-DD) en la zona `tz`, para agrupar estadísticas. */
export function dayIn(ms, tz) {
  return new Date(ms + tzOffset(ms, tz)).toISOString().slice(0, 10);
}

/** Texto plano a HTML: párrafos, saltos de línea y enlaces. */
export function richText(text) {
  const paras = String(text || '').trim().split(/\n{2,}/).filter(Boolean);
  return paras
    .map((p) => {
      const safe = esc(p).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
      return `<p>${safe.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

export function cleanSrc(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32) || 'directo';
}

export function isHttpUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:';
  } catch {
    return false;
  }
}

export const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|embedly|quora|pinterest|googleimageproxy|proofpoint|mimecast|barracuda|headless|lighthouse|curl|wget|python-requests|httpclient/i;
