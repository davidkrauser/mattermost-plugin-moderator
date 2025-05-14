// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import debounce from 'lodash/debounce';
import PropTypes from 'prop-types';
import React, {useEffect} from 'react';
import type {MultiValue, StylesConfig} from 'react-select';
import AsyncSelect from 'react-select/async';

import type {UserProfile} from '@mattermost/types/users';

interface UsersInputProps {
    placeholder?: string;
    users: UserProfile[] | Array<{id: string}>;
    onChange?: (users: UserProfile[]) => void;
    actions: {
        searchProfiles: (term: string, options: Record<string, any>) => Promise<{data: UserProfile[]}>;
        getMissingProfilesByIds: (userIds: string[]) => Promise<{data: UserProfile[]}>;
    };
}

// UsersInput searches and selects user profiles displayed by username.
// Users prop can handle the user profile object or strings directly if the user object is not available.
// Returns the selected users ids in the `OnChange` value parameter.
export default function UsersInput(props: UsersInputProps) {
    // Extract the user IDs from the props.users array
    const userIds = React.useMemo(() => {
        if (!props.users || !props.users.length) {
            return [];
        }

        return props.users.map((user: UserProfile | {id: string}) => {
            return user.id;
        }).filter(Boolean);
    }, [props.users]);

    // Fetch missing profiles whenever userIds changes
    useEffect(() => {
        if (userIds.length > 0) {
            props.actions.getMissingProfilesByIds(userIds);
        }
    }, [userIds, props.actions]);

    const onChange = (newValue: MultiValue<string | UserProfile | {id: string}>) => {
        if (props.onChange) {
            props.onChange(newValue as unknown as UserProfile[]);
        }
    };

    const getOptionValue = (user: UserProfile | {id: string} | string) => {
        if (typeof user === 'object' && user.id) {
            return user.id;
        }
        return user as string;
    };

    const formatOptionLabel = (option: UserProfile | {id: string} | string) => {
        if (typeof option === 'object') {
            if ('username' in option && option.username) {
                const firstName = 'first_name' in option ? option.first_name : '';
                const lastName = 'last_name' in option ? option.last_name : '';

                if (firstName && lastName) {
                    return (
                        <React.Fragment>
                            {`@${option.username} (${firstName} ${lastName})`}
                        </React.Fragment>
                    );
                }

                return (
                    <React.Fragment>
                        {`@${option.username}`}
                    </React.Fragment>
                );
            }

            if (option.id) {
                return option.id;
            }
        }

        return option as string;
    };

    const debouncedSearchProfiles = debounce((term: string, callback: (data: UserProfile[]) => void) => {
        props.actions.searchProfiles(term, {allow_inactive: true}).
            then(({data}) => {
                callback(data);
            }).
            catch(() => {
                // eslint-disable-next-line no-console
                console.error('Error searching user profiles in custom attribute settings dropdown.');
                callback([]);
            });
    }, 150);

    const usersLoader = (term: string, callback: (data: UserProfile[]) => void) => {
        try {
            debouncedSearchProfiles(term, callback);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            callback([]);
        }
    };

    const keyDownHandler = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
        }
    };

    return (
        <AsyncSelect
            isMulti={true}
            cacheOptions={true}
            defaultOptions={false}
            loadOptions={usersLoader}
            onChange={onChange}
            getOptionValue={getOptionValue}
            formatOptionLabel={formatOptionLabel}
            defaultMenuIsOpen={false}
            openMenuOnClick={false}
            isClearable={false}
            placeholder={props.placeholder}
            value={props.users}
            components={{DropdownIndicator: () => null, IndicatorSeparator: () => null}}
            styles={customStyles}
            menuPortalTarget={document.body}
            menuPosition={'fixed'}
            onKeyDown={keyDownHandler}
        />
    );
}

// PropTypes can still be defined for the component
UsersInput.propTypes = {
    placeholder: PropTypes.string,
    users: PropTypes.array,
    onChange: PropTypes.func,
    actions: PropTypes.shape({
        searchProfiles: PropTypes.func.isRequired,
        getMissingProfilesByIds: PropTypes.func.isRequired,
    }).isRequired,
};

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
