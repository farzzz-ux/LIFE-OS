# ==============================================================================
# LIFE OS — Production Multi-Stage Dockerfile
# Optimized for security, small image footprint, and non-root execution.
# ==============================================================================

# STAGE 1: Dependency Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install native compilation build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

# STAGE 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies for SQLite
RUN apk add --no-cache curl

# Copy dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy application source code and assets
COPY src ./src
COPY js ./js
COPY pages ./pages
COPY scripts ./scripts
COPY index.html ./
COPY script.js ./
COPY style.css ./
COPY server.cjs ./

# Create data directory with write permissions for non-root user
RUN mkdir -p /app/data /app/data/backups && chown -R node:node /app

# Drop root privileges
USER node

# Expose web server port
EXPOSE 3000

# Health check definition
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start production server
CMD ["node", "server.cjs"]
