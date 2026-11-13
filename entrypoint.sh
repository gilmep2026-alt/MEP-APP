#!/bin/sh
# ============================================================================
# MEP · Entrypoint de PocketBase
# ----------------------------------------------------------------------------
# 1. Localiza el binario.
# 2. Comprueba que el data dir sea escribible y avisa si NO parece un volumen.
# 3. Crea/actualiza el superusuario desde PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD
#    (idempotente: se ejecuta en cada arranque).
# 4. Arranca el servidor con --dir apuntando SIEMPRE al data dir correcto.
# ============================================================================
set -eu

# ---------------------------------------------------------------- binario
PB_BIN=""
for candidato in /usr/local/bin/pocketbase /pocketbase /pb/pocketbase /app/pocketbase; do
  if [ -x "$candidato" ]; then PB_BIN="$candidato"; break; fi
done
if [ -z "$PB_BIN" ]; then
  PB_BIN="$(command -v pocketbase 2>/dev/null || true)"
fi
if [ -z "$PB_BIN" ]; then
  echo "[mep] ERROR: no se encontró el binario de PocketBase." >&2
  exit 1
fi

# ---------------------------------------------------------------- config
DATA_DIR="${PB_DATA_DIR:-/pb_data}"
HTTP_PORT="${PB_HTTP_PORT:-8090}"
HOOKS_DIR="${PB_HOOKS_DIR:-/pb_hooks}"

echo "[mep] binario   : $PB_BIN"
echo "[mep] data dir  : $DATA_DIR"
echo "[mep] puerto    : $HTTP_PORT"
echo "[mep] hooks dir : $HOOKS_DIR"

mkdir -p "$DATA_DIR" "$HOOKS_DIR" /pb_public /pb_migrations 2>/dev/null || true
chown "$(id -u):$(id -g)" "$DATA_DIR" 2>/dev/null || true

# ------------------------------------------- ¿está el data dir en el volumen?
if ! touch "$DATA_DIR/.mep_write_test" 2>/dev/null; then
  echo "[mep] ERROR: no se puede escribir en $DATA_DIR. Revisa el montaje del volumen." >&2
else
  rm -f "$DATA_DIR/.mep_write_test"
fi

DEV_ROOT="$(stat -c %d / 2>/dev/null || echo root)"
DEV_DATA="$(stat -c %d "$DATA_DIR" 2>/dev/null || echo data)"
if [ "$DEV_ROOT" = "$DEV_DATA" ]; then
  echo "[mep] AVISO: $DATA_DIR parece estar en el sistema de archivos efímero del contenedor."
  echo "[mep]        Si no es el volumen de Railway, la base se perderá en cada deploy."
fi

if [ -f "$DATA_DIR/data.db" ]; then
  echo "[mep] base de datos encontrada: $DATA_DIR/data.db"
else
  echo "[mep] PRIMER ARRANQUE: no existe data.db todavía."
fi

# ---------------------------------------------------------- superusuario
if [ -n "${PB_ADMIN_EMAIL:-}" ] && [ -n "${PB_ADMIN_PASSWORD:-}" ]; then
  echo "[mep] asegurando superusuario: $PB_ADMIN_EMAIL"
  if "$PB_BIN" superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir="$DATA_DIR"; then
    echo "[mep] superusuario OK (superuser upsert)"
  elif "$PB_BIN" admin upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir="$DATA_DIR"; then
    echo "[mep] superusuario OK (admin upsert, versión antigua)"
  else
    echo "[mep] ERROR: no se pudo crear/actualizar el superusuario." >&2
  fi
else
  echo "[mep] sin PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD: no se toca el superusuario."
fi

# --------------------------------------------------------------- servidor
exec "$PB_BIN" serve \
  --http="0.0.0.0:${HTTP_PORT}" \
  --dir="$DATA_DIR" \
  --hooksDir="$HOOKS_DIR" \
  --publicDir=/pb_public \
  --migrationsDir=/pb_migrations
