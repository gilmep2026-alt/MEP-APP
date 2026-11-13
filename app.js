/* ============================================================================
   MEP · Movimiento Electoral del Pueblo — app.js
   PWA vanilla JS + PocketBase
   ----------------------------------------------------------------------------
   Cambios de esta versión (respecto al script inline original):
   · Sin handlers inline: toda la interacción usa addEventListener.
   · Escape y validación de URLs en todo HTML dinámico (XSS).
   · Identidad del chat firmada en el servidor; el cliente solo envía user_id.
   · Realtime: se suscribe tras login, se desuscribe al salir, append incremental.
   · Router con History API (botón atrás de Android ya no cierra la app).
   · Carrusel real: autoplay, flechas, puntos, progreso, iframe solo del slide activo.
   · Galería sin duplicar DOM; videos con póster y click-to-play (menos RAM).
   · Formularios admin de En Vivo / Reglamentos / Sub-Apps implementados.
   · Edición de elementos (cargarParaEditar) y monitoreo de chat admin.
   · Service worker registrado + aviso de actualización + instalación PWA.
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------ base */
const $ = (id) => document.getElementById(id);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function safeUrl(u) {
  if (typeof u !== 'string' || !u.trim()) return null;
  try {
    const x = new URL(u, location.origin);
    if (!['http:', 'https:'].includes(x.protocol)) return null;
    return x.toString();
  } catch { return null; }
}

const PB_URL = 'https://pocketbase-railway-production-6031.up.railway.app';
const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">' +
  '<rect width="400" height="250" fill="#1a0b30"/>' +
  '<text x="50%" y="50%" fill="#ffd700" font-size="16" text-anchor="middle" font-family="sans-serif">Imagen no disponible</text></svg>'
);

/* ------------------------------------------- división político-territorial */
/* 24 entidades federales (23 estados + Distrito Capital) + Guayana Esequiba.
   Fuente: Anexo:Municipios de Venezuela (Wikipedia, 335 municipios). */
const VENEZUELA_DATA = {
  'Amazonas': ['Alto Orinoco', 'Atabapo', 'Atures', 'Autana', 'Manapiare', 'Maroa', 'Río Negro'],
  'Anzoátegui': ['Anaco', 'Aragua', 'Bolívar', 'Bruzual', 'Cajigal', 'Carvajal', 'Freites', 'Guanipa', 'Guanta', 'Independencia', 'Libertad', 'McGregor', 'Miranda', 'Monagas', 'Peñalver', 'Píritu', 'San Juan de Capistrano', 'Santa Ana', 'Simón Rodríguez', 'Sotillo', 'Diego Bautista Urbaneja'],
  'Apure': ['Achaguas', 'Biruaca', 'Pedro Camejo', 'Muñoz', 'Páez', 'Rómulo Gallegos', 'San Fernando'],
  'Aragua': ['Alcántara', 'Bolívar', 'Camatagua', 'Girardot', 'Iragorry', 'Lamas', 'Libertador', 'Mariño', 'Michelena', 'Ocumare de la Costa de Oro', 'Revenga', 'Ribas', 'San Casimiro', 'San Sebastián', 'Sucre', 'Tovar', 'Urdaneta', 'Zamora'],
  'Barinas': ['Alberto Arvelo Torrealba', 'Andrés Eloy Blanco', 'Antonio José de Sucre', 'Arismendi', 'Barinas', 'Bolívar', 'Cruz Paredes', 'Ezequiel Zamora', 'Obispos', 'Pedraza', 'Rojas', 'Sosa'],
  'Bolívar': ['Angostura', 'Angostura del Orinoco', 'Caroní', 'Cedeño', 'Chien', 'El Callao', 'Gran Sabana', 'Piar', 'Roscio', 'Sifontes', 'Sucre'],
  'Carabobo': ['Bejuma', 'Carlos Arvelo', 'Diego Ibarra', 'Guacara', 'Juan José Mora', 'Libertador', 'Los Guayos', 'Miranda', 'Montalbán', 'Naguanagua', 'Puerto Cabello', 'San Diego', 'San Joaquín', 'Valencia'],
  'Cojedes': ['Anzoátegui', 'San Carlos', 'Girardot', 'Lima Blanco', 'Pao de San Juan Bautista', 'Ricaurte', 'Rómulo Gallegos', 'Tinaco', 'Tinaquillo'],
  'Delta Amacuro': ['Antonio Díaz', 'Casacoima', 'Pedernales', 'Tucupita'],
  'Distrito Capital': ['Libertador'],
  'Falcón': ['Acosta', 'Bolívar', 'Buchivacoa', 'Carirubana', 'Colina', 'Dabajuro', 'Democracia', 'Falcón', 'Federación', 'Iturriza', 'Jacura', 'Los Taques', 'Manaure', 'Mauroa', 'Miranda', 'Palmasola', 'Petit', 'Píritu', 'San Francisco', 'Sucre', 'Silva', 'Tocópero', 'Unión', 'Urumaco', 'Zamora'],
  'Guárico': ['Camaguán', 'Chaguaramas', 'El Socorro', 'Francisco de Miranda', 'José Félix Ribas', 'José Tadeo Monagas', 'Juan Germán Roscio', 'Juan José Rondón', 'Julián Mellado', 'Leonardo Infante', 'Ortiz', 'San Gerónimo de Guayabal', 'San José de Guaribe', 'Santa María de Ipire', 'Zaraza'],
  'Guayana Esequiba': ['Guayana Esequiba'],
  'Lara': ['Andrés Eloy Blanco', 'Crespo', 'Iribarren', 'Jiménez', 'Morán', 'Palavecino', 'Simón Planas', 'Torres', 'Urdaneta'],
  'La Guaira': ['Vargas'],
  'Mérida': ['Alberto Adriani', 'Andrés Bello', 'Antonio Pinto Salinas', 'Aricagua', 'Arzobispo Chacón', 'Campo Elías', 'Caracciolo Parra Olmedo', 'Cardenal Quintero', 'Guaraque', 'Julio César Salas', 'Justo Briceño', 'Libertador', 'Miranda', 'Obispo Ramos de Lora', 'Padre Noguera', 'Pueblo Llano', 'Rangel', 'Rivas Dávila', 'Santos Marquina', 'Sucre', 'Tovar', 'Tulio Febres Cordero', 'Zea'],
  'Miranda': ['Acevedo', 'Andrés Bello', 'Baruta', 'Bolívar', 'Brión', 'Buroz', 'Carrizal', 'Chacao', 'Cristóbal Rojas', 'El Hatillo', 'Guaicaipuro', 'Gual', 'Independencia', 'Lander', 'Los Salias', 'Páez', 'Paz Castillo', 'Plaza', 'Sucre', 'Urdaneta', 'Zamora'],
  'Monagas': ['Acosta', 'Aguasay', 'Bolívar', 'Caripe', 'Cedeño', 'Libertador', 'Maturín', 'Piar', 'Punceres', 'Santa Bárbara', 'Sotillo', 'Uracoa', 'Zamora'],
  'Nueva Esparta': ['Antolín del Campo', 'Antonio Díaz', 'Arismendi', 'García', 'Gómez', 'Macanao', 'Maneiro', 'Marcano', 'Mariño', 'Tubores', 'Villalba'],
  'Portuguesa': ['Agua Blanca', 'Araure', 'Esteller', 'Guanare', 'Guanarito', 'José Vicente de Unda', 'Ospino', 'Páez', 'Papelón', 'San Genaro de Boconoíto', 'San Rafael de Onoto', 'Santa Rosalía', 'Sucre', 'Turén'],
  'Sucre': ['Andrés Eloy Blanco', 'Andrés Mata', 'Arismendi', 'Benítez', 'Bermúdez', 'Bolívar', 'Cajigal', 'Cruz Salmerón Acosta', 'Libertador', 'Mariño', 'Mejía', 'Montes', 'Ribero', 'Sucre', 'Valdez'],
  'Táchira': ['Andrés Bello', 'Antonio Rómulo Costa', 'Ayacucho', 'Bolívar', 'Cárdenas', 'Córdoba', 'Fernández Feo', 'Francisco de Miranda', 'García de Hevia', 'Guásimos', 'Independencia', 'Jáuregui', 'José María Vargas', 'Junín', 'Libertad', 'Libertador', 'Lobatera', 'Michelena', 'Panamericano', 'Pedro María Ureña', 'Rafael Urdaneta', 'Samuel Darío Maldonado', 'San Cristóbal', 'San Judas Tadeo', 'Seboruco', 'Simón Rodríguez', 'Sucre', 'Torbes', 'Uribante'],
  'Trujillo': ['Andrés Bello', 'Boconó', 'Bolívar', 'Candelaria', 'Carache', 'Carvajal', 'Escuque', 'Juan Vicente Campo Elías', 'La Ceiba', 'Márquez Cañizales', 'Miranda', 'Monte Carmelo', 'Motatán', 'Pampán', 'Pampanito', 'Rangel', 'Sucre', 'Trujillo', 'Urdaneta', 'Valera'],
  'Yaracuy': ['Arístides Bastidas', 'Bolívar', 'Bruzual', 'Cocorote', 'Independencia', 'José Antonio Páez', 'La Trinidad', 'Manuel Monge', 'Nirgua', 'Peña', 'San Felipe', 'Sucre', 'Urachiche', 'Veroes'],
  'Zulia': ['Almirante Padilla', 'Baralt', 'Cabimas', 'Catatumbo', 'Colón', 'Francisco Javier Pulgar', 'Guajira', 'Jesús Enrique Lossada', 'Jesús María Semprún', 'La Cañada de Urdaneta', 'Lagunillas', 'Machiques de Perijá', 'Mara', 'Maracaibo', 'Miranda', 'Rosario de Perijá', 'San Francisco', 'Santa Rita', 'Simón Bolívar', 'Sucre', 'Valmore Rodríguez']
};

/* ----------------------------------------------------------------- estado */
const DB = { galeria: [], agenda: [], reglamentos: [], envivo: [], subapps: [] };
const VIEWS = ['galeria', 'inicio', 'subapp', 'agenda', 'reglamentos', 'envivo', 'chat', 'intranet', 'admin'];
const editando = { galeria: null, envivo: null, agenda: null, reglamentos: null, subapps: null };

