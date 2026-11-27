import { esc, fmtDay, fmtTime } from '../util.mjs';
import { shell, logo } from './layout.mjs';

export function cartelPage({ m, base, src }) {
  const url = `${base}/${m.slug}?s=${encodeURIComponent(src)}`;
  const body = `
<main class="cartel">
<div class="cartel-tools no-print"><a class="btn btn-ghost btn-sm" href="/${m.slug}">Volver a la landing</a><button class="btn btn-primary btn-sm" type="button" data-print>Imprimir</button></div>
<article class="poster">
<header>${logo()}<span class="chip">${esc(m.comunidad || 'Meetup')}</span></header>
<p class="kicker">Escanea con tu cámara</p>
<h1 class="display">Tu primer paso<br><span class="grad">en Avalanche.</span></h1>
<div class="poster-qr" data-qr-url="${esc(url)}" role="img" aria-label="Código QR"></div>
<p class="poster-sub">${esc(m.titulo)}</p>
<p class="poster-meta">${esc(fmtDay(m.inicio, m.tz))} · ${esc(fmtTime(m.inicio, m.tz))}${m.lugar ? ' · ' + esc(m.lugar) : ''}</p>
<ol class="poster-steps"><li><b>Explora Cascade</b></li><li><b>Crea tu cuenta de builder</b></li><li><b>Instala Core</b></li></ol>
</article>
</main>`;
  return shell({
    title: `Cartel QR · ${m.titulo}`,
    robots: 'noindex',
    tema: m.tema,
    bodyClass: 'cartel-page',
    body,
    scripts: ['qrcode.js', 'cartel.js'],
  });
}
