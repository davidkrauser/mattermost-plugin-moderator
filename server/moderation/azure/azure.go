package azure

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/mattermost/mattermost-plugin-content-moderator/server/moderation"
	"github.com/pkg/errors"
)

const (
	// ContentSafetyTextAnalyzeEndpoint is the Azure AI Content Safety text analyze API path
	ContentSafetyTextAnalyzeEndpoint = "/contentsafety/text:analyze?api-version=2024-09-01"

	// DefaultOutputType is used to determine the result format provided by the API
	DefaultOutputType = "FourSeverityLevels"
)

// These constants define the available content categories for moderation
const (
	CategoryHate     = "Hate"
	CategorySexual   = "Sexual"
	CategoryViolence = "Violence"
	CategorySelfHarm = "SelfHarm"
)

// Ensure Moderator implements the moderation.Moderator interface
var _ moderation.Moderator = (*Moderator)(nil)

// Moderator implements Azure AI Content Safety for text moderation
type Moderator struct {
	// client is the HTTP client for API requests
	client *http.Client

	// config holds the Azure moderator configuration
	config *moderation.Config
}

// TextAnalyzeRequest represents the request structure for Azure Content Safety text analysis
type TextAnalyzeRequest struct {
	Text       string   `json:"text"`
	Categories []string `json:"categories,omitempty"`
	OutputType string   `json:"outputType,omitempty"`
}

// AnalyzeResponse represents the response from Azure Content Safety API
type AnalyzeResponse struct {
	CategoriesAnalysis []struct {
		Category string `json:"category"`
		Severity int    `json:"severity"`
	} `json:"categoriesAnalysis"`
}

// New creates a new Azure AI Content Safety moderator
func New(config *moderation.Config) (*Moderator, error) {
	if config.Endpoint == "" {
		return nil, errors.New("endpoint URL is required")
	}

	if config.APIKey == "" {
		return nil, errors.New("API key is required")
	}

	return &Moderator{
		client: &http.Client{},
		config: config,
	}, nil
}

// ModerateText analyzes text content using Azure AI Content Safety API
func (m *Moderator) ModerateText(ctx context.Context, text string) (moderation.Result, error) {
	// Create the request for moderation
	req, err := makeModerateTextRequest(ctx, m.config.Endpoint, text)
	if err != nil {
		return nil, errors.Wrap(err, "failed to create moderation request")
	}

	// Send the request to the Azure API
	result, err := sendRequest(m.client, m.config.APIKey, req)
	if err != nil {
		return nil, errors.Wrap(err, "failed to moderate text content")
	}

	return result, nil
}

func makeModerateTextRequest(ctx context.Context, apiEndpoint string, text string) (*http.Request, error) {
	// Create the request body
	reqBody := TextAnalyzeRequest{
		Text:       text,
		Categories: []string{CategoryHate, CategorySexual, CategoryViolence, CategorySelfHarm},
		OutputType: DefaultOutputType,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, errors.Wrap(err, "error marshaling request")
	}

	// Create the HTTP request
	endpoint := apiEndpoint + ContentSafetyTextAnalyzeEndpoint
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, errors.Wrap(err, "error creating request")
	}

	return req, nil
}

// addRequestHeaders adds the required headers to the request
func addRequestHeaders(req *http.Request, apiKey string) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Ocp-Apim-Subscription-Key", apiKey)
}

// parseResponseBody parses the response body into a structured AnalyzeResponse
func parseResponseBody(responseBody io.Reader) (*AnalyzeResponse, error) {
	var analyzeResp AnalyzeResponse
	if err := json.NewDecoder(responseBody).Decode(&analyzeResp); err != nil {
		return nil, errors.Wrap(err, "error decoding API response")
	}
	return &analyzeResp, nil
}

// convertToModerationResult converts API response to moderation.Result
func convertToModerationResult(resp *AnalyzeResponse) moderation.Result {
	result := make(moderation.Result)
	for _, categoryResult := range resp.CategoriesAnalysis {
		result[categoryResult.Category] = categoryResult.Severity
	}
	return result
}

// sendRequest sends a request to the Azure API and processes the response
func sendRequest(client *http.Client, apiKey string, req *http.Request) (moderation.Result, error) {
	// Add headers
	addRequestHeaders(req, apiKey)

	// Execute the request
	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.Wrap(err, "error calling Azure AI Content Safety API")
	}
	defer resp.Body.Close()

	// Handle non-successful responses
	if resp.StatusCode != http.StatusOK {
		body, e := io.ReadAll(resp.Body)
		if e != nil {
			return nil, errors.Wrapf(e, "failed to read error response body (status code: %d)", resp.StatusCode)
		}
		return nil, errors.Errorf("Azure API returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse the response
	analyzeResp, err := parseResponseBody(resp.Body)
	if err != nil {
		return nil, err
	}

	// Convert to result
	return convertToModerationResult(analyzeResp), nil
}