let currentUser = null;
let isAdmin = false;
let currentView = null;
let subappActual = null;
let cargado = false;

let rtMensajes = null;
let rtIntranet = null;
let rtNotif = null;
let instalarEvento = null;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fechaFmt = new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/* -------------------------------------------------------------- utilidades */
function authRecord() {
  return pb.authStore.record || pb.authStore.model || null;
}

function fmtFecha(iso) {
  if (!iso) return '';
  const soloFecha = String(iso).split(' ')[0];
  const p = soloFecha.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function mesCorto(iso) {
  const soloFecha = String(iso || '').split(' ')[0];
  const m = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const i = parseInt(soloFecha.split('-')[1], 10);
  return m[i - 1] || '';
}

function ytEmbed(u) {
  if (!u) return null;
  const m = String(u).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#]|$)/);
  return m ? 'https://www.youtube.com/embed/' + m[1] : null;
}

function ytId(u) {
  const e = ytEmbed(u);
  return e ? e.split('/embed/')[1] : null;
}

function fmtCreado(iso) {
  const d = new Date(String(iso || '').replace(' ', 'T'));
  return isNaN(d.getTime()) ? '' : fechaFmt.format(d);
}

function hace2h() {
  return new Date(Date.now() - 2 * 60 * 60 * 1000);
}

function fechaDe(a) {
  if (!a || !a.fecha) return null;
  const d = new Date(`${String(a.fecha).split(' ')[0]}T${a.hora || '00:00'}:00`);
  return isNaN(d) ? null : d;
}

function vigentes(lista) {
  const limite = hace2h();
  return lista.filter((a) => {
    const d = fechaDe(a);
    return d && d >= limite;
  });
}

function mensajeError(e, fallback) {
  if (e && e.status === 0) return 'Sin conexión. Revisa tu red e inténtalo de nuevo.';
  if (e && e.status === 429) return 'Demasiados intentos. Espera un momento.';
  const m = (e && e.response && e.response.message) || '';
  if (m && !/^(failed|the )/i.test(m)) return m;
  return fallback;
}

function toast(msg, tipo) {
  const t = $('toast');
  if (!t) return;
  const error = tipo === 'err' || String(msg).includes('❌') || String(msg).startsWith('⚠');
  t.innerHTML =
    `<svg class="ico" aria-hidden="true"><use href="#i-${error ? 'warn' : 'check'}"/></svg><span>${esc(msg)}</span>`;
  t.classList.toggle('err', error);
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 3200);
}

function setFallbacks(root) {
  if (!root) return;
  root.querySelectorAll('img').forEach((img) => {
    if (img.dataset.fb) return;
    img.dataset.fb = '1';
    img.addEventListener('error', () => { img.src = PLACEHOLDER; }, { once: true });
  });
}

function imgDe(rec, file) {
  try { return pb.files.getUrl(rec, file); } catch { return ''; }
}

/* ------------------------------------------------------------- modales */
function abrirModal(id) {
  const m = $(id);
  if (!m) return;
  m.classList.add('show');
  m.style.display = 'flex';
  m.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function cerrarModal(id) {
  const m = $(id);
  if (!m) return;
  m.classList.remove('show');
  m.style.display = '';
  m.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal-overlay.show')) document.body.classList.remove('modal-open');
}

function cerrarTodosLosModales() {
  document.querySelectorAll('.modal-overlay.show').forEach((m) => {
    m.classList.remove('show');
    m.style.display = '';
  });
  document.body.classList.remove('modal-open');
}

/* --------------------------------------------------------------- datos */
async function cargarDatos() {
  try {
    const [galeria, agenda, reglamentos, envivo, subapps] = await Promise.all([
      pb.collection('galeria').getFullList({ sort: '-fecha,-created' }),
      pb.collection('agenda').getFullList({ sort: 'fecha,hora' }),
      pb.collection('reglamentos').getFullList({ sort: 'titulo' }),
      pb.collection('envivo').getFullList({ sort: '-created' }),
      pb.collection('subapps').getFullList({ sort: 'nombre' })
    ]);

    DB.galeria = galeria.map((r) => ({
      ...r,
      url: r.archivo ? imgDe(r, r.archivo) : (safeUrl(r.url) || '')
    }));

    DB.agenda = agenda.map((r) => ({ ...r }));

    DB.reglamentos = reglamentos.map((r) => ({
      ...r,
      url: r.archivo ? imgDe(r, r.archivo) : (r.enlace || '')
    }));

    DB.envivo = envivo.map((r) => ({ ...r }));
    DB.subapps = subapps.map((r) => ({ ...r }));
    cargado = true;
  } catch (e) {
    console.error('Error cargando datos:', e);
    cargado = false;
    toast(mensajeError(e, 'No se pudo cargar el contenido. Revisa tu conexión.'), 'err');
  }
}

/* ------------------------------------------------------------- sesión */
function aplicarSesion(rec) {
  if (!rec) return limpiarSesionUI();

  currentUser = rec;
  isAdmin = String(rec.role || '').trim().toLowerCase() === 'admin';

  $('btnLogin').style.display = 'none';
  $('btnProfile').style.display = 'flex';
  $('btnLogout').style.display = 'flex';
  $('adminNavWrap').style.display = isAdmin ? 'block' : 'none';
  $('navItemIntranet').style.display = isAdmin ? 'flex' : 'none';

  $('topbarAvatar').src = rec.foto ? imgDe(rec, rec.foto) : 'logo.png';
  $('topbarName').textContent = rec.nombre_completo ? String(rec.nombre_completo).split(' ')[0] : 'Perfil';
  $('topbarCargo').textContent = rec.cargo || 'Usuario';

  actualizarZonaChat();
  if (isAdmin) renderAdminListas();
  suscribirRealtime();
}

function limpiarSesionUI() {
  currentUser = null;
  isAdmin = false;

  $('btnLogin').style.display = 'inline-flex';
  $('btnProfile').style.display = 'none';
  $('btnLogout').style.display = 'none';
  $('adminNavWrap').style.display = 'none';
  $('navItemIntranet').style.display = 'none';
  $('topbarAvatar').src = 'logo.png';

  desuscribirIntranet();
  desuscribirRealtime();

  ['chatBox', 'adminChatBox', 'intranetChatBox'].forEach((id) => {
    const el = $(id);
    if (el) el.innerHTML = '';
  });
  $('chatForm').style.display = 'none';
  $('chatLoginPrompt').style.display = 'block';
  $('adminChatInput').value = '';
  $('intranetChatInput').value = '';

  if (currentView === 'admin' || currentView === 'intranet') go('galeria', { push: false });
  actualizarZonaChat();
}

async function refrescarSesion() {
  try {
    const r = await pb.collection('users').authRefresh();
    const rec = (r && (r.record || r.model)) || authRecord();
    if (rec) aplicarSesion(rec);
  } catch (e) {
    if (e && (e.status === 401 || e.status === 403)) {
      pb.authStore.clear();
      limpiarSesionUI();
    }
  }
}

function actualizarZonaChat() {
  if (currentView !== 'chat') return;
  const logueado = !!currentUser;
  $('chatLoginPrompt').style.display = logueado ? 'none' : 'block';
  $('chatForm').style.display = logueado ? 'flex' : 'none';
  if (logueado) renderChat();
  else $('chatBox').innerHTML = '';
}

/* --------------------------------------------------------------- router */
function vistaDeHash() {
  const v = (location.hash || '').replace('#', '').trim();
  return VIEWS.includes(v) ? v : 'galeria';
}

function go(view, opts = {}) {
  if (!VIEWS.includes(view)) view = 'galeria';

  if (view === 'admin' && !isAdmin) {
    toast('No tienes permisos de administrador', 'err');
    view = 'inicio';
  }

  if (currentView === 'subapp' && view !== 'subapp') {
    const f = $('subappFrame');
    if (f) f.src = 'about:blank';
  }
  if (view === 'subapp' && subappActual && subappActual.url) {
    const f = $('subappFrame');
    if (f && (f.src === 'about:blank' || !f.src)) f.src = subappActual.url;
  }

  currentView = view;

  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === view));

  const conVolver = view !== 'galeria' && view !== 'inicio';
  $('backBtnWrap').classList.toggle('show', conVolver);
  document.body.classList.toggle('subapp-mode', view === 'subapp');

  cerrarMenu();
  window.scrollTo({ top: 0, behavior: 'auto' });

  if (view === 'chat') actualizarZonaChat();
  if (view === 'intranet') checkIntranetAuth();
  if (view === 'admin') {
    renderAdminListas();
    renderAdminChat();
  }
  actualizarGaleriaPersistente(view);

  if (opts.push !== false && location.hash !== '#' + view) {
    history.pushState({ view }, '', '#' + view);
  }
}

function goBack() {
  if (history.length > 1) history.back();
  else go('galeria');
}

function actualizarGaleriaPersistente(view) {
  const pg = $('persistentGallery');
  if (!pg) return;
  pg.style.display = view === 'galeria' || view === 'subapp' ? 'none' : 'block';
}

/* ---------------------------------------------------------------- menú */
const sidebar = $('sidebar');
const overlay = $('overlay');

function abrirMenu() { sidebar.classList.add('open'); overlay.classList.add('show'); }
function cerrarMenu() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

function aplicarSidebarColapsada() {
  const colapsada = localStorage.getItem('mep_sidebar_collapsed') === '1';
  document.body.classList.toggle('sidebar-collapsed', colapsada);
  const btn = $('collapseToggle');
  if (btn) btn.setAttribute('aria-pressed', colapsada ? 'true' : 'false');
}

/* --------------------------------------------------------------- render */
function renderNavSubapps() {
  const cont = $('navSubapps');
  if (!cont) return;
  cont.innerHTML = DB.subapps.length
    ? DB.subapps.map((s) => `
        <div class="nav-item" data-subapp="${esc(s.id)}" role="button" tabindex="0">
          <span style="font-size:16px;line-height:1;width:18px;text-align:center;flex:none" aria-hidden="true">${esc(s.icono || '🔗')}</span>
          <span class="label">${esc(s.nombre || 'Sub-app')}</span>
        </div>`).join('')
    : '<div class="nav-item" style="opacity:.5;font-size:13px"><span class="label">Sin sub-apps</span></div>';
}

