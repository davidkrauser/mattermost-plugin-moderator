// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import type {UserProfile} from '@mattermost/types/users';

import {
    getProfiles,
    searchProfiles as reduxSearchProfiles,
    getMissingProfilesByIds,
} from 'mattermost-redux/actions/users';
import {getUsers} from 'mattermost-redux/selectors/entities/users';
import type {GlobalState} from 'mattermost-redux/types/store';

import UsersInput from './users_input';

// Standard search function, we'll handle the current user elsewhere
const searchProfiles = (term: string, options = {}) => {
    if (!term) {
        return getProfiles(0, 20, options);
    }
    return reduxSearchProfiles(term, options);
};

function mapStateToProps(state: GlobalState, ownProps: {users: UserProfile[] | Array<{id: string}>}) {
    const userIds = ownProps.users ?
        ownProps.users.map((user: any) => user.id) :
        [];

    const userObjects = userIds.map((id: string) => {
        const user = getUsers(state)[id];
        return user || {id};
    });

    return {
        users: userObjects,
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            searchProfiles,
            getMissingProfilesByIds,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(UsersInput as any);
