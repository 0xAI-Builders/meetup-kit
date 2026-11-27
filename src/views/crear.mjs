import { esc } from '../util.mjs';
import { shell, logo, TEMAS } from './layout.mjs';

const ZONAS = [
  ['America/Mexico_City', 'México (centro)'], ['America/Cancun', 'México (Cancún)'], ['America/Tijuana', 'México (Tijuana)'], ['America/Hermosillo', 'México (Sonora)'],
  ['America/Guatemala', 'Guatemala'], ['America/El_Salvador', 'El Salvador'], ['America/Tegucigalpa', 'Honduras'], ['America/Managua', 'Nicaragua'], ['America/Costa_Rica', 'Costa Rica'],
  ['America/Panama', 'Panamá'], ['America/Santo_Domingo', 'República Dominicana'], ['America/Bogota', 'Colombia'], ['America/Caracas', 'Venezuela'], ['America/Guayaquil', 'Ecuador'],
  ['America/Lima', 'Perú'], ['America/La_Paz', 'Bolivia'], ['America/Santiago', 'Chile'], ['America/Argentina/Buenos_Aires', 'Argentina'], ['America/Asuncion', 'Paraguay'],
  ['America/Montevideo', 'Uruguay'], ['America/Sao_Paulo', 'Brasil (São Paulo)'], ['America/New_York', 'EE. UU. (este)'], ['America/Los_Angeles', 'EE. UU. (pacífico)'], ['Europe/Madrid', 'España'],
];

const field = (name, label, { type = 'text', ph = '', req = false, max = 120, help = '', attrs = '' } = {}) =>
  `<label class="field"><span class="field-l">${label}${req ? ' <i>*</i>' : ''}</span>
<input name="${name}" type="${type}" placeholder="${esc(ph)}" ${req ? 'required' : ''} ${type === 'text' || type === 'url' ? `maxlength="${max}"` : ''} ${attrs} autocomplete="off">
${help ? `<span class="field-h">${help}</span>` : ''}</label>`;

