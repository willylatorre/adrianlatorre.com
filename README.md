# Playground (Vue + FastAPI)

Full-stack app with Vue 3 (Vite) frontend and a Python FastAPI backend with SQLite. The server serves the built frontend from `dist/` and exposes REST + SSE endpoints.

## Overview

- **Frontend build**: Vite outputs to `dist/` at project root.
- **Server static files**: `server/main.py` serves `dist/assets`, known public files, and falls back to `index.html` for client-side routes.
- **Context loader**: `server/context_loader.py` reads `src/pages` to enrich AI prompts.
- **Database**: SQLite file path comes from `DB_PATH` and defaults to `./adrian.db`.
- **OpenAI**: `OPENAI_API_KEY` enables chat streaming and image generation.

## Local Development

- **Install frontend deps**
```bash
npm install
```

- **Install backend deps**
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r server/requirements-dev.txt
```

- **Run dev (frontend + server)**
```bash
npm run dev
```

- **Build locally**
```bash
npm run build
```

- **Run production server locally**
```bash
npm run start
```

## Docker

The root-level multi-stage `Dockerfile` builds the frontend with Node and runs the FastAPI server in a Python runtime image.

### Build and run

```bash
docker build -t playground:latest .

docker run --rm -p 8080:8080 \
  -e ENV=production \
  -e PORT=8080 \
  -e DB_PATH=/app/data/adrian.db \
  -e OPENAI_API_KEY=your_key_optional \
  -v $(pwd)/data:/app/data \
  playground:latest
```

Open http://localhost:8080 and test `GET /api/coffee`.

## Deploying on Coolify v4

Use the provided Dockerfile.

- **Build Type**: Docker
- **Dockerfile Path**: `Dockerfile`
- **Build Context**: `.`
- **Environment variables**:
  - `ENV=production`
  - `PORT=8080`
  - `DB_PATH=/app/data/adrian.db`
  - `OPENAI_API_KEY=<your-key>` (optional; enables AI chat/image)
  - `OPENAI_MODEL=gpt-5-mini` (optional)
- **Ports**: expose `8080`
- **Volumes**: mount a persistent volume to `/app/data`

## Endpoints

- `GET /api/ping`
- `GET /api/coffee`
- `POST /api/coffee/increment`
- `POST /api/chat/message` (SSE streaming)
- `POST /api/chat/generate-image` (requires `OPENAI_API_KEY`)

## Checks

```bash
npm run type-check
npm run test
npm run test:server
```

## Troubleshooting

- If the coffee counter resets on deploy, confirm `DB_PATH` points inside the mounted persistent volume.
- If the UI 404s on refresh, confirm `dist/index.html` exists in the container.
- If chat or image routes return `openai client not configured`, set `OPENAI_API_KEY`.
