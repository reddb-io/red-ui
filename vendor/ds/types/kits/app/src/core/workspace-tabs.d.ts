export interface WorkspaceTab {
    /** Stable application-owned identity. */
    id: string;
    /** Visible tab name. */
    label: string;
    /** Native destination. NavigationScope may intercept owned, unmodified clicks. */
    href?: string;
    /** Whether the application accepts close requests. */
    closable?: boolean;
    /** Caller-observed unsaved changes, independent of execution. */
    dirty?: boolean;
    /** Caller-observed operation in progress. */
    busy?: boolean;
    /** Prevent selection and closing. */
    disabled?: boolean;
}
export declare function workspaceTabs(items: readonly WorkspaceTab[]): readonly WorkspaceTab[];
export declare function workspaceSelection(items: readonly WorkspaceTab[], selected?: string | null): string;
/** Restore focus only when removing the workspace control that owned it. */
export declare function mountWorkspaceFocus(root: HTMLElement): {
    sync(items: readonly WorkspaceTab[], selected: string): void;
    destroy(): void;
};
