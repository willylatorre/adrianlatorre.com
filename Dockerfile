# Multi-stage build for Vue (Vite) + Go (Gin + SQLite)

# ---- Stage 1: Build the Vue.js Frontend ----
FROM node:22-alpine AS client
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build


# ---- Stage 2: Build the Go Backend ----
FROM golang:1.24-alpine AS server
WORKDIR /app
# Required toolchain for CGO/sqlite
RUN apk add --no-cache build-base
COPY ./server ./server
# Build statically-linked-ish binary with CGO disabled
ENV CGO_ENABLED=1
ENV GOOS=linux
RUN cd server && go build -o /server-binary .

# ---- Stage 3: Create the Final Production Image ----

FROM alpine:3.20
WORKDIR /app


# --- Security & User ---
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create the directory for the database and give ownership to the app user
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

# Switch to the non-root user
USER appuser

# Copy server binary
COPY --from=server /server-binary /app/server-binary
COPY --from=client /app/dist /app/dist

# Copy Vue source pages for context loader (server expects ../src/pages relative to this working dir)
COPY --from=client /app/src/pages /app/src/pages

# Expose the app port (configurable via PORT env)
EXPOSE 8080

# Run the server
CMD ["/app/server-binary"]