export function crearPage({ createCode, defaultTz }) {
  const body = `
<header class="cnav wrap">${logo()}<div class="progress" aria-hidden="true"><i></i></div><button class="btn btn-ghost btn-sm show-m" type="button" data-preview-open>Ver cómo queda</button></header>
<main class="crear wrap">
<form class="wizard" id="wizard" novalidate>
<div class="wz-head"><p class="kicker" data-modo-label>Nueva landing</p><h1 class="h2" data-step-title>Lo básico</h1><p class="small" data-step-sub>Cómo se llama y cuándo es.</p></div>

<fieldset class="wz-step is-on" data-step="1" data-title="Lo básico" data-sub="Cómo se llama y cuándo es.">
${field('titulo', 'Título del meetup', { req: true, max: 90, ph: 'Tech & Chill: Agentes de IA sobre Avalanche' })}
${field('bajada', 'Una frase que lo venda', { max: 160, ph: 'Casos reales de IA para negocios y cómo los agentes ya pagan solos.' })}
<div class="row2">${field('fecha', 'Fecha', { type: 'date', req: true })}${field('hora', 'Hora de inicio', { type: 'time', req: true, attrs: 'value="17:00"' })}</div>
<div class="row2">
<label class="field"><span class="field-l">Duración</span><select name="duracion">${[[60, '1 hora'], [90, '1 h 30 min'], [120, '2 horas'], [180, '3 horas'], [240, '4 horas'], [300, '5 horas'], [480, '8 horas'], [720, 'Todo el día']].map(([v, l]) => `<option value="${v}"${v === 180 ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
<label class="field"><span class="field-l">Zona horaria</span><select name="tz">${ZONAS.map(([v, l]) => `<option value="${v}"${v === defaultTz ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
</div>
</fieldset>

<fieldset class="wz-step" data-step="2" data-title="El lugar" data-sub="Dónde se van a ver.">
${field('lugar', 'Nombre del lugar', { max: 90, ph: 'Friki! By FRKLicious, jardín' })}
${field('direccion', 'Dirección', { max: 160, ph: 'Calle 10 Norte 603, San Andrés Cholula' })}
<div class="row2">${field('ciudad', 'Ciudad', { max: 60, ph: 'Puebla' })}${field('mapa_url', 'Liga de Google Maps', { type: 'url', max: 400, ph: 'https://maps.app.goo.gl/…', help: 'Opcional. Si no la pones, armamos una con la dirección.' })}</div>
</fieldset>

<fieldset class="wz-step" data-step="3" data-title="Registro" data-sub="A dónde se registra la gente y quién organiza.">
${field('registro_url', 'Liga de registro (Luma u otra)', { type: 'url', req: true, max: 400, ph: 'https://luma.com/tu-evento', help: 'El botón «Apartar mi lugar» lleva aquí, con la etiqueta de cada canal para que Luma también la vea.' })}
<div class="row2">${field('organiza', 'Quién organiza', { max: 80, ph: '0xAI Builders' })}${field('comunidad', 'Comunidad', { max: 60, ph: 'Team1 LatAm', attrs: 'value="Team1 LatAm"' })}</div>
${field('contacto', 'Tu correo o Telegram (privado)', { max: 120, ph: '@tuusuario', help: 'No se publica. Solo por si hay que avisarte algo.' })}
</fieldset>

<fieldset class="wz-step" data-step="4" data-title="La historia" data-sub="Qué van a vivir y en qué orden.">
<label class="field"><span class="field-l">De qué se trata</span><textarea name="descripcion" rows="6" maxlength="4000" placeholder="Una tarde para platicar de IA aplicada a negocios con emprendedores, devs y curiosos. Charlas cortas y networking en el jardín."></textarea><span class="field-h">Las ligas que pegues se vuelven clicables.</span></label>
<div class="agenda-ed"><div class="agenda-ed-h"><span class="field-l">Agenda</span><button class="btn btn-ghost btn-sm" type="button" data-add-row>+ Agregar</button></div><ol class="agenda-rows" id="agenda-rows"></ol></div>
</fieldset>

<fieldset class="wz-step" data-step="5" data-title="El look" data-sub="Portada, colores y listo.">
<div class="drop" id="drop" tabindex="0" role="button" aria-label="Subir portada">
<input type="file" accept="image/jpeg,image/png,image/webp" id="file" hidden>
<div class="drop-empty"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><b>Sube tu portada</b><span>Arrástrala aquí o toca para elegir. Horizontal se ve mejor.</span></div>
<img class="drop-img" alt="" hidden><button class="drop-x" type="button" hidden aria-label="Quitar portada">×</button>
</div>
<span class="field-l" style="margin-top:20px;display:block">Colores</span>
<div class="temas" role="radiogroup">${Object.entries(TEMAS).map(([k, t], i) => `<label class="tema" style="--a:${t.a};--b:${t.b}"><input type="radio" name="tema" value="${k}"${i === 0 ? ' checked' : ''}><span></span><em>${t.nombre}</em></label>`).join('')}</div>
<label class="toggle"><input type="checkbox" name="publico" checked><span></span><b>Mostrarlo en la lista de próximos meetups</b></label>
${createCode ? field('codigo', 'Código de acceso', { req: true, max: 60, help: 'Te lo da quien coordina tu comunidad. Evita el spam.' }) : ''}
</fieldset>

<p class="form-err" role="alert" hidden></p>
<div class="wz-nav"><button class="btn btn-ghost" type="button" data-prev hidden>Atrás</button><button class="btn btn-primary btn-lg" type="button" data-next><span>Siguiente</span></button></div>
</form>

<aside class="preview" aria-label="Vista previa">
<div class="pv-bar"><span>Vista previa</span><div class="seg" role="tablist"><button type="button" class="is-on" data-modo="antes">Antes</button><button type="button" data-modo="vivo">En vivo</button><button type="button" data-modo="despues">Después</button></div><button class="btn btn-icon show-m" type="button" data-preview-close aria-label="Cerrar vista previa">×</button></div>
<div class="device"><div class="device-notch"></div><iframe id="pv" title="Vista previa de la landing" loading="eager"></iframe></div>
</aside>

<section class="done" hidden>
<div class="confetti" aria-hidden="true"></div>
<p class="kicker">Listo</p><h1 class="display">Tu landing<br><span class="grad">ya está viva.</span></h1>
<div class="done-links">
<div class="copyrow"><span>Liga pública</span><input readonly data-out="url"><button class="btn btn-ghost btn-sm" type="button" data-copy="url">Copiar</button></div>
<div class="copyrow secret"><span>Tu panel privado</span><input readonly data-out="panel"><button class="btn btn-ghost btn-sm" type="button" data-copy="panel">Copiar</button></div>
<p class="warn">Guarda la liga de tu panel: con ella ves tus números y editas el meetup. No hay otra forma de recuperarla.</p>
</div>
<div class="ctas"><a class="btn btn-primary btn-lg" data-out-href="panel">Ir a mi panel</a><a class="btn btn-ghost" data-out-href="url" target="_blank" rel="noopener">Ver mi landing</a></div>
</section>
</main>`;
  return shell({ title: 'Crear mi landing · Meetup Kit', desc: 'Arma la landing de tu meetup en dos minutos.', robots: 'noindex', bodyClass: 'crear-page', body, scripts: ['crear.js'] });
}
