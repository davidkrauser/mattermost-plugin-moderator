package main

import (
	"context"
	"sync"
	"time"

	"github.com/mattermost/mattermost-plugin-content-moderator/server/moderation"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/pkg/errors"
)

const postsPerMinuteLimit = 500
const processingInterval = 1 / postsPerMinuteLimit * time.Minute

var (
	ErrModerationRejection   = errors.New("potentially inappropriate content detected")
	ErrModerationUnavailable = errors.New("moderation service is not available")
)

type PostProcessor struct {
	moderator moderation.Moderator

	stopChan chan bool

	thresholdValue int
	targetAll      bool
	targetUsers    map[string]struct{}

	postsToProcess []*model.Post
	processLock    sync.Mutex
}

func newPostProcessor(
	moderator moderation.Moderator,
	thresholdValue int,
	targetAll bool,
	targetUsers map[string]struct{},
) (*PostProcessor, error) {
	if moderator == nil {
		return nil, ErrModerationUnavailable
	}
	return &PostProcessor{
		moderator:      moderator,
		stopChan:       make(chan bool, 1),
		thresholdValue: thresholdValue,
		targetAll:      targetAll,
		targetUsers:    targetUsers,
	}, nil
}

func (p *PostProcessor) start(api plugin.API) {
	go func() {
		for {
			select {
			case <-p.stopChan:
				return
			default:
			}

			time.Sleep(processingInterval)

			post := p.popPostForProcessing()
			if post == nil {
				continue
			}

			err := p.moderatePost(api, post)
			if err == nil {
				continue
			}

			if errors.Is(err, ErrModerationUnavailable) {
				api.LogError("Content moderation error", "err", err, "post_id", post.Id, "user_id", post.UserId)
				continue
			}

			if err := api.DeletePost(post.Id); err != nil {
				api.LogError("Failed to delete post flagged by content moderation", "post_id", post.Id, "err", err)
			}
		}
	}()
}

func (p *PostProcessor) stop() {
	p.stopChan <- true
}

func (p *PostProcessor) queuePostForProcessing(post *model.Post) {
	p.processLock.Lock()
	defer p.processLock.Unlock()

	p.postsToProcess = append(p.postsToProcess, post)
}

func (p *PostProcessor) popPostForProcessing() *model.Post {
	p.processLock.Lock()
	defer p.processLock.Unlock()

	if len(p.postsToProcess) == 0 {
		return nil
	}

	post := p.postsToProcess[0]
	p.postsToProcess = p.postsToProcess[1:]

	return post
}

func (p *PostProcessor) moderatePost(api plugin.API, post *model.Post) error {
	if !p.shouldModerateUser(post.UserId) {
		return nil
	}

	if post.Message == "" {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), moderationTimeout)
	defer cancel()

	result, err := p.moderator.ModerateText(ctx, post.Message)
	if err != nil {
		return ErrModerationUnavailable
	}

	if p.resultSeverityAboveThreshold(result) {
		p.logFlaggedResult(api, post.UserId, result)
		return ErrModerationRejection
	}

	return nil
}

func (p *PostProcessor) shouldModerateUser(userID string) bool {
	if p.targetAll {
		return true
	}
	_, exists := p.targetUsers[userID]
	return exists
}

func (p *PostProcessor) resultSeverityAboveThreshold(result moderation.Result) bool {
	for _, severity := range result {
		if severity >= p.thresholdValue {
			return true
		}
	}
	return false
}

func (p *PostProcessor) logFlaggedResult(api plugin.API, userID string, result moderation.Result) {
	keyPairs := []any{"user_id", userID, "threshold", p.thresholdValue}

	for category, severity := range result {
		if severity >= p.thresholdValue {
			keyPairs = append(keyPairs, category)
			keyPairs = append(keyPairs, severity)
		}
	}

	api.LogInfo("Content was flagged by moderation", keyPairs...)
}
