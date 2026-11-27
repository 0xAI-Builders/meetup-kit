// Comportamiento común: entradas al hacer scroll, barra superior, botones magnéticos y avisos.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MK = (window.MK = window.MK || {});
  // Subruta de la app ('' si vive en la raíz del dominio). La pone el servidor en <body data-base>.
  MK.base = document.body.dataset.base || '';

  // Entradas al hacer scroll
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;
  MK.reveal = (root = document) => root.querySelectorAll('.reveal:not(.in)').forEach((el) => (io && !reduce ? io.observe(el) : el.classList.add('in')));
  // Lo de la portada entra al cargar, sin esperar scroll: el botón principal siempre se ve.
  document.querySelectorAll('.hero .reveal, .home-hero .reveal, .wz-head, .done .reveal').forEach((el) => requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in'))));
  MK.reveal();

  // Barra superior con fondo al bajar
  const onScroll = () => document.body.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Botones magnéticos (solo con mouse)
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
      });
      b.addEventListener('pointerleave', () => (b.style.transform = ''));
    });
    // Brillo que sigue al mouse en tarjetas de pasos
    document.querySelectorAll('.step').forEach((c) =>
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', `${e.clientX - r.left}px`);
        c.style.setProperty('--my', `${e.clientY - r.top}px`);
      }),
    );
  }

  // Aviso breve
  let tt;
  MK.toast = (msg) => {
    const t = document.querySelector('.toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => t.classList.remove('show'), 2400);
  };

  MK.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    MK.toast('Copiado');
  };

  // Contador que sube
  MK.countUp = (el, to, ms = 1400) => {
    to = +to || 0;
    if (reduce || to === 0) return void (el.textContent = to.toLocaleString('es-MX'));
    const t0 = performance.now();
    const from = +(el.dataset.v || 0);
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(from + (to - from) * e).toLocaleString('es-MX');
      if (p < 1) requestAnimationFrame(step);
      else el.dataset.v = to;
    };
    requestAnimationFrame(step);
  };
  MK.reduce = reduce;
})();
