// Landing de un meetup: cuenta regresiva, contador de visitas, compartir y botón fijo.
(() => {
  const MK = window.MK;
  const data = JSON.parse(document.getElementById('mk')?.textContent || '{}');
  const beacon = (ev) => {
    if (data.preview) return;
    const body = JSON.stringify({ slug: data.slug, ev, src: data.src });
    const to = MK.base + '/api/e';
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon(to, new Blob([body], { type: 'application/json' }))))
        fetch(to, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
    } catch {}
  };

  // Visita: una vez por carga, cuando la página es visible (evita contar precargas).
  if (!data.preview) {
    const go = () => { beacon('visita'); document.removeEventListener('visibilitychange', onVis); };
    const onVis = () => document.visibilityState === 'visible' && go();
    if (document.visibilityState === 'visible') go();
    else document.addEventListener('visibilitychange', onVis);
    // La liga ya se contó: quitamos ?s= para que si la copian no se mezcle el canal.
    if (location.search.includes('s=')) history.replaceState(null, '', location.pathname + location.hash);
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-ev]');
    if (a && a.dataset.ev === 'mapa') beacon('mapa');
    if (data.preview && e.target.closest('a[href]') && !e.target.closest('a[href^="#"]')) e.preventDefault();
  });

  // Compartir
  document.querySelectorAll('[data-share]').forEach((b) =>
    b.addEventListener('click', async () => {
      beacon('compartir');
      const share = { title: data.titulo, url: data.url };
      if (navigator.share) {
        try { await navigator.share(share); } catch {}
      } else MK.copy(data.url);
    }),
  );

  // Cuenta regresiva
  const cd = document.querySelector('.countdown');
  if (cd) {
    const to = +cd.dataset.to;
    const nums = [...cd.querySelectorAll('.cd-n')];
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      let s = Math.max(0, Math.floor((to - Date.now()) / 1000));
      const v = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
      v.forEach((x, i) => {
        const t = pad(x);
        if (nums[i].textContent !== t) {
          nums[i].textContent = t;
          nums[i].classList.remove('tick');
          void nums[i].offsetWidth;
          nums[i].classList.add('tick');
        }
      });
      if (s === 0 && !data.preview) setTimeout(() => location.reload(), 1500);
    };
    tick();
    setInterval(tick, 1000);
  }

  // Botón fijo (celular): aparece al pasar la portada.
  const sticky = document.querySelector('.sticky-cta');
  const hero = document.querySelector('.hero');
  if (sticky && hero && 'IntersectionObserver' in window)
    new IntersectionObserver(([e]) => sticky.classList.toggle('show', !e.isIntersecting), { threshold: 0.15 }).observe(hero);

  // Profundidad de la portada
  const img = document.querySelector('.hero-bg img');
  if (img && !MK.reduce) {
    let raf;
    addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => img.style.setProperty('--py', `${Math.min(scrollY, innerHeight) * 0.25}px`));
    }, { passive: true });
  }
})();
