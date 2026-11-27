import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server.mjs';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1';
let app, base, dir;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'mk-test-'));
  app = createApp({ dataDir: dir, createCode: 'team1', salt: 'x', baseUrl: 'http://test.local' });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(() => { app.server.close(); app.store.close?.(); rmSync(dir, { recursive: true, force: true }); });

const meetup = (over = {}) => ({
  titulo: 'Tech & Chill Puebla', bajada: 'IA para negocios', fecha: '2030-01-10', hora: '17:00', duracion: '180', tz: 'America/Mexico_City',
  lugar: 'Friki', ciudad: 'Puebla', registro_url: 'https://luma.com/no-existe-xyz', organiza: '0xAI', comunidad: 'Team1 LatAm',
  descripcion: 'Hola', agenda: [{ hora: '5 pm', titulo: 'Bienvenida' }], tema: 'avalanche', publico: true, codigo: 'team1', ...over,
});
const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': UA, ...headers }, body: JSON.stringify(body) });

test('crear pide el código de la comunidad', async () => {
  const r = await post('/api/meetups', meetup({ codigo: 'otro' }));
  assert.equal(r.status, 403);
});

test('valida campos obligatorios y ligas', async () => {
  assert.equal((await post('/api/meetups', meetup({ titulo: '' }))).status, 400);
  assert.equal((await post('/api/meetups', meetup({ registro_url: 'javascript:alert(1)' }))).status, 400);
});

test('flujo completo: crear, visitar, medir por canal, editar', async () => {
  const r = await post('/api/meetups', meetup({ portada: PNG }));
  assert.equal(r.status, 201);
  const { slug, key, url, panel } = await r.json();
  assert.equal(slug, 'tech-chill-puebla');
  assert.equal(url, 'http://test.local/tech-chill-puebla');
  assert.ok(panel.includes('#k=' + key));

  // mismo título: otra liga
  const r2 = await (await post('/api/meetups', meetup())).json();
  assert.notEqual(r2.slug, slug);

  const land = await fetch(`${base}/${slug}?s=whatsapp`, { headers: { 'user-agent': UA } });
  assert.equal(land.status, 200);
  const html = await land.text();
  assert.ok(html.includes('Tech &amp; Chill Puebla'));
  assert.ok(html.includes('"src":"whatsapp"'));

  await post('/api/e', { slug, ev: 'visita', src: 'whatsapp' });
  await post('/api/e', { slug, ev: 'visita', src: 'whatsapp' });
  await post('/api/e', { slug, ev: 'visita', src: 'qr' });
  await post('/api/e', { slug, ev: 'visita', src: 'qr' }, { 'user-agent': 'WhatsApp/2.0' }); // vista previa: no cuenta

  const reg = await fetch(`${base}/${slug}/ir/registro?s=whatsapp`, { redirect: 'manual', headers: { 'user-agent': UA } });
  assert.equal(reg.status, 302);
  const loc = new URL(reg.headers.get('location'));
  assert.equal(loc.host, 'luma.com');
  assert.equal(loc.searchParams.get('utm_source'), 'whatsapp');
  assert.equal(loc.searchParams.get('utm_campaign'), slug);

  const cas = await fetch(`${base}/${slug}/ir/cascade?s=qr`, { redirect: 'manual', headers: { 'user-agent': UA } });
  assert.equal(cas.status, 302);
  assert.match(cas.headers.get('location'), /cascade\.team1\.network/);

  assert.equal((await fetch(`${base}/api/meetups/${slug}/stats`)).status, 403);
  assert.equal((await fetch(`${base}/api/meetups/${slug}/stats`, { headers: { 'x-key': 'mala' } })).status, 403);
  const st = await (await fetch(`${base}/api/meetups/${slug}/stats`, { headers: { 'x-key': key } })).json();
  assert.equal(st.total.visita, 3);
  assert.equal(st.total.unicos, 1);
  assert.equal(st.total.registro, 1);
  assert.equal(st.total.cascade, 1);
  assert.equal(st.fuentes.whatsapp.visita, 2);
  assert.equal(st.fuentes.qr.cascade, 1);

  // editar con la clave
  const put = await fetch(`${base}/api/meetups/${slug}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-key': key }, body: JSON.stringify(meetup({ titulo: 'Tech & Chill Puebla 2' })) });
  assert.equal(put.status, 200);
  const bad = await fetch(`${base}/api/meetups/${slug}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-key': 'mala' }, body: JSON.stringify(meetup()) });
  assert.equal(bad.status, 403);
  const got = await (await fetch(`${base}/api/meetups/${slug}`, { headers: { 'x-key': key } })).json();
  assert.equal(got.titulo, 'Tech & Chill Puebla 2');
  assert.ok(!('key_hash' in got));

  const ics = await fetch(`${base}/${slug}/evento.ics`, { headers: { 'user-agent': UA } });
  assert.match(ics.headers.get('content-type'), /text\/calendar/);
  assert.match(await ics.text(), /DTSTART:20300110T230000Z/);
});

test('rutas de servicio', async () => {
  assert.equal((await fetch(base + '/healthz')).status, 200);
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/crear')).status, 200);
  assert.equal((await fetch(base + '/no-existe')).status, 404);
  assert.equal((await fetch(base + '/static/../src/server.mjs')).status, 404);
  const h = await fetch(base + '/');
  assert.match(h.headers.get('content-security-policy') || '', /script-src 'self'/);
});

test('un título malicioso no rompe la página', async () => {
  const r = await post('/api/meetups', meetup({ titulo: 'Hola</script><script>alert(1)</script>', bajada: '<img src=x onerror=alert(1)>' }));
  assert.equal(r.status, 201);
  const { slug } = await r.json();
  const html = await (await fetch(`${base}/${slug}`, { headers: { 'user-agent': UA } })).text();
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('<img src=x'));
});
