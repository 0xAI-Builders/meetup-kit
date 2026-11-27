import { esc, fmtShort, fmtTime } from '../util.mjs';
import { shell, logo, footer, TEMAS } from './layout.mjs';

const card = (m, base, bp) => {
  const t = TEMAS[m.tema] || TEMAS.avalanche;
  return `<a class="mcard reveal" href="${bp}/${m.slug}" style="--accent:${t.a};--accent-2:${t.b}">
<div class="mcard-img">${m.portada ? `<img src="${esc(base + m.portada)}" alt="" loading="lazy" decoding="async">` : '<div class="hero-art small"><i></i><i></i><i></i></div>'}<span class="mcard-date">${esc(fmtShort(m.inicio, m.tz))}</span></div>
<div class="mcard-b"><b>${esc(m.titulo)}</b><span>${esc([fmtTime(m.inicio, m.tz), m.lugar, m.ciudad].filter(Boolean).join(' · '))}</span>${m.comunidad ? `<span class="chip">${esc(m.comunidad)}</span>` : ''}</div></a>`;
};

export function homePage({ base, bp = '', proximos, pasados, totales }) {
  const body = `
<header class="hnav wrap">${logo('', bp)}<nav><a href="#como" class="hide-m">Cómo funciona</a><a href="#meetups" class="hide-m">Meetups</a><a class="btn btn-primary btn-sm" href="${bp}/crear">Crear mi landing</a></nav></header>
<main>
<section class="home-hero">
<div class="aurora" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<div class="gridlines" aria-hidden="true"></div>
<div class="wrap home-hero-in">
<p class="kicker reveal">Para organizadores de la comunidad de Team1 LatAm</p>
<h1 class="display mega"><span class="line"><span>Tu meetup,</span></span><span class="line"><span class="grad">lleno.</span></span></h1>
<p class="lead reveal" style="--d:3">Arma la landing de tu meetup en dos minutos, comparte una liga distinta por cada canal y ve en vivo quién llega de dónde. Después del evento, la misma página lleva a tu gente a dar su primer paso en Avalanche.</p>
<div class="ctas reveal" style="--d:4"><a class="btn btn-primary btn-xl magnetic" href="${bp}/crear"><span>Crear mi landing</span><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M5 10h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></a><a class="btn btn-ghost" href="#como">Ver cómo funciona</a></div>
${totales.meetups ? `<div class="kpis reveal" style="--d:5">
<div><b data-count="${totales.meetups}">0</b><span>meetups</span></div>
<div><b data-count="${totales.visitas}">0</b><span>visitas</span></div>
<div><b data-count="${totales.onboarding}">0</b><span>pasos a Avalanche</span></div>
<div><b data-count="${totales.ciudades}">0</b><span>ciudades</span></div>
</div>` : ''}
</div>
<div class="phone-stack hide-m" aria-hidden="true">
<div class="phone p1"><div class="ph-top"></div><div class="ph-hero"><span></span><b>Agentes de IA</b><b class="grad">sobre Avalanche</b><em>SÁB 21 NOV · 5 PM</em><i class="ph-btn">Apartar mi lugar</i></div><div class="ph-cd"><span>06</span><span>14</span><span>32</span><span>09</span></div></div>
<div class="phone p2"><div class="ph-top"></div><div class="ph-panel"><em>Visitas hoy</em><b>1,284</b><svg viewBox="0 0 120 40"><path d="M0 34 L15 30 L30 31 L45 22 L60 24 L75 14 L90 16 L105 6 L120 8" fill="none" stroke="var(--accent)" stroke-width="2.5"/></svg><div class="ph-bars"><i style="--w:86%">WhatsApp</i><i style="--w:54%">Instagram</i><i style="--w:31%">QR</i></div></div></div>
</div>
</section>

<section class="how wrap" id="como">
<p class="kicker reveal">Cómo funciona</p>
<h2 class="h2 reveal">Tres pasos.<br><span class="grad">Cero código.</span></h2>
<div class="bento">
<article class="bx reveal" style="--d:1"><span class="bx-n">01</span><h3>Crea tu landing</h3><p>Título, fecha, lugar, tu liga de Luma y una portada. Ves cómo queda en vivo mientras escribes. Cuenta regresiva, agenda y botón de registro incluidos.</p><div class="bx-art art-form"><i></i><i></i><i></i><b></b></div></article>
<article class="bx bx-wide reveal" style="--d:2"><span class="bx-n">02</span><h3>Comparte una liga por canal</h3><p>WhatsApp, Telegram, Instagram, X, correo y un QR para imprimir. Cada liga se cuenta por separado, así sabes qué canal sí te trae gente.</p><div class="bx-art art-chips"><span>WhatsApp</span><span>Telegram</span><span>Instagram</span><span>X</span><span>Correo</span><span>QR</span></div></article>
<article class="bx bx-wide reveal" style="--d:3"><span class="bx-n">03</span><h3>Mide todo, en vivo</h3><p>Visitas, personas únicas, clics a registrarse y registrados en Luma. Después del evento, cuántos entraron a Cascade, crearon su cuenta de builder o instalaron Core. El resumen sale listo para tu recap de Team1.</p><div class="bx-art art-chart"><svg viewBox="0 0 300 90" preserveAspectRatio="none"><path class="draw" d="M0 80 C40 70 60 74 90 58 S150 40 180 44 230 18 300 10" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M0 80 C40 70 60 74 90 58 S150 40 180 44 230 18 300 10 V90 H0Z" fill="url(#gfill)" opacity=".35"/><defs><linearGradient id="gfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="transparent"/></linearGradient></defs></svg></div></article>
<article class="bx reveal" style="--d:4"><span class="bx-n">04</span><h3>Y después, Avalanche</h3><p>Al terminar, tu landing cambia sola a «Gracias por venir» con los tres pasos que cuenta Team1: Cascade, Builder Hub y Core.</p><div class="bx-art art-steps"><i>1</i><i>2</i><i>3</i></div></article>
</div>
</section>

<section class="list wrap" id="meetups">
<p class="kicker reveal">Próximos meetups</p>
<h2 class="h2 reveal">Lo que viene en la comunidad</h2>
${proximos.length ? `<div class="mgrid">${proximos.map((m) => card(m, base, bp)).join('')}</div>` : `<div class="empty reveal"><p>Todavía no hay meetups próximos. ¿Armas el primero?</p><a class="btn btn-primary" href="${bp}/crear">Crear mi landing</a></div>`}
${pasados.length ? `<p class="kicker reveal" style="margin-top:56px">Ya pasaron</p><div class="mgrid past">${pasados.map((m) => card(m, base, bp)).join('')}</div>` : ''}
</section>

<section class="final wrap reveal"><h2 class="display final-t">Tu próximo meetup<br><span class="grad">empieza aquí.</span></h2><a class="btn btn-primary btn-xl magnetic" href="${bp}/crear"><span>Crear mi landing</span></a><p class="small">Gratis y de código abierto.</p></section>
</main>
${footer(bp)}`;
  return shell({
    title: 'Meetup Kit · Landings para meetups de la comunidad de Team1',
    desc: 'Arma la landing de tu meetup en dos minutos, comparte una liga por canal y mide quién llega de dónde. Hecho por 0xAI Builders.',
    url: base + '/',
    og: base + '/static/og-default.png',
    bp,
    bodyClass: 'home',
    body,
    scripts: ['home.js'],
  });
}
