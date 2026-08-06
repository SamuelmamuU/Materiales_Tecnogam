# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Install standard compilation dependencies for native modules if needed
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS app
RUN npm run build

# Clean development packages to keep image thin
RUN npm prune --production

# Stage 2: Production Run
FROM node:20-slim

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 3000

ENV NODE_ENV=production

# Run migrations and start app
CMD ["node", "dist/main"]
