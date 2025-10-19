package main

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
	log.Println("Starting Playground server...")
	
	// Log working directory for debugging
	if wd, err := os.Getwd(); err == nil {
		log.Printf("Working directory: %s", wd)
	}

	// Load configuration
	cfg := config.Load()
	log.Printf("Configuration loaded - Environment: %s, Port: %s", cfg.Environment, cfg.ServerPort)
	log.Printf("Database path: %s", cfg.DatabasePath)
	log.Printf("OpenAI API Key configured: %v", cfg.OpenAIAPIKey != "")

	// Initialize database with configuration
	log.Println("Initializing database...")
	db, err := database.InitDB(cfg.DatabasePath, cfg.MaxOpenConns, cfg.MaxIdleConns)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	log.Println("Database initialized successfully")
	defer db.Close()

	// Initialize repository layer
	log.Println("Initializing repository layer...")
	coffeeRepo := repository.NewCoffeeRepository(db)

	// Initialize services with context from Vue pages
	pagesDir := "/app/src/pages" // Relative to server directory
	log.Printf("Loading context from pages directory: %s", pagesDir)
	openAIService := services.NewOpenAIService(cfg.OpenAIAPIKey, pagesDir)
	log.Println("Services initialized")

	// Initialize handlers with dependency injection
	log.Println("Initializing handlers...")
	coffeeHandler := handlers.NewCoffeeHandler(coffeeRepo)
	chatHandler := handlers.NewChatHandler(openAIService)
	log.Println("Handlers initialized")

	// Initialize Gin router
	log.Println("Setting up Gin router...")
	r := gin.Default()
	log.Printf("Gin mode: %s", gin.Mode())

	// Configure trusted proxies (development: trust localhost only)
	// r.SetTrustedProxies([]string{"127.0.0.1", "::1"})
	r.SetTrustedProxies(nil)
	log.Println("Trusted proxies configured")

	// Apply middleware
	r.Use(middleware.CORS())
	log.Println("CORS middleware applied")



	// API routes
	log.Printf("Setting up API routes... for %v", gin.Mode())
	api := r.Group("/api")
	{
		// Health check endpoint (no auth required)
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})
		api.GET("/coffee", coffeeHandler.GetCoffee)
		api.POST("/coffee/increment", coffeeHandler.IncrementCoffee)
		api.POST("/chat/message", chatHandler.SendMessage)
		api.POST("/chat/generate-image", chatHandler.GenerateImage)
	}
	log.Println("API routes configured")

	if gin.Mode() == gin.ReleaseMode {
		log.Println("Production mode: Setting up static file serving...")

		// Check if we're running in Docker (working directory is /app) or locally (working directory is server/)
		var staticPath string
		if wd, _ := os.Getwd(); strings.HasPrefix(wd, "/app") {
			// Docker environment: absolute path
			staticPath = "/app/dist"
		} else {
			// Local development: relative to server directory
			staticPath = "./dist"

			if _, err := os.Stat(staticPath); os.IsNotExist(err) {
				staticPath = "../dist"
			}
		}

		log.Printf("Static files path: %s", staticPath)

		// Check if static files exist
		if _, err := os.Stat(staticPath); os.IsNotExist(err) {
			log.Printf("Static files directory not found: %s", staticPath)
		} else {
			log.Printf("Static files directory found: %s", staticPath)
		}

		r.StaticFS("/assets", http.Dir(filepath.Join(staticPath, "assets")))
		r.StaticFile("/favicon.png", filepath.Join(staticPath, "favicon.png"))
		r.StaticFile("/profile-2.jpg", filepath.Join(staticPath, "profile-2.jpg"))
		r.StaticFile("/interview-prompt.png", filepath.Join(staticPath, "interview-prompt.png"))
		r.StaticFile("/manifest.json", filepath.Join(staticPath, "manifest.json"))

		// Catch-all handler: serve index.html for client-side routing
		r.NoRoute(func(c *gin.Context) {
			if !strings.HasPrefix(c.Request.URL.Path, "/api") {
				indexPath := filepath.Join(staticPath, "index.html")
				if _, err := os.Stat(indexPath); os.IsNotExist(err) {
					c.String(404, "index.html not found")
					return
				}
				c.File(indexPath)
			}
		})
		log.Println("Static file serving configured")
	} else {
		log.Println("Development mode: API server only")
	}

	// Start server
	port := ":" + cfg.ServerPort
	log.Printf("Starting server on port %s", port)
	go func() {
		log.Printf("Server listening on %s", port)
		if err := r.Run(port); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Println("Server startup complete!")

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	log.Println("Waiting for shutdown signal...")
	<-quit
	log.Println("Shutting down server...")
	log.Println("Server exited")
}
