# syntax=docker/dockerfile:1

# One image runs both the web app (default command) and the worker (scripts/worker.ts).
# The worker and scripts are TypeScript run directly by Node 24, so the image keeps
# src/ and the production node_modules instead of Next's trimmed standalone output.

FROM node:24-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholders only for the build step; real values come from the server's .env at runtime.
RUN BETTER_AUTH_SECRET=build-placeholder BETTER_AUTH_URL=http://localhost:3000 npm run build

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY package.json next.config.ts tsconfig.json ./
COPY public ./public
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src ./src
RUN mkdir -p data && chown node:node data

USER node
VOLUME /app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Migrate on every start, so deploying a new version is just pulling the image.
CMD ["sh", "-c", "node scripts/migrate.ts && exec ./node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
