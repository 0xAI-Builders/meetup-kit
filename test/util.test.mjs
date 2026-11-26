import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, zonedToUtc, fmtDay, fmtTime, dayIn, cleanSrc, isHttpUrl, esc, richText, BOT_UA } from '../src/util.mjs';

test('slugify quita acentos y símbolos', () => {
  assert.equal(slugify('Tech & Chill: Agentes de IA sobre Avalanche'), 'tech-chill-agentes-de-ia-sobre-avalanche');
  assert.equal(slugify('¡Ñandú en Cholula!'), 'nandu-en-cholula');
});

test('zonedToUtc respeta la zona horaria', () => {
  // 5 pm en Ciudad de México (UTC-6) son las 23:00 UTC
  assert.equal(new Date(zonedToUtc('2026-11-21T17:00', 'America/Mexico_City')).toISOString(), '2026-11-21T23:00:00.000Z');
  assert.equal(new Date(zonedToUtc('2026-11-21T17:00', 'America/Bogota')).toISOString(), '2026-11-21T22:00:00.000Z');
});

test('fechas en español y en la zona del meetup', () => {
  const t = zonedToUtc('2026-11-21T17:00', 'America/Mexico_City');
  assert.match(fmtDay(t, 'America/Mexico_City'), /sábado.*21 de noviembre/i);
  assert.match(fmtTime(t, 'America/Mexico_City'), /5:00\s?p/);
  assert.equal(dayIn(t, 'America/Mexico_City'), '2026-11-21');
  assert.equal(dayIn(t, 'UTC'), '2026-11-21');
});

test('cleanSrc normaliza el canal', () => {
  assert.equal(cleanSrc('WhatsApp'), 'whatsapp');
  assert.equal(cleanSrc('<script>'), 'script');
  assert.equal(cleanSrc(''), 'directo');
});

test('solo ligas http(s)', () => {
  assert.ok(isHttpUrl('https://luma.com/abc'));
  assert.ok(!isHttpUrl('javascript:alert(1)'));
  assert.ok(!isHttpUrl('data:text/html,hola'));
});

test('escapa HTML y enlaza solo http(s)', () => {
  assert.equal(esc('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
  const h = richText('Hola <b>\n\nmira https://0xai.build y javascript:alert(1)');
  assert.ok(!h.includes('<b>'));
  assert.ok(h.includes('href="https://0xai.build"'));
  assert.ok(!h.includes('href="javascript'));
});

test('reconoce bots y vistas previas de chats', () => {
  assert.ok(BOT_UA.test('WhatsApp/2.23'));
  assert.ok(BOT_UA.test('TelegramBot (like TwitterBot)'));
  assert.ok(!BOT_UA.test('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1'));
});
