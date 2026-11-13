# Everything here is plain JavaScript (node:sqlite is built in, tuyapi has no native code), so both stages run on the runner's arch
FROM --platform=$BUILDPLATFORM node:26-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY . .
RUN npm run build

FROM --platform=$BUILDPLATFORM node:26-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev --ignore-scripts

FROM node:26-slim
ARG APP_VERSION=dev
ENV NODE_ENV=production \
    APP_VERSION=$APP_VERSION \
    DATABASE_PATH=/data/della.db \
    PORT=4646
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/web/dist web/dist
VOLUME /data
EXPOSE 4646
CMD ["node", "server/dist/index.mjs"]
