// Meetup Kit: landings de meetups con registro y seguimiento por canal.
// Servidor HTTP de Node sin dependencias externas.
import { createServer } from 'node:http';
import { writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.mjs';
import { slugify, newKey, sha256, shortId, zonedToUtc, validTz, dayIn, cleanSrc, isHttpUrl, BOT_UA } from './util.mjs';
import { homePage } from './views/home.mjs';
import { crearPage } from './views/crear.mjs';
import { landingPage } from './views/landing.mjs';
import { panelPage } from './views/panel.mjs';
import { cartelPage } from './views/cartel.mjs';
import { notFoundPage } from './views/layout.mjs';
import { icsFor } from './views/ics.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const config = {
  port: +(process.env.PORT || 7343),
  host: process.env.HOST || '127.0.0.1',
  dataDir: process.env.DATA_DIR || join(ROOT, 'data'),
  baseUrl: (process.env.BASE_URL || 'http://localhost:7343').replace(/\/$/, ''),
  createCode: process.env.CREATE_CODE || '',
  salt: process.env.SALT || 'cambia-esta-sal',
  trustProxy: process.env.TRUST_PROXY === '1',
  defaultTz: process.env.DEFAULT_TZ || 'America/Mexico_City',
  links: {
    cascade: process.env.CASCADE_URL || 'https://cascade.team1.network/?ref=t1-latam',
    builderhub: process.env.BUILDERHUB_URL || 'https://build.avax.network/login',
    core: process.env.CORE_URL || 'https://core.app/',
  },
};

export const TEMAS = ['avalanche', 'aurora', 'menta', 'ambar', 'cielo'];
const RESERVADOS = new Set(['crear', 'api', 'static', 'u', 'healthz', 'panel', 'favicon.ico', 'robots.txt', 'sitemap.xml']);

