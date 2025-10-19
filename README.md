# Playground (Vue + Go)

Full-stack app with Vue 3 (Vite) frontend and Go (Gin) backend with SQLite. The server serves the built frontend from `server/dist` and exposes REST + SSE endpoints.

## Overview

- **Frontend build**: Vite outputs to `dist/` at project root during CI.
- **Server static files**: `server/main.go` serves from `./dist` relative to the server working dir.
- **Context loader**: `server/services/context_loader.go` reads `../src/pages` to enrich AI prompts.
- **Database**: SQLite file path from `DB_PATH` (default `./adrian.db`, relative to server working dir).

## Local Development

- **Install deps**
```bash
npm install
```

- **Run dev (frontend + server)**
```bash
npm run dev
```

- **Build locally**
```bash
npm run build
```

The build will produce `dist/` and a `server-binary` for local runs. The Docker build uses a separate multi-stage process (below).

## Docker

A root-level multi-stage `Dockerfile` builds the frontend and the Go server (with CGO for SQLite) and arranges runtime paths:

- `dist/` is copied to `/app/server/dist` so `server/main.go` can serve it.
- `src/pages/` is copied to `/app/src/pages` so the context loader can read `../src/pages` from the server working directory (`/app/server`).
- Default envs are set but can be overridden at runtime.

### Build and run

```bash
docker build -t playground:latest .

# Persist DB under ./data on the host; the container will use /data/adrian.db
docker run --rm -p 8080:8080 \
  -e ENV=production \
  -e PORT=8080 \
  -e DB_PATH=/data/adrian.db \
  -e OPENAI_API_KEY=your_key_optional \
  -v $(pwd)/data:/data \
  playground:latest
```

Open http://localhost:8080 and test `GET /api/coffee`.

## Deploying on Coolify v4

Coolify’s default Nixpacks won’t install Go for this mixed project. Use the provided Dockerfile.

### Steps

- **Create Application** in Coolify
- **Repository**: Connect this repo
- **Build**:
  - Build Type: Docker
  - Dockerfile Path: `Dockerfile`
  - Build Context: `.`
- **Environment variables**:
  - `ENV=production`
  - `PORT=8080`
  - `DB_PATH=/data/adrian.db` (recommended for persistence)
  - `OPENAI_API_KEY=<your-key>` (optional; enables AI chat/image)
  - Optional tuning: `DB_MAX_OPEN_CONNS`, `DB_MAX_IDLE_CONNS`
- **Ports**:
  - Exposed: `8080`
- **Volumes**:
  - Mount a persistent volume to `/data` (e.g. `playground-data:/data`)

Deploy. Coolify will build the multi-stage image and run the server.

### Notes

- `.env` file is optional in containers. `server/config/config.go` prefers process env and does not fail if `.env` is absent.
- Static assets are served from `server/dist` by these routes in `server/main.go`:
  - `r.StaticFS("/assets", http.Dir(filepath.Join(".", "dist", "assets")))`
  - `r.StaticFile("/favicon.png", filepath.Join(".", "dist", "favicon.png"))`
  - `r.StaticFile("/profile-2.jpg", filepath.Join(".", "dist", "profile-2.jpg"))`
  - `r.StaticFile("/interview-prompt.png", filepath.Join(".", "dist", "interview-prompt.png"))`
  - `r.StaticFile("/manifest.json", filepath.Join(".", "dist", "manifest.json"))`
- Client-side routing is handled by the catch-all `NoRoute` to serve `index.html` for non-`/api` paths.
- SSE streaming for `/api/chat/message` works behind Coolify’s proxy as standard HTTP; no special config is required.

## Endpoints (excerpt)

- `GET /api/coffee`
- `POST /api/coffee/increment`
- `POST /api/chat/message` (SSE streaming)
- `POST /api/chat/generate-image` (requires `OPENAI_API_KEY`)

## Troubleshooting

- If you see DB errors on restarts, ensure `DB_PATH` points to `/data/adrian.db` and `/data` is a persistent volume.
- If the UI 404s on refresh, confirm the built `dist/` is present under `/app/server/dist` in the container (the Dockerfile handles this).
