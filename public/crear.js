// Asistente para crear o editar la landing de un meetup.
(() => {
  const MK = window.MK;
  const form = document.getElementById('wizard');
  if (!form) return;
  const steps = [...form.querySelectorAll('.wz-step')];
  const btnNext = form.querySelector('[data-next]');
  const btnPrev = form.querySelector('[data-prev]');
  const err = form.querySelector('.form-err');
  const progress = document.querySelector('.cnav .progress');
  const iframe = document.getElementById('pv');
  const rows = document.getElementById('agenda-rows');
  const drop = document.getElementById('drop');
  const file = document.getElementById('file');
  const dropImg = drop.querySelector('.drop-img');
  const dropX = drop.querySelector('.drop-x');
  const preview = document.querySelector('.preview');
  const params = new URLSearchParams(location.search);
  const edit = { slug: params.get('editar'), key: new URLSearchParams(location.hash.slice(1)).get('k') };
  const editing = !!(edit.slug && edit.key);
  let step = 0;
  let portada = ''; // dataURL nueva, ruta /u/… existente o ''
  let modo = 'antes';

  // ---------- agenda ----------
  const addRow = (a = {}) => {
    const li = document.createElement('li');
    li.innerHTML = `<input placeholder="5:00 pm" maxlength="12" data-a="hora"><input placeholder="Charla o actividad" maxlength="120" data-a="titulo"><button type="button" aria-label="Quitar">×</button><input class="q" placeholder="Quién (opcional)" maxlength="90" data-a="quien">`;
    li.querySelector('[data-a=hora]').value = a.hora || '';
    li.querySelector('[data-a=titulo]').value = a.titulo || '';
    li.querySelector('[data-a=quien]').value = a.quien || '';
    li.querySelector('button').onclick = () => { li.remove(); schedule(); };
    rows.append(li);
  };
  form.querySelector('[data-add-row]').onclick = () => { addRow(); rows.lastElementChild.querySelector('input').focus(); };
  const agenda = () => [...rows.children].map((li) => Object.fromEntries([...li.querySelectorAll('[data-a]')].map((i) => [i.dataset.a, i.value.trim()]))).filter((a) => a.titulo);

  // ---------- portada: se comprime en el navegador ----------
  const setPortada = (src) => {
    portada = src;
    dropImg.hidden = !src;
    dropX.hidden = !src;
    drop.querySelector('.drop-empty').style.visibility = src ? 'hidden' : '';
    if (src) dropImg.src = src;
    schedule();
  };
  const loadFile = async (f) => {
    if (!f || !/^image\/(jpeg|png|webp)$/.test(f.type)) return showErr('La portada debe ser JPG, PNG o WebP.');
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const max = 1800;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let q = 0.86;
      let out = c.toDataURL('image/jpeg', q);
      while (out.length > 1_400_000 && q > 0.5) out = c.toDataURL('image/jpeg', (q -= 0.08));
      URL.revokeObjectURL(url);
      setPortada(out);
    };
    img.onerror = () => showErr('No pude leer esa imagen.');
    img.src = url;
  };
  drop.onclick = (e) => { if (e.target !== dropX) file.click(); };
  drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
  file.onchange = () => loadFile(file.files[0]);
  dropX.onclick = (e) => { e.stopPropagation(); file.value = ''; setPortada(''); };
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => loadFile(e.dataTransfer.files[0]));

  // ---------- datos ----------
  const val = (n) => form.elements[n]?.value?.trim() ?? '';
  const data = () => ({
    titulo: val('titulo'), bajada: val('bajada'), fecha: val('fecha'), hora: val('hora'), duracion: val('duracion'), tz: val('tz'),
    lugar: val('lugar'), direccion: val('direccion'), ciudad: val('ciudad'), mapa_url: val('mapa_url'),
    registro_url: val('registro_url'), organiza: val('organiza'), comunidad: val('comunidad'), contacto: val('contacto'),
    descripcion: form.elements.descripcion.value, agenda: agenda(), tema: form.querySelector('[name=tema]:checked')?.value || 'avalanche',
    publico: form.elements.publico.checked, codigo: val('codigo'), portada,
  });

  // ---------- vista previa ----------
  let timer, seq = 0;
  const PV = 'data:image/jpeg;base64,__PV__';
  const schedule = () => { clearTimeout(timer); timer = setTimeout(render, 320); };
  async function render() {
    if (!iframe) return;
    const d = data();
    const big = d.portada.startsWith('data:');
    const my = ++seq;
    try {
      const r = await fetch('/api/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...d, portada: big ? PV : d.portada, modo }) });
      if (my !== seq || !r.ok) return;
      let html = await r.text();
      if (big) html = html.split(PV).join(d.portada);
      const y = iframe.contentWindow?.scrollY || 0;
      iframe.srcdoc = html;
      iframe.onload = () => { try { iframe.contentWindow.scrollTo(0, y); } catch {} };
    } catch {}
  }
  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);
  document.querySelectorAll('.seg [data-modo]').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.seg [data-modo]').forEach((x) => x.classList.toggle('is-on', x === b));
      modo = b.dataset.modo;
      render();
    }),
  );
  document.querySelector('[data-preview-open]')?.addEventListener('click', () => { preview.classList.add('open'); document.body.style.overflow = 'hidden'; render(); });
  document.querySelector('[data-preview-close]')?.addEventListener('click', () => { preview.classList.remove('open'); document.body.style.overflow = ''; });

  // ---------- pasos ----------
  const head = { kicker: document.querySelector('[data-modo-label]'), title: document.querySelector('[data-step-title]'), sub: document.querySelector('[data-step-sub]') };
  function show(i, back = false) {
    steps.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.classList.toggle('back', back); });
    step = i;
    head.title.textContent = steps[i].dataset.title;
    head.sub.textContent = steps[i].dataset.sub;
    btnPrev.hidden = i === 0;
    btnNext.querySelector('span').textContent = i === steps.length - 1 ? (editing ? 'Guardar cambios' : 'Publicar mi landing') : 'Siguiente';
    progress?.style.setProperty('--p', `${((i + 1) / steps.length) * 100}%`);
    hideErr();
    if (innerWidth < 1000) scrollTo({ top: 0, behavior: MK.reduce ? 'auto' : 'smooth' });
  }
  function showErr(m) { err.textContent = m; err.hidden = false; }
  function hideErr() { err.hidden = true; }
  function check(i) {
    const bad = [...steps[i].querySelectorAll('[required]')].filter((el) => !el.value.trim() || (el.type === 'url' && !/^https?:\/\/\S+\.\S+/.test(el.value.trim())));
    steps[i].querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    if (bad.length) {
      bad.forEach((el) => el.setAttribute('aria-invalid', 'true'));
      bad[0].focus();
      showErr(bad[0].type === 'url' ? 'Esa liga debe empezar con https://' : 'Completa los campos marcados.');
      return false;
    }
    const mu = form.elements.mapa_url;
    if (i === 1 && mu.value.trim() && !/^https?:\/\//.test(mu.value.trim())) { mu.setAttribute('aria-invalid', 'true'); showErr('La liga del mapa debe empezar con https://'); return false; }
    return true;
  }
  btnPrev.onclick = () => show(Math.max(0, step - 1), true);
  btnNext.onclick = () => {
    if (!check(step)) return;
    if (step < steps.length - 1) return show(step + 1);
    submit();
  };
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !e.target.closest('.agenda-rows')) { e.preventDefault(); btnNext.click(); }
  });

  async function submit() {
    btnNext.classList.add('is-busy');
    hideErr();
    try {
      const r = await fetch(editing ? `/api/meetups/${edit.slug}` : '/api/meetups', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json', ...(editing ? { 'x-key': edit.key } : {}) },
        body: JSON.stringify(data()),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return showErr(j.error || 'No se pudo guardar. Intenta otra vez.');
      if (editing) {
        MK.toast('Cambios guardados');
        setTimeout(() => (location.href = `/${edit.slug}/panel#k=${edit.key}`), 700);
        return;
      }
      try {
        const mine = JSON.parse(localStorage.getItem('mk-mios') || '[]');
        mine.unshift({ slug: j.slug, titulo: data().titulo, panel: j.panel });
        localStorage.setItem('mk-mios', JSON.stringify(mine.slice(0, 30)));
      } catch {}
      done(j);
    } catch {
      showErr('Sin conexión. Revisa tu internet e intenta otra vez.');
    } finally {
      btnNext.classList.remove('is-busy');
    }
  }

  function done(j) {
    form.hidden = true;
    preview.hidden = true;
    document.querySelector('.cnav .progress').style.setProperty('--p', '100%');
    const d = document.querySelector('.done');
    d.hidden = false;
    d.querySelector('[data-out=url]').value = j.url;
    d.querySelector('[data-out=panel]').value = j.panel;
    d.querySelector('[data-out-href=url]').href = j.url;
    d.querySelector('[data-out-href=panel]').href = j.panel;
    d.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => MK.copy(d.querySelector(`[data-out=${b.dataset.copy}]`).value)));
    scrollTo({ top: 0 });
    if (!MK.reduce) {
      const c = d.querySelector('.confetti');
      const colors = [getComputedStyle(document.body).getPropertyValue('--accent'), getComputedStyle(document.body).getPropertyValue('--accent-2'), '#ffffff', '#ffd166'];
      for (let i = 0; i < 90; i++) {
        const p = document.createElement('i');
        p.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % 4]};animation-duration:${2.2 + Math.random() * 2.4}s;animation-delay:${Math.random() * 0.6}s;transform:rotate(${Math.random() * 360}deg)`;
        c.append(p);
      }
      setTimeout(() => (c.innerHTML = ''), 6000);
    }
  }

  // ---------- edición ----------
  const localParts = (ms, tz) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ms).map((x) => [x.type, x.value]));
    return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
  };
  async function loadEdit() {
    head.kicker.textContent = 'Editar landing';
    try {
      const r = await fetch(`/api/meetups/${edit.slug}`, { headers: { 'x-key': edit.key } });
      if (!r.ok) throw new Error();
      const m = await r.json();
      const lp = localParts(m.inicio, m.tz);
      const set = (n, v) => { if (form.elements[n] != null) form.elements[n].value = v ?? ''; };
      ['titulo', 'bajada', 'lugar', 'direccion', 'ciudad', 'mapa_url', 'registro_url', 'organiza', 'comunidad', 'contacto', 'descripcion', 'tz'].forEach((n) => set(n, m[n]));
      set('fecha', lp.fecha);
      set('hora', lp.hora);
      const dur = Math.round((m.fin - m.inicio) / 60000);
      const sel = form.elements.duracion;
      if (![...sel.options].some((o) => +o.value === dur)) sel.add(new Option(`${Math.floor(dur / 60)} h ${dur % 60} min`, dur));
      sel.value = dur;
      const t = form.querySelector(`[name=tema][value="${m.tema}"]`);
      if (t) t.checked = true;
      form.elements.publico.checked = !!m.publico;
      if (form.elements.codigo) form.elements.codigo.closest('.field').remove();
      rows.innerHTML = '';
      (m.agenda || []).forEach(addRow);
      if (!m.agenda?.length) addRow();
      if (m.portada) setPortada(m.portada);
      show(0);
      render();
    } catch {
      showErr('La liga de edición no es válida. Ábrela desde tu panel.');
    }
  }

  // ---------- inicio ----------
  if (editing) loadEdit();
  else {
    const f = form.elements.fecha;
    const d = new Date(Date.now() + 14 * 86400e3);
    f.value = d.toISOString().slice(0, 10);
    f.min = new Date().toISOString().slice(0, 10);
    addRow({ hora: '5:00 pm', titulo: 'Bienvenida' });
    addRow({ hora: '5:30 pm', titulo: 'Charla principal', quien: '' });
    addRow({ hora: '7:00 pm', titulo: 'Networking' });
    show(0);
    render();
  }
})();
