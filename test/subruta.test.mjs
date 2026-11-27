// La app detrás de un proxy en una subruta (BASE_PATH), por ejemplo https://team1.0xai.build/meetup-generator.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, normBasePath } from '../src/server.mjs';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1';
const BP = '/meetup-generator';
const PUB = 'https://team1.test' + BP;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
let app, base, dir;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'mk-sub-'));
  app = createApp({ dataDir: dir, createCode: 'team1', salt: 'x', baseUrl: PUB, basePath: BP + '/' });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(() => { app.server.close(); app.store.close?.(); rmSync(dir, { recursive: true, force: true }); });

const meetup = (over = {}) => ({
  titulo: 'Meetup Team1 Puebla', fecha: '2030-02-10', hora: '18:00', duracion: '120', tz: 'America/Mexico_City',
  lugar: 'Friki', ciudad: 'Puebla', registro_url: 'https://luma.com/no-existe-abc', tema: 'aurora', publico: true, codigo: 'team1', ...over,
});
const post = (path, body, headers = {}) => fetch(base + BP + path, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': UA, ...headers }, body: JSON.stringify(body) });
const get = (path, init = {}) => fetch(base + path, { ...init, headers: { 'user-agent': UA, ...(init.headers || {}) } });

// Toda ruta local (href, src, action) de la página debe empezar con la subruta.
const rutasLocales = (html) => [...html.matchAll(/\s(?:href|src|action)="(\/[^"]*)"/g)].map((m) => m[1]);
const todasConPrefijo = (html, donde) => {
  const malas = rutasLocales(html).filter((u) => !u.startsWith(BP + '/'));
  assert.deepEqual(malas, [], `${donde}: rutas sin ${BP}: ${malas.join(', ')}`);
};

test('normaliza BASE_PATH', () => {
  assert.equal(normBasePath(''), '');
  assert.equal(normBasePath('/'), '');
  assert.equal(normBasePath('meetup-generator'), '/meetup-generator');
  assert.equal(normBasePath('/meetup-generator/'), '/meetup-generator');
  assert.equal(normBasePath('/a/b'), '/a/b');
  assert.throws(() => normBasePath('/con espacio'));
  assert.throws(() => normBasePath('/x"><script>'));
});

test('la subruta sin diagonal redirige a la subruta con diagonal', async () => {
  const r = await get(BP, { redirect: 'manual' });
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), BP + '/');
  const q = await get(BP + '?s=qr', { redirect: 'manual' });
  assert.equal(q.headers.get('location'), BP + '/?s=qr');
});

test('fuera de la subruta no hay nada, salvo /healthz', async () => {
  assert.equal((await get('/')).status, 404);
  assert.equal((await get('/crear')).status, 404);
  assert.equal((await get('/static/app.css')).status, 404);
  assert.equal((await get('/meetup-generatorx')).status, 404);
  assert.equal((await get('/healthz')).status, 200);
  assert.equal((await get(BP + '/healthz')).status, 200);
});

test('inicio, crear y archivos estáticos bajo la subruta', async () => {
  const home = await get(BP + '/');
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.ok(html.includes(`data-base="${BP}"`));
  todasConPrefijo(html, 'inicio');
  assert.ok(html.includes(`<link rel="canonical" href="${PUB}/">`));
  assert.ok(html.includes(`${PUB}/static/og-default.png`));

  const crear = await (await get(BP + '/crear')).text();
  todasConPrefijo(crear, 'crear');
  assert.ok(crear.includes(`src="${BP}/static/crear.js?v=`));

  for (const u of rutasLocales(html).filter((x) => x.includes('/static/'))) {
    const r = await get(u);
    assert.equal(r.status, 200, u);
  }
  assert.match((await get(BP + '/static/app.css')).headers.get('content-type'), /text\/css/);
  assert.equal((await get(BP + '/favicon.ico')).status, 200);
  assert.equal((await get(BP + '/no-existe')).status, 404);
  todasConPrefijo(await (await get(BP + '/no-existe')).text(), '404');
});

