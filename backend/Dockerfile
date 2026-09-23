# syntax=docker/dockerfile:1

# --- Build stage: install all deps (incl. dev) and compile TypeScript ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage: production deps only + compiled output ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Non-root user: never run the server as root in a container.
RUN addgroup -g 1001 nodejs && adduser -S -u 1001 -G nodejs appuser

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Uploads directory (local-disk storage adapter, src/config/storage.ts) —
# mount a volume here in production, or point PUBLIC_MEDIA_BASE_URL /
# swap the storage adapter for S3/Cloudinary instead of relying on
# container-local disk, which doesn't survive a redeploy.
RUN mkdir -p /app/uploads && chown -R appuser:nodejs /app/uploads

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
