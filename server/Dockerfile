# Build from the repo root: docker build -f server/Dockerfile .
FROM node:26-slim AS build
WORKDIR /app

COPY shared/package.json shared/package-lock.json shared/
COPY libs/eve-esi/package.json libs/eve-esi/package-lock.json libs/eve-esi/
COPY server/package.json server/package-lock.json server/
RUN npm ci --prefix shared \
  && npm ci --prefix libs/eve-esi \
  && npm ci --prefix server

COPY shared/ shared/
COPY libs/eve-esi/ libs/eve-esi/
COPY server/ server/
RUN npm run build --prefix shared \
  && npm run build --prefix libs/eve-esi \
  && npm run build --prefix server \
  && npm prune --omit=dev --prefix server

FROM node:26-slim
ENV NODE_ENV=production
WORKDIR /app

# server/node_modules links to ../shared and ../libs/eve-esi, so keep this layout.
COPY --from=build /app/shared/package.json shared/
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/libs/eve-esi/package.json libs/eve-esi/
COPY --from=build /app/libs/eve-esi/dist libs/eve-esi/dist
COPY --from=build /app/server/package.json server/
COPY --from=build /app/server/node_modules server/node_modules
COPY --from=build /app/server/dist server/dist

WORKDIR /app/server
USER node
CMD ["node", "dist/server.js"]
