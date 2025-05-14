// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Type declarations for external modules

declare module 'lodash/debounce' {
    export default function debounce<T extends (...args: any[]) => any>(
        func: T,
        wait?: number,
        options?: {
            leading?: boolean;
            trailing?: boolean;
            maxWait?: number;
        }
    ): T & {
        cancel: () => void;
        flush: () => ReturnType<T>;
    };
}
