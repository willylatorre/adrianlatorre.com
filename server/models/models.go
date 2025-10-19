package models

import (
	"time"
	
	"playground-server/database"
)

// Coffee represents the coffee counter model
type Coffee struct {
	ID         int       `json:"id"`
	Counter    int       `json:"counter"`
	LastUpdate time.Time `json:"last_update"`
}

// GetCoffee retrieves the current coffee counter from the database
func GetCoffee() (Coffee, error) {
	var coffee Coffee
	row := database.DB.QueryRow("SELECT id, counter, last_update FROM coffee LIMIT 1")
	err := row.Scan(&coffee.ID, &coffee.Counter, &coffee.LastUpdate)
	return coffee, err
}

// UpdateCoffeeCounter increments the coffee counter and updates the last_update timestamp
// Uses RETURNING clause for atomic operation (SQLite 3.35+)
func UpdateCoffeeCounter() (Coffee, error) {
	var coffee Coffee
	err := database.DB.QueryRow(`
		UPDATE coffee 
		SET counter = counter + 1, last_update = CURRENT_TIMESTAMP 
		WHERE id = (SELECT id FROM coffee LIMIT 1)
		RETURNING id, counter, last_update
	`).Scan(&coffee.ID, &coffee.Counter, &coffee.LastUpdate)
	
	return coffee, err
}

// ResetCoffeeCounter resets the coffee counter to 0 and updates the last_update timestamp
// Uses RETURNING clause for atomic operation (SQLite 3.35+)
func ResetCoffeeCounter() (Coffee, error) {
	var coffee Coffee
	err := database.DB.QueryRow(`
		UPDATE coffee 
		SET counter = 0, last_update = CURRENT_TIMESTAMP 
		WHERE id = (SELECT id FROM coffee LIMIT 1)
		RETURNING id, counter, last_update
	`).Scan(&coffee.ID, &coffee.Counter, &coffee.LastUpdate)
	
	return coffee, err
}

// ChatMessage represents a message in a chat conversation
type ChatMessage struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Content   string `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

// ChatRequest represents the incoming chat request from the client
type ChatRequest struct {
	Messages []ChatMessage `json:"messages"`
	Prompt   string        `json:"prompt"`
}

// ChatResponse represents a streaming chunk from the AI
type ChatResponse struct {
	Chunk string `json:"chunk"`
}

// ImageGenerationRequest represents a request to generate an image
type ImageGenerationRequest struct {
	Prompt string `json:"prompt"`
}

// ImageGenerationResponse represents the response from image generation
type ImageGenerationResponse struct {
	ImageURL string `json:"image_url"`
}
