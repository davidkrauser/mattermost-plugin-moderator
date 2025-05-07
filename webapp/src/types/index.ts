// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {UserProfile as MattermostUserProfile} from '@mattermost/types/users';

/**
 * Lightweight user interface for components that only need basic user information
 */
export interface ModeratorUser {
    id: string;
    username?: string;
    first_name?: string;
    last_name?: string;
}

/**
 * Maps a Mattermost UserProfile to our lightweight ModeratorUser interface
 */
export const mapUserProfileToModeratorUser = (user: MattermostUserProfile | any): ModeratorUser => {
    return {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
    };
};

/**
 * Creates a basic ModeratorUser object from a user ID
 */
export const createBasicModeratorUser = (id: string): ModeratorUser => {
    return {
        id,
    };
};
