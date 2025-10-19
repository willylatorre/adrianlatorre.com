package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ContextLoader loads context from Vue files to enrich the AI's knowledge about Adrian
type ContextLoader struct {
	pagesDir string
}

// NewContextLoader creates a new context loader
func NewContextLoader(pagesDir string) *ContextLoader {
	return &ContextLoader{
		pagesDir: pagesDir,
	}
}

// LoadAdrianContext extracts information from Vue page files to build context
func (c *ContextLoader) LoadAdrianContext() string {
	context := strings.Builder{}
	context.WriteString("CONTEXT ABOUT ADRIAN LATORRE:\n\n")

	// Read DashboardPage.vue for professional info
	dashboardPath := filepath.Join(c.pagesDir, "DashboardPage.vue")
	if content, err := os.ReadFile(dashboardPath); err == nil {
		context.WriteString("PROFESSIONAL BACKGROUND:\n")
		context.WriteString(c.extractRelevantContent(string(content)))
		context.WriteString("\n\n")
	}

	// Read MediaPage.vue for projects and interests
	mediaPath := filepath.Join(c.pagesDir, "MediaPage.vue")
	if content, err := os.ReadFile(mediaPath); err == nil {
		context.WriteString("PERSONAL PROJECTS & INTERESTS:\n")
		context.WriteString(c.extractRelevantContent(string(content)))
		context.WriteString("\n\n")
	}

	return context.String()
}

// extractRelevantContent removes Vue template syntax and extracts meaningful text
func (c *ContextLoader) extractRelevantContent(content string) string {
	// Remove script tags
	content = removeSection(content, "<script", "</script>")
	
	// Remove style tags
	content = removeSection(content, "<style", "</style>")
	
	// Remove HTML tags but keep the text content
	lines := strings.Split(content, "\n")
	var cleanLines []string
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		// Skip empty lines and template tags
		if line == "" || strings.HasPrefix(line, "<template") || 
		   strings.HasPrefix(line, "</template") || strings.HasPrefix(line, "<!--") {
			continue
		}
		
		// Remove common HTML tags but keep content
		line = stripHTMLTags(line)
		line = strings.TrimSpace(line)
		
		// Only include lines with actual content
		if len(line) > 0 && !strings.HasPrefix(line, "<") && !strings.HasPrefix(line, ">") {
			cleanLines = append(cleanLines, line)
		}
	}
	
	return strings.Join(cleanLines, "\n")
}

// removeSection removes content between start and end tags
func removeSection(content, startTag, endTag string) string {
	for {
		startIdx := strings.Index(content, startTag)
		if startIdx == -1 {
			break
		}
		endIdx := strings.Index(content[startIdx:], endTag)
		if endIdx == -1 {
			break
		}
		content = content[:startIdx] + content[startIdx+endIdx+len(endTag):]
	}
	return content
}

// stripHTMLTags removes HTML tags from a line
func stripHTMLTags(line string) string {
	result := strings.Builder{}
	inTag := false
	
	for _, char := range line {
		if char == '<' {
			inTag = true
		} else if char == '>' {
			inTag = false
			result.WriteRune(' ')
		} else if !inTag {
			result.WriteRune(char)
		}
	}
	
	return strings.TrimSpace(result.String())
}

// BuildEnhancedSystemPrompt creates a system prompt with injected context
func (c *ContextLoader) BuildEnhancedSystemPrompt(basePrompt string) string {
	context := c.LoadAdrianContext()
	
	return fmt.Sprintf(`%s

%s

Use this context to answer questions authentically as Adrian. Don't mention that you have this context - just naturally incorporate the information into your responses.`, basePrompt, context)
}
