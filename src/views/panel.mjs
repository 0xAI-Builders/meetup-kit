import { esc, fmtShort, fmtTime } from '../util.mjs';
import { shell, logo } from './layout.mjs';

export const CANALES = [
  ['whatsapp', 'WhatsApp'], ['telegram', 'Telegram'], ['instagram', 'Instagram'], ['x', 'X'], ['linkedin', 'LinkedIn'],
  ['facebook', 'Facebook'], ['correo', 'Correo'], ['luma', 'Luma'], ['qr', 'QR impreso'], ['amigos', 'Boca a boca'],
];

export function panelPage({ m, base, bp = '' }) {
  const body = `
<header class="pnav wrap">${logo('', bp)}
<div class="pnav-t"><b>${esc(m.titulo)}</b><span>${esc(fmtShort(m.inicio, m.tz))} · ${esc(fmtTime(m.inicio, m.tz))}</span></div>
<div class="pnav-r"><span class="livedot" hidden><i></i><span>En vivo</span></span><a class="btn btn-ghost btn-sm" href="${bp}/${m.slug}" target="_blank" rel="noopener">Ver landing</a><a class="btn btn-ghost btn-sm" data-edit href="${bp}/crear">Editar</a></div>
</header>
<main class="panel wrap">
<section class="lock" hidden><h1 class="h2">Abre tu panel con tu liga privada</h1><p class="lead">La liga que te dimos al crear el meetup termina en <code>#k=…</code>. Pégala aquí:</p><form class="lock-f"><input name="link" placeholder="https://…/panel#k=…" autocomplete="off"><button class="btn btn-primary" type="submit">Abrir</button></form><p class="form-err" hidden></p></section>

<div class="pbody" hidden>
<section class="kgrid">
${[
    ['visita', 'Visitas', 'Veces que se abrió la landing'],
    ['unicos', 'Personas únicas', 'Visitantes distintos por día, sin guardar datos personales'],
    ['registro', 'Clics a registrarse', 'Tocaron «Apartar mi lugar»'],
    ['luma', 'Registrados en Luma', 'Dato público de Luma'],
    ['cascade', 'Entraron a Cascade', 'Clics al mapa del ecosistema'],
    ['builderhub', 'Builder Hub', 'Clics a crear cuenta de builder'],
    ['core', 'Core', 'Clics a instalar la wallet'],
    ['calendario', 'Al calendario', 'Descargaron el evento'],
  ].map(([k, l, h], i) => `<article class="kcard reveal" style="--d:${i}" data-k="${k}"><span class="kcard-l">${l}</span><b class="kcard-n">—</b><span class="kcard-h">${h}</span></article>`).join('')}
</section>

<section class="pgrid">
<article class="pcard reveal"><header><h2 class="h3">Embudo</h2><span class="small">De la visita al primer paso en Avalanche</span></header><div class="funnel" id="funnel"></div></article>
<article class="pcard reveal"><header><h2 class="h3">Por día</h2><div class="legend"><span class="lg-a">Visitas</span><span class="lg-b">Clics a registro</span></div></header><div class="chart" id="chart"></div></article>
<article class="pcard pcard-wide reveal"><header><h2 class="h3">De dónde llega tu gente</h2><span class="small">Cada canal con su propia liga</span></header><div class="sources" id="sources"></div></article>
</section>

<section class="pcard share reveal" id="compartir">
<header><h2 class="h3">Tus ligas para compartir</h2><span class="small">Usa una liga distinta en cada canal: así sabes cuál funciona.</span></header>
<div class="chans">${CANALES.map(([k, l], i) => `<button type="button" class="chan${i === 0 ? ' is-on' : ''}" data-s="${k}">${l}</button>`).join('')}<label class="chan chan-own"><input placeholder="otro canal" maxlength="24" data-own></label></div>
<div class="share-out">
<div class="share-l"><div class="copyrow"><input readonly data-link><button class="btn btn-primary btn-sm" type="button" data-copy-link>Copiar liga</button></div>
<div class="share-btns"><a class="btn btn-ghost btn-sm" data-wa target="_blank" rel="noopener">Mandar por WhatsApp</a><a class="btn btn-ghost btn-sm" data-tg target="_blank" rel="noopener">Mandar por Telegram</a><a class="btn btn-ghost btn-sm" href="${bp}/${m.slug}/cartel?s=qr" target="_blank" rel="noopener">Cartel con QR para imprimir</a></div></div>
<div class="qrbox"><canvas width="220" height="220" data-qr aria-label="Código QR de la liga"></canvas><button class="btn btn-ghost btn-sm" type="button" data-qr-dl>Descargar QR</button></div>
</div>
</section>

<section class="pcard recap reveal">
<header><h2 class="h3">Resumen para tu recap de Team1</h2><span class="small">Cópialo tal cual al formulario o a tu reporte</span></header>
<textarea readonly rows="9" data-recap></textarea>
<div class="ctas"><button class="btn btn-primary" type="button" data-copy-recap>Copiar resumen</button><span class="small" data-updated></span></div>
</section>
</div>
</main>
<div class="toast" role="status" aria-live="polite"></div>
<script type="application/json" id="mk">${JSON.stringify({ slug: m.slug, base, titulo: m.titulo }).replace(/</g, '\\u003c')}</script>`;
  return shell({
    title: `Panel · ${m.titulo}`,
    robots: 'noindex,nofollow',
    tema: m.tema,
    bp,
    bodyClass: 'panel-page',
    body,
    scripts: ['qrcode.js', 'panel.js'],
  });
}
