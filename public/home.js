// Portada: cifras que suben al aparecer y luz de la aurora que sigue al mouse.
(() => {
  const MK = window.MK;
  const kpis = document.querySelector('.kpis');
  if (kpis && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      kpis.querySelectorAll('[data-count]').forEach((b) => MK.countUp(b, b.dataset.count));
      io.disconnect();
    }, { threshold: 0.4 });
    io.observe(kpis);
  }
  const aurora = document.querySelector('.aurora');
  if (aurora && !MK.reduce && matchMedia('(pointer: fine)').matches) {
    let raf;
    addEventListener('pointermove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        aurora.style.setProperty('--mx', `${e.clientX}px`);
        aurora.style.setProperty('--my', `${e.clientY}px`);
      });
    }, { passive: true });
  }
})();
