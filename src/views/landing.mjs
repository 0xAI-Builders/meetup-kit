import { esc, fmtDay, fmtTime, fmtShort, richText } from '../util.mjs';
import { shell, logo } from './layout.mjs';

export function modoDe(m, now) {
  if (now < m.inicio) return 'antes';
  if (now <= m.fin) return 'vivo';
  return 'despues';
}

const words = (t) =>
  esc(t)
    .split(/\s+/)
    .map((w, i) => `<span class="w" style="--i:${i}"><span>${w}</span></span>`)
    .join(' ');

export function pasosAvalanche(href, intro = true) {
  const p = [
    { k: 'cascade', n: 1, t: 'Explora Cascade', d: 'El mapa del ecosistema de Avalanche: más de 500 proyectos y guías paso a paso para empezar.', c: 'Abrir Cascade' },
    { k: 'builderhub', n: 2, t: 'Crea tu cuenta de builder', d: 'Avalanche Builder Hub: cursos, documentación y herramientas para construir.', c: 'Crear mi cuenta' },
    { k: 'core', n: 3, t: 'Instala Core', d: 'La wallet de Avalanche. La vas a necesitar para tu primera transacción.', c: 'Instalar Core' },
  ];
  return `<section class="steps-sec wrap reveal" id="pasos">
${intro ? `<p class="kicker">Tu siguiente paso</p><h2 class="h2">Entra a Avalanche<br><span class="grad">en cinco minutos.</span></h2>` : ''}
<div class="steps">
${p.map((s) => `<a class="step reveal" style="--d:${s.n}" href="${href(s.k)}" data-ev="${s.k}">
<span class="step-n">${s.n}</span><span class="step-b"><b>${s.t}</b><span>${s.d}</span></span><span class="step-cta">${s.c}<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 10h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>`).join('\n')}
</div></section>`;
}

