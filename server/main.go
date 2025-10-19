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
	// Load configuration
	cfg := config.Load()
	log.Printf("Starting server in %s mode", cfg.Environment)

	// Initialize database with configuration
	db, err := database.InitDB(cfg.DatabasePath, cfg.MaxOpenConns, cfg.MaxIdleConns)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize repository layer
	coffeeRepo := repository.NewCoffeeRepository(db)

	// Initialize services with context from Vue pages
	pagesDir := "/app/src/pages" // Relative to server directory
	openAIService := services.NewOpenAIService(cfg.OpenAIAPIKey, pagesDir)

	// Initialize handlers with dependency injection
	coffeeHandler := handlers.NewCoffeeHandler(coffeeRepo)
	chatHandler := handlers.NewChatHandler(openAIService)

	// Initialize Gin router
	r := gin.Default()

	// Configure trusted proxies (development: trust localhost only)
	// r.SetTrustedProxies([]string{"127.0.0.1", "::1"})
	r.SetTrustedProxies(nil)

	// Apply middleware
	r.Use(middleware.CORS())

	// API routes
	api := r.Group("/api")
	{
		api.GET("/coffee", coffeeHandler.GetCoffee)
		api.POST("/coffee/increment", coffeeHandler.IncrementCoffee)
		api.POST("/chat/message", chatHandler.SendMessage)
		api.POST("/chat/generate-image", chatHandler.GenerateImage)
	}



	// --- Static File Serving ---
	// This tells Gin to serve files from the './dist' directory.
	// For example, a request to '/assets/index-a1b2c3d4.js' will serve
	// the file './dist/assets/index-a1b2c3d4.js'.
	// This is the key to fixing the MIME type error.
	r.StaticFS("/assets", http.Dir(filepath.Join(".", "dist", "assets")))
	r.StaticFile("/favicon.png", filepath.Join(".", "dist", "favicon.png"))
	r.StaticFile("/profile-2.jpg", filepath.Join(".", "dist", "profile-2.jpg"))
	r.StaticFile("/interview-prompt.png", filepath.Join(".", "dist", "interview-prompt.png"))
	// Serve other static files if they exist at the root of dist
	r.StaticFile("/manifest.json", filepath.Join(".", "dist", "manifest.json"))


	// Catch-all handler: serve index.html for client-side routing
	r.NoRoute(func(c *gin.Context) {
		// Only serve the Vue app for non-API routes
		if !strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.File(filepath.Join("/app/dist", "index.html"))
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

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")
	log.Println("Server exited")
}
