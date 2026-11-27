// Panel privado del organizador.
(() => {
  const MK = window.MK;
  const meta = JSON.parse(document.getElementById('mk')?.textContent || '{}');
  const $ = (s, r = document) => r.querySelector(s);
  const lock = $('.lock');
  const body = $('.pbody');
  const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('es-MX'));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const NOMBRES = { whatsapp: 'WhatsApp', telegram: 'Telegram', instagram: 'Instagram', x: 'X', linkedin: 'LinkedIn', facebook: 'Facebook', correo: 'Correo', luma: 'Luma', qr: 'QR impreso', amigos: 'Boca a boca', directo: 'Directo', compartido: 'Compartida' };
  const nombre = (s) => NOMBRES[s] || s;

  // La clave va después de # para que nunca llegue a registros de servidores ni a otras páginas.
  let key = new URLSearchParams(location.hash.slice(1)).get('k');
  if (!key) {
    try {
      const mine = JSON.parse(localStorage.getItem('mk-mios') || '[]').find((x) => x.slug === meta.slug);
      if (mine) key = new URLSearchParams(mine.panel.split('#')[1] || '').get('k');
    } catch {}
  }
  if (!key) return showLock();

  $('[data-edit]').href = `/crear?editar=${meta.slug}#k=${key}`;
  let first = true;
  load();
  setInterval(() => document.visibilityState === 'visible' && load(), 30_000);

  function showLock(msg) {
    lock.hidden = false;
    body.hidden = true;
    if (msg) { const e = $('.form-err', lock); e.textContent = msg; e.hidden = false; }
    $('.lock-f').onsubmit = (e) => {
      e.preventDefault();
      const v = e.target.link.value.trim();
      const k = new URLSearchParams(v.split('#')[1] || '').get('k') || v;
      location.hash = 'k=' + k;
      location.reload();
    };
  }

  async function load() {
    try {
      const r = await fetch(`/api/meetups/${meta.slug}/stats`, { headers: { 'x-key': key } });
      if (r.status === 403) return showLock('Esa liga privada no es válida para este meetup.');
      if (!r.ok) throw new Error();
      render(await r.json());
    } catch {
      if (first) MK.toast('No pude cargar los números. Reintento en 30 s.');
    }
  }

  function render(d) {
    lock.hidden = true;
    body.hidden = false;
    const t = d.total || {};
    const now = d.now;
    const vivo = now >= d.meetup.inicio - 3 * 3600e3 && now <= d.meetup.fin + 3 * 3600e3;
    $('.livedot').hidden = !vivo;
    const vals = { visita: t.visita, unicos: t.unicos, registro: t.registro, luma: d.luma?.registrados ?? null, cascade: t.cascade, builderhub: t.builderhub, core: t.core, calendario: t.calendario };
    document.querySelectorAll('.kcard').forEach((c) => {
      const n = $('.kcard-n', c);
      const v = vals[c.dataset.k];
      if (v == null && c.dataset.k === 'luma') { n.textContent = '—'; $('.kcard-h', c).textContent = 'Luma no lo publica para este evento'; return; }
      if (c.dataset.k === 'luma' && d.luma?.cupo) $('.kcard-h', c).textContent = `de ${fmt(d.luma.cupo)} lugares · dato de Luma`;
      MK.countUp(n, v || 0, first ? 1400 : 700);
    });
    if (first) MK.reveal(body);
    funnel(vals);
    chart(d.dias || {});
    sources(d.fuentes || {});
    recap(d, vals);
    $('[data-updated]').textContent = 'Actualizado ' + new Date(now).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
    first = false;
  }

  function funnel(v) {
    const steps = [
      ['Visitas', v.visita], ['Personas únicas', v.unicos], ['Clics a registrarse', v.registro],
      ['Entraron a Cascade', v.cascade], ['Builder Hub', v.builderhub], ['Core', v.core],
    ];
    const max = Math.max(1, ...steps.map((s) => s[1] || 0));
    const el = $('#funnel');
    el.innerHTML = steps.map(([l, n], i) => {
      const prev = i > 0 ? steps[i - 1][1] : null;
      const pct = prev ? Math.round(((n || 0) / prev) * 100) : null;
      return `<div class="fn-row"><span>${l}</span><b>${fmt(n || 0)}</b><div class="fn-bar"><i data-w="${((n || 0) / max) * 100}"></i></div>${i > 1 && prev && pct <= 100 ? `<em>${pct}% del paso anterior</em>` : ''}</div>`;
    }).join('');
    requestAnimationFrame(() => el.querySelectorAll('[data-w]').forEach((i) => (i.style.width = Math.max(1.5, +i.dataset.w) + '%')));
  }

  function chart(dias) {
    const el = $('#chart');
    const keys = Object.keys(dias).sort();
    if (!keys.length) { el.innerHTML = '<div class="empty-c">Aquí vas a ver las visitas por día en cuanto compartas tu liga.</div>'; return; }
    // Rellena días sin datos entre el primero y el último (máximo 45).
    const all = [];
    for (let t = Date.parse(keys[0]); t <= Date.parse(keys.at(-1)) && all.length < 45; t += 86400e3) all.push(new Date(t).toISOString().slice(0, 10));
    const W = 600, H = 200, pad = 22;
    const max = Math.max(1, ...all.map((k) => dias[k]?.visita || 0));
    const bw = Math.min(64, (W - pad) / all.length);
    const bars = all.map((k, i) => {
      const v = dias[k]?.visita || 0, r = dias[k]?.registro || 0;
      const x = pad + i * bw;
      const hv = ((H - 30) * v) / max, hr = ((H - 30) * r) / max;
      const w = Math.max(3, bw * 0.36);
      return `<g><title>${k}: ${v} visitas, ${r} clics a registro</title><rect class="bar" x="${x + bw * 0.1}" y="${H - 18 - hv}" width="${w}" height="${hv}" rx="3" fill="var(--accent)" style="animation-delay:${i * 25}ms"/><rect class="bar" x="${x + bw * 0.1 + w + 2}" y="${H - 18 - hr}" width="${w}" height="${hr}" rx="3" fill="var(--accent-2)" style="animation-delay:${i * 25 + 80}ms"/>${all.length <= 14 || i % Math.ceil(all.length / 8) === 0 ? `<text x="${x + bw * 0.1}" y="${H - 4}">${k.slice(8)}/${k.slice(5, 7)}</text>` : ''}</g>`;
    }).join('');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Visitas y clics a registro por día"><text x="0" y="12">${max}</text><line x1="${pad}" x2="${W}" y1="${H - 18}" y2="${H - 18}" stroke="rgba(255,255,255,.1)"/>${bars}</svg>`;
  }

  function sources(f) {
    const rows = Object.entries(f).map(([s, v]) => ({ s, ...v })).sort((a, b) => (b.visita || 0) - (a.visita || 0));
    const el = $('#sources');
    if (!rows.length) { el.innerHTML = '<p class="small">Todavía no llega nadie. Copia una liga de abajo y compártela.</p>'; return; }
    const max = Math.max(1, ...rows.map((r) => r.visita || 0));
    el.innerHTML = rows.map((r) => `<div class="src-row"><span class="src-n">${esc(nombre(r.s))}</span><div class="src-bar"><i data-w="${((r.visita || 0) / max) * 100}"></i><b>${fmt(r.visita || 0)} visitas</b></div>
<div class="src-meta"><span><strong>${fmt(r.unicos || 0)}</strong> únicas</span><span><strong>${fmt(r.registro || 0)}</strong> registro</span><span><strong>${fmt((r.cascade || 0) + (r.builderhub || 0) + (r.core || 0))}</strong> pasos Avalanche</span></div></div>`).join('');
    requestAnimationFrame(() => el.querySelectorAll('[data-w]').forEach((i) => (i.style.width = Math.max(2, +i.dataset.w) + '%')));
  }

  function recap(d, v) {
    const fq = d.fuentes?.qr || {};
    const top = Object.entries(d.fuentes || {}).sort((a, b) => (b[1].visita || 0) - (a[1].visita || 0)).slice(0, 4).map(([s, x]) => `${nombre(s)} (${x.visita || 0})`).join(', ');
    const fecha = new Date(d.meetup.inicio).toLocaleDateString('es-MX', { timeZone: d.meetup.tz, day: 'numeric', month: 'long', year: 'numeric' });
    $('[data-recap]').value = [
      `Meetup: ${d.meetup.titulo} (${fecha})`,
      `Landing: ${meta.base}/${meta.slug}`,
      `Visitas a la landing: ${v.visita || 0} (${v.unicos || 0} personas únicas)`,
      `Clics a registrarse: ${v.registro || 0}`,
      v.luma != null ? `Registrados en Luma: ${v.luma}` : null,
      `Entraron a Cascade: ${v.cascade || 0} (desde el QR del lugar: ${fq.cascade || 0})`,
      `Clics a crear cuenta en Builder Hub: ${v.builderhub || 0}`,
      `Clics a instalar Core: ${v.core || 0}`,
      top ? `Canales con más visitas: ${top}` : null,
      `Datos de Meetup Kit al ${new Date(d.now).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}. Son clics; el registro final se confirma en cada plataforma.`,
    ].filter(Boolean).join('\n');
  }
  $('[data-copy-recap]').onclick = () => MK.copy($('[data-recap]').value);

  // ---------- ligas por canal ----------
  const link = $('[data-link]');
  const canvas = $('[data-qr]');
  let canal = 'whatsapp';
  const urlFor = (s) => `${meta.base}/${meta.slug}?s=${encodeURIComponent(s)}`;
  function drawQr(target, text, size) {
    if (!window.qrcode) return;
    const q = window.qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount(), quiet = 2, cell = Math.floor(size / (n + quiet * 2));
    const off = Math.floor((size - cell * n) / 2);
    target.width = target.height = size;
    const ctx = target.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0b0a10';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(off + c * cell, off + r * cell, cell, cell);
  }
  function setCanal(s) {
    canal = s;
    const u = urlFor(s);
    link.value = u;
    $('[data-wa]').href = `https://wa.me/?text=${encodeURIComponent(`${meta.titulo} ${u}`)}`;
    $('[data-tg]').href = `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(meta.titulo)}`;
    drawQr(canvas, u, 440);
  }
  document.querySelectorAll('.chan[data-s]').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.chan').forEach((x) => x.classList.toggle('is-on', x === b));
      $('[data-own]').value = '';
      setCanal(b.dataset.s);
    }),
  );
  $('[data-own]').addEventListener('input', (e) => {
    const s = e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 24);
    if (!s) return;
    document.querySelectorAll('.chan[data-s]').forEach((x) => x.classList.remove('is-on'));
    setCanal(s);
  });
  $('[data-copy-link]').onclick = () => MK.copy(link.value);
  $('[data-qr-dl]').onclick = () => {
    const c = document.createElement('canvas');
    drawQr(c, link.value, 1200);
    const a = Object.assign(document.createElement('a'), { href: c.toDataURL('image/png'), download: `qr-${meta.slug}-${canal}.png` });
    a.click();
  };
  const waitQr = () => (window.qrcode ? setCanal(canal) : setTimeout(waitQr, 120));
  waitQr();
})();
