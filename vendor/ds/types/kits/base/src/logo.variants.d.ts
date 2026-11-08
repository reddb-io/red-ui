import { type VariantProps } from "tailwind-variants";
export declare const logo: import("tailwind-variants").TVReturnType<{
    interactive: {
        /**
         * The `href` form. The ink focus outline (ADR 0023) is drawn on this
         * element — the box that already INCLUDES the clearspace — so it falls
         * outside the clearspace by construction; its 2px offset only moves it
         * further out.
         */
        readonly true: "rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
        /** The default: the pure Mark, in a footer or as an avatar. */
        readonly false: "";
    };
}, undefined, string, {
    interactive: {
        /**
         * The `href` form. The ink focus outline (ADR 0023) is drawn on this
         * element — the box that already INCLUDES the clearspace — so it falls
         * outside the clearspace by construction; its 2px offset only moves it
         * further out.
         */
        readonly true: "rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
        /** The default: the pure Mark, in a footer or as an avatar. */
        readonly false: "";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    interactive: {
        /**
         * The `href` form. The ink focus outline (ADR 0023) is drawn on this
         * element — the box that already INCLUDES the clearspace — so it falls
         * outside the clearspace by construction; its 2px offset only moves it
         * further out.
         */
        readonly true: "rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
        /** The default: the pure Mark, in a footer or as an avatar. */
        readonly false: "";
    };
}, undefined>>;
/**
 * The Mark itself. `block` because an inline image sits on a text baseline and
 * would push the clearspace out of true; nothing else, because everything the
 * drawing looks like is the Brand's.
 */
export declare const logoMark: import("tailwind-variants").TVReturnType<{} | {} | {}, undefined, "block", {} | {}, undefined, import("tailwind-variants").TVReturnTypeLike<unknown, undefined>>;
export type LogoVariants = VariantProps<typeof logo>;
