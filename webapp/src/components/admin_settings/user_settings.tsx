// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {connect} from 'react-redux';

import type {UserProfile} from '@mattermost/types/users';

import UsersInputComponent from '../users_input';
const UsersInput = UsersInputComponent as any;

interface UserSettingsProps {
    id: string;
    value: string;
    onChange: (id: string, value: string) => void;
}

interface UserSettingsState {
    users: Array<{id: string}>;
}

class UserSettings extends React.Component<UserSettingsProps, UserSettingsState> {
    constructor(props: UserSettingsProps) {
        super(props);
        this.state = {
            users: [],
        };
    }

    componentDidMount() {
        this.initializeUsers(this.props.value);
    }

    componentDidUpdate(prevProps: UserSettingsProps) {
        if (prevProps.value !== this.props.value) {
            this.initializeUsers(this.props.value);
        }
    }

    initializeUsers = (value: string) => {
        if (value) {
            const userIds = value.split(',').filter((id) => id.trim());
            if (userIds.length > 0) {
                // Just create user objects with IDs
                // The UsersInput component will fetch the full profiles
                const userObjects = userIds.map((id) => ({id}));
                this.setState({users: userObjects});
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
                actions={{
                    searchProfiles: () => Promise.resolve({data: []}),
                    getMissingProfilesByIds: () => Promise.resolve({data: []}),
                }}
            />
        );
    }
}

export default connect(null, null)(UserSettings);