export function createApp(opts = {}) {
  const cfg = { ...config, ...opts };
  const store = openDb(opts.dbFile || join(cfg.dataDir, 'meetup-kit.sqlite'));
  const uploads = join(cfg.dataDir, 'uploads');
  const limits = new Map();
  const lumaCache = new Map();

  function limited(ip, bucket, max, windowMs) {
    const k = bucket + ':' + ip;
    const now = Date.now();
    const e = limits.get(k);
    if (!e || e.reset < now) {
      limits.set(k, { n: 1, reset: now + windowMs });
      return false;
    }
    e.n++;
    return e.n > max;
  }
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of limits) if (v.reset < now) limits.delete(k);
  }, 60_000).unref();

  const ipOf = (req) =>
    (cfg.trustProxy && (req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0].trim())) || req.socket.remoteAddress || '0';

  function track(req, m, ev, src) {
    const ua = String(req.headers['user-agent'] || '');
    if (!ua || BOT_UA.test(ua)) return;
    const dia = dayIn(Date.now(), m.tz);
    store.hit(m.slug, dia, src, ev);
    if (ev === 'visita') store.unico(m.slug, dia, sha256([ipOf(req), ua, dia, m.slug, cfg.salt].join('|')).slice(0, 24), src);
  }

  async function lumaRegistrados(url) {
    const m = /lu\.ma\/([\w-]+)|luma\.com\/([\w-]+)/.exec(url || '');
    const id = m && (m[1] || m[2]);
    if (!id || ['event', 'home', 'calendar'].includes(id)) return null;
    const c = lumaCache.get(id);
    if (c && c.t > Date.now() - 10 * 60_000) return c.v;
    let v = null;
    try {
      const r = await fetch('https://api.lu.ma/url?url=' + encodeURIComponent(id), { signal: AbortSignal.timeout(4000), headers: { accept: 'application/json' } });
      if (r.ok) {
        const d = (await r.json()).data || {};
        const t = d.ticket_info || {};
        const quedan = typeof t.spots_remaining === 'number' ? t.spots_remaining : null;
        const tipos = Array.isArray(d.ticket_types) ? d.ticket_types : [];
        const porTipo = tipos.reduce((a, x) => a + (+x.num_tickets_registered || 0), 0);
        const registrados = d.guest_count || porTipo || null;
        const cupoTipos = tipos.every((x) => x.max_capacity) ? tipos.reduce((a, x) => a + x.max_capacity, 0) : null;
        const cupo = cupoTipos || (registrados != null && quedan != null ? registrados + quedan : null);
        v = { registrados, cupo, quedan };
      }
    } catch {}
    lumaCache.set(id, { t: Date.now(), v });
    return v;
  }

  // ---------- validación ----------
  async function parseMeetup(b, prev) {
    const err = (m) => ({ error: m });
    const str = (v, max) => String(v ?? '').trim().slice(0, max);
    const titulo = str(b.titulo, 90);
    if (titulo.length < 3) return err('Ponle un título a tu meetup.');
    const tz = validTz(b.tz) ? b.tz : cfg.defaultTz;
    const inicio = zonedToUtc(`${str(b.fecha, 10)}T${str(b.hora, 5)}`, tz);
    if (!Number.isFinite(inicio)) return err('Revisa la fecha y la hora.');
    const durMin = Math.min(Math.max(parseInt(b.duracion, 10) || 180, 30), 24 * 60);
    const registro_url = str(b.registro_url, 400);
    if (!isHttpUrl(registro_url)) return err('La liga de registro debe empezar con https:// (por ejemplo, tu evento en Luma).');
    const mapa_url = str(b.mapa_url, 400);
    if (mapa_url && !isHttpUrl(mapa_url)) return err('La liga del mapa debe empezar con https://');
    const agenda = (Array.isArray(b.agenda) ? b.agenda : [])
      .slice(0, 20)
      .map((a) => ({ hora: str(a?.hora, 12), titulo: str(a?.titulo, 120), quien: str(a?.quien, 90) }))
      .filter((a) => a.titulo);
    let portada = prev?.portada || '';
    if (typeof b.portada === 'string' && b.portada.startsWith('data:')) {
      const saved = await saveImage(b.portada);
      if (saved.error) return saved;
      portada = saved.path;
    } else if (b.portada === '') portada = '';
    return {
      titulo,
      bajada: str(b.bajada, 160),
      descripcion: str(b.descripcion, 4000),
      organiza: str(b.organiza, 80),
      contacto: str(b.contacto, 120),
      comunidad: str(b.comunidad, 60),
      ciudad: str(b.ciudad, 60),
      inicio,
      fin: inicio + durMin * 60_000,
      tz,
      lugar: str(b.lugar, 90),
      direccion: str(b.direccion, 160),
      mapa_url,
      registro_url,
      agenda,
      portada,
      tema: TEMAS.includes(b.tema) ? b.tema : 'avalanche',
      publico: b.publico === false ? 0 : 1,
    };
  }

  async function saveImage(dataUrl) {
    const m = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!m) return { error: 'La portada debe ser JPG, PNG o WebP.' };
    const buf = Buffer.from(m[3], 'base64');
    if (buf.length > 3_000_000) return { error: 'La portada pesa demasiado (máximo 3 MB).' };
    const magic = buf.subarray(0, 12).toString('hex');
    const ok = magic.startsWith('ffd8ff') || magic.startsWith('89504e47') || (magic.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP');
    if (!ok) return { error: 'La portada no parece una imagen válida.' };
    await mkdir(uploads, { recursive: true });
    const name = `${Date.now().toString(36)}-${shortId(8)}.${m[2] === 'jpeg' ? 'jpg' : m[2]}`;
    await writeFile(join(uploads, name), buf);
    return { path: '/u/' + name };
  }

  function uniqueSlug(titulo, inicio, tz) {
    const base = slugify(titulo, 40);
    let s = RESERVADOS.has(base) ? base + '-meetup' : base;
    if (!store.exists(s)) return s;
    s = `${base}-${dayIn(inicio, tz).slice(5).replace('-', '')}`;
    while (store.exists(s) || RESERVADOS.has(s)) s = `${base}-${shortId(4)}`;
    return s;
  }

  const keyOk = (m, req, url) => {
    const k = req.headers['x-key'] || url.searchParams.get('k') || '';
    return !!m && k.length > 10 && sha256(k) === m.key_hash;
  };

  // ---------- respuestas ----------
  const SEC = {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'content-security-policy':
      "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  };
  const send = (res, code, body, type = 'text/html; charset=utf-8', extra = {}) => {
    res.writeHead(code, { 'content-type': type, ...SEC, ...extra });
    res.end(body);
  };
  const json = (res, code, obj) => send(res, code, JSON.stringify(obj), 'application/json; charset=utf-8', { 'cache-control': 'no-store' });
  const redirect = (res, to, code = 302) => {
    res.writeHead(code, { location: to, 'cache-control': 'no-store', ...SEC });
    res.end();
  };

  async function readBody(req, max = 4_500_000) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > max) {
          reject(Object.assign(new Error('Demasiado grande'), { status: 413 }));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }
  const readJson = async (req, max) => {
    try {
      return JSON.parse((await readBody(req, max)) || '{}');
    } catch (e) {
      if (e.status) throw e;
      return {};
    }
  };

  const STATIC_TYPES = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
  async function serveFile(res, base, rel, maxAge) {
    const p = normalize(join(base, rel));
    if (!p.startsWith(base)) return send(res, 404, 'No encontrado', 'text/plain');
    try {
      const st = await stat(p);
      if (!st.isFile()) throw new Error();
      res.writeHead(200, { 'content-type': STATIC_TYPES[extname(p)] || 'application/octet-stream', 'content-length': st.size, 'cache-control': `public, max-age=${maxAge}`, ...SEC });
      createReadStream(p).pipe(res);
    } catch {
      send(res, 404, 'No encontrado', 'text/plain');
    }
  }

  const ctxFor = () => ({ base: cfg.baseUrl, createCode: !!cfg.createCode, defaultTz: cfg.defaultTz, links: cfg.links, now: Date.now() });

  // ---------- rutas ----------
  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';
    const method = req.method;
    const ip = ipOf(req);

    if (path === '/healthz') return send(res, 200, 'ok', 'text/plain');
    if (path === '/robots.txt') return send(res, 200, `User-agent: *\nDisallow: /api/\nDisallow: /*/panel\nSitemap: ${cfg.baseUrl}/sitemap.xml\n`, 'text/plain');
    if (path === '/sitemap.xml') {
      const urls = [cfg.baseUrl + '/', ...store.proximos(Date.now() - 365 * 86400e3, 200).map((m) => `${cfg.baseUrl}/${m.slug}`)];
      return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${u}</loc></url>`).join('')}</urlset>`, 'application/xml');
    }
    if (path.startsWith('/static/')) return serveFile(res, join(ROOT, 'public'), path.slice(8), 86400);
    if (path === '/favicon.ico') return serveFile(res, join(ROOT, 'public'), 'favicon.svg', 86400);
    if (path.startsWith('/u/')) return serveFile(res, uploads, path.slice(3), 31536000);

    if (path === '/' && method === 'GET') {
      const now = Date.now();
      return send(res, 200, homePage({ ...ctxFor(), proximos: store.proximos(now), pasados: store.pasados(now), totales: store.totales() }), undefined, { 'cache-control': 'public, max-age=60' });
    }
    if (path === '/crear' && method === 'GET') return send(res, 200, crearPage(ctxFor()), undefined, { 'cache-control': 'no-store' });

    // API
    if (path === '/api/meetups' && method === 'POST') {
      if (limited(ip, 'crear', 12, 3600_000)) return json(res, 429, { error: 'Demasiados intentos. Espera un rato.' });
      const b = await readJson(req);
      if (cfg.createCode && String(b.codigo || '').trim() !== cfg.createCode) return json(res, 403, { error: 'El código de acceso no es correcto. Pídeselo a quien organiza tu comunidad.' });
      const m = await parseMeetup(b, null);
      if (m.error) return json(res, 400, m);
      const key = newKey();
      const slug = uniqueSlug(m.titulo, m.inicio, m.tz);
      const now = Date.now();
      store.insert({ ...m, slug, key_hash: sha256(key), creado: now, editado: now });
      return json(res, 201, { slug, key, url: `${cfg.baseUrl}/${slug}`, panel: `${cfg.baseUrl}/${slug}/panel#k=${key}` });
    }
    let mm;
    if ((mm = /^\/api\/meetups\/([a-z0-9-]+)$/.exec(path))) {
      const prev = store.get(mm[1]);
      if (!keyOk(prev, req, url)) return json(res, 403, { error: 'Liga privada no válida.' });
      if (method === 'GET') {
        const { key_hash, ...pub } = prev;
        void key_hash;
        return json(res, 200, pub);
      }
      if (method === 'PUT') {
        if (limited(ip, 'editar', 60, 3600_000)) return json(res, 429, { error: 'Demasiados cambios seguidos. Espera un rato.' });
        const m = await parseMeetup(await readJson(req), prev);
        if (m.error) return json(res, 400, m);
        store.update({ ...m, slug: prev.slug, editado: Date.now() });
        return json(res, 200, { ok: true, url: `${cfg.baseUrl}/${prev.slug}` });
      }
    }
    if ((mm = /^\/api\/meetups\/([a-z0-9-]+)\/stats$/.exec(path)) && method === 'GET') {
      const m = store.get(mm[1]);
      if (!keyOk(m, req, url)) return json(res, 403, { error: 'Liga privada no válida.' });
      return json(res, 200, { meetup: { slug: m.slug, titulo: m.titulo, inicio: m.inicio, fin: m.fin, tz: m.tz }, ...store.stats(m.slug), luma: await lumaRegistrados(m.registro_url), now: Date.now() });
    }
    if (path === '/api/preview' && method === 'POST') {
      if (limited(ip, 'preview', 240, 3600_000)) return send(res, 429, '');
      const b = await readJson(req);
      const tz = validTz(b.tz) ? b.tz : cfg.defaultTz;
      let inicio = zonedToUtc(`${b.fecha}T${b.hora}`, tz);
      if (!Number.isFinite(inicio)) inicio = Date.now() + 7 * 86400e3;
      const fake = {
        slug: 'vista-previa', titulo: String(b.titulo || 'Tu meetup').slice(0, 90), bajada: String(b.bajada || '').slice(0, 160), descripcion: String(b.descripcion || '').slice(0, 4000),
        organiza: String(b.organiza || '').slice(0, 80), comunidad: String(b.comunidad || '').slice(0, 60), ciudad: String(b.ciudad || '').slice(0, 60),
        inicio, fin: inicio + (parseInt(b.duracion, 10) || 180) * 60_000, tz, lugar: String(b.lugar || '').slice(0, 90), direccion: String(b.direccion || '').slice(0, 160),
        mapa_url: '', registro_url: '#', agenda: Array.isArray(b.agenda) ? b.agenda.slice(0, 20) : [],
        portada: typeof b.portada === 'string' && /^(data:image\/(jpeg|png|webp);base64,|\/u\/)/.test(b.portada) ? b.portada : '',
        tema: TEMAS.includes(b.tema) ? b.tema : 'avalanche',
      };
      return send(res, 200, landingPage({ ...ctxFor(), m: fake, src: 'preview', preview: true, modo: b.modo }), undefined, { 'cache-control': 'no-store' });
    }
    if (path === '/api/e' && method === 'POST') {
      if (limited(ip, 'beacon', 240, 60_000)) return send(res, 204, '');
      const b = await readJson(req, 2000);
      const m = typeof b.slug === 'string' && /^[a-z0-9-]{1,60}$/.test(b.slug) ? store.get(b.slug) : null;
      if (m && ['visita', 'compartir', 'calendario', 'mapa'].includes(b.ev)) track(req, m, b.ev, cleanSrc(b.src));
      return send(res, 204, '');
    }

    // Páginas de cada meetup
    if ((mm = /^\/([a-z0-9-]+)(?:\/(panel|cartel|evento\.ics|ir\/(registro|cascade|builderhub|core)))?$/.exec(path)) && method === 'GET') {
      const m = store.get(mm[1]);
      if (!m) return send(res, 404, notFoundPage(ctxFor()));
      const src = cleanSrc(url.searchParams.get('s'));
      const sub = mm[2];
      if (!sub) return send(res, 200, landingPage({ ...ctxFor(), m, src }), undefined, { 'cache-control': 'no-cache' });
      if (sub === 'panel') return send(res, 200, panelPage({ ...ctxFor(), m }), undefined, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
      if (sub === 'cartel') return send(res, 200, cartelPage({ ...ctxFor(), m, src: url.searchParams.get('s') ? src : 'qr' }), undefined, { 'cache-control': 'no-cache' });
      if (sub === 'evento.ics') {
        track(req, m, 'calendario', src);
        return send(res, 200, icsFor(m, cfg.baseUrl), 'text/calendar; charset=utf-8', { 'content-disposition': `attachment; filename="${m.slug}.ics"` });
      }
      const dest = mm[3];
      track(req, m, dest, src);
      if (dest === 'registro') {
        const u = new URL(m.registro_url);
        if (!u.searchParams.has('utm_source')) {
          u.searchParams.set('utm_source', src);
          u.searchParams.set('utm_medium', 'meetup-kit');
          u.searchParams.set('utm_campaign', m.slug);
        }
        return redirect(res, u.toString());
      }
      return redirect(res, cfg.links[dest]);
    }
    return send(res, 404, notFoundPage(ctxFor()));
  }

  const server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (e) {
      if (!res.headersSent) {
        if (e.status === 413) json(res, 413, { error: 'La portada pesa demasiado (máximo 3 MB).' });
        else {
          console.error(e);
          json(res, 500, { error: 'Algo falló de nuestro lado. Intenta otra vez.' });
        }
      }
    }
  });
  return { server, store, cfg };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const { server, cfg } = createApp();
  if (cfg.salt === 'cambia-esta-sal' && process.env.NODE_ENV === 'production') {
    console.error('Falta SALT: define una cadena larga y aleatoria en el entorno antes de abrir el servicio.');
    process.exit(1);
  }
  await mkdir(cfg.dataDir, { recursive: true });
  server.listen(cfg.port, cfg.host, () => console.log(`Meetup Kit en ${cfg.baseUrl} (escuchando ${cfg.host}:${cfg.port})`));
}

