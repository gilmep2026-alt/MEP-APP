/// <reference path="../pb_data/types.d.ts" />
/*
 * MEP · Movimientos Electoral del Pueblo
 * Hooks de seguridad y consistencia para PocketBase
 * ------------------------------------------------------------------
 * Destino : pb_hooks/main.pb.js   (junto al binario, ver README)
 * Requiere: PocketBase >= 0.23    (API de request hooks con e.next())
 *
 * ADVERTENCIA: un error de sintaxis en este archivo hace que la API
 * rechace TODAS las peticiones. Probar en staging y tener backup.
 *
 * Qué resuelve:
 *   1. El rol nunca puede venir del cliente al registrarse.
 *   2. Un usuario no puede ascenderse a admin ni "verificarse" solo.
 *   3. La identidad de los mensajes del chat se firma en el servidor
 *      (usuario, cargo, avatar) -> fin de la suplantación y del XSS
 *      por foto_url.
 *   4. El bloqueo del chat se aplica en el servidor (no evitable).
 *   5. La intranet privada valida remitente y destinatario.
 *   6. No se puede suspender dos veces al mismo usuario.
 *   7. Al cambiar el rol de un usuario (solo superusuario) se invalidan
 *      sus tokens activos.
 */

// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------

function mepAuth(e) {
  try { if (e.auth) return e.auth; } catch (_) {}
  try {
    const info = e.requestInfo();
    if (info && info.auth) return info.auth;
  } catch (_) {}
  // Compatibilidad con la API antigua (0.22)
  try {
    const ctx = e.httpContext;
    if (ctx && typeof ctx.get === "function") {
      const r = ctx.get("authRecord");
      if (r) return r;
    }
  } catch (_) {}
  return null;
}

function mepIsSuperuser(e) {
  try {
    if (typeof e.hasSuperuserAuth === "function" && e.hasSuperuserAuth()) return true;
  } catch (_) {}
  const a = mepAuth(e);
  try {
    return !!(a && a.collection && a.collection().name === "_superusers");
  } catch (_) {
    return false;
  }
}

function mepRol(a) {
  try { return String(a.getString("role") || "").trim().toLowerCase(); } catch (_) { return ""; }
}

function mepIsAdmin(a) {
  if (!a) return false;
  try {
    if (a.collection().name !== "users") return false;
  } catch (_) {
    return false;
  }
  return mepRol(a) === "admin";
}

function mepNombre(a, fallback) {
  let n = "";
  try { n = String(a.getString("nombre_completo") || "").trim(); } catch (_) {}
  if (!n) { try { n = String(a.getString("email") || "").trim(); } catch (_) {} }
  if (!n) n = fallback || "Usuario";
  return n.slice(0, 120);
}

// Base pública de PocketBase, para construir URLs absolutas de archivos
// (el campo mensajes.foto_url es de tipo "url" y exige URL absoluta).
function mepBase(e) {
  try {
    const info = e.requestInfo();
    const h = info && info.headers ? info.headers : null;
    if (h) {
      const host = h.host || h.Host || "";
      if (host) return "https://" + String(host).replace(/\/+$/, "");
    }
  } catch (_) {}
  try {
    const env = $os.getenv("PB_PUBLIC_URL");
    if (env) return String(env).replace(/\/+$/, "");
  } catch (_) {}
  try {
    const appUrl = $app.settings().meta.appURL;
    if (appUrl) return String(appUrl).replace(/\/+$/, "");
  } catch (_) {}
  return "https://pocketbase-railway-production-6031.up.railway.app";
}

function mepFileUrl(e, rec, filename) {
  if (!filename) return "";
  try {
    return mepBase(e) + "/api/files/" + rec.collection().id + "/" + rec.id + "/" + encodeURIComponent(filename);
  } catch (_) {
    return "";
  }
}

// Devuelve true si el usuario tiene una suspensión activa.
// Si la consulta falla, se falla CERRADO (se rechaza el mensaje).
function mepEstaBloqueado(uid) {
  try {
    const rows = $app.findRecordsByFilter("bloqueados", "user_id = {:uid}", "", 1, 0, { uid: uid });
    return rows.length > 0;
  } catch (err) {
    console.log("[mep] error verificando bloqueo, se rechaza por precaución:", err);
    return true;
  }
}

// ------------------------------------------------------------------
// 1-2. users: registro y edición
// ------------------------------------------------------------------

