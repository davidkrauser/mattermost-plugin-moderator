// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import UserSettings from '@/components/admin_settings/user_settings';
import manifest from '@/manifest';
import type {PluginRegistry} from '@/types/mattermost-webapp';

export default class Plugin {
    public async initialize(registry: PluginRegistry) {
        registry.registerAdminConsoleCustomSetting('moderationTargets', UserSettings, {showTitle: true});
    }
}

declare global {
    interface Window {
        registerPlugin(pluginId: string, plugin: Plugin): void;
    }
}

window.registerPlugin(manifest.id, new Plugin());
