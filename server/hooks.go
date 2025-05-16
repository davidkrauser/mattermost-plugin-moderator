package main

import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

func (p *Plugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	p.processor.queuePostForProcessing(post)
}

func (p *Plugin) MessageHasBeenUpdated(c *plugin.Context, post, _ *model.Post) {
	p.processor.queuePostForProcessing(post)
}
