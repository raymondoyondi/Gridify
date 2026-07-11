# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app

# Install dependencies first to leverage layer caching
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Build the frontend (Vite) and bundle the server (esbuild) into dist/
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# Copy built artifacts and production dependencies
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000

# The production server serves the built frontend from dist/ on PORT 3000
CMD ["node", "dist/server.cjs"]