function itemAgenda(a, conFecha) {
  return `
    <div class="ag-item">
      <div class="ag-date">
        <b>${esc(String(a.fecha || '').split(' ')[0].split('-')[2] || '--')}</b>
        <small>${mesCorto(a.fecha)}</small>
      </div>
      <div class="ag-body">
        <h3>${esc(a.titulo || 'Sin título')}</h3>
        <div class="ag-meta">
          ${conFecha && a.fecha ? `<span><svg class="ico" aria-hidden="true"><use href="#i-calendar"/></svg>${esc(fmtFecha(a.fecha))}</span>` : ''}
          ${a.hora ? `<span><svg class="ico" aria-hidden="true"><use href="#i-clock"/></svg>${esc(a.hora)}</span>` : ''}
          ${a.lugar ? `<span><svg class="ico" aria-hidden="true"><use href="#i-pin"/></svg>${esc(a.lugar)}</span>` : ''}
          ${!conFecha ? `<span><svg class="ico" aria-hidden="true"><use href="#i-shield"/></svg>${esc(a.nivel || 'Nacional')}</span>` : ''}
        </div>
        ${conFecha && a.descripcion ? `<p>${esc(a.descripcion)}</p>` : ''}
      </div>
    </div>`;
}

function renderInicio() {
  $('statAgenda').textContent = DB.agenda.length;
  $('statGaleria').textContent = DB.galeria.length;
  $('statSubapps').textContent = DB.subapps.length;
  $('statRegs').textContent = DB.reglamentos.length;

  const prox = vigentes(DB.agenda).slice(0, 3);
  $('inicioAgenda').innerHTML = prox.length
    ? prox.map((a) => itemAgenda(a, false)).join('')
    : '<p class="muted">No hay actividades próximas.</p>';
}

function renderAgenda() {
  const validas = vigentes(DB.agenda);
  const grupos = {
    Nacional: validas.filter((a) => a.nivel === 'Nacional' || !a.nivel),
    Regional: validas.filter((a) => a.nivel === 'Regional'),
    Municipal: validas.filter((a) => a.nivel === 'Municipal')
  };
  const vacio = '<div class="empty"><span class="em"><svg class="ico ico-2xl" aria-hidden="true"><use href="#i-calendar"/></svg></span><h3>Sin actividades</h3><p>No hay actividades en este nivel.</p></div>';

  Object.entries(grupos).forEach(([nivel, lista]) => {
    const cont = $('agendaList' + nivel)?.querySelector('.agenda-container');
    if (cont) cont.innerHTML = lista.length ? lista.map((a) => itemAgenda(a, true)).join('') : vacio;
  });
}

function renderReglamentos() {
  const cont = $('regList');
  if (!cont) return;
  if (!DB.reglamentos.length) {
    cont.innerHTML = '<div class="empty"><span class="em"><svg class="ico ico-2xl" aria-hidden="true"><use href="#i-scroll"/></svg></span><h3>Sin reglamentos</h3><p>Aún no se han publicado reglamentos.</p></div>';
    return;
  }
  cont.innerHTML = DB.reglamentos.map((r) => {
    const u = safeUrl(r.url);
    const boton = u
      ? `<div class="row"><a class="btn sm primary" href="${esc(u)}" target="_blank" rel="noopener noreferrer"><svg class="ico" aria-hidden="true"><use href="#i-external"/></svg>Ver documento</a></div>`
      : '';
    return `
      <div class="reg-item">
        <h3><svg class="ico ico-lg" aria-hidden="true"><use href="#i-scroll"/></svg>${esc(r.titulo || 'Documento')}</h3>
        ${r.descripcion ? `<p style="color:var(--text-dim);margin-bottom:12px">${esc(r.descripcion)}</p>` : ''}
        ${r.texto ? `<p>${esc(r.texto)}</p>` : ''}
        ${boton}
      </div>`;
  }).join('');
}

function renderEnVivo() {
  const cont = $('liveList');
  if (!cont) return;
  if (!DB.envivo.length) {
    cont.innerHTML = '<div class="empty"><span class="em"><svg class="ico ico-2xl" aria-hidden="true"><use href="#i-broadcast"/></svg></span><h3>Sin transmisiones</h3><p>No hay transmisiones en este momento.</p></div>';
    return;
  }
  cont.innerHTML = DB.envivo.map((v) => {
    const u = safeUrl(v.url);
    const activo = v.activo === true;
    const boton = u
      ? `<a class="btn ${activo ? 'primary' : 'purple'}" href="${esc(u)}" target="_blank" rel="noopener noreferrer">
           <svg class="ico" aria-hidden="true"><use href="#i-${activo ? 'eye' : 'external'}"/></svg>${activo ? 'Ver ahora' : 'Abrir enlace'}
         </a>`
      : '';
    return `
      <div class="live-card ${activo ? 'is-live' : ''}">
        <div class="live-dot ${activo ? 'on' : ''}"></div>
        <div class="lc-body">
          <h3>${esc(v.titulo || 'Transmisión')} ${activo ? '<span class="tag">EN VIVO</span>' : ''}</h3>
          ${v.plataforma ? `<div class="ag-meta"><span><svg class="ico" aria-hidden="true"><use href="#i-broadcast"/></svg>${esc(v.plataforma)}</span></div>` : ''}
          ${v.descripcion ? `<p>${esc(v.descripcion)}</p>` : ''}
        </div>
        ${boton}
      </div>`;
  }).join('');
}

/* ------------------------------------------------------------- galería */
function posterDe(it) {
  const id = ytId(it.url);
  if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  if (it.tipo === 'video') return '';
  return safeUrl(it.url) || '';
}