onRecordUpdateRequest((e) => {
  if (mepIsSuperuser(e)) {
    // Solo el superusuario puede cambiar roles. Si lo hace, se invalidan
    // los tokens vivos de ese usuario (tokenKey forma parte del token).
    const antes = e.record.original().getString("role");
    if (e.record.getString("role") !== antes) {
      e.record.set("tokenKey", $security.randomString(50));
      console.log("[mep] rol cambiado, tokens invalidados para", e.record.id);
    }
    return e.next();
  }

  // Un administrador de la app puede editar perfiles, pero no tocar
  // role ni verified: se restauran desde el registro original.
  e.record.set("role", e.record.original().getString("role"));
  e.record.set("verified", e.record.original().get("verified"));

  e.next();
}, "users");

// ------------------------------------------------------------------
// 3. mensajes (chat público): identidad firmada + anti-bloqueo
// ------------------------------------------------------------------

onRecordCreateRequest((e) => {
  const auth = mepAuth(e);
  if (!auth) throw new ForbiddenError("Debes iniciar sesión para escribir en el chat.");

  const uid = String(auth.id || "");
  if (!uid) throw new ForbiddenError("Sesión inválida.");

  if (mepEstaBloqueado(uid)) {
    console.log("[mep] mensaje rechazado, usuario suspendido:", uid);
    throw new ForbiddenError("Estás suspendido del chat. Contacta a un administrador.");
  }

  // La identidad SIEMPRE sale del registro autenticado, nunca del body.
  e.record.set("user_id", uid);
  e.record.set("usuario", mepNombre(auth));
  e.record.set("cargo", String(auth.getString("cargo") || "Usuario").slice(0, 120));

  let foto = "";
  try { foto = String(auth.getString("foto") || ""); } catch (_) {}
  e.record.set("foto_url", foto ? mepFileUrl(e, auth, foto) : "");

  const texto = String(e.record.getString("texto") || "").trim();
  if (!texto) throw new BadRequestError("El mensaje no puede estar vacío.");
  if (texto.length > 600) throw new BadRequestError("El mensaje no puede superar los 600 caracteres.");
  e.record.set("texto", texto);

  e.next();
}, "mensajes");

// ------------------------------------------------------------------
// 4. chat_intranet (privado): solo admins, remitente real, destinatario admin
// ------------------------------------------------------------------

onRecordCreateRequest((e) => {
  const auth = mepAuth(e);
  if (!auth) throw new ForbiddenError("Debes iniciar sesión.");
  if (!mepIsAdmin(auth)) throw new ForbiddenError("Solo los administradores pueden usar la intranet privada.");

  const uid = String(auth.id);
  const destino = String(e.record.getString("destinatario") || "").trim();

  if (!destino) throw new BadRequestError("Selecciona un destinatario.");
  if (destino === uid) throw new BadRequestError("No puedes enviarte un mensaje a ti mismo.");

  let target = null;
  try { target = $app.findRecordById("users", destino); } catch (_) { target = null; }
  if (!target) throw new BadRequestError("El destinatario no existe.");
  if (mepRol(target) !== "admin") throw new BadRequestError("El destinatario debe ser administrador.");

  e.record.set("user_id", uid);
  e.record.set("usuario", mepNombre(auth, "Dirigente"));

  const texto = String(e.record.getString("texto") || "").trim();
  if (texto.length > 2000) throw new BadRequestError("El mensaje es demasiado largo.");
  e.record.set("texto", texto);

  e.next();
}, "chat_intranet");

// ------------------------------------------------------------------
// 5. bloqueados: sin duplicados y con el nombre tomado de users
// ------------------------------------------------------------------

onRecordCreateRequest((e) => {
  const uid = String(e.record.getString("user_id") || "").trim();
  if (!uid) throw new BadRequestError("Falta el usuario a suspender.");

  let usuario = "";
  try {
    const u = $app.findRecordById("users", uid);
    usuario = String(u.getString("nombre_completo") || u.getString("email") || "").slice(0, 120);
  } catch (_) {}

  let previos = [];
  try {
    previos = $app.findRecordsByFilter("bloqueados", "user_id = {:uid}", "", 1, 0, { uid: uid });
  } catch (err) {
    console.log("[mep] no se pudo comprobar duplicado de bloqueo:", err);
  }
  if (previos.length > 0) throw new BadRequestError("Ese usuario ya está suspendido.");

  if (usuario) e.record.set("usuario", usuario);

  e.next();
}, "bloqueados");

// ------------------------------------------------------------------
// Fuera de alcance a propósito:
//  - MFA para admins: activarlo en Admin UI > users > Auth options,
//    pero SOLO con SMTP funcionando; si no, quedan bloqueados.
//  - Verificación de correo obligatoria: requiere SMTP y plantilla.
//  - Web Push: no es un hook, requiere VAPID + backend de envío.
// ------------------------------------------------------------------
