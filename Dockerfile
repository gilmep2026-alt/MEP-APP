# ============================================================================
# MEP · PocketBase con hooks, superusuario idempotente y datos persistentes
# ----------------------------------------------------------------------------
# Contexto de build: esta carpeta (Dockerfile + pb_hooks/ + entrypoint.sh).
#
# >>> Fija el tag de la versión que ya tienes desplegada
# >>> (Admin UI -> Settings -> About). Ejemplo: :0.23.12
# >>> Un salto de versión migra la base de datos y no se deshace sin backup.
# ============================================================================

ARG PB_IMAGE=ghcr.io/muchobien/pocketbase:latest
FROM ${PB_IMAGE}

# Ruta INTERNA del data dir. Debe coincidir con el "Mount path" del volumen
# de Railway. Si tu volumen está montado en /data, define PB_DATA_DIR=/data
# en las variables del servicio.
ENV PB_DATA_DIR=/pb_data

# Puerto interno. Debe coincidir con el "Target Port" del servicio en Railway.
ENV PB_HTTP_PORT=8090

# Hooks (este proyecto). Se copian a las dos rutas posibles para que funcione
# tanto con la imagen muchobien (--hooksDir=/pb_hooks) como con la oficial
# (WORKDIR /pb, hooksDir por defecto). PocketBase solo carga una de las dos.
COPY pb_hooks /pb_hooks
COPY pb_hooks /pb/pb_hooks

COPY entrypoint.sh /usr/local/bin/mep-entrypoint.sh
# sed elimina posibles CRLF (si el archivo se editó en Windows) y luego da permisos.
RUN sed -i 's/\r$//' /usr/local/bin/mep-entrypoint.sh && chmod +x /usr/local/bin/mep-entrypoint.sh

EXPOSE 8090

ENTRYPOINT ["/usr/local/bin/mep-entrypoint.sh"]
