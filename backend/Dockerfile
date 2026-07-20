FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV NO_PROXY=$NO_PROXY

ARG NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
ARG NPM_CONFIG_FETCH_TIMEOUT=600000
ARG NPM_CONFIG_FETCH_RETRIES=5
ARG NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ARG NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_REGISTRY=$NPM_CONFIG_REGISTRY
ENV NPM_CONFIG_FETCH_TIMEOUT=$NPM_CONFIG_FETCH_TIMEOUT
ENV NPM_CONFIG_FETCH_RETRIES=$NPM_CONFIG_FETCH_RETRIES
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=$NPM_CONFIG_FETCH_RETRY_MINTIMEOUT
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=$NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public
ENV DATABASE_URL=$DATABASE_URL

RUN npm run prisma:generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl gosu \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
