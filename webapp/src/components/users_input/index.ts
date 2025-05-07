// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import type {Dispatch} from 'redux';

import {
    getProfiles,
    searchProfiles as reduxSearchProfiles,
} from 'mattermost-redux/actions/users';

import UsersInput from './users_input';

// Standard search function, we'll handle the current user elsewhere
const searchProfiles = (term: string, options = {}) => {
    if (!term) {
        return getProfiles(0, 20, options);
    }
    return reduxSearchProfiles(term, options);
};

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            searchProfiles,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(UsersInput);
