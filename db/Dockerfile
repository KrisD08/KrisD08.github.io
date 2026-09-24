# db/Dockerfile — LAB-02
#
# La imagen oficial de Postgres ejecuta, en orden alfabético, todo .sql que
# encuentre en /docker-entrypoint-initdb.d/, pero SOLO la primera vez que
# arranca con el volumen de datos vacío.
#
# postgres:16-alpine: tag fijo (nunca "latest") y base pequeña (Alpine).
# La propia imagen oficial ya arranca el proceso de Postgres con el usuario
# "postgres" (no root) internamente: por eso no hace falta un USER aquí
# para cumplir el Reto 3. Lo verificamos con `docker compose exec db whoami`.
FROM postgres:16-alpine

COPY init/ /docker-entrypoint-initdb.d/

# pg_isready viene incluido en la imagen oficial: no hay que instalar nada
# para tener un healthcheck real (Reto 2), a diferencia de web y api.
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=5 \
  CMD pg_isready -U "${POSTGRES_USER:-app}" -d "${POSTGRES_DB:-libro}" || exit 1
