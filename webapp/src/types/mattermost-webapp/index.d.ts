// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface PluginRegistry {
    registerAdminConsoleCustomSetting(key: string, component: React.ComponentType<any>, options?: {showTitle: boolean});
}

export interface PluginManifest {
    id: string;
    version: string;
}
