# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Export dist ────────────────────────────────────
# This stage just holds the dist output for volume mounting into nginx.
# The actual serving is done by the nginx service in docker-compose.
FROM alpine:3.19

WORKDIR /app/dist
COPY --from=builder /app/dist .

CMD ["sh", "-c", "echo 'Frontend build ready at /app/dist' && tail -f /dev/null"]
