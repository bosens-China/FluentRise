FROM node:22-alpine AS builder

ARG PNPM_VERSION=10.32.0

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --filter web...

COPY . .

ENV CI=true \
    NODE_ENV=production

RUN pnpm --filter web build

FROM nginx:alpine-slim

ENV TZ=Asia/Shanghai
ENV API_URL="http://backend:8000"

RUN apk upgrade --no-cache && \
    apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
