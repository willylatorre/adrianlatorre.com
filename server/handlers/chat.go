package handlers

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"playground-server/models"
	"playground-server/services"
)

// ChatHandler handles AI chat requests
type ChatHandler struct {
	chatService services.ChatService
}

// NewChatHandler creates a new chat handler
func NewChatHandler(chatService services.ChatService) *ChatHandler {
	return &ChatHandler{chatService: chatService}
}

// SendMessage handles streaming chat messages from OpenAI using the official openai-go library
func (h *ChatHandler) SendMessage(c *gin.Context) {
	var req models.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERROR: Invalid request: %v", err)
		c.JSON(400, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	// Adding a timeout: Add timeout
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Minute)
	defer cancel()

	err := h.chatService.StreamChat(ctx, req.Messages, req.Prompt, func(chunk string) {
		fmt.Fprintf(c.Writer, "data: %s\n\n", chunk)
		c.Writer.Flush()
	})

	if err != nil {
		log.Printf("ERROR: Stream error: %v", err)
	}
}

// GenerateImage handles image generation requests
func (h *ChatHandler) GenerateImage(c *gin.Context) {
	var req models.ImageGenerationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERROR: Invalid image generation request: %v", err)
		c.JSON(400, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 1*time.Minute)
	defer cancel()

	imageURL, err := h.chatService.GenerateImage(ctx, req.Prompt)
	if err != nil {
		log.Printf("ERROR: Image generation error: %v", err)
		c.JSON(500, gin.H{
			"error": "Failed to generate image",
		})
		return
	}

	c.JSON(200, models.ImageGenerationResponse{
		ImageURL: imageURL,
	})
}
