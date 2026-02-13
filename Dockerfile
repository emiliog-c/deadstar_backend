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

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /server/.medusa ./.medusa
RUN if [ -d ./.medusa/server/public ]; then cp -R ./.medusa/server/public ./public; fi
RUN if [ -d ./.medusa/server/src ]; then cp -R ./.medusa/server/src ./src; fi
RUN if [ -f ./.medusa/server/medusa-config.js ]; then cp ./.medusa/server/medusa-config.js ./medusa-config.js; fi
RUN if [ -f ./.medusa/server/instrumentation.js ]; then cp ./.medusa/server/instrumentation.js ./instrumentation.js; fi

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start production server (skip rebuild since we already built)
CMD ["pnpm", "medusa", "start"]