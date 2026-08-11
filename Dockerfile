# Lumière — single image serving the built client from the Express API.
#
# Build stage compiles the React app; the runtime stage carries only production
# dependencies and the built assets.

# ── build ────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# Vite inlines VITE_* variables at build time, so the publishable key has to be
# present now, not at runtime.
ARG VITE_CLERK_PUBLISHABLE_KEY=""
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

COPY package*.json ./
RUN npm ci

COPY client ./client
COPY vite.config.js ./
RUN npm run build

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY --from=build /app/dist ./dist

# Product photos and the JSON database live on a mounted volume.
RUN mkdir -p /app/server/data/uploads

EXPOSE 4000

# Fail the container if the API stops answering.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
