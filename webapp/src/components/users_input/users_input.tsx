// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import debounce from 'lodash/debounce';
import PropTypes from 'prop-types';
import React from 'react';
import type {MultiValue, StylesConfig} from 'react-select';
import AsyncSelect from 'react-select/async';

// UsersInput searches and selects user profiles displayed by username.
// Users prop can handle the user profile object or strings directly if the user object is not available.
// Returns the selected users ids in the `OnChange` value parameter.
export default class UsersInput extends React.Component<any, any> {
    static propTypes = {
        placeholder: PropTypes.string,
        users: PropTypes.array,
        onChange: PropTypes.func,
        actions: PropTypes.shape({
            searchProfiles: PropTypes.func.isRequired,
        }).isRequired,
    };

    onChange = (value: MultiValue<any>) => {
        if (this.props.onChange) {
            this.props.onChange(value);
        }
    };

    getOptionValue = (user: any) => {
        if (user.id) {
            return user.id;
        }

        return user;
    };

    formatOptionLabel = (option: any) => {
        if (option.first_name && option.last_name && option.username) {
            return (
                <React.Fragment>
                    {`@${option.username} (${option.first_name} ${option.last_name})`}
                </React.Fragment>
            );
        }

        if (option.username) {
            return (
                <React.Fragment>
                    {`@${option.username}`}
                </React.Fragment>
            );
        }

        return option;
    };

    debouncedSearchProfiles = debounce((term: string, callback: (data: any[]) => void) => {
        this.props.actions.searchProfiles(term, {allow_inactive: true}).then(({data}: {data: any[]}) => {
            callback(data);
        }).catch(() => {
            // eslint-disable-next-line no-console
            console.error('Error searching user profiles in custom attribute settings dropdown.');
            callback([]);
        });
    }, 150);

    usersLoader = (term: string, callback: (data: any[]) => void) => {
        try {
            this.debouncedSearchProfiles(term, callback);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            callback([]);
        }
    };

    keyDownHandler = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
        }
    };

    render() {
        return (
            <AsyncSelect
                isMulti={true}
                cacheOptions={true}
                defaultOptions={false}
                loadOptions={this.usersLoader}
                onChange={this.onChange}
                getOptionValue={this.getOptionValue}
                formatOptionLabel={this.formatOptionLabel}
                defaultMenuIsOpen={false}
                openMenuOnClick={false}
                isClearable={false}
                placeholder={this.props.placeholder}
                value={this.props.users}
                components={{DropdownIndicator: () => null, IndicatorSeparator: () => null}}
                styles={customStyles}
                menuPortalTarget={document.body}
                menuPosition={'fixed'}
                onKeyDown={this.keyDownHandler}
            />
        );
    }
}

const customStyles: StylesConfig<any, true> = {
    container: (baseStyles) => ({
        ...baseStyles,
    }),
    control: (baseStyles) => ({
        ...baseStyles,
        minHeight: '46px',
    }),
    menuPortal: (baseStyles) => ({
        ...baseStyles,
        zIndex: 9999,
    }),
    multiValue: (baseStyles) => ({
        ...baseStyles,
        borderRadius: '50px',
    }),
};
