# ---------- 1. Builder stage ----------
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --omit=dev


# ---------- 2. Runtime stage ----------
FROM node:20-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

STOPSIGNAL SIGINT

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

USER node

EXPOSE 3333
EXPOSE 3334

CMD ["node", "dist/index.js"]