# ==============================================================================
# LIFE OS — Production Multi-Stage Dockerfile (Debian Node 22)
# ==============================================================================

# STAGE 1: Dependency Builder
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install compilation build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends     python3     make     g++     && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

# STAGE 2: Minimal Production Runtime
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install runtime utilities (curl for health check)
RUN apt-get update && apt-get install -y --no-install-recommends     curl     && rm -rf /var/lib/apt/lists/*

# Copy compiled dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy application source code and assets
COPY src ./src
COPY js ./js
COPY pages ./pages
COPY scripts ./scripts
COPY data ./data
COPY index.html ./
COPY script.js ./
COPY style.css ./
COPY server.cjs ./
COPY favicon.svg ./

# Create data directory with write permissions for node user
RUN mkdir -p /app/data /app/data/backups && chown -R node:node /app

# Drop root privileges
USER node

# Expose web server port
EXPOSE 3000

# Health check definition
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3   CMD curl -f http://localhost:3000/api/health || exit 1

# Start production server
CMD ["node", "server.cjs"]
