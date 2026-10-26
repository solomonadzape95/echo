# syntax=docker/dockerfile:1

# BlindVote API — standalone echo-server image.
#
# This Dockerfile is for the `echo` repository (the server repo). The shared
# crypto core is vendored under src/vendor/blindvote-shared, so the image does
# not need the monorepo workspace.
FROM oven/bun:1-slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]
