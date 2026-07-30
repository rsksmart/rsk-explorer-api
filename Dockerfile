FROM node:26-alpine AS base
RUN apk add --no-cache build-base git python3 openssl
WORKDIR /app
COPY package*.json ./

FROM base AS dependencies
RUN npm ci --omit=dev

FROM base AS prisma
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

FROM prisma AS build
COPY . .
RUN npm run build

FROM node:26-alpine AS production
RUN apk add --no-cache openssl && \
    npm install -g pm2 && \
    mkdir -p /var/log/rsk-explorer && \
    chown node:node /var/log/rsk-explorer

USER node
WORKDIR /home/node

RUN pm2 install pm2-logrotate && \
    pm2 set pm2-logrotate:compress true && \
    mkdir -p logs/api logs/blocks

COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=prisma /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=node:node --from=prisma /app/node_modules/prisma ./node_modules/prisma
COPY --chown=node:node --from=build /app/package*.json ./
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/config.json ./config.json
