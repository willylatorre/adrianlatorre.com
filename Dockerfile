# ---- Stage 1: Build the Vue.js Frontend ----
FROM node:22-alpine AS client
WORKDIR /app

# Install dependencies using npm ci for faster, deterministic builds
COPY package.json package-lock.json ./
RUN npm ci

# Copy sources and build the client
COPY . .
RUN npx vite build

# ---- Stage 2: Build the Go Backend ----
FROM golang:1.23-alpine AS server
WORKDIR /app/server

# Required toolchain for CGO (for github.com/mattn/go-sqlite3)
RUN apk add --no-cache build-base

# Cache Go modules
COPY server/go.mod server/go.sum ./
RUN go mod download

# Copy server sources
COPY server/ .

# Build a statically-linked binary with CGO enabled
ENV CGO_ENABLED=1
ENV GOOS=linux
RUN go build -o /server-binary .

# ---- Stage 3: Create the Final Production Image ----
FROM alpine:3.20
WORKDIR /app

# Add CA certificates for TLS and timezone data for correct log timestamps
RUN apk add --no-cache ca-certificates tzdata

# --- Security & User ---
# Create a non-root user and group for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create a directory for the database and give ownership to the app user
# This is the recommended target for your persistent volume mount.
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

# Copy built artifacts and set permissions
COPY --from=server /server-binary /app/server-binary
COPY --from=client /app/dist /app/dist
RUN chown appuser:appgroup /app/server-binary

# Switch to the non-root user
USER appuser

# Expose the app port (configurable via PORT env)
EXPOSE 8080

# --- Environment Configuration ---
# You can override these in Coolify's environment variables section
ENV PORT=8080
# The DB_PATH should point to the persistent volume directory
ENV DB_PATH=/app/data/adrian.db
ENV GIN_MODE=release

# Run the server
CMD ["/app/server-binary"]

