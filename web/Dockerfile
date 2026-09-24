# web/Dockerfile — LAB-02
#
# OJO al contexto de build: este Dockerfile vive en web/, pero copia
# index.html y libro-de-visitas.js que están en la RAÍZ del repo. Por eso en
# compose.yaml el "context" de este servicio es "." (la raíz) y el
# "dockerfile" apunta aquí con "web/Dockerfile". El build context es la
# carpeta que Docker "ve"; la ruta del Dockerfile es solo dónde están las
# instrucciones.
#
# nginx-unprivileged: la misma nginx oficial, pero ya configurada para
# escuchar en el puerto 8080 (no el 80) y correr como usuario "nginx" sin
# privilegios. La imagen normal de nginx necesita root para abrir el
# puerto 80 (todo puerto <1024 requiere el privilegio CAP_NET_BIND_SERVICE);
# usando 8080 evitamos esa necesidad por completo (Reto 3).
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY --chown=nginx:nginx index.html /usr/share/nginx/html/index.html
COPY --chown=nginx:nginx libro-de-visitas.js /usr/share/nginx/html/libro-de-visitas.js
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

# Imagen basada en Alpine: trae wget (de busybox), así que no hace falta
# instalar curl solo para el healthcheck.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget --spider -q http://localhost:8080/ || exit 1