function mediaReal(it, auto) {
  if (it.tipo === 'video') {
    const yt = ytEmbed(it.url);
    if (yt) {
      const extra = auto ? '&autoplay=1&mute=1' : '';
      return `<iframe class="gal-media" src="${esc(yt + '?rel=0' + extra)}" title="${esc(it.titulo || 'Video')}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    }
    const u = safeUrl(it.url);
    return u
      ? `<video class="gal-media" src="${esc(u)}" controls ${auto ? 'autoplay muted loop playsinline' : 'preload="metadata"'}></video>`
      : '';
  }
  const u = safeUrl(it.url);
  return u ? `<img class="gal-media" src="${esc(u)}" alt="${esc(it.titulo || '')}" loading="lazy" decoding="async">` : '';
}

function tarjetaGaleria(it, i) {
  const esVideo = it.tipo === 'video';
  const poster = posterDe(it);
  const media = poster
    ? `<img class="gal-media" src="${esc(poster)}" alt="${esc(it.titulo || '')}" loading="lazy" decoding="async">`
    : '<div class="gal-media gal-media-ph"><svg class="ico ico-2xl" aria-hidden="true"><use href="#i-video"/></svg></div>';

  return `
    <div class="gal-card" style="animation-delay:${Math.min(i * 45, 450)}ms">
      <div class="gal-media-wrap">
        <span class="gal-badge"><svg class="ico" aria-hidden="true"><use href="#i-${esVideo ? 'video' : 'image'}"/></svg>${esVideo ? 'Video' : 'Imagen'}</span>
        ${media}
        ${esVideo ? `<button type="button" class="gal-play" data-play="${i}" aria-label="Reproducir ${esc(it.titulo || 'video')}"><svg class="ico ico-lg" aria-hidden="true"><use href="#i-video"/></svg></button>` : ''}
      </div>
      <div class="gal-info">
        <h3>${esc(it.titulo || 'Sin título')}</h3>
        ${it.descripcion ? `<p>${esc(it.descripcion)}</p>` : ''}
        ${it.fecha ? `<span class="gal-fecha"><svg class="ico" aria-hidden="true"><use href="#i-calendar"/></svg>${esc(fmtFecha(it.fecha))}</span>` : ''}
      </div>
    </div>`;
}

function renderGaleria() {
  const g = $('galGrid');
  const gp = $('galGridPersistent');
  if (!g) return;

  if (!DB.galeria.length) {
    g.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <span class="em"><svg class="ico ico-2xl" aria-hidden="true"><use href="#i-images"/></svg></span>
      <h3>Galería vacía</h3>
      <p>${cargado ? 'El administrador puede agregar contenido.' : 'No se pudo cargar el contenido.'}</p>
      ${cargado ? '' : '<button type="button" class="btn sm primary" data-retry style="margin-top:16px">Reintentar</button>'}
    </div>`;
    if (gp) gp.innerHTML = '';
    return;
  }

  const tarjetas = DB.galeria.map((it, i) => tarjetaGaleria(it, i));
  g.innerHTML = tarjetas.join('');
  setFallbacks(g);
  if (gp) { gp.innerHTML = tarjetas.slice(0, 8).join(''); setFallbacks(gp); }
}

/* ------------------------------------------------------------ carrusel */
const CARRUSEL_MS = 5500;
let cIdx = 0;
let cTimer = null;
let cPausado = false;

function slideHtml(it, i) {
  const poster = posterDe(it);
  return `
    <div class="carousel-slide" data-slide="${i}">
      <div class="slide-media">
        ${poster
          ? `<img src="${esc(poster)}" alt="${esc(it.titulo || '')}" ${i === 0 ? 'loading="eager"' : 'loading="lazy"'} decoding="async">`
          : '<div class="slide-ph"></div>'}
      </div>
      <div class="carousel-overlay"></div>
      <div class="carousel-caption">
        <h3>${esc(it.titulo || 'Sin título')}</h3>
        ${it.descripcion ? `<p>${esc(it.descripcion)}</p>` : ''}
        ${it.fecha ? `<span class="carousel-meta"><svg class="ico" aria-hidden="true"><use href="#i-calendar"/></svg>${esc(fmtFecha(it.fecha))}</span>` : ''}
      </div>
    </div>`;
}

function montarSlide(el, i) {
  if (!el || el.dataset.montado === '1') return;
  const it = DB.galeria[i];
  if (!it) return;
  const cont = el.querySelector('.slide-media');
  if (!cont) return;
  cont.innerHTML = mediaReal(it, true);
  el.dataset.montado = '1';
  setFallbacks(cont);
}

function desmontarSlide(el, i) {
  if (!el || el.dataset.montado !== '1') return;
  const it = DB.galeria[i];
  const cont = el.querySelector('.slide-media');
  if (!cont) return;
  const poster = it ? posterDe(it) : '';
  cont.innerHTML = poster
    ? `<img src="${esc(poster)}" alt="${esc((it && it.titulo) || '')}" loading="lazy" decoding="async">`
    : '<div class="slide-ph"></div>';
  el.dataset.montado = '';
}

function reiniciarProgreso() {
  const bar = $('carouselProgressBar');
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '0%';
  void bar.offsetWidth;
  if (!reduceMotion && !cPausado) {
    bar.style.transition = `width ${CARRUSEL_MS}ms linear`;
    bar.style.width = '100%';
  }
}

function aplicarIndice(n, animar = true) {
  const total = DB.galeria.length;
  if (!total) return;
  cIdx = ((n % total) + total) % total;

  const track = $('carouselTrack');
  track.style.transition = animar && !reduceMotion ? 'transform .9s cubic-bezier(.65,0,.35,1)' : 'none';
  track.style.transform = `translateX(-${cIdx * 100}%)`;

  document.querySelectorAll('#carouselTrack .carousel-slide').forEach((s, i) => {
    if (i === cIdx) montarSlide(s, i);
    else desmontarSlide(s, i);
  });
  document.querySelectorAll('#carouselDots .carousel-dot').forEach((d, i) => {
    d.classList.toggle('active', i === cIdx);
    d.setAttribute('aria-current', i === cIdx ? 'true' : 'false');
  });
  reiniciarProgreso();
}

function renderCarrusel() {
  const track = $('carouselTrack');
  const dots = $('carouselDots');
  const controls = $('carouselControls');
  const wrap = $('carouselWrap');
  if (!track || !dots || !controls) return;

  if (!DB.galeria.length) {
    track.innerHTML = '<div class="carousel-empty"><span class="em"><svg class="ico" aria-hidden="true"><use href="#i-images"/></svg></span><h3>No hay contenido</h3><p>El administrador puede agregar imágenes y videos.</p></div>';
    dots.style.display = 'none';
    controls.style.display = 'none';
    pararAutoplay();
    return;
  }

  track.innerHTML = DB.galeria.map((it, i) => slideHtml(it, i)).join('');
  setFallbacks(track);
  dots.style.display = 'flex';
  controls.style.display = 'flex';
  dots.innerHTML = DB.galeria.map((_, i) =>
    `<button type="button" class="carousel-dot" data-dot="${i}" aria-label="Diapositiva ${i + 1}"></button>`).join('');

  if (wrap) wrap.classList.remove('pausado');
  aplicarIndice(0, false);
  iniciarAutoplay();
}

function pararAutoplay() {
  if (cTimer) { clearInterval(cTimer); cTimer = null; }
}

function iniciarAutoplay() {
  pararAutoplay();
  if (reduceMotion || cPausado || document.hidden || DB.galeria.length < 2) return;
  cTimer = setInterval(() => aplicarIndice(cIdx + 1), CARRUSEL_MS);
}

/* --------------------------------------------------------------- chat */
function avatarDe(m) {
  return safeUrl(m.foto_url) || 'logo.png';
}

function mensajeHtml(m, admin) {
  const esMio = !!currentUser && m.user_id === currentUser.id;
  return `
    <div class="msg ${esMio ? 'mine' : ''}" data-msg="${esc(m.id)}">
      <img src="${esc(avatarDe(m))}" class="msg-avatar" alt="" loading="lazy" decoding="async">
      <div class="msg-content">
        <div class="msg-head">
          <b>${esc(m.usuario || 'Usuario')} <span class="msg-cargo">${esc(m.cargo || 'Usuario')}</span></b>
          <span>${esc(fmtCreado(m.created))}</span>
          ${admin && !esMio && m.user_id ? `<button type="button" class="btn sm danger" style="padding:2px 8px;margin-left:8px;font-size:10px" data-action="ban" data-userid="${esc(m.user_id)}" data-usuario="${esc(m.usuario || '')}">Suspender</button>` : ''}
        </div>
        <div class="msg-body">${esc(m.texto || '')}</div>
      </div>
    </div>`;
}

function vacioChat(titulo, texto) {
  return `<div class="empty" style="margin:auto;background:transparent;border:0"><h3>${esc(titulo)}</h3><p>${esc(texto)}</p></div>`;
}

function pintarMensajes(box, items, admin) {
  if (!box) return;
  const alFinal = box.scrollTop + box.clientHeight >= box.scrollHeight - 80;
  box.innerHTML = items.length
    ? items.map((m) => mensajeHtml(m, admin)).join('')
    : vacioChat('Sin mensajes', 'Envía el primer mensaje.');
  setFallbacks(box);
  if (alFinal) box.scrollTop = box.scrollHeight;
}

async function renderChat() {
  const box = $('chatBox');
  if (!box || !currentUser) return;
  try {
    const res = await pb.collection('mensajes').getList(1, 100, { sort: 'created' });
    pintarMensajes(box, res.items, false);
  } catch (e) {
    console.error('Error cargando chat:', e);
    box.innerHTML = '<p class="muted">No se pudo cargar el chat.</p>';
  }
}

async function renderAdminChat() {
  const box = $('adminChatBox');
  if (!box) return;
  try {
    const res = await pb.collection('mensajes').getList(1, 100, { sort: 'created' });
    pintarMensajes(box, res.items, true);
  } catch (e) {
    box.innerHTML = '<p class="muted">No se pudo cargar el chat.</p>';
  }
}

function appendMensaje(box, m, admin) {
  if (!box) return;
  if (box.querySelector(`[data-msg="${m.id}"]`)) return;
  if (!box.querySelector('.msg')) box.innerHTML = '';
  const alFinal = box.scrollTop + box.clientHeight >= box.scrollHeight - 80;
  box.insertAdjacentHTML('beforeend', mensajeHtml(m, admin));
  setFallbacks(box);
  if (alFinal) box.scrollTop = box.scrollHeight;
}

async function enviarMensaje(texto, input) {
  if (!currentUser) { toast('Inicia sesión para escribir', 'err'); return; }
  if (!texto) return;
  const textoLimpio = texto.trim().slice(0, 600);
  if (!textoLimpio) return;
  try {
    const creado = await pb.collection('mensajes').create({ user_id: currentUser.id, texto: textoLimpio });
    if (input) input.value = '';
    if (creado) {
      if (currentView === 'chat') appendMensaje($('chatBox'), creado, false);
      if (currentView === 'admin') appendMensaje($('adminChatBox'), creado, true);
    }
  } catch (e) {
    toast(mensajeError(e, 'No se pudo enviar el mensaje'), 'err');
  }
}

async function banearUsuario(userId, usuario) {
  if (!userId) return;
  if (!confirm(`¿Suspender a ${usuario || 'este usuario'} del chat?`)) return;
  try {
    await pb.collection('bloqueados').create({ user_id: userId, usuario: usuario || '' });
    toast(`${usuario || 'Usuario'} suspendido`);
    renderBlockedUsers();
  } catch (e) {
    toast(mensajeError(e, 'No se pudo suspender al usuario'), 'err');
  }
}

async function desbloquearUsuario(id, nombre) {
  if (!confirm(`¿Desbloquear a ${nombre || 'este usuario'}?`)) return;
  try {
    await pb.collection('bloqueados').delete(id);
    toast(`${nombre || 'Usuario'} desbloqueado`);
    renderBlockedUsers();
  } catch (e) {
    toast(mensajeError(e, 'No se pudo desbloquear'), 'err');
  }
}

async function renderBlockedUsers() {
  const cont = $('blockedUsersList');
  if (!cont || !isAdmin) return;
  try {
    const lista = await pb.collection('bloqueados').getFullList({ sort: '-created' });
    cont.innerHTML = lista.length
      ? lista.map((b) => `
        <div class="ad-row">
          <div class="thumb" style="background:#7f1d1d;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px" aria-hidden="true">🚫</div>
          <div class="ad-txt"><b>${esc(b.usuario || 'Usuario')}</b><small>ID: ${esc(b.user_id || '')}</small></div>
          <button type="button" class="btn sm primary" data-action="unban" data-id="${esc(b.id)}" data-usuario="${esc(b.usuario || '')}"><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Desbloquear</button>
        </div>`).join('')
      : '<p class="muted">No hay usuarios suspendidos.</p>';
  } catch {
    cont.innerHTML = '<p class="muted">No se pudo cargar la lista.</p>';
  }
}

/* ------------------------------------------------------------ realtime */
async function suscribirRealtime() {
  if (!pb.authStore.isValid || rtMensajes) return;
  try {
    rtMensajes = await pb.collection('mensajes').subscribe('*', (e) => {
      if (e.action === 'create') {
        if (currentView === 'chat') appendMensaje($('chatBox'), e.record, false);
        if (currentView === 'admin') appendMensaje($('adminChatBox'), e.record, true);
      } else if (e.action === 'delete') {
        const nodo = document.querySelector(`[data-msg="${e.record.id}"]`);
        if (nodo) nodo.remove();
        else if (currentView === 'chat') renderChat();
        else if (currentView === 'admin') renderAdminChat();
      }
    });
  } catch (e) { console.warn('Realtime mensajes:', e); }
}

async function desuscribirRealtime() {
  if (rtMensajes) { try { await rtMensajes(); } catch { } rtMensajes = null; }
  desuscribirIntranet();
}

async function suscribirIntranet(otroId) {
  await desuscribirIntranet();
  if (!otroId || !isAdmin || !pb.authStore.isValid) return;
  try {
    const filtro = pb.filter('(user_id = {:yo} && destinatario = {:el}) || (user_id = {:el} && destinatario = {:yo})', { yo: currentUser.id, el: otroId });
    rtIntranet = await pb.collection('chat_intranet').subscribe('*', () => {
      if (currentView === 'intranet') renderIntranetChat();
    }, { filter: filtro });
  } catch (e) { console.warn('Realtime intranet:', e); }
}

async function desuscribirIntranet() {
  if (rtIntranet) { try { await rtIntranet(); } catch { } rtIntranet = null; }
}

async function suscribirNotificaciones() {
  if (rtNotif) return;
  try {
    rtNotif = await pb.collection('notificaciones').subscribe('*', (e) => {
      if (e.action !== 'create') return;
      const d = e.record || {};
      toast('🔔 ' + (d.titulo || 'Nueva notificación'));
      mostrarNotificacion(d.titulo, d.mensaje);
    });
  } catch (e) { console.warn('Realtime notificaciones:', e); }
}

function mostrarNotificacion(titulo, cuerpo) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body: cuerpo || '', icon: '/icon-192.png', badge: '/icon-192.png', lang: 'es' };
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(titulo || 'MEP', opts))
      .catch(() => { try { new Notification(titulo || 'MEP', opts); } catch { } });
  }
}

