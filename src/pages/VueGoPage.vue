<script setup lang="ts">
// Vue + Go page - explaining the tech stack combination
</script>

<template>
  <div class="max-w-4xl mx-auto py-8">
    <div class="space-y-8">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold mb-4">Vue + Go: A Full-Stack Exploration</h1>
        <p class="text-slate-600 text-lg">
          While Nuxt.js is undoubtedly the best way to build Vue applications with excellent SSR,
          routing, and ecosystem support, sometimes you want to explore the fundamentals and build
          something from scratch. This page demonstrates how to combine Vue.js on the frontend with
          Go on the backend.
        </p>
      </div>

      <!-- Source Code Alert -->
      <UAlert
        title="Check the Source Code!"
        description="This entire Vue + Go application is open source. Explore the complete implementation at GitHub."
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

      <!-- Why Vue + Go -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Why Vue + Go?</h2>
        <div class="prose prose-slate max-w-none">
          <p>This combination offers several advantages:</p>
          <ul>
            <li>
              <strong>Performance:</strong> Go's compiled nature and efficient HTTP handling
              provides excellent server performance
            </li>
            <li>
              <strong>Type Safety:</strong> Both Vue with TypeScript and Go provide strong typing
              throughout the stack
            </li>
            <li>
              <strong>Simplicity:</strong> No complex frameworks - just the essentials to understand
              the core concepts
            </li>
            <li>
              <strong>Learning:</strong> Building from scratch helps understand the fundamental
              building blocks
            </li>
          </ul>
          <p>
            That said, for production applications, I'd recommend Nuxt.js for Vue applications due
            to its mature ecosystem, excellent developer experience, and built-in optimizations.
          </p>
        </div>
      </div>

      <!-- Go Server Code -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Go Server Architecture</h2>
        <p class="text-slate-700 mb-4">
          Here's the main Go server file that serves the Vue application and provides API endpoints:
        </p>
        <div class="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto">
          <pre class="text-sm"><code>{{ goServerCode }}</code></pre>
        </div>
      </div>

      <!-- Package.json Commands -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Development Workflow</h2>
        <p class="text-slate-700 mb-4">
          The package.json includes scripts to manage both the Vue frontend and Go backend:
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

      <!-- Deploy to Coolify -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Deploy to Coolify</h2>
        <p class="text-slate-700 mb-4">
          Deploying complex applications with multiple technologies can be challenging. The easiest
          way to deploy a Vue + Go application is using Docker, which packages everything into a
          single container. Here's our Dockerfile that handles the multi-stage build:
        </p>
        <div class="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto">
          <pre class="text-sm"><code>{{ dockerfileCode }}</code></pre>
        </div>
        <p class="text-slate-700 mt-4">This Dockerfile uses multi-stage builds to:</p>
        <ul class="text-slate-700 ml-4 space-y-1">
          <li>• Build the Vue frontend with Node.js</li>
          <li>• Build the Go server with CGO enabled (required for SQLite)</li>
          <li>• Create a minimal Alpine runtime image</li>
        </ul>
        <p class="text-slate-700 mt-4">
          In Coolify, simply connect your repository and point it to this Dockerfile for seamless
          deployment.
        </p>
      </div>

      <!-- Demo -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Live Demo</h2>
        <p class="text-slate-700 mb-4">
          This iframe loads my personal website built with the same Vue + Go architecture:
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
          Demo: My portfolio website showcasing Vue + Go in production
        </p>
      </div>

      <!-- Final Source Code CTA -->
      <UAlert
        title="Ready to Build Your Own?"
        description="Fork this repository and adapt it for your own Vue + Go projects. The complete source code is available on GitHub."
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

<script lang="ts">
export default {
  data() {
    return {
      dockerfileCode: `# Multi-stage build for Vue (Vite) + Go (Gin + SQLite)

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
CMD ["./server-binary"]`,
      goServerCode: `package main

import (
	"log"
	"os"
	"os/signal"
	"strings"
	"net/http"
	"path/filepath"
	"syscall"

	"github.com/gin-gonic/gin"
	"playground-server/config"
	"playground-server/database"
	"playground-server/handlers"
	"playground-server/middleware"
	"playground-server/repository"
	"playground-server/services"
)

func main() {
	// Load configuration
	cfg := config.Load()
	log.Printf("Starting server in %s mode", cfg.Environment)

	// Initialize database with configuration
	db, err := database.InitDB(cfg.DatabasePath, cfg.MaxOpenConns, cfg.MaxIdleConns)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()


    // All of those are my server initializations, you will probably not have those
	// Initialize repository layer
	coffeeRepo := repository.NewCoffeeRepository(db)

	// Initialize services with context from Vue pages
	openAIService := services.NewOpenAIService(cfg.OpenAIAPIKey)

	// Initialize handlers with dependency injection
	coffeeHandler := handlers.NewCoffeeHandler(coffeeRepo)
	chatHandler := handlers.NewChatHandler(openAIService)

	// Initialize Gin router
	r := gin.Default()

	// Configure trusted proxies (development: trust localhost only)
	r.SetTrustedProxies(nil)

	// Apply middleware
	r.Use(middleware.CORS())

	// API routes, whatever the backend is
	api := r.Group("/api")
	{
		api.GET("/coffee", coffeeHandler.GetCoffee)
		api.POST("/coffee/increment", coffeeHandler.IncrementCoffee)
		api.POST("/chat/message", chatHandler.SendMessage)
		api.POST("/chat/generate-image", chatHandler.GenerateImage)
        ...
	}

	// Static file serving for VUE
	r.StaticFS("/assets", http.Dir(filepath.Join(".", "dist", "assets")))
	r.StaticFile("/favicon.png", filepath.Join(".", "dist", "favicon.png"))
	r.StaticFile("/profile-2.jpg", filepath.Join(".", "dist", "profile-2.jpg"))
	r.StaticFile("/interview-prompt.png", filepath.Join(".", "dist", "interview-prompt.png"))

	// Catch-all handler: serve index.html for client-side routing, the VUE part basically
	r.NoRoute(func(c *gin.Context) {
		// Only serve the Vue app for non-API routes
		if !strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.File(filepath.Join(".", "dist", "index.html"))
		}
	})

	// Start server
	port := ":" + cfg.ServerPort
	log.Printf("Server starting on port %s", port)
	go func() {
		if err := r.Run(port); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()
}`,
      packageCommands: [
        {
          name: 'Development',
          command: 'npm run dev',
          description: 'Run both Vue dev server and Go server concurrently',
        },
        {
          name: 'Vue Dev Server',
          command: 'vite --host',
          description: 'Start Vite development server for Vue',
        },
        {
          name: 'Go Server',
          command: 'cd server && go run main.go',
          description: 'Start Go server from server directory',
        },
        {
          name: 'Build',
          command: 'vite build && (cd server && go build -o ../server-binary .)',
          description:
            'Build Vue app and compile Go binary. The Go binary will be in the root directory.',
        },
        {
          name: 'Production',
          command: './server-binary',
          description: 'Run the compiled Go binary with built Vue assets',
        },
        {
          name: 'Type Generation',
          command: 'cd server && ~/go/bin/tygo generate',
          description: 'Generate TypeScript types from Go structs using tygo',
        },
      ],
    }
  },
}
</script>
