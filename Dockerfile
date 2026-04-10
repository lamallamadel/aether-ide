# Build stage
FROM node:23-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --ignore-scripts || npm install --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:23-alpine

WORKDIR /app

# Install lightweight HTTP server
RUN npm install -g serve

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
