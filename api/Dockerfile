
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY app.js package.json ./

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=5 \
  CMD ["/nodejs/bin/node", "-e", "require('http').get('http://localhost:3000/api/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"]

CMD ["app.js"]