test('robots y sitemap con la subruta', async () => {
  const robots = await (await get(BP + '/robots.txt')).text();
  assert.match(robots, new RegExp(`Disallow: ${BP}/api/`));
  assert.match(robots, new RegExp(`Sitemap: ${PUB}/sitemap.xml`));
  const sm = await (await get(BP + '/sitemap.xml')).text();
  assert.ok(sm.includes(`<loc>${PUB}/</loc>`));
});

test('flujo completo bajo la subruta: crear, landing, /ir, panel, cartel, stats', async () => {
  const r = await post('/api/meetups', meetup({ portada: PNG }));
  assert.equal(r.status, 201);
  const { slug, key, url, panel } = await r.json();
  assert.equal(url, `${PUB}/${slug}`);
  assert.equal(panel, `${PUB}/${slug}/panel#k=${key}`);

  const land = await get(`${BP}/${slug}?s=whatsapp`);
  assert.equal(land.status, 200);
  const html = await land.text();
  todasConPrefijo(html, 'landing');
  assert.ok(html.includes(`href="${BP}/${slug}/ir/registro?s=whatsapp"`));
  assert.ok(html.includes(`href="${BP}/${slug}/evento.ics?s=whatsapp"`));
  assert.ok(html.includes(`${PUB}/u/`), 'la portada usa la dirección pública con subruta');
  assert.ok(html.includes(`"url":"${PUB}/${slug}?s=compartido"`));

  const portada = /src="https:\/\/team1\.test(\/meetup-generator\/u\/[^"]+)"/.exec(html)[1];
  const img = await get(portada);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');

  await post('/api/e', { slug, ev: 'visita', src: 'whatsapp' });
  await post('/api/e', { slug, ev: 'visita', src: 'qr' });

  const reg = await get(`${BP}/${slug}/ir/registro?s=whatsapp`, { redirect: 'manual' });
  assert.equal(reg.status, 302);
  const loc = new URL(reg.headers.get('location'));
  assert.equal(loc.host, 'luma.com');
  assert.equal(loc.searchParams.get('utm_source'), 'whatsapp');
  const cas = await get(`${BP}/${slug}/ir/cascade?s=qr`, { redirect: 'manual' });
  assert.equal(cas.status, 302);

  const ics = await (await get(`${BP}/${slug}/evento.ics`)).text();
  assert.ok(ics.includes(`URL:${PUB}/${slug}`));

  const pan = await get(`${BP}/${slug}/panel`);
  assert.equal(pan.status, 200);
  const ph = await pan.text();
  todasConPrefijo(ph, 'panel');
  assert.ok(ph.includes(`"base":"${PUB}"`));
  assert.ok(ph.includes(`href="${BP}/${slug}/cartel?s=qr"`));

  const cartel = await (await get(`${BP}/${slug}/cartel`)).text();
  todasConPrefijo(cartel, 'cartel');
  assert.ok(cartel.includes(`data-qr-url="${PUB}/${slug}?s=qr"`));

  assert.equal((await fetch(`${base}${BP}/api/meetups/${slug}/stats`)).status, 403);
  const st = await (await fetch(`${base}${BP}/api/meetups/${slug}/stats`, { headers: { 'x-key': key } })).json();
  assert.equal(st.total.visita, 2);
  assert.equal(st.total.registro, 1);
  assert.equal(st.total.cascade, 1);
  assert.equal(st.fuentes.whatsapp.visita, 1);

  // editar con la clave y la vista previa del asistente
  const put = await fetch(`${base}${BP}/api/meetups/${slug}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-key': key }, body: JSON.stringify(meetup({ titulo: 'Meetup Team1 Puebla 2' })) });
  assert.equal(put.status, 200);
  assert.equal((await put.json()).url, `${PUB}/${slug}`);
  const got = await (await fetch(`${base}${BP}/api/meetups/${slug}`, { headers: { 'x-key': key } })).json();
  assert.match(got.portada, /^\/u\//, 'la portada se guarda sin subruta');
  const pv = await post('/api/preview', { titulo: 'Vista', fecha: '2030-02-10', hora: '18:00', portada: got.portada });
  assert.equal(pv.status, 200);
  const pvh = await pv.text();
  assert.ok(pvh.includes(`data-base="${BP}"`));
  assert.ok(pvh.includes(`${PUB}/u/`));
});
