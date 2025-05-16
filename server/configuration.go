package main

import (
	"reflect"
	"strconv"
	"strings"

	"github.com/pkg/errors"
)

// configuration captures the plugin's external configuration as exposed in the Mattermost server
// configuration, as well as values computed from the configuration. Any public fields will be
// deserialized from the Mattermost server configuration in OnConfigurationChange.
//
// As plugins are inherently concurrent (hooks being called asynchronously), and the plugin
// configuration can change at any time, access to the configuration must be synchronized. The
// strategy used in this plugin is to guard a pointer to the configuration, and clone the entire
// struct whenever it changes. You may replace this with whatever strategy you choose.
//
// If you add non-reference types to your configuration struct, be sure to rewrite Clone as a deep
// copy appropriate for your types.
type configuration struct {
	Enabled  bool   `json:"enabled"`
	Type     string `json:"type"`
	Endpoint string `json:"azure_endpoint"`
	APIKey   string `json:"azure_apiKey"`

	ModerationTargets string `json:"moderationTargets"`
	ModerateAllUsers  bool   `json:"moderateAllUsers"`

	Threshold string `json:"azure_threshold"`
}

func (c *configuration) ModerationTargetsList() map[string]struct{} {
	if c.ModerationTargets == "" {
		return nil
	}
	targetMap := make(map[string]struct{})
	for _, targetID := range strings.Split(c.ModerationTargets, ",") {
		if targetID != "" {
			targetMap[targetID] = struct{}{}
		}
	}
	return targetMap
}

// ThresholdValue returns the threshold as an integer
func (c *configuration) ThresholdValue() (int, error) {
	if c.Threshold == "" {
		return 0, errors.New("required threshold configuration is unset")
	}
	val, err := strconv.Atoi(c.Threshold)
	if err != nil {
		return 0, errors.Wrapf(err, "could not parse threshold value: '%s'", c.Threshold)
	}
	return val, nil
}

// Clone shallow copies the configuration. Your implementation may require a deep copy if
// your configuration has reference types.
func (c *configuration) Clone() *configuration {
	var clone = *c
	return &clone
}

// getConfiguration retrieves the active configuration under lock, making it safe to use
// concurrently. The active configuration may change underneath the client of this method, but
// the struct returned by this API call is considered immutable.
func (p *Plugin) getConfiguration() *configuration {
	p.configurationLock.RLock()
	defer p.configurationLock.RUnlock()

	if p.configuration == nil {
		return &configuration{}
	}

	return p.configuration
}

// setConfiguration replaces the active configuration under lock.
//
// Do not call setConfiguration while holding the configurationLock, as sync.Mutex is not
// reentrant. In particular, avoid using the plugin API entirely, as this may in turn trigger a
// hook back into the plugin. If that hook attempts to acquire this lock, a deadlock may occur.
//
// This method panics if setConfiguration is called with the existing configuration. This almost
// certainly means that the configuration was modified without being cloned and may result in
// an unsafe access.
func (p *Plugin) setConfiguration(configuration *configuration) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()

	if configuration != nil && p.configuration == configuration {
		// Ignore assignment if the configuration struct is empty. Go will optimize the
		// allocation for same to point at the same memory address, breaking the check
		// above.
		if reflect.ValueOf(*configuration).NumField() == 0 {
			return
		}

		panic("setConfiguration called with the existing configuration pointer - this may indicate a logic error")
	}

	p.API.LogInfo("Moderation configuration changed",
		"moderationEnabled", configuration.Enabled,
		"moderationAllUsers", configuration.ModerateAllUsers,
		"moderationTargets", configuration.ModerationTargets,
		"moderationThreshold", configuration.Threshold)

	p.configuration = configuration
}

// OnConfigurationChange is invoked when configuration changes may have been made.
func (p *Plugin) OnConfigurationChange() error {
	var configuration = new(configuration)

	// Load the public configuration fields from the Mattermost server configuration.
	if err := p.API.LoadPluginConfiguration(configuration); err != nil {
		return errors.Wrap(err, "failed to load plugin configuration")
	}

	p.setConfiguration(configuration)

	// Initialize or reinitialize the moderator with the new configuration
	if err := p.initialize(); err != nil {
		p.API.LogError("Failed to reinitialize after configuration change", "err", err)
		return errors.Wrap(err, "failed to reinitialize")
	}

	return nil
}
