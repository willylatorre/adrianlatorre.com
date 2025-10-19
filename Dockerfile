# Multi-stage build for Vue (Vite) + Go (Gin + SQLite)

# 1) Build frontend
FROM node:22-alpine AS client
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy sources and build only the client (avoid running package.json build which also builds Go)
COPY . .
RUN npx vite build

# 2) Build Go server with CGO (required for github.com/mattn/go-sqlite3)
FROM golang:1.24-alpine AS server
WORKDIR /app/server

# Required toolchain for CGO/sqlite
RUN apk add --no-cache build-base

# Cache go modules first
COPY server/go.mod server/go.sum ./
RUN go mod download

# Copy server sources
COPY server/ .

# Build statically-linked-ish binary with CGO enabled
ENV CGO_ENABLED=1
ENV GOOS=linux
# Use default arch to let builder pick suitable target
RUN go build -o /app/server/server-binary .

# 3) Final runtime image
FROM alpine:3.20
WORKDIR /app/server

# CA certs and timezone data (TLS & logs)
RUN apk add --no-cache ca-certificates tzdata

# Copy server binary
COPY --from=server /app/server/server-binary ./server-binary

# Copy built frontend into server/dist so the Go server can serve it from ./dist
COPY --from=client /app/dist ./dist

# Copy Vue source pages for context loader (server expects ../src/pages relative to this working dir)
COPY --from=client /app/src/pages /app/src/pages

# Expose the app port (configurable via PORT env)
EXPOSE 8080

# Default environment configuration
ENV PORT=8080
# Recommend overriding to a volume path in Coolify, e.g. /data/adrian.db
ENV DB_PATH=/app/data/adrian.db
ENV ENV=production

# Run the server
CMD ["./server-binary"]
