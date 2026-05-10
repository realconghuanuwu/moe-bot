# Build stage
FROM node:20-slim AS base
# Cài đặt toolchain để build native module (node-gyp) + FFmpeg runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python-is-python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

# Runner stage
FROM base AS runner
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Ensure the bot runs in production mode
ENV NODE_ENV=production

# Start the bot
CMD [ "pnpm", "start" ]