async function activarNotificaciones() {
  if (!('Notification' in window)) { toast('Este navegador no permite notificaciones', 'err'); return; }
  if (Notification.permission === 'granted') { toast('Las notificaciones ya están activas'); return; }
  if (Notification.permission === 'denied') { toast('Bloqueaste las notificaciones en este navegador', 'err'); return; }
  try {
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? 'Notificaciones activadas' : 'No se activaron las notificaciones', p === 'granted' ? '' : 'err');
  } catch { toast('No se pudieron activar las notificaciones', 'err'); }
}

/* ----------------------------------------------------------- intranet */
function checkIntranetAuth() {
  const login = $('intranetLoginView');
  const chat = $('intranetChatView');
  if (!login || !chat) return;

  if (isAdmin && currentUser) {
    login.style.display = 'none';
    chat.style.display = 'block';
    $('intranetUserLabel').textContent = currentUser.nombre_completo || 'Administrador';
    loadIntranetContacts();
  } else {
    login.style.display = 'block';
    chat.style.display = 'none';
  }
}

async function loadIntranetContacts() {
  const select = $('intranetRecipient');
  if (!select || !isAdmin || !currentUser) return;

  try {
    const users = await pb.collection('users').getFullList({
      sort: 'nombre_completo',
      filter: pb.filter('role = {:rol} && id != {:id}', { rol: 'admin', id: currentUser.id })
    });

    if (!users.length) {
      select.innerHTML = '<option value="">No hay otros administradores disponibles</option>';
      select.disabled = true;
      $('intranetChatInput').disabled = true;
      $('intranetSendBtn').disabled = true;
      return;
    }

    select.innerHTML = '<option value="">Selecciona un destinatario...</option>' +
      users.map((u) => `<option value="${esc(u.id)}">${esc(u.nombre_completo || u.email || 'Administrador')}</option>`).join('');
    select.disabled = false;
  } catch (e) {
    console.error('Error cargando contactos:', e);
    select.innerHTML = '<option value="">No se pudieron cargar los contactos</option>';
    select.disabled = true;
  }
}

async function renderIntranetChat() {
  const box = $('intranetChatBox');
  const dest = $('intranetRecipient').value;
  if (!box || !currentUser || !dest) return;

  try {
    const filtro = pb.filter('(user_id = {:yo} && destinatario = {:el}) || (user_id = {:el} && destinatario = {:yo})', { yo: currentUser.id, el: dest });
    const res = await pb.collection('chat_intranet').getList(1, 100, { filter: filtro, sort: 'created' });

    const alFinal = box.scrollTop + box.clientHeight >= box.scrollHeight - 80;
    box.innerHTML = res.items.length
      ? res.items.map((m) => {
        const mio = m.user_id === currentUser.id;
        const adjunto = m.archivo
          ? (() => {
            const u = imgDe(m, m.archivo);
            return u
              ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" class="btn sm" style="margin-top:10px;display:inline-flex;background:var(--purple-800);border-color:var(--gold-400)"><svg class="ico" aria-hidden="true"><use href="#i-download"/></svg>Descargar PDF</a>`
              : '';
          })()
          : '';
        return `
          <div class="msg ${mio ? 'mine' : ''}">
            <div class="msg-head">
              <b style="color:var(--gold-400)">${mio ? 'Tú' : esc(m.usuario || 'Administrador')}</b>
              <span>${esc(fmtCreado(m.created))}</span>
            </div>
            <div class="msg-body">
              ${m.texto ? esc(m.texto) : ''}
              ${adjunto}
            </div>
          </div>`;
      }).join('')
      : vacioChat('Sin mensajes', 'Inicia la conversación privada con este dirigente.');

    if (alFinal) box.scrollTop = box.scrollHeight;
  } catch (e) {
    console.error('Error cargando intranet:', e);
    box.innerHTML = '<p class="muted">No se pudo cargar el chat privado.</p>';
  }
}

/* -------------------------------------------------------------- admin */
function setEtiquetaBoton(id, texto) {
  const b = $(id);
  if (!b) return;
  const icono = texto === 'Actualizar' ? 'pencil' : 'plus';
  b.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-${icono}"/></svg>${texto}`;
}

function renderAdminListas() {
  if (!isAdmin) return;

  const g = $('g_list');
  if (g) g.innerHTML = DB.galeria.length ? DB.galeria.map((it) => `
    <div class="ad-row">
      ${it.tipo === 'imagen'
        ? `<img class="thumb" src="${esc(it.url)}" alt="" loading="lazy">`
        : '<div class="thumb" style="display:flex;align-items:center;justify-content:center;color:var(--gold-300)"><svg class="ico ico-lg" aria-hidden="true"><use href="#i-video"/></svg></div>'}
      <div class="ad-txt"><b>${esc(it.titulo || 'Sin título')}</b><small>${esc(it.tipo || 'imagen')} · ${esc(fmtFecha(it.fecha) || 'sin fecha')}</small></div>
      <button type="button" class="btn sm icon" data-action="edit" data-type="galeria" data-id="${esc(it.id)}" aria-label="Editar"><svg class="ico" aria-hidden="true"><use href="#i-pencil"/></svg></button>
      <button type="button" class="btn sm icon danger" data-action="del" data-type="galeria" data-id="${esc(it.id)}" aria-label="Eliminar"><svg class="ico" aria-hidden="true"><use href="#i-trash"/></svg></button>
    </div>`).join('') : '<p class="muted">Sin elementos.</p>';

  const a = $('a_list');
  if (a) a.innerHTML = DB.agenda.length ? DB.agenda.map((x) => `
    <div class="ad-row">
      <div class="ad-txt"><b>${esc(x.titulo || '')} <span style="font-size:10px;color:var(--gold-500)">[${esc(x.nivel || 'Nacional')}]</span></b><small>${esc(fmtFecha(x.fecha))} ${esc(x.hora || '')}</small></div>
      <button type="button" class="btn sm icon" data-action="edit" data-type="agenda" data-id="${esc(x.id)}" aria-label="Editar"><svg class="ico" aria-hidden="true"><use href="#i-pencil"/></svg></button>
      <button type="button" class="btn sm icon danger" data-action="del" data-type="agenda" data-id="${esc(x.id)}" aria-label="Eliminar"><svg class="ico" aria-hidden="true"><use href="#i-trash"/></svg></button>
    </div>`).join('') : '<p class="muted">Sin actividades.</p>';

  const e = $('e_list');
  if (e) e.innerHTML = DB.envivo.length ? DB.envivo.map((v) => `
    <div class="ad-row">
      <span class="live-dot ${v.activo ? 'on' : ''}"></span>
      <div class="ad-txt"><b>${esc(v.titulo || '')}</b><small>${esc(v.plataforma || 'plataforma')}</small></div>
      <button type="button" class="btn sm icon" data-action="edit" data-type="envivo" data-id="${esc(v.id)}" aria-label="Editar"><svg class="ico" aria-hidden="true"><use href="#i-pencil"/></svg></button>
      <button type="button" class="btn sm icon danger" data-action="del" data-type="envivo" data-id="${esc(v.id)}" aria-label="Eliminar"><svg class="ico" aria-hidden="true"><use href="#i-trash"/></svg></button>
    </div>`).join('') : '<p class="muted">Sin transmisiones.</p>';

  const r = $('r_list');
  if (r) r.innerHTML = DB.reglamentos.length ? DB.reglamentos.map((x) => `
    <div class="ad-row">
      <div class="ad-txt"><b>${esc(x.titulo || '')}</b><small>${esc(x.descripcion || 'documento')}</small></div>
      <button type="button" class="btn sm icon" data-action="edit" data-type="reglamentos" data-id="${esc(x.id)}" aria-label="Editar"><svg class="ico" aria-hidden="true"><use href="#i-pencil"/></svg></button>
      <button type="button" class="btn sm icon danger" data-action="del" data-type="reglamentos" data-id="${esc(x.id)}" aria-label="Eliminar"><svg class="ico" aria-hidden="true"><use href="#i-trash"/></svg></button>
    </div>`).join('') : '<p class="muted">Sin reglamentos.</p>';

  const s = $('s_list');
  if (s) s.innerHTML = DB.subapps.length ? DB.subapps.map((x) => `
    <div class="ad-row">
      <div class="thumb" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:transparent;border-color:var(--glass-border-subtle)">${esc(x.icono || '🔗')}</div>
      <div class="ad-txt"><b>${esc(x.nombre || '')}</b><small>${esc(x.url || '')}</small></div>
      <button type="button" class="btn sm icon" data-action="edit" data-type="subapps" data-id="${esc(x.id)}" aria-label="Editar"><svg class="ico" aria-hidden="true"><use href="#i-pencil"/></svg></button>
      <button type="button" class="btn sm icon danger" data-action="del" data-type="subapps" data-id="${esc(x.id)}" aria-label="Eliminar"><svg class="ico" aria-hidden="true"><use href="#i-trash"/></svg></button>
    </div>`).join('') : '<p class="muted">Sin sub-apps.</p>';

  renderBlockedUsers();
}

