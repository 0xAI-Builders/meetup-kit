import { esc } from '../util.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const TEMAS = {
  avalanche: { nombre: 'Avalanche', a: '#E84142', b: '#FF8A4C' },
  aurora: { nombre: 'Aurora', a: '#8B5CF6', b: '#22D3EE' },
  menta: { nombre: 'Menta', a: '#10B981', b: '#A3E635' },
  ambar: { nombre: 'Ámbar', a: '#F59E0B', b: '#F43F5E' },
  cielo: { nombre: 'Cielo', a: '#38BDF8', b: '#818CF8' },
};

// Huella del contenido de /public: cambia sola con cada cambio de CSS o JS y obliga a los navegadores a bajar lo nuevo.
const PUB = fileURLToPath(new URL('../../public/', import.meta.url));
const h = createHash('sha1');
for (const f of readdirSync(PUB).sort()) h.update(f).update(readFileSync(PUB + f));
export const VERSION = h.digest('hex').slice(0, 10);
const v = `?v=${VERSION}`;

/** Esqueleto HTML común. `bp` es la subruta de la app ('' en la raíz); el JS la lee de data-base. */
export function shell({ title, desc = '', url = '', og = '', tema = 'avalanche', body, scripts = [], robots = 'index,follow', bodyClass = '', extraHead = '', bp = '' }) {
  const t = TEMAS[tema] || TEMAS.avalanche;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#07070b">
${url ? `<link rel="canonical" href="${esc(url)}"><meta property="og:url" content="${esc(url)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${og ? `<meta property="og:image" content="${esc(og)}"><meta name="twitter:image" content="${esc(og)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${bp}/static/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,500..800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap">
<link rel="stylesheet" href="${bp}/static/app.css${v}">
${extraHead}
</head>
<body class="${esc(bodyClass)}" data-base="${esc(bp)}" style="--accent:${t.a};--accent-2:${t.b}">
<div class="grain" aria-hidden="true"></div>
${body}
${['base.js', ...scripts].map((s) => `<script src="${s.startsWith('http') ? s : `${bp}/static/${s}${v}`}" defer></script>`).join('\n')}
</body>
</html>`;
}

export const logo = (cls = '', bp = '') => `<a class="brand ${cls}" href="${bp}/" aria-label="Meetup Kit, inicio">
<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="9" fill="url(#lg)"/><path d="M9 22V11l7 6 7-6v11" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
<span>Meetup<b>Kit</b></span></a>`;

export const footer = (bp = '') => `<footer class="foot wrap">
<div>${logo('', bp)}<p>Landings para meetups con registro y seguimiento por canal. Código abierto, hecho por <a href="https://0xai.build" target="_blank" rel="noopener">0xAI Builders</a> para la comunidad de Team1 LatAm.</p></div>
<nav><a href="${bp}/crear">Crear mi landing</a><a href="https://github.com/0xAI-Builders/meetup-kit" target="_blank" rel="noopener">GitHub</a></nav>
</footer>`;

export function notFoundPage({ bp = '' } = {}) {
  return shell({
    bp,
    title: 'No encontramos ese meetup · Meetup Kit',
    robots: 'noindex',
    body: `<main class="center-page wrap"><p class="kicker">404</p><h1 class="display">Ese meetup no existe<span class="dot">.</span></h1><p class="lead">Revisa la liga o crea el tuyo en dos minutos.</p><a class="btn btn-primary" href="${bp}/crear">Crear mi landing</a></main>`,
  });
}
