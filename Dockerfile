# Development Dockerfile for Medusa
FROM node:20-alpine

# Set working directory
WORKDIR /server

# Install pnpm globally
RUN npm install pnpm -g

# Copy package files and yarn config
COPY package.json pnpm-lock.yaml* ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Expose the port Medusa runs on
EXPOSE 9000 5173

# Start with migrations and then the development server
ENTRYPOINT ["./start.sh"]