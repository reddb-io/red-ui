/** The Theme's type role utilities (text-display … text-eyebrow), by role name. */
export declare const TYPE_ROLE_UTILITIES: readonly ["display", "title", "heading", "body", "caption", "eyebrow"];
/** The tailwind-variants config every type-role recipe passes as its second argument. */
export declare const typeRoleMerge: {
    twMergeConfig: {
        extend: {
            classGroups: {
                "font-size": {
                    text: string[];
                }[];
            };
        };
    };
};
