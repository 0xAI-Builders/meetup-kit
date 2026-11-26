// Cartel imprimible con el QR del meetup (canal «qr»).
(() => {
  const box = document.querySelector('[data-qr-url]');
  const draw = () => {
    if (!window.qrcode) return setTimeout(draw, 120);
    const q = window.qrcode(0, 'M');
    q.addData(box.dataset.qrUrl);
    q.make();
    box.innerHTML = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
  };
  draw();
  document.querySelector('[data-print]')?.addEventListener('click', () => print());
})();