async function limpiarForm(type) {
  editando[type] = null;
  if (type === 'galeria') {
    ['g_titulo', 'g_desc', 'g_fecha', 'g_url'].forEach((i) => { $(i).value = ''; });
    $('g_file').value = '';
    $('g_tipo').value = 'imagen';
    setEtiquetaBoton('g_save', 'Agregar');
    $('g_cancel').style.display = 'none';
  }
  if (type === 'envivo') {
    ['e_titulo', 'e_plat', 'e_url', 'e_desc'].forEach((i) => { $(i).value = ''; });
    $('e_activo').value = 'no';
    setEtiquetaBoton('e_save', 'Agregar');
    $('e_cancel').style.display = 'none';
  }
  if (type === 'agenda') {
    ['a_titulo', 'a_fecha', 'a_hora', 'a_lugar', 'a_desc'].forEach((i) => { $(i).value = ''; });
    $('a_nivel').value = 'Nacional';
    setEtiquetaBoton('a_save', 'Agregar');
    $('a_cancel').style.display = 'none';
  }
  if (type === 'reglamentos') {
    ['r_titulo', 'r_desc', 'r_url', 'r_texto'].forEach((i) => { $(i).value = ''; });
    if ($('r_file')) $('r_file').value = '';
    setEtiquetaBoton('r_save', 'Agregar');
    $('r_cancel').style.display = 'none';
  }
  if (type === 'subapps') {
    ['s_nombre', 's_icono', 's_url'].forEach((i) => { $(i).value = ''; });
    setEtiquetaBoton('s_save', 'Agregar');
    $('s_cancel').style.display = 'none';
  }
}

function cargarParaEditar(type, id) {
  const it = (DB[type] || []).find((x) => x.id === id);
  if (!it) return;
  editando[type] = id;

  if (type === 'galeria') {
    $('g_titulo').value = it.titulo || '';
    $('g_desc').value = it.descripcion || '';
    $('g_fecha').value = String(it.fecha || '').split(' ')[0];
    $('g_tipo').value = it.tipo || 'imagen';
    $('g_url').value = it.archivo ? '' : (it.url || '');
    $('g_url').placeholder = it.archivo ? 'Archivo cargado (sube otro para reemplazarlo)' : 'https://...';
    $('g_file').value = '';
    setEtiquetaBoton('g_save', 'Actualizar');
    $('g_cancel').style.display = 'inline-flex';
  }

  if (type === 'envivo') {
    $('e_titulo').value = it.titulo || '';
    $('e_plat').value = it.plataforma || '';
    $('e_url').value = it.url || '';
    $('e_desc').value = it.descripcion || '';
    $('e_activo').value = it.activo ? 'si' : 'no';
    setEtiquetaBoton('e_save', 'Actualizar');
    $('e_cancel').style.display = 'inline-flex';
  }

  if (type === 'agenda') {
    $('a_titulo').value = it.titulo || '';
    $('a_fecha').value = String(it.fecha || '').split(' ')[0];
    $('a_hora').value = it.hora || '';
    $('a_lugar').value = it.lugar || '';
    $('a_desc').value = it.descripcion || '';
    $('a_nivel').value = it.nivel || 'Nacional';
    setEtiquetaBoton('a_save', 'Actualizar');
    $('a_cancel').style.display = 'inline-flex';
  }

  if (type === 'reglamentos') {
    $('r_titulo').value = it.titulo || '';
    $('r_desc').value = it.descripcion || '';
    $('r_url').value = it.enlace || '';
    $('r_texto').value = it.texto || '';
    if ($('r_file')) $('r_file').value = '';
    setEtiquetaBoton('r_save', 'Actualizar');
    $('r_cancel').style.display = 'inline-flex';
  }

  if (type === 'subapps') {
    $('s_nombre').value = it.nombre || '';
    $('s_icono').value = it.icono || '';
    $('s_url').value = it.url || '';
    setEtiquetaBoton('s_save', 'Actualizar');
    $('s_cancel').style.display = 'inline-flex';
  }

  const destinoScroll = { galeria: 'g_save', agenda: 'a_save', envivo: 'e_save', reglamentos: 'r_save', subapps: 's_save' }[type];
  const card = destinoScroll ? $(destinoScroll) : null;
  if (card && typeof card.scrollIntoView === 'function') card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const COLECCIONES_PERMITIDAS = new Set(['galeria', 'agenda', 'envivo', 'reglamentos', 'subapps']);

async function eliminarItem(type, id) {
  if (!COLECCIONES_PERMITIDAS.has(type) || !id) return;
  if (!confirm('¿Eliminar este elemento?')) return;
  try {
    await pb.collection(type).delete(id);
    await cargarDatos();
    renderTodo();
    await limpiarForm(type);
    toast('Elemento eliminado');
  } catch (e) {
    toast(mensajeError(e, 'No se pudo eliminar'), 'err');
  }
}

async function guardarGaleria() {
  const titulo = $('g_titulo').value.trim();
  const url = $('g_url').value.trim();
  const archivo = $('g_file').files[0];
  if (!titulo) { toast('Escribe un título', 'err'); return; }
  if (!url && !archivo && !editando.galeria) { toast('Indica una URL o un archivo', 'err'); return; }

  const fd = new FormData();
  fd.append('titulo', titulo);
  fd.append('descripcion', $('g_desc').value.trim());
  fd.append('fecha', $('g_fecha').value);
  fd.append('tipo', $('g_tipo').value);
  if (archivo) fd.append('archivo', archivo);
  else if (url) fd.append('url', url);

  try {
    if (editando.galeria) await pb.collection('galeria').update(editando.galeria, fd);
    else await pb.collection('galeria').create(fd);
    await cargarDatos();
    renderTodo();
    await limpiarForm('galeria');
    toast('Guardado');
  } catch (e) {
    toast(mensajeError(e, 'No se pudo guardar'), 'err');
  }
}

async function guardarAgenda() {
  const titulo = $('a_titulo').value.trim();
  const fecha = $('a_fecha').value;
  if (!titulo || !fecha) { toast('Escribe título y fecha', 'err'); return; }

  const payload = {
    titulo,
    fecha,
    hora: $('a_hora').value,
    nivel: $('a_nivel').value,
    lugar: $('a_lugar').value.trim(),
    descripcion: $('a_desc').value.trim()
  };

  try {
    if (editando.agenda) await pb.collection('agenda').update(editando.agenda, payload);
    else await pb.collection('agenda').create(payload);
    await cargarDatos();
    renderTodo();
    await limpiarForm('agenda');
    toast('Guardado');
  } catch (e) {
    toast(mensajeError(e, 'No se pudo guardar'), 'err');
  }
}

async function guardarEnVivo() {
  const titulo = $('e_titulo').value.trim();
  const url = $('e_url').value.trim();
  if (!titulo) { toast('Escribe un título', 'err'); return; }

  const payload = {
    titulo,
    plataforma: $('e_plat').value.trim(),
    url,
    descripcion: $('e_desc').value.trim(),
    activo: $('e_activo').value === 'si'
  };

  try {
    if (editando.envivo) await pb.collection('envivo').update(editando.envivo, payload);
    else await pb.collection('envivo').create(payload);
    await cargarDatos();
    renderTodo();
    await limpiarForm('envivo');
    toast('Guardado');
  } catch (e) {
    toast(mensajeError(e, 'No se pudo guardar'), 'err');
  }
}

async function guardarReglamento() {
  const titulo = $('r_titulo').value.trim();
  if (!titulo) { toast('Escribe un título', 'err'); return; }

  const fd = new FormData();
  fd.append('titulo', titulo);
  fd.append('descripcion', $('r_desc').value.trim());
  fd.append('enlace', $('r_url').value.trim());
  fd.append('texto', $('r_texto').value.trim());
  const archivo = $('r_file') && $('r_file').files[0];
  if (archivo) fd.append('archivo', archivo);

  try {
    if (editando.reglamentos) await pb.collection('reglamentos').update(editando.reglamentos, fd);
    else await pb.collection('reglamentos').create(fd);
    await cargarDatos();
    renderTodo();
    await limpiarForm('reglamentos');
    toast('Guardado');
  } catch (e) {
    toast(mensajeError(e, 'No se pudo guardar'), 'err');
  }
}

async function guardarSubapp() {
  const nombre = $('s_nombre').value.trim();
  const url = $('s_url').value.trim();
  if (!nombre || !url) { toast('Escribe nombre y URL', 'err'); return; }

  const payload = {
    nombre,
    icono: $('s_icono').value.trim() || '🔗',
    url,
    activo: true
  };

  try {
    if (editando.subapps) {
      await pb.collection('subapps').update(editando.subapps, payload);
    } else {
      await pb.collection('subapps').create(payload);
    }
    await cargarDatos();
    renderTodo();
    await limpiarForm('subapps');
    toast('Guardado');
  } catch (e) {
    toast(mensajeError(e, 'No se pudo guardar. Revisa la URL.'), 'err');
  }
}

async function enviarNotificacion() {
  const titulo = $('n_titulo').value.trim();
  const mensaje = $('n_mensaje').value.trim();
  if (!titulo || !mensaje) { toast('Escribe título y mensaje', 'err'); return; }

  const btn = $('n_send');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  try {
    await pb.collection('notificaciones').create({ titulo, mensaje });
    $('n_titulo').value = '';
    $('n_mensaje').value = '';
    toast('Notificación enviada');
  } catch (e) {
    toast(mensajeError(e, 'No se pudo enviar la notificación'), 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

/* ----------------------------------------------------------- subapps */
function abrirSubapp(id) {
  const s = DB.subapps.find((x) => x.id === id);
  if (!s) return;
  const u = safeUrl(s.url);
  if (!u) { toast('La URL de esta sub-app no es válida', 'err'); return; }

  subappActual = { ...s, url: u };
  $('subappTitle').textContent = s.nombre || 'Sub-app';
  const frame = $('subappFrame');
  frame.src = 'about:blank';
  go('subapp');
  setTimeout(() => { if (currentView === 'subapp') frame.src = u; }, 60);
}

function abrirPrimeraSubapp() {
  if (!DB.subapps.length) { toast('Todavía no hay sub-apps configuradas'); return; }
  abrirSubapp(DB.subapps[0].id);
}

/* ------------------------------------------------------------ eventos */
function enlazarEventos() {
  aplicarSidebarColapsada();
  inicializarFormularioRegistro();

  $('btnMenu').addEventListener('click', () => (sidebar.classList.contains('open') ? cerrarMenu() : abrirMenu()));
  overlay.addEventListener('click', cerrarMenu);

  $('collapseToggle').addEventListener('click', () => {
    const nueva = !document.body.classList.contains('sidebar-collapsed');
    document.body.classList.toggle('sidebar-collapsed', nueva);
    localStorage.setItem('mep_sidebar_collapsed', nueva ? '1' : '0');
    $('collapseToggle').setAttribute('aria-pressed', nueva ? 'true' : 'false');
  });

  document.querySelectorAll('.nav-head').forEach((head) => {
    head.addEventListener('click', () => head.parentElement.classList.toggle('open'));
    head.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); head.parentElement.classList.toggle('open'); }
    });
  });

  $('nav').addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (!item) return;
    if (item.dataset.link) { window.location.href = item.dataset.link; return; }
    if (item.dataset.subapp) { abrirSubapp(item.dataset.subapp); return; }
    if (item.dataset.view) go(item.dataset.view);
  });

  $('brand').addEventListener('click', () => go('galeria'));
  $('btnBack').addEventListener('click', goBack);

  document.addEventListener('click', (e) => {
    const goto = e.target.closest('[data-goto]');
    if (goto) { go(goto.dataset.goto); return; }

    if (e.target.closest('[data-open-subapps]')) { abrirPrimeraSubapp(); return; }
    if (e.target.closest('#linkOpenAuth')) { e.preventDefault(); abrirModalAuth(); return; }
    if (e.target.closest('[data-retry]')) { recargarTodo(); return; }

    const authToggle = e.target.closest('[data-auth-toggle]');
    if (authToggle) {
      e.preventDefault();
      toggleAuthForms(authToggle.dataset.authToggle === 'register');
      return;
    }

    const passToggle = e.target.closest('[data-toggle-pass]');
    if (passToggle) { togglePassword(passToggle.dataset.togglePass, passToggle); return; }

    const play = e.target.closest('[data-play]');
    if (play) {
      const it = DB.galeria[Number(play.dataset.play)];
      const wrap = play.closest('.gal-media-wrap');
      if (it && wrap) { wrap.innerHTML = mediaReal(it, false); setFallbacks(wrap); }
      return;
    }

    const accion = e.target.closest('[data-action]');
    if (!accion) return;
    const { action, type, id, userid, usuario } = accion.dataset;
    if (action === 'del') eliminarItem(type, id);
    else if (action === 'edit') cargarParaEditar(type, id);
    else if (action === 'ban') banearUsuario(userid, usuario);
    else if (action === 'unban') desbloquearUsuario(id, usuario);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.querySelector('.modal-overlay.show')) { cerrarTodosLosModales(); return; }
      cerrarMenu();
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-goto],[role="button"].nav-item')) {
      e.preventDefault();
      if (e.target.dataset.goto) go(e.target.dataset.goto);
      else if (e.target.dataset.link) window.location.href = e.target.dataset.link;
      else if (e.target.dataset.subapp) abrirSubapp(e.target.dataset.subapp);
    }
  });

  /* auth */
  $('btnLogin').addEventListener('click', abrirModalAuth);
  $('authModalClose').addEventListener('click', () => cerrarModal('authModal'));
  $('profileModalClose').addEventListener('click', () => cerrarModal('profileModal'));
  $('btnLogout').addEventListener('click', cerrarSesion);
  $('logoutBtnAdmin').addEventListener('click', cerrarSesion);
  $('intranetLogoutBtn').addEventListener('click', () => { cerrarSesion(); toast('Sesión cerrada'); });

  $('btnProfile').addEventListener('click', () => {
    if (!currentUser) return;
    $('profFoto').src = currentUser.foto ? imgDe(currentUser, currentUser.foto) : 'logo.png';
    $('profNombre').textContent = currentUser.nombre_completo || '';
    $('profCargo').textContent = currentUser.cargo || '';
    $('profEstado').textContent = currentUser.estado || '—';
    $('profMunicipio').textContent = currentUser.municipio || '—';
    $('profRole').textContent = currentUser.role || 'municipal';
    abrirModal('profileModal');
  });

  $('loginForm').addEventListener('submit', iniciarSesion);
  $('registerForm').addEventListener('submit', registrarUsuario);

  /* chat */
  $('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    enviarMensaje($('chatInput').value, $('chatInput'));
  });
  $('adminChatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    enviarMensaje($('adminChatInput').value, $('adminChatInput'));
  });

  /* intranet */
  $('intranetLoginForm').addEventListener('submit', entrarIntranet);
  $('intranetRecipient').addEventListener('change', () => {
    const dest = $('intranetRecipient').value;
    const input = $('intranetChatInput');
    const btn = $('intranetSendBtn');

    input.disabled = !dest;
    btn.disabled = !dest;

    if (dest) {
      input.focus();
      renderIntranetChat();
      suscribirIntranet(dest);
    } else {
      $('intranetChatBox').innerHTML = vacioChat('Selecciona un destinatario', 'Elige a otro administrador de la lista para ver la conversación privada.');
      desuscribirIntranet();
    }
  });

  $('btnAttachFile').addEventListener('click', () => $('intranetFile').click());
  $('intranetFile').addEventListener('change', () => {
    const f = $('intranetFile').files[0];
    const label = $('intranetFileName');
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        toast('El PDF supera los 10 MB', 'err');
        $('intranetFile').value = '';
        label.style.display = 'none';
        return;
      }
      label.textContent = `Adjunto: ${f.name}`;
      label.style.display = 'block';
    } else {
      label.style.display = 'none';
    }
  });

  $('intranetChatForm').addEventListener('submit', enviarIntranet);

  /* admin */
  $('g_save').addEventListener('click', guardarGaleria);
  $('a_save').addEventListener('click', guardarAgenda);
  $('e_save').addEventListener('click', guardarEnVivo);
  $('r_save').addEventListener('click', guardarReglamento);
  $('s_save').addEventListener('click', guardarSubapp);
  $('n_send').addEventListener('click', enviarNotificacion);

  [['g_cancel', 'galeria'], ['a_cancel', 'agenda'], ['e_cancel', 'envivo'], ['r_cancel', 'reglamentos'], ['s_cancel', 'subapps']]
    .forEach(([id, tipo]) => $(id).addEventListener('click', () => limpiarForm(tipo)));

  $('btnEnableNotifications').addEventListener('click', activarNotificaciones);

  /* carrusel */
  $('carouselPrev').addEventListener('click', () => { aplicarIndice(cIdx - 1); iniciarAutoplay(); });
  $('carouselNext').addEventListener('click', () => { aplicarIndice(cIdx + 1); iniciarAutoplay(); });
  $('carouselDots').addEventListener('click', (e) => {
    const dot = e.target.closest('[data-dot]');
    if (!dot) return;
    aplicarIndice(Number(dot.dataset.dot));
    iniciarAutoplay();
  });

  const wrap = $('carouselWrap');
  wrap.addEventListener('mouseenter', () => { cPausado = true; pararAutoplay(); });
  wrap.addEventListener('mouseleave', () => { cPausado = false; iniciarAutoplay(); });
  wrap.addEventListener('focusin', () => { cPausado = true; pararAutoplay(); });
  wrap.addEventListener('focusout', () => { cPausado = false; iniciarAutoplay(); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pararAutoplay();
    else iniciarAutoplay();
  });

  /* subapp */
  $('subappBack').addEventListener('click', goBack);
  $('subappOpen').addEventListener('click', () => {
    const u = subappActual && safeUrl(subappActual.url);
    if (u) window.open(u, '_blank', 'noopener,noreferrer');
  });

  /* términos */
  $('acceptTermsBtn').addEventListener('click', () => {
    localStorage.setItem('mep_terms_accepted_v1', 'true');
    cerrarModal('termsModal');
  });

  /* historial */
  window.addEventListener('popstate', (e) => {
    const v = (e.state && e.state.view) || vistaDeHash();
    go(v, { push: false });
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.error('Promesa rechazada:', e.reason);
  });

  /* instalación PWA */
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    instalarEvento = e;
    if (localStorage.getItem('mep_install_dismissed') !== '1') $('installBar').classList.add('show');
  });
  $('installOk').addEventListener('click', async () => {
    $('installBar').classList.remove('show');
    if (!instalarEvento) return;
    instalarEvento.prompt();
    try { await instalarEvento.userChoice; } catch { }
    instalarEvento = null;
  });
  $('installNo').addEventListener('click', () => {
    localStorage.setItem('mep_install_dismissed', '1');
    $('installBar').classList.remove('show');
  });
  window.addEventListener('appinstalled', () => {
    localStorage.setItem('mep_install_dismissed', '1');
    $('installBar').classList.remove('show');
  });
}

