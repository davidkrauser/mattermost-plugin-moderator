package moderation

import (
	"context"
)

// Result contains the resulting severities from a moderation check
type Result map[string]int

// Moderator defines the interface for content moderation services
type Moderator interface {
	// ModerateText checks if text content violates moderation rules
	ModerateText(ctx context.Context, text string) (Result, error)
}

// Config defines a common configuration for moderators
type Config struct {
	// Endpoint is the API endpoint URL
	Endpoint string

	// APIKey is the authentication key
	APIKey string
}
