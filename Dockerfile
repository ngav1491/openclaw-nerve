FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  python3 \
  make \
  g++ \
  pkg-config \
  ffmpeg \
  curl \
  tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .
RUN pnpm run build

FROM base AS runtime

ENV NODE_ENV=production
ENV HOME=/data

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist
COPY --from=build /app/server-dist ./server-dist

RUN mkdir -p /data && chown -R node:node /app /data

USER node
EXPOSE 3080

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server-dist/index.js"]