/* ------------------------------------------------- formulario de registro */
function inicializarFormularioRegistro() {
  const selEstado = $('regEstado');
  const selMunicipio = $('regMunicipio');
  if (!selEstado || !selMunicipio) return;

  // Estados (solo se cargan una vez)
  if (selEstado.options.length <= 1) {
    Object.keys(VENEZUELA_DATA)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .forEach((estado) => {
        const opt = document.createElement('option');
        opt.value = estado;
        opt.textContent = estado;
        selEstado.appendChild(opt);
      });
  }

  // Municipios dependientes del estado
  selEstado.addEventListener('change', () => {
    const estado = selEstado.value;
    const municipios = (VENEZUELA_DATA[estado] || []).slice().sort((a, b) => a.localeCompare(b, 'es'));

    selMunicipio.innerHTML = '<option value="">Selecciona...</option>';

    if (!municipios.length) {
      selMunicipio.disabled = true;
      selMunicipio.innerHTML = '<option value="">Elige un estado</option>';
      return;
    }

    municipios.forEach((municipio) => {
      const opt = document.createElement('option');
      opt.value = municipio;
      opt.textContent = municipio;
      selMunicipio.appendChild(opt);
    });
    selMunicipio.disabled = false;
  });

  // Los usuarios normales no tienen cargo: solo nombre, contacto y foto.
}

/* ---------------------------------------------------------------- auth */
function slugUsuario(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 24) || 'usuario';
}

/* El login se hace con el usuario. Internamente se usa como correo
   `<usuario>@mep.local`, así PocketBase sigue validando un email único
   sin pedirle uno real a la persona. */
