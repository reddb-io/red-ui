import { type VariantProps } from "tailwind-variants";
/** The quiet fill under the pointer. */
export declare const QUIET_HOVER = "hover:bg-foreground/8";
/** The stronger quiet fill while pressed: also the only feedback on touch. */
export declare const QUIET_PRESSED = "active:bg-foreground/12";
/** A trigger holding its popup open. */
export declare const QUIET_OPEN = "[&[aria-haspopup][aria-expanded=true]]:bg-foreground/10";
/** The ink focus outline (ADR 0023), drawn outside the control. */
export declare const QUIET_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
/** Button's disabled treatment, for a native `disabled` or `aria-disabled`. */
export declare const QUIET_DISABLED = "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";
export declare const quietControl: import("tailwind-variants").TVReturnType<{
    ink: {
        /** Secondary ink at rest, full ink under the pointer: a ghost Button, a close "×". */
        readonly muted: "text-ink-muted hover:text-foreground";
        /** Full ink throughout: a menu trigger or a row whose label is the content. */
        readonly foreground: "text-foreground";
        /** The caller's colour (a tone, the surrounding text). */
        readonly inherit: "";
    };
    focus: {
        /** The default: 2px outside the control, on the ground. */
        readonly offset: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
        /** Inside the control, where a scroll region or a tight rail would clip it. */
        readonly inset: "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";
    };
    selected: {
        /** Current, selected or pressed: the selected surface, which the pointer does not lighten. */
        readonly true: "bg-foreground/10 hover:bg-foreground/10 font-medium text-foreground hover:text-foreground";
        readonly false: "";
    };
}, undefined, string, {
    ink: {
        /** Secondary ink at rest, full ink under the pointer: a ghost Button, a close "×". */
        readonly muted: "text-ink-muted hover:text-foreground";
        /** Full ink throughout: a menu trigger or a row whose label is the content. */
        readonly foreground: "text-foreground";
        /** The caller's colour (a tone, the surrounding text). */
        readonly inherit: "";
    };
    focus: {
        /** The default: 2px outside the control, on the ground. */
        readonly offset: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
        /** Inside the control, where a scroll region or a tight rail would clip it. */
        readonly inset: "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";
    };
    selected: {
        /** Current, selected or pressed: the selected surface, which the pointer does not lighten. */
        readonly true: "bg-foreground/10 hover:bg-foreground/10 font-medium text-foreground hover:text-foreground";
        readonly false: "";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    ink: {
        /** Secondary ink at rest, full ink under the pointer: a ghost Button, a close "×". */
        readonly muted: "text-ink-muted hover:text-foreground";
        /** Full ink throughout: a menu trigger or a row whose label is the content. */
        readonly foreground: "text-foreground";
        /** The caller's colour (a tone, the surrounding text). */
        readonly inherit: "";
    };
    focus: {
        /** The default: 2px outside the control, on the ground. */
        readonly offset: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
        /** Inside the control, where a scroll region or a tight rail would clip it. */
        readonly inset: "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";
    };
    selected: {
        /** Current, selected or pressed: the selected surface, which the pointer does not lighten. */
        readonly true: "bg-foreground/10 hover:bg-foreground/10 font-medium text-foreground hover:text-foreground";
        readonly false: "";
    };
}, undefined>>;
export type QuietControlVariants = VariantProps<typeof quietControl>;
export type QuietControlInk = NonNullable<QuietControlVariants["ink"]>;
export type QuietControlFocus = NonNullable<QuietControlVariants["focus"]>;
export declare const QUIET_CONTROL_INKS: readonly QuietControlInk[];
export declare const QUIET_CONTROL_FOCUS: readonly QuietControlFocus[];
