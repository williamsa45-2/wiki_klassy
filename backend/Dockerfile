# Imagen del backend de la wiki. Etapas:
#   produccion   -> la API compilada (node dist/server.js), la que corre en el VPS.
#   herramientas -> código fuente + tsx para correr scripts (npm run crear-admin).

FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencias AS compilacion
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM dependencias AS herramientas
ENV NODE_ENV=production
COPY tsconfig.json tsconfig.scripts.json ./
COPY src ./src
COPY scripts ./scripts
CMD ["npm", "run", "crear-admin"]

FROM node:22-alpine AS produccion
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=compilacion /app/dist ./dist
# Los archivos subidos viven en /app/uploads: en compose es un volumen.
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 4100
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4100/health > /dev/null || exit 1
CMD ["node", "dist/server.js"]
