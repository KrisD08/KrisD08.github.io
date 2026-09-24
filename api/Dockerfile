# api/Dockerfile — LAB-02
#
# Dos etapas:
#   1) "deps"    tiene npm y compila/instala dependencias.
#   2) "runtime" es una imagen "distroless": no tiene shell, ni npm, ni
#      gestor de paquetes, solo el runtime de Node y tu código. Reduce
#      drásticamente el tamaño y la superficie de ataque (Reto 1), y ya
#      corre como usuario sin privilegios por defecto (Reto 3).

# ---------- Etapa 1: instalar dependencias ----------
FROM node:20-alpine AS deps

WORKDIR /app

# Copiamos solo el manifiesto primero: si no cambian las dependencias,
# Docker reutiliza la capa de "npm install" de la caché aunque cambie app.js.
COPY package.json ./
RUN npm install --omit=dev

# ---------- Etapa 2: imagen final, mínima y sin root ----------
# La imagen "nonroot" de distroless ya trae un usuario sin privilegios
# (uid 65532) configurado como USER por defecto: no hace falta crearlo.
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY app.js package.json ./

EXPOSE 3000

# Sin curl ni shell disponibles: el propio Node hace la petición HTTP.
# CMD en forma "exec" (array) no necesita shell, por eso funciona aquí.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD ["node", "-e", "require('http').get('http://localhost:3000/api/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"]

# El ENTRYPOINT de esta imagen base ya es ["node"]; solo indicamos el script.
CMD ["app.js"]