function identidadLogin(valor) {
  const v = String(valor || '').trim().toLowerCase();
  if (!v) return '';
  return v.includes('@') ? v : v + '@mep.local';
}

function abrirModalAuth() {
  $('authError').classList.remove('show');
  abrirModal('authModal');
  toggleAuthForms(false);
}

function toggleAuthForms(esRegistro) {
  $('loginForm').style.display = esRegistro ? 'none' : 'block';
  $('registerForm').style.display = esRegistro ? 'block' : 'none';
  $('authModalTitle').textContent = esRegistro ? 'Registro de Usuario' : 'Ingresar';
  $('authModalSubtitle').textContent = esRegistro ? 'Completa tus datos para unirte al movimiento' : 'Accede a tu cuenta';
  $('authError').classList.remove('show');
}

function togglePassword(inputId, btn) {
  const input = $(inputId);
  if (!input) return;
  const icon = btn.querySelector('use');
  const ver = input.type === 'password';
  input.type = ver ? 'text' : 'password';
  if (icon) icon.setAttribute('href', ver ? '#i-eye-off' : '#i-eye');
  btn.setAttribute('aria-pressed', ver ? 'true' : 'false');
}

function mostrarErrorAuth(msg) {
  $('authErrorText').textContent = msg;
  $('authError').classList.add('show');
}

async function iniciarSesion(e) {
  e.preventDefault();
  const email = identidadLogin($('loginEmail').value);
  const pass = $('loginPass').value;
  const btn = e.target.querySelector('button[type="submit"]');
  if (!email || !pass) { mostrarErrorAuth('Completa usuario y contraseña.'); return; }

  btn.disabled = true;
  btn.textContent = 'Verificando...';

  try {
    const auth = await pb.collection('users').authWithPassword(email, pass);
    const rec = auth.record || auth.user || authRecord();
    aplicarSesion(rec);
    cerrarModal('authModal');
    $('loginPass').value = '';
    toast(isAdmin ? 'Bienvenido, administrador' : 'Bienvenido al movimiento');
    go(isAdmin ? 'admin' : 'inicio');
  } catch (err) {
    if (err && err.status === 400) mostrarErrorAuth('Credenciales incorrectas o cuenta inexistente.');
    else if (err && err.status === 429) mostrarErrorAuth('Demasiados intentos. Espera un minuto.');
    else mostrarErrorAuth(mensajeError(err, 'No se pudo iniciar sesión. Revisa tu conexión.'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-lock"/></svg>Iniciar Sesión';
  }
}

async function registrarUsuario(e) {
  e.preventDefault();

  const nombre = $('regName').value.trim();
  const apellido = $('regApellido').value.trim();

  if ($('regPass').value !== $('regPassConfirm').value) {
    mostrarErrorAuth('Las contraseñas no coinciden.');
    return;
  }

  const foto = $('regFoto').files[0];
  if (foto) {
    if (!foto.type || !foto.type.startsWith('image/')) {
      mostrarErrorAuth('El archivo debe ser una imagen (JPG, PNG, WEBP).');
      return;
    }
    if (foto.size > 5 * 1024 * 1024) {
      mostrarErrorAuth('La foto pesa más de 5 MB. Usa una imagen más pequeña.');
      return;
    }
  }

  const btn = e.target.querySelector('button[type="submit"]');
  const textoOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Creando cuenta...';

  const base = slugUsuario(`${nombre}.${apellido}`);
  let username = base;
  let creado = null;
  let ultimoError = null;

  for (let intento = 1; intento <= 5 && !creado; intento++) {
    const fd = new FormData();
    fd.append('email', username + '@mep.local');
    fd.append('username', username);
    fd.append('password', $('regPass').value);
    fd.append('passwordConfirm', $('regPass').value);
    fd.append('nombre_completo', `${nombre} ${apellido}`.trim());
    fd.append('estado', $('regEstado').value);
    fd.append('municipio', $('regMunicipio').value);
    fd.append('telefono', $('regTelefono').value.trim());
    if (foto) fd.append('foto', foto);

    try {
      creado = await pb.collection('users').create(fd);
    } catch (err) {
      ultimoError = err;
      const data = (err && err.response && err.response.data) || {};
      const ocupado = (data.email && data.email.code === 'validation_not_unique') ||
                      (data.username && data.username.code === 'validation_not_unique');
      if (ocupado && intento < 5) {
        username = base + (intento + 1);
        continue;
      }
      break;
    }
  }

  if (creado) {
    toggleAuthForms(false);
    $('loginEmail').value = username;
    $('authModalTitle').textContent = 'Cuenta creada';
    $('authModalSubtitle').textContent = `Tu usuario es "${username}". Guárdalo: con él y tu contraseña entrarás.`;
    $('loginPass').focus();
    toast(`Cuenta creada. Tu usuario es: ${username}`);
  } else {
    console.error('Registro falló:', ultimoError && ultimoError.status, ultimoError && ultimoError.response);
    const data = (ultimoError && ultimoError.response && ultimoError.response.data) || {};
    const servidor = (ultimoError && ultimoError.response && ultimoError.response.message) || '';
    let msg = '';

    if (data.email && data.email.code === 'validation_not_unique') msg = 'Ese nombre de usuario ya está en uso. Prueba escribiendo también tu segundo nombre o apellido.';
    else if (data.email) msg = 'No se pudo generar el usuario. Revisa el nombre.';
    else if (data.passwordConfirm) msg = 'Las contraseñas no coinciden.';
    else if (data.password) msg = 'La contraseña debe tener al menos 8 caracteres.';
    else if (data.foto) msg = 'No se pudo subir la foto (imagen de hasta 5 MB).';
    else if (data.telefono) msg = 'Revisa el número de teléfono.';
    else if (data.estado || data.municipio) msg = 'Selecciona estado y municipio.';
    else if (data.nombre_completo) msg = 'Escribe tu nombre y apellido.';
    else if (ultimoError && ultimoError.status === 0) msg = 'Sin conexión con el servidor. Revisa tu red.';
    else if (ultimoError && ultimoError.status === 403) msg = 'El registro no está permitido en este momento.';
    else if (servidor && !/failed to create/i.test(servidor)) msg = servidor;
    else msg = 'No se pudo registrar. Revisa los datos e inténtalo de nuevo.';

    mostrarErrorAuth(msg);
  }

  btn.disabled = false;
  btn.innerHTML = textoOriginal;
}

function cerrarSesion() {
  pb.authStore.clear();
  cerrarTodosLosModales();
  limpiarSesionUI();
  $('authError').classList.remove('show');
  toast('Sesión cerrada');
  go('galeria', { push: false });
}

async function entrarIntranet(e) {
  e.preventDefault();
  const email = identidadLogin($('intranetEmail').value);
  const pass = $('intranetPass').value;
  const btn = $('intranetLoginBtn');
  btn.disabled = true;

  try {
    const auth = await pb.collection('users').authWithPassword(email, pass);
    const rec = auth.record || auth.user || authRecord();
    aplicarSesion(rec);
    if (!isAdmin) { toast('Esta cuenta no tiene acceso a la intranet', 'err'); pb.authStore.clear(); limpiarSesionUI(); return; }
    $('intranetPass').value = '';
    toast('Acceso concedido');
    checkIntranetAuth();
  } catch (err) {
    toast(mensajeError(err, 'Credenciales incorrectas'), 'err');
  } finally {
    btn.disabled = false;
  }
}

async function enviarIntranet(e) {
  e.preventDefault();
  const input = $('intranetChatInput');
  const fileInput = $('intranetFile');
  const dest = $('intranetRecipient').value;
  const texto = input.value.trim();
  const archivo = fileInput.files[0];

  if (!currentUser || !dest) return;
  if (!texto && !archivo) return;

  const btn = $('intranetSendBtn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const fd = new FormData();
  fd.append('usuario', currentUser.nombre_completo || 'Dirigente');
  fd.append('user_id', currentUser.id);
  fd.append('destinatario', dest);
  if (texto) fd.append('texto', texto);
  if (archivo) fd.append('archivo', archivo);

  try {
    await pb.collection('chat_intranet').create(fd);
    input.value = '';
    fileInput.value = '';
    $('intranetFileName').style.display = 'none';
    await renderIntranetChat();
  } catch (err) {
    toast(mensajeError(err, 'No se pudo enviar el mensaje'), 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-chat"/></svg>Enviar';
  }
}

/* ----------------------------------------------------------------- PWA */
function registrarSW() {
  if (!('serviceWorker' in navigator)) return;

  const teniaControl = !!navigator.serviceWorker.controller;
  let recargando = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!teniaControl || recargando) return;
    recargando = true;
    toast('Actualizando a la nueva versión…');
    setTimeout(() => location.reload(), 900);
  });

  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => console.warn('Service worker:', e));
}

function mostrarTerminos() {
  if (localStorage.getItem('mep_terms_accepted_v1') === 'true') return;
  abrirModal('termsModal');
}

/* -------------------------------------------------------------- arranque */
function renderTodo() {
  renderNavSubapps();
  renderInicio();
  renderAgenda();
  renderReglamentos();
  renderGaleria();
  renderCarrusel();
  renderEnVivo();
  if (isAdmin) renderAdminListas();
}

async function recargarTodo() {
  await cargarDatos();
  renderTodo();
}

async function init() {
  enlazarEventos();

  await cargarDatos();
  renderTodo();

  if (pb.authStore.isValid) {
    const rec = authRecord();
    if (rec) { aplicarSesion(rec); refrescarSesion(); }
    else { pb.authStore.clear(); limpiarSesionUI(); }
  } else {
    limpiarSesionUI();
  }

  suscribirNotificaciones();
  go(vistaDeHash(), { push: false });
  mostrarTerminos();
  registrarSW();

  pb.authStore.onChange((token, model) => {
    const rec = model || authRecord();
    if (token && pb.authStore.isValid && rec) {
      if (!currentUser || currentUser.id !== rec.id || currentUser.role !== rec.role) aplicarSesion(rec);
    } else if (currentUser) {
      limpiarSesionUI();
      go('galeria', { push: false });
    }
  });
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && pb.authStore.isValid && currentUser) refrescarSesion();
});

init();
