<script lang="ts" setup>
import CodeSnippet from '@/components/CodeSnippet.vue'

const dockerfileCode = `# ---- Stage 1: Build the Vue.js Frontend ----
FROM node:22-alpine AS client
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx vite build

# ---- Stage 2: Create the Python Runtime ----
FROM python:3.14-alpine AS server
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata
COPY server/requirements.txt ./server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY server /app/server
COPY --from=client /app/dist /app/dist
COPY --from=client /app/src/pages /app/src/pages

RUN mkdir -p /app/data && chown -R appuser:appgroup /app && chmod -R 755 /app
USER appuser

EXPOSE 8080
ENV PORT=8080
ENV DB_PATH=/app/data/adrian.db
ENV ENV=production

CMD ["python", "-m", "server.main"]`

const fastApiServerCode = `from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Adrian Latorre API")

@app.get("/api/ping")
async def ping():
    return "pong"

@app.get("/api/coffee")
async def get_coffee():
    return {"data": coffee_repository.get()}

@app.post("/api/coffee/increment")
async def increment_coffee():
    return {
        "data": coffee_repository.increment(),
        "message": "Coffee counter incremented",
    }

@app.post("/api/chat/message")
async def send_message(request: ChatRequest):
    if openai_service.client is None:
        raise HTTPException(status_code=500, detail="openai client not configured")

    async def events():
        async for chunk in openai_service.stream_chat(request.messages, request.prompt):
            yield f"data: {chunk}\\n\\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )

app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

# Non-API routes fall back to dist/index.html so Vue Router can handle them.`

const packageCommands = [
  {
    name: 'Development',
    command: 'npm run dev',
    description: 'Run both Vite and the FastAPI server concurrently',
  },
  {
    name: 'Vue Dev Server',
    command: 'vite --host',
    description: 'Start Vite for the Vue client',
  },
  {
    name: 'FastAPI Server',
    command: 'python3 -m uvicorn server.main:app --reload --host 0.0.0.0 --port 8080',
    description: 'Start the API server with hot reload',
  },
  {
    name: 'Build',
    command: 'vite build',
    description: 'Build the Vue app. Docker installs Python dependencies for production.',
  },
  {
    name: 'Production',
    command: 'python3 -m server.main',
    description: 'Run FastAPI with Uvicorn, serving the built Vue assets',
  },
  {
    name: 'Types',
    command: 'Use /api/openapi.json as the source of truth',
    description: 'The small client type file mirrors the Pydantic response models',
  },
]
</script>

<template>
  <div class="max-w-4xl mx-auto py-8">
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold mb-4">Vue + FastAPI: AI-Ready Full Stack</h1>
        <p class="text-slate-600 text-lg">
          This project pairs a Vue 3 frontend with a FastAPI backend for a compact portfolio,
          SQLite-backed counters, server-sent chat streaming, and OpenAI-powered image generation.
          The goal is to keep deployment simple while making AI experiments easier to iterate on in
          Python.
        </p>
      </div>

      <UAlert
        title="Check the Source Code"
        description="This Vue + FastAPI application is open source. Explore the complete implementation at GitHub."
        icon="i-lucide-github"
        color="success"
        variant="soft"
        :actions="[
          {
            label: 'View on GitHub',
            to: 'https://github.com/willylatorre/adrianlatorre.com',
            target: '_blank',
            icon: 'i-lucide-external-link',
          },
        ]"
      />

      <div>
        <h2 class="text-xl font-semibold mb-4">Why Vue + FastAPI?</h2>
        <div class="prose prose-slate max-w-none">
          <p>This combination keeps the stack practical for a small product surface:</p>
          <ul>
            <li>
              <strong>AI ecosystem:</strong> Python has strong SDK, evaluation, notebook, and data
              tooling for OpenAI workflows.
            </li>
            <li>
              <strong>Typed contracts:</strong> Pydantic models feed FastAPI's OpenAPI schema, which
              can drive TypeScript generation as the API grows.
            </li>
            <li>
              <strong>Streaming:</strong> FastAPI's <code>StreamingResponse</code> preserves the
              existing Vue client contract for <code>text/event-stream</code> chat chunks.
            </li>
            <li>
              <strong>Deployment:</strong> One Docker image still serves the built Vue app, the API,
              and the persistent SQLite file.
            </li>
          </ul>
          <p>
            Go remains a strong option for simple single-binary deployments. Here, Python wins
            because the most active experimentation is around OpenAI and LLM features.
          </p>
        </div>
      </div>

      <div>
        <h2 class="text-xl font-semibold mb-4">FastAPI Server Shape</h2>
        <p class="text-slate-700 mb-4">
          The backend keeps the old public API stable while moving the implementation to Pydantic,
          SQLite, and the OpenAI Python SDK:
        </p>
        <CodeSnippet :code="fastApiServerCode" language="python" />
      </div>

      <div>
        <h2 class="text-xl font-semibold mb-4">Development Workflow</h2>
        <p class="text-slate-700 mb-4">
          The package scripts run Vite and FastAPI together locally, then Docker handles the
          production Python runtime:
        </p>
        <div class="bg-slate-50 border rounded-lg p-4">
          <div class="space-y-3">
            <div
              v-for="command in packageCommands"
              :key="command.name"
              class="border-b border-slate-200 pb-3 last:border-b-0 last:pb-0"
            >
              <h3 class="font-medium text-slate-900 mb-1">{{ command.name }}</h3>
              <code class="text-sm bg-white px-2 py-1 rounded border">{{ command.command }}</code>
              <p class="text-sm text-slate-600 mt-1">{{ command.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 class="text-xl font-semibold mb-4">Deploy to Coolify</h2>
        <p class="text-slate-700 mb-4">
          The multi-stage Dockerfile builds Vue assets with Node, installs FastAPI dependencies in a
          Python runtime image, and keeps SQLite under <code>/app/data</code> for a persistent
          Coolify volume:
        </p>
        <CodeSnippet :code="dockerfileCode" language="dockerfile" />
        <p class="text-slate-700 mt-4">In Coolify, configure these environment variables:</p>
        <ul class="text-slate-700 ml-4 space-y-1">
          <li>• <code>PORT=8080</code></li>
          <li>• <code>DB_PATH=/app/data/adrian.db</code></li>
          <li>• <code>OPENAI_API_KEY=&lt;your-key&gt;</code></li>
          <li>• Mount a persistent volume to <code>/app/data</code></li>
        </ul>
      </div>

      <div>
        <h2 class="text-xl font-semibold mb-4">Live Demo</h2>
        <p class="text-slate-700 mb-4">
          This iframe loads the production site using the same Vue + FastAPI architecture:
        </p>
        <div class="border-2 border-slate-200 rounded-lg overflow-hidden">
          <iframe
            src="https://adrianlatorre.com"
            class="w-full h-96"
            title="Adrian Latorre - Portfolio"
            sandbox="allow-scripts allow-same-origin"
          ></iframe>
        </div>
        <p class="text-xs text-slate-500 mt-2">
          Demo: My portfolio website showcasing Vue + FastAPI in production
        </p>
      </div>

      <UAlert
        title="Ready to Build Your Own?"
        description="Fork this repository and adapt it for your own Vue + FastAPI projects. The complete source code is available on GitHub."
        icon="i-lucide-code"
        color="success"
        variant="soft"
        :actions="[
          {
            label: 'Fork on GitHub',
            to: 'https://github.com/willylatorre/adrianlatorre.com',
            target: '_blank',
            icon: 'i-lucide-git-fork',
          },
        ]"
      />
    </div>
  </div>
</template>
