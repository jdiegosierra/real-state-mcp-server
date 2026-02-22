FROM node:22-slim AS base
RUN corepack enable pnpm

# --- Build stage ---
FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY prisma ./prisma/
RUN pnpm db:generate
COPY src ./src/
RUN pnpm build

# --- Production stage ---
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile && pnpm db:generate
COPY --from=build /app/dist ./dist/

EXPOSE 3000
CMD ["node", "dist/src/index.js"]
