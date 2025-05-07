// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import type {UserProfile} from '@mattermost/types/users';

import {getProfilesByIds, getMissingProfilesByIds} from 'mattermost-redux/actions/users';

import UsersInput from '../users_input';

interface UserSettingsProps {
    id: string;
    value: string;
    onChange: (id: string, value: string) => void;
    actions: {
        getProfilesByIds: (userIds: string[]) => any;
        getMissingProfilesByIds: (userIds: string[]) => any;
    };
}

interface UserSettingsState {
    users: UserProfile[];
}

class UserSettings extends React.Component<UserSettingsProps, UserSettingsState> {
    constructor(props: UserSettingsProps) {
        super(props);
        this.state = {
            users: [],
        };
    }

    componentDidMount() {
        this.fetchUsers(this.props.value);
    }

    componentDidUpdate(prevProps: UserSettingsProps) {
        if (prevProps.value !== this.props.value) {
            this.fetchUsers(this.props.value);
        }
    }

    fetchUsers = (value: string) => {
        if (value) {
            const userIds = value.split(',').filter((id) => id.trim());
            if (userIds.length > 0) {
                // First fetch any users that aren't in the Redux store yet
                this.props.actions.getMissingProfilesByIds(userIds).then(() => {
                    // Then get the user profiles from the Redux store
                    this.props.actions.getProfilesByIds(userIds).then((result: any) => {
                        if (result && result.data) {
                            this.setState({users: result.data});
                        }
                    }).catch(() => {
                        // Silent error - we'll display with just IDs
                    });
                });
            } else {
                this.setState({users: []});
            }
        } else {
            this.setState({users: []});
        }
    };

    handleChange = (selectedUsers: UserProfile[]) => {
        // Save the selected user IDs as a comma-separated string
        const userIds = selectedUsers.map((user) => user.id).join(',');
        this.props.onChange(this.props.id, userIds);
    };

    render() {
        return (
            <UsersInput
                placeholder='Search for users to moderate'
                users={this.state.users}
                onChange={this.handleChange}
            />
        );
    }
}

function mapDispatchToProps(dispatch: any) {
    return {
        actions: bindActionCreators({
            getProfilesByIds,
            getMissingProfilesByIds,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(UserSettings);
