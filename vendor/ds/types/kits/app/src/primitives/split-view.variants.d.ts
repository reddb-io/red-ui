import { type VariantProps } from "tailwind-variants";
export declare const splitView: import("tailwind-variants").TVReturnType<{
    orientation: {
        /** Panes side by side, divided by a vertical rule. */
        readonly horizontal: {
            readonly root: "flex-row";
            readonly divider: "relative w-1 cursor-col-resize before:absolute before:inset-y-0 before:-inset-x-2.5 before:content-['']";
        };
        /** Panes stacked, divided by a horizontal one. */
        readonly vertical: {
            readonly root: "flex-col";
            readonly divider: "relative h-1 cursor-row-resize before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-['']";
        };
    };
    dragging: {
        /** While the divider is held: the rule takes the accent it is being moved by. */
        readonly true: {
            readonly divider: "bg-primary";
        };
        readonly false: {
            readonly divider: "bg-muted hover:bg-control-edge";
        };
    };
}, {
    root: string;
    pane: string;
    divider: string;
}, undefined, {
    orientation: {
        /** Panes side by side, divided by a vertical rule. */
        readonly horizontal: {
            readonly root: "flex-row";
            readonly divider: "relative w-1 cursor-col-resize before:absolute before:inset-y-0 before:-inset-x-2.5 before:content-['']";
        };
        /** Panes stacked, divided by a horizontal one. */
        readonly vertical: {
            readonly root: "flex-col";
            readonly divider: "relative h-1 cursor-row-resize before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-['']";
        };
    };
    dragging: {
        /** While the divider is held: the rule takes the accent it is being moved by. */
        readonly true: {
            readonly divider: "bg-primary";
        };
        readonly false: {
            readonly divider: "bg-muted hover:bg-control-edge";
        };
    };
}, {
    root: string;
    pane: string;
    divider: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    orientation: {
        /** Panes side by side, divided by a vertical rule. */
        readonly horizontal: {
            readonly root: "flex-row";
            readonly divider: "relative w-1 cursor-col-resize before:absolute before:inset-y-0 before:-inset-x-2.5 before:content-['']";
        };
        /** Panes stacked, divided by a horizontal one. */
        readonly vertical: {
            readonly root: "flex-col";
            readonly divider: "relative h-1 cursor-row-resize before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-['']";
        };
    };
    dragging: {
        /** While the divider is held: the rule takes the accent it is being moved by. */
        readonly true: {
            readonly divider: "bg-primary";
        };
        readonly false: {
            readonly divider: "bg-muted hover:bg-control-edge";
        };
    };
}, {
    root: string;
    pane: string;
    divider: string;
}>>;
export type SplitViewVariants = VariantProps<typeof splitView>;
