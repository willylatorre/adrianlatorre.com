# ---- Stage 1: Build the Vue.js Frontend ----
FROM node:22-alpine AS client
WORKDIR /app

# Install dependencies using npm ci for faster, deterministic builds
COPY package.json package-lock.json ./
RUN npm ci

# Copy sources and build the client
COPY . .
RUN npx vite build

# ---- Stage 2: Create the Python Runtime ----
FROM python:3.14-slim AS server
WORKDIR /app

# Add CA certificates for TLS and timezone data for correct log timestamps
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for better layer caching
COPY server/requirements.txt ./server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# Create a non-root user and group for runtime
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

# Copy built artifacts first
COPY server /app/server
COPY --from=client /app/dist /app/dist
COPY --from=client /app/src/pages /app/src/pages

# Create a directory for the database and give ownership to the app user
# This is the recommended target for your persistent volume mount.
RUN mkdir -p /app/data && chown -R appuser:appgroup /app && chmod -R 755 /app

# Switch to the non-root user
USER appuser

# Expose the app port (configurable via PORT env)
EXPOSE 8080

# --- Environment Configuration ---
# You can override these in Coolify's environment variables section
ENV PORT=8080

# Database configuration
# Persistent database path (bind this directory in Coolify for survival across deploys)
ENV DB_PATH=/app/data/adrian.db

ENV ENV=production

# Run the server
CMD ["python", "-m", "server.main"]
