package main

import (
	"sync"
	"time"

	"github.com/mattermost/mattermost-plugin-content-moderator/server/moderation"
	"github.com/mattermost/mattermost-plugin-content-moderator/server/moderation/azure"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/pkg/errors"
)

const moderationTimeout = 10 * time.Second

type Plugin struct {
	plugin.MattermostPlugin

	configurationLock sync.RWMutex
	configuration     *configuration

	processor *PostProcessor
}

func (p *Plugin) OnActivate() error {
	return p.initialize()
}

func (p *Plugin) initialize() error {
	if p.processor != nil {
		p.processor.stop()
		p.processor = nil
	}

	config := p.getConfiguration()
	if !config.Enabled {
		p.API.LogInfo("Content moderation is disabled")
		return nil
	}

	targetUsers := config.ModerationTargetsList()
	if len(targetUsers) == 0 && !config.ModerateAllUsers {
		p.API.LogInfo("Content moderation is targeting no users")
		return nil
	}

	thresholdValue, err := config.ThresholdValue()
	if err != nil {
		p.API.LogError("failed to load moderation threshold", "err", err)
		return errors.Wrap(err, "failed to load moderation threshold")
	}

	moderator, err := initModerator(p.API, config)
	if err != nil {
		return errors.Wrap(err, "failed to initialize moderator")
	}

	processor, err := newPostProcessor(
		moderator, thresholdValue, config.ModerateAllUsers, targetUsers)
	if err != nil {
		p.API.LogError("failed to create post processor", "err", err)
		return errors.Wrap(err, "failed to create post processor")
	}
	p.processor = processor
	p.processor.start(p.API)

	return nil
}

func initModerator(api plugin.API, config *configuration) (moderation.Moderator, error) {
	switch config.Type {
	case "azure":
		azureConfig := &moderation.Config{
			Endpoint: config.Endpoint,
			APIKey:   config.APIKey,
		}

		mod, err := azure.New(azureConfig)
		if err != nil {
			api.LogError("failed to create Azure moderator", "err", err)
			return nil, errors.Wrap(err, "failed to create Azure moderator")
		}

		api.LogInfo("Azure AI Content Safety moderator initialized")
		return mod, nil
	default:
		return nil, errors.Errorf("unknown moderator type: %s", config.Type)
	}
}
