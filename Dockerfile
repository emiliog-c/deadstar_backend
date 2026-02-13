# Build stage
FROM node:20-alpine AS builder

WORKDIR /server

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build-time placeholders required by Medusa config
ENV DATABASE_URL=postgres://localhost:5432/medusa-build
ENV STORE_CORS=http://localhost:3000
ENV ADMIN_CORS=http://localhost:9000
ENV AUTH_CORS=http://localhost:3000,http://localhost:9000
ENV JWT_SECRET=build-secret
ENV COOKIE_SECRET=build-secret
ENV DB_SSL=false

# Build for production
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /server

ENV NODE_ENV=production

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install runtime + build dependencies (needed because start script runs medusa build)
RUN pnpm install --frozen-lockfile

# Copy source application from builder
COPY --from=builder /server/src ./src
COPY --from=builder /server/medusa-config.ts ./medusa-config.ts
COPY --from=builder /server/instrumentation.ts ./instrumentation.ts
COPY --from=builder /server/tsconfig.json ./tsconfig.json
COPY --from=builder /server/static ./static

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server (runs build then start via package.json)
CMD ["pnpm", "start"]