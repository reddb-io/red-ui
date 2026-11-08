import { type VariantProps } from "tailwind-variants";
export declare const button: import("tailwind-variants").TVReturnType<{
    variant: {
        /** The affirmative action of a view — at most one per view. */
        readonly primary: "bg-primary text-on-primary";
        /** Everything else that is still an action: outlined, not filled. */
        readonly secondary: "border-control-edge bg-transparent text-foreground hover:border-foreground";
        /**
         * An action that should not compete for attention. It is the quiet-control
         * contract (quiet-control.variants.ts, wave 6A): transparent at rest, the
         * quiet fill on hover, the stronger one pressed or holding a popup open.
         */
        readonly ghost: "bg-transparent text-ink-muted hover:text-foreground hover:bg-foreground/8 active:bg-foreground/12 [&[aria-haspopup][aria-expanded=true]]:bg-foreground/10";
    };
    tone: {
        readonly neutral: "";
        readonly info: "";
        readonly success: "";
        readonly warning: "";
        readonly danger: "";
    };
    size: {
        readonly sm: "min-h-[var(--reddb-spatial-control-height-sm)] px-[var(--reddb-spatial-inset-sm)] text-sm";
        readonly md: "min-h-[var(--reddb-spatial-control-height-md)] px-[var(--reddb-spatial-inset-md)] text-sm";
        readonly lg: "min-h-[var(--reddb-spatial-control-height-lg)] px-[var(--reddb-spatial-inset-lg)] text-base";
    };
    block: {
        /** Fills its column — a form's submit, a drawer's confirm, a mobile action. */
        readonly true: "w-full";
        /** The default: as wide as what it says. */
        readonly false: "";
    };
}, undefined, string, {
    variant: {
        /** The affirmative action of a view — at most one per view. */
        readonly primary: "bg-primary text-on-primary";
        /** Everything else that is still an action: outlined, not filled. */
        readonly secondary: "border-control-edge bg-transparent text-foreground hover:border-foreground";
        /**
         * An action that should not compete for attention. It is the quiet-control
         * contract (quiet-control.variants.ts, wave 6A): transparent at rest, the
         * quiet fill on hover, the stronger one pressed or holding a popup open.
         */
        readonly ghost: "bg-transparent text-ink-muted hover:text-foreground hover:bg-foreground/8 active:bg-foreground/12 [&[aria-haspopup][aria-expanded=true]]:bg-foreground/10";
    };
    tone: {
        readonly neutral: "";
        readonly info: "";
        readonly success: "";
        readonly warning: "";
        readonly danger: "";
    };
    size: {
        readonly sm: "min-h-[var(--reddb-spatial-control-height-sm)] px-[var(--reddb-spatial-inset-sm)] text-sm";
        readonly md: "min-h-[var(--reddb-spatial-control-height-md)] px-[var(--reddb-spatial-inset-md)] text-sm";
        readonly lg: "min-h-[var(--reddb-spatial-control-height-lg)] px-[var(--reddb-spatial-inset-lg)] text-base";
    };
    block: {
        /** Fills its column — a form's submit, a drawer's confirm, a mobile action. */
        readonly true: "w-full";
        /** The default: as wide as what it says. */
        readonly false: "";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    variant: {
        /** The affirmative action of a view — at most one per view. */
        readonly primary: "bg-primary text-on-primary";
        /** Everything else that is still an action: outlined, not filled. */
        readonly secondary: "border-control-edge bg-transparent text-foreground hover:border-foreground";
        /**
         * An action that should not compete for attention. It is the quiet-control
         * contract (quiet-control.variants.ts, wave 6A): transparent at rest, the
         * quiet fill on hover, the stronger one pressed or holding a popup open.
         */
        readonly ghost: "bg-transparent text-ink-muted hover:text-foreground hover:bg-foreground/8 active:bg-foreground/12 [&[aria-haspopup][aria-expanded=true]]:bg-foreground/10";
    };
    tone: {
        readonly neutral: "";
        readonly info: "";
        readonly success: "";
        readonly warning: "";
        readonly danger: "";
    };
    size: {
        readonly sm: "min-h-[var(--reddb-spatial-control-height-sm)] px-[var(--reddb-spatial-inset-sm)] text-sm";
        readonly md: "min-h-[var(--reddb-spatial-control-height-md)] px-[var(--reddb-spatial-inset-md)] text-sm";
        readonly lg: "min-h-[var(--reddb-spatial-control-height-lg)] px-[var(--reddb-spatial-inset-lg)] text-base";
    };
    block: {
        /** Fills its column — a form's submit, a drawer's confirm, a mobile action. */
        readonly true: "w-full";
        /** The default: as wide as what it says. */
        readonly false: "";
    };
}, undefined>>;
/**
 * The loading indicator, inheriting the Button variant's current colour. It
 * takes the Icon size role of the Button's size, so it matches a leading Icon
 * at every Density stop and the label does not shift when loading starts.
 */
export declare const buttonSpinner: import("tailwind-variants").TVReturnType<{
    size: {
        sm: {
            root: string;
        };
        md: {
            root: string;
        };
        lg: {
            root: string;
        };
    };
}, {
    root: string;
    track: string;
    head: string;
}, undefined, {
    size: {
        sm: {
            root: string;
        };
        md: {
            root: string;
        };
        lg: {
            root: string;
        };
    };
}, {
    root: string;
    track: string;
    head: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        sm: {
            root: string;
        };
        md: {
            root: string;
        };
        lg: {
            root: string;
        };
    };
}, {
    root: string;
    track: string;
    head: string;
}>>;
export type ButtonVariants = VariantProps<typeof button>;
export type ButtonVariant = NonNullable<ButtonVariants["variant"]>;
export type ButtonTone = NonNullable<ButtonVariants["tone"]>;
/** @deprecated Button's meaning is `tone` (ADR 0026); use `ButtonTone`. Removed next release. */
export type ButtonIntent = ButtonTone;
export type ButtonSize = NonNullable<ButtonVariants["size"]>;
export declare const BUTTON_VARIANTS: readonly ButtonVariant[];
export declare const BUTTON_TONES: readonly ButtonTone[];
/** @deprecated Button's meaning is `tone` (ADR 0026); use `BUTTON_TONES`. Removed next release. */
export declare const BUTTON_INTENTS: readonly ButtonTone[];
export declare const BUTTON_SIZES: readonly ButtonSize[];
