# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  cairo-dev \
  jpeg-dev \
  pango-dev \
  giflib-dev \
  librsvg-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
  cairo \
  jpeg \
  pango \
  giflib \
  librsvg \
  tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Copy application files
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p temp uploads docs && \
  chown -R nodejs:nodejs temp uploads docs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "src/app.js"] 