export function landingPage({ m, src = 'directo', base, now, preview = false, modo: forced }) {
  const modo = ['antes', 'vivo', 'despues'].includes(forced) ? forced : modoDe(m, now);
  const go = (dest) => (preview ? '#' : `/${m.slug}/ir/${dest}?s=${encodeURIComponent(src)}`);
  const dia = fmtDay(m.inicio, m.tz);
  const hora = `${fmtTime(m.inicio, m.tz)} a ${fmtTime(m.fin, m.tz)}`;
  const portada = m.portada ? (m.portada.startsWith('data:') ? m.portada : `${base}${m.portada}`) : '';
  const og = m.portada && !m.portada.startsWith('data:') ? `${base}${m.portada}` : `${base}/static/og-default.png`;
  const url = `${base}/${m.slug}`;
  const chips = [m.comunidad, m.ciudad].filter(Boolean).map((c) => `<span class="chip">${esc(c)}</span>`).join('');
  const ticker = [fmtShort(m.inicio, m.tz), fmtTime(m.inicio, m.tz).toUpperCase(), m.lugar, m.ciudad, 'ENTRADA LIBRE', 'CUPO LIMITADO'].filter(Boolean).map(esc);
  const tickerHtml = Array(4).fill(ticker.map((t) => `<span>${t}</span><i>✦</i>`).join('')).join('');
  const calHref = preview ? '#' : `/${m.slug}/evento.ics?s=${encodeURIComponent(src)}`;
  const mapa = m.mapa_url || (m.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${m.lugar} ${m.direccion}`)}` : '');

  const cta =
    modo === 'antes'
      ? `<a class="btn btn-primary btn-xl magnetic" href="${go('registro')}" data-ev="registro"><span>Apartar mi lugar</span><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M5 10h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
<a class="btn btn-ghost" href="${calHref}" data-ev="calendario">Agregar a mi calendario</a>`
      : modo === 'vivo'
        ? `<a class="btn btn-primary btn-xl magnetic" href="#pasos"><span>Estoy aquí: dame los pasos</span></a>`
        : `<a class="btn btn-primary btn-xl magnetic" href="#pasos"><span>Mi siguiente paso</span></a>`;

  const estado =
    modo === 'antes'
      ? `<div class="countdown" data-to="${m.inicio}" aria-label="Cuenta regresiva">
${['días', 'horas', 'min', 'seg'].map((u, i) => `<div class="cd-u"><span class="cd-n" data-u="${i}">00</span><span class="cd-l">${u}</span></div>`).join('')}
</div>`
      : modo === 'vivo'
        ? `<p class="live"><span class="pulse"></span>Está pasando ahora</p>`
        : `<p class="live done">Ya pasó · ¡gracias por venir!</p>`;

  const titulo = modo === 'despues' ? `Gracias por venir a ${m.titulo}` : m.titulo;

  const body = `
<header class="lnav wrap">${logo()}
<div class="lnav-r">
<button class="btn btn-icon" type="button" data-share aria-label="Compartir"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v12m0-12-4 4m4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
${modo === 'antes' ? `<a class="btn btn-primary btn-sm hide-m" href="${go('registro')}" data-ev="registro">Registrarme</a>` : ''}
</div></header>

<main id="top">
<section class="hero">
<div class="hero-bg" aria-hidden="true">${portada ? `<img src="${esc(portada)}" alt="" fetchpriority="high" decoding="async">` : `<div class="hero-art"><i></i><i></i><i></i></div>`}<div class="hero-shade"></div></div>
<div class="hero-in wrap">
<div class="chips reveal">${chips}<span class="chip chip-date">${esc(fmtShort(m.inicio, m.tz))}</span></div>
<h1 class="display hero-title">${words(titulo)}</h1>
${m.bajada ? `<p class="lead reveal" style="--d:3">${esc(m.bajada)}</p>` : ''}
<div class="meta reveal" style="--d:4">
<div><span class="meta-l">Cuándo</span><b>${esc(dia)}</b><span>${esc(hora)}</span></div>
${m.lugar || m.direccion ? `<div><span class="meta-l">Dónde</span><b>${esc(m.lugar || m.ciudad)}</b><span>${esc(m.direccion)}</span></div>` : ''}
${m.organiza ? `<div><span class="meta-l">Organiza</span><b>${esc(m.organiza)}</b><span>${esc(m.comunidad)}</span></div>` : ''}
</div>
<div class="estado reveal" style="--d:5">${estado}</div>
<div class="ctas reveal" style="--d:6">${cta}</div>
</div>
<a class="scroll-hint" href="#info" aria-label="Más información"><span></span></a>
</section>

<div class="ticker" aria-hidden="true"><div class="ticker-t">${tickerHtml}</div></div>

${modo !== 'antes' ? pasosAvalanche(go) : ''}

${m.descripcion ? `<section class="about wrap reveal" id="info"><p class="kicker">De qué se trata</p><div class="prose">${richText(m.descripcion)}</div></section>` : '<span id="info"></span>'}

${m.agenda?.length ? `<section class="agenda-sec wrap" id="agenda"><p class="kicker reveal">Agenda</p><h2 class="h2 reveal">Así va la tarde</h2>
<ol class="agenda">${m.agenda.map((a, i) => `<li class="reveal" style="--d:${i}"><span class="ag-h">${esc(a.hora)}</span><span class="ag-b"><b>${esc(a.titulo)}</b>${a.quien ? `<span>${esc(a.quien)}</span>` : ''}</span></li>`).join('')}</ol></section>` : ''}

${m.lugar || m.direccion ? `<section class="place wrap reveal"><div class="place-card">
<div><p class="kicker">El lugar</p><h3 class="h3">${esc(m.lugar || m.ciudad)}</h3><p>${esc(m.direccion)}</p></div>
${mapa ? `<a class="btn btn-ghost" href="${preview ? '#' : esc(mapa)}" target="_blank" rel="noopener" data-ev="mapa">Cómo llegar</a>` : ''}
</div></section>` : ''}

${modo === 'antes' ? `${pasosAvalanche(go, false).replace('<section class="steps-sec wrap reveal" id="pasos">', '<section class="steps-sec wrap reveal" id="pasos"><p class="kicker">Mientras llega el día</p><h2 class="h2">Prepárate en<br><span class="grad">cinco minutos.</span></h2>')}
<section class="final wrap reveal"><h2 class="display final-t">¿Te apartamos<br>un lugar?</h2><a class="btn btn-primary btn-xl magnetic" href="${go('registro')}" data-ev="registro"><span>Apartar mi lugar</span></a></section>` : ''}

</main>

<footer class="foot-mini wrap"><span>${esc(m.organiza || m.comunidad || 'Meetup')} · ${esc(fmtShort(m.inicio, m.tz))}</span><a href="/">Hecho con Meetup Kit</a></footer>

${modo === 'antes' ? `<div class="sticky-cta"><div><b>${esc(fmtShort(m.inicio, m.tz))}</b><span>${esc(fmtTime(m.inicio, m.tz))} · ${esc(m.lugar || m.ciudad || '')}</span></div><a class="btn btn-primary" href="${go('registro')}" data-ev="registro">Apartar lugar</a></div>` : ''}
<div class="toast" role="status" aria-live="polite"></div>
<script type="application/json" id="mk">${JSON.stringify({ slug: m.slug, src, modo, preview, titulo: m.titulo, url: `${url}?s=compartido` }).replace(/</g, '\\u003c')}</script>`;

  return shell({
    title: modo === 'despues' ? `Gracias por venir · ${m.titulo}` : `${m.titulo} · ${dia}`,
    desc: m.bajada || `${dia}, ${hora}${m.lugar ? ' · ' + m.lugar : ''}. Regístrate y aparta tu lugar.`,
    url,
    og,
    tema: m.tema,
    robots: preview ? 'noindex' : 'index,follow',
    bodyClass: `landing modo-${modo}${preview ? ' is-preview' : ''}`,
    body,
    scripts: ['landing.js'],
    extraHead: preview ? '' : `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Event', name: m.titulo, startDate: new Date(m.inicio).toISOString(), endDate: new Date(m.fin).toISOString(),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: m.lugar || m.ciudad, address: m.direccion || m.ciudad },
      image: [og], description: m.bajada || m.descripcion.slice(0, 200), organizer: { '@type': 'Organization', name: m.organiza || m.comunidad || 'Meetup' },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'MXN', url: m.registro_url, availability: 'https://schema.org/InStock' },
    }).replace(/</g, '\\u003c')}</script>`,
  });
}
