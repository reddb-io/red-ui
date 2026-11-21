import { type VariantProps } from "tailwind-variants";
export declare const text: import("tailwind-variants").TVReturnType<{
    role: {
        readonly body: "text-body";
        readonly label: "text-label";
        readonly code: "text-code";
        readonly caption: "text-caption";
    };
    ink: {
        readonly default: "text-foreground";
        readonly muted: "text-ink-muted";
    };
}, undefined, "", {
    role: {
        readonly body: "text-body";
        readonly label: "text-label";
        readonly code: "text-code";
        readonly caption: "text-caption";
    };
    ink: {
        readonly default: "text-foreground";
        readonly muted: "text-ink-muted";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    role: {
        readonly body: "text-body";
        readonly label: "text-label";
        readonly code: "text-code";
        readonly caption: "text-caption";
    };
    ink: {
        readonly default: "text-foreground";
        readonly muted: "text-ink-muted";
    };
}, undefined>>;
export type TextVariants = VariantProps<typeof text>;
export type TextRole = NonNullable<TextVariants["role"]>;
export type TextInk = NonNullable<TextVariants["ink"]>;
export declare const TEXT_ROLES: readonly TextRole[];
export declare const TEXT_INKS: readonly TextInk[];
/** The elements Text may render: block copy, an inline run, or fine print. */
export declare const TEXT_ELEMENTS: readonly ["p", "span", "div", "small"];
export type TextElement = (typeof TEXT_ELEMENTS)[number];
/** A caption supports what it sits under, so it reads muted unless told otherwise. */
export declare function defaultTextInk(role: TextRole): TextInk;
