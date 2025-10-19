package services

import (
	"context"
	"errors"
	"strings"

	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"playground-server/models"
)

const defaultSystemPrompt = "You are Adrian Latorre, a software engineer being interviewed. Answer questions about your life experiences, career journey, hobbies, interests, and memorable moments in a genuine and conversational way, but keep them short, a couple of senteces max. Be authentic, thoughtful, and share personal anecdotes. Keep your responses natural and engaging, as if chatting with a friend."

// ChatService defines behaviour for AI chat streaming and image generation.
type ChatService interface {
	StreamChat(ctx context.Context, history []models.ChatMessage, prompt string, onChunk func(string)) error
	GenerateImage(ctx context.Context, prompt string) (string, error)
}

// OpenAIService implements ChatService using OpenAI's Chat Completions API.
type OpenAIService struct {
	client        *openai.Client
	contextLoader *ContextLoader
	systemPrompt  string
}

// NewOpenAIService creates a new OpenAI service instance.
func NewOpenAIService(apiKey string, pagesDir string) *OpenAIService {
	if apiKey == "" {
		return &OpenAIService{}
	}

	client := openai.NewClient(
		option.WithAPIKey(apiKey),
	)

	// Load context from Vue pages
	contextLoader := NewContextLoader(pagesDir)
	enhancedPrompt := contextLoader.BuildEnhancedSystemPrompt(defaultSystemPrompt)

	return &OpenAIService{
		client:        &client,
		contextLoader: contextLoader,
		systemPrompt:  enhancedPrompt,
	}
}

// StreamChat streams a chat completion response and invokes onChunk for each text fragment.
func (s *OpenAIService) StreamChat(ctx context.Context, history []models.ChatMessage, prompt string, onChunk func(string)) error {
	if s == nil || s.client == nil {
		return errors.New("openai client not configured")
	}

	messages := []openai.ChatCompletionMessageParamUnion{
		openai.SystemMessage(s.systemPrompt),
	}

	for _, msg := range history {
		content := strings.TrimSpace(msg.Content)
		if content == "" {
			continue
		}

		switch strings.ToLower(msg.Role) {
		case "user":
			messages = append(messages, openai.UserMessage(content))
		case "assistant":
			messages = append(messages, openai.AssistantMessage(content))
		case "system":
			messages = append(messages, openai.SystemMessage(content))
		}
	}

	messages = append(messages, openai.UserMessage(prompt))

	params := openai.ChatCompletionNewParams{
		Model:    openai.ChatModelGPT4oMini,
		Messages: messages,
	}

	stream := s.client.Chat.Completions.NewStreaming(ctx, params)
	defer stream.Close()

	for stream.Next() {
		chunk := stream.Current()
		if len(chunk.Choices) == 0 {
			continue
		}

		if text := chunk.Choices[0].Delta.Content; text != "" {
			onChunk(text)
		}
	}

	return stream.Err()
}

// GenerateImage generates a 32-bit pixel art style image based on the provided text prompt
func (s *OpenAIService) GenerateImage(ctx context.Context, prompt string) (string, error) {
	if s == nil || s.client == nil {
		return "", errors.New("openai client not configured")
	}

	// Enhance the prompt to ensure 32-bit pixel art style
	enhancedPrompt := "A 32-bit pixel art scene in the style of a retro adventure RPG, viewed in an isometric perspective. The color palette is cohesive, dominated by shades of teal, turquoise, and cool blues. The lighting is soft and slightly moody. The art should look like it belongs to the same game world as other scenes with this style — consistent pixel density, same resolution, and same color tones. Resolution: 256x256. Scene description: " + prompt

	params := openai.ImageGenerateParams{
		Prompt: enhancedPrompt,
		Model:  openai.ImageModelDallE3,
		Size:   openai.ImageGenerateParamsSize1024x1024,
		Style:  openai.ImageGenerateParamsStyleNatural,
		ResponseFormat: openai.ImageGenerateParamsResponseFormatURL,
		Quality: openai.ImageGenerateParamsQualityStandard,
	}

	response, err := s.client.Images.Generate(ctx, params)
	if err != nil {
		return "", err
	}

	if len(response.Data) == 0 {
		return "", errors.New("no image generated")
	}

	return response.Data[0].URL, nil
}
