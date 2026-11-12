# MEP · PocketBase con hooks de seguridad
#
# Contexto de build: ESTA carpeta (donde están Dockerfile y pb_hooks/).
#
# >>> ANTES DE DESPLEGAR: cambia el tag `latest` por la versión exacta
# >>> que ya tienes en producción (Admin UI -> Settings -> About).
# >>> Un salto de versión migra la base de datos y no se deshace sin backup.
# >>> Ejemplo: ghcr.io/muchobien/pocketbase:0.23.12

FROM ghcr.io/muchobien/pocketbase:latest

# Imagen muchobien: arranca con --hooksDir=/pb_hooks
COPY pb_hooks /pb_hooks

# Imagen oficial pocketbase/pocketbase: WORKDIR=/pb y hooksDir por defecto.
# Deja solo la línea que corresponda a tu imagen.
COPY pb_hooks /pb/pb_hooks

# Nota: las dos rutas pueden coexistir sin problema; PocketBase solo carga
# el directorio indicado por --hooksDir, así que los hooks no se ejecutan dos veces.
