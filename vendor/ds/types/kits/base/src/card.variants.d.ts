import { type VariantProps } from "tailwind-variants";
import { type Tone } from "./tone";
export declare const card: import("tailwind-variants").TVReturnType<{
    variant: {
        readonly outline: {};
        readonly plain: {
            readonly root: "border-transparent";
            readonly header: "border-transparent";
            readonly footer: "border-transparent";
        };
    };
    raised: {
        readonly false: {};
        readonly true: {
            readonly root: "shadow-elevation-raised";
        };
    };
    tone: {
        readonly neutral: {
            readonly root: "bg-elevation-raised-surface text-foreground";
            readonly header: "text-foreground";
            readonly title: "text-foreground";
            readonly description: "text-ink-muted";
            readonly body: "text-foreground";
            readonly footer: "text-foreground";
        };
        readonly success: {
            readonly root: "bg-[var(--reddb-color-feedback-success-surface)] text-[var(--reddb-color-feedback-success-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-success-foreground)]";
        };
        readonly warning: {
            readonly root: "bg-[var(--reddb-color-feedback-warning-surface)] text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-warning-foreground)]";
        };
        readonly danger: {
            readonly root: "bg-[var(--reddb-color-feedback-danger-surface)] text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-danger-foreground)]";
        };
        readonly info: {
            readonly root: "bg-[var(--reddb-color-feedback-info-surface)] text-[var(--reddb-color-feedback-info-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-info-foreground)]";
        };
        /**
         * @deprecated The accent is an emphasis, not a tone (ADR 0026): kept one
         * release with its accent fill, then removed. Use a tone, or `neutral`.
         */
        readonly brand: {
            readonly root: "bg-[var(--reddb-color-primary)] text-[var(--reddb-color-on-primary)]";
            readonly header: "text-[var(--reddb-color-on-primary)]";
            readonly title: "text-[var(--reddb-color-on-primary)]";
            readonly description: "text-[var(--reddb-color-on-primary)]";
            readonly body: "text-[var(--reddb-color-on-primary)]";
            readonly footer: "text-[var(--reddb-color-on-primary)]";
        };
    };
    padding: {
        readonly none: {
            readonly header: "p-0";
            readonly body: "p-0";
            readonly footer: "p-0";
        };
        readonly sm: {
            readonly header: "p-[var(--reddb-spatial-inset-sm)]";
            readonly body: "p-[var(--reddb-spatial-inset-sm)]";
            readonly footer: "p-[var(--reddb-spatial-inset-sm)]";
        };
        readonly md: {
            readonly header: "p-[var(--reddb-spatial-inset-md)]";
            readonly body: "p-[var(--reddb-spatial-inset-md)]";
            readonly footer: "p-[var(--reddb-spatial-inset-md)]";
        };
    };
    actionsAlign: {
        readonly start: {
            readonly footer: "justify-start";
        };
        readonly center: {
            readonly footer: "justify-center";
        };
        readonly end: {
            readonly footer: "justify-end";
        };
        readonly between: {
            readonly footer: "justify-between";
        };
    };
    orientation: {
        readonly vertical: {
            readonly root: "flex flex-col";
            readonly layout: "flex min-w-0 flex-1 flex-col";
            readonly media: "w-full";
            readonly content: "flex min-w-0 flex-1 flex-col";
        };
        readonly horizontal: {
            readonly root: "";
            readonly layout: "flex min-w-0 flex-1 flex-col @sm/card:flex-row";
            readonly content: "flex min-w-0 flex-1 flex-col";
        };
    };
    fit: {
        readonly cover: {
            readonly media: "[&>*]:object-cover";
        };
        readonly contain: {
            readonly media: "[&>*]:object-contain";
        };
    };
    position: {
        readonly center: {
            readonly media: "[&>*]:object-center";
        };
        readonly top: {
            readonly media: "[&>*]:object-top";
        };
        readonly bottom: {
            readonly media: "[&>*]:object-bottom";
        };
        readonly start: {
            readonly media: "[&>*]:object-left";
        };
        readonly end: {
            readonly media: "[&>*]:object-right";
        };
    };
    ratio: {
        readonly "16/9": {
            readonly media: "aspect-video [&>*]:h-full";
        };
        readonly "4/3": {
            readonly media: "aspect-[4/3] [&>*]:h-full";
        };
        readonly "1/1": {
            readonly media: "aspect-square [&>*]:h-full";
        };
        readonly auto: {
            readonly media: "aspect-auto [&>*]:h-auto";
        };
    };
    span: {
        readonly third: {};
        readonly "two-fifths": {};
        readonly half: {};
        readonly background: {
            readonly root: "relative isolate";
            readonly media: "absolute inset-0 size-full";
            readonly content: "relative z-10";
        };
    };
}, {
    root: string;
    layout: string;
    media: string;
    content: string;
    header: string;
    titleRow: string;
    icon: string;
    title: string;
    description: string;
    body: string;
    footer: string;
}, undefined, {
    variant: {
        readonly outline: {};
        readonly plain: {
            readonly root: "border-transparent";
            readonly header: "border-transparent";
            readonly footer: "border-transparent";
        };
    };
    raised: {
        readonly false: {};
        readonly true: {
            readonly root: "shadow-elevation-raised";
        };
    };
    tone: {
        readonly neutral: {
            readonly root: "bg-elevation-raised-surface text-foreground";
            readonly header: "text-foreground";
            readonly title: "text-foreground";
            readonly description: "text-ink-muted";
            readonly body: "text-foreground";
            readonly footer: "text-foreground";
        };
        readonly success: {
            readonly root: "bg-[var(--reddb-color-feedback-success-surface)] text-[var(--reddb-color-feedback-success-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-success-foreground)]";
        };
        readonly warning: {
            readonly root: "bg-[var(--reddb-color-feedback-warning-surface)] text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-warning-foreground)]";
        };
        readonly danger: {
            readonly root: "bg-[var(--reddb-color-feedback-danger-surface)] text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-danger-foreground)]";
        };
        readonly info: {
            readonly root: "bg-[var(--reddb-color-feedback-info-surface)] text-[var(--reddb-color-feedback-info-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-info-foreground)]";
        };
        /**
         * @deprecated The accent is an emphasis, not a tone (ADR 0026): kept one
         * release with its accent fill, then removed. Use a tone, or `neutral`.
         */
        readonly brand: {
            readonly root: "bg-[var(--reddb-color-primary)] text-[var(--reddb-color-on-primary)]";
            readonly header: "text-[var(--reddb-color-on-primary)]";
            readonly title: "text-[var(--reddb-color-on-primary)]";
            readonly description: "text-[var(--reddb-color-on-primary)]";
            readonly body: "text-[var(--reddb-color-on-primary)]";
            readonly footer: "text-[var(--reddb-color-on-primary)]";
        };
    };
    padding: {
        readonly none: {
            readonly header: "p-0";
            readonly body: "p-0";
            readonly footer: "p-0";
        };
        readonly sm: {
            readonly header: "p-[var(--reddb-spatial-inset-sm)]";
            readonly body: "p-[var(--reddb-spatial-inset-sm)]";
            readonly footer: "p-[var(--reddb-spatial-inset-sm)]";
        };
        readonly md: {
            readonly header: "p-[var(--reddb-spatial-inset-md)]";
            readonly body: "p-[var(--reddb-spatial-inset-md)]";
            readonly footer: "p-[var(--reddb-spatial-inset-md)]";
        };
    };
    actionsAlign: {
        readonly start: {
            readonly footer: "justify-start";
        };
        readonly center: {
            readonly footer: "justify-center";
        };
        readonly end: {
            readonly footer: "justify-end";
        };
        readonly between: {
            readonly footer: "justify-between";
        };
    };
    orientation: {
        readonly vertical: {
            readonly root: "flex flex-col";
            readonly layout: "flex min-w-0 flex-1 flex-col";
            readonly media: "w-full";
            readonly content: "flex min-w-0 flex-1 flex-col";
        };
        readonly horizontal: {
            readonly root: "";
            readonly layout: "flex min-w-0 flex-1 flex-col @sm/card:flex-row";
            readonly content: "flex min-w-0 flex-1 flex-col";
        };
    };
    fit: {
        readonly cover: {
            readonly media: "[&>*]:object-cover";
        };
        readonly contain: {
            readonly media: "[&>*]:object-contain";
        };
    };
    position: {
        readonly center: {
            readonly media: "[&>*]:object-center";
        };
        readonly top: {
            readonly media: "[&>*]:object-top";
        };
        readonly bottom: {
            readonly media: "[&>*]:object-bottom";
        };
        readonly start: {
            readonly media: "[&>*]:object-left";
        };
        readonly end: {
            readonly media: "[&>*]:object-right";
        };
    };
    ratio: {
        readonly "16/9": {
            readonly media: "aspect-video [&>*]:h-full";
        };
        readonly "4/3": {
            readonly media: "aspect-[4/3] [&>*]:h-full";
        };
        readonly "1/1": {
            readonly media: "aspect-square [&>*]:h-full";
        };
        readonly auto: {
            readonly media: "aspect-auto [&>*]:h-auto";
        };
    };
    span: {
        readonly third: {};
        readonly "two-fifths": {};
        readonly half: {};
        readonly background: {
            readonly root: "relative isolate";
            readonly media: "absolute inset-0 size-full";
            readonly content: "relative z-10";
        };
    };
}, {
    root: string;
    layout: string;
    media: string;
    content: string;
    header: string;
    titleRow: string;
    icon: string;
    title: string;
    description: string;
    body: string;
    footer: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    variant: {
        readonly outline: {};
        readonly plain: {
            readonly root: "border-transparent";
            readonly header: "border-transparent";
            readonly footer: "border-transparent";
        };
    };
    raised: {
        readonly false: {};
        readonly true: {
            readonly root: "shadow-elevation-raised";
        };
    };
    tone: {
        readonly neutral: {
            readonly root: "bg-elevation-raised-surface text-foreground";
            readonly header: "text-foreground";
            readonly title: "text-foreground";
            readonly description: "text-ink-muted";
            readonly body: "text-foreground";
            readonly footer: "text-foreground";
        };
        readonly success: {
            readonly root: "bg-[var(--reddb-color-feedback-success-surface)] text-[var(--reddb-color-feedback-success-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-success-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-success-foreground)]";
        };
        readonly warning: {
            readonly root: "bg-[var(--reddb-color-feedback-warning-surface)] text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-warning-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-warning-foreground)]";
        };
        readonly danger: {
            readonly root: "bg-[var(--reddb-color-feedback-danger-surface)] text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-danger-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-danger-foreground)]";
        };
        readonly info: {
            readonly root: "bg-[var(--reddb-color-feedback-info-surface)] text-[var(--reddb-color-feedback-info-foreground)]";
            readonly header: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly title: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly description: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly body: "text-[var(--reddb-color-feedback-info-foreground)]";
            readonly footer: "text-[var(--reddb-color-feedback-info-foreground)]";
        };
        /**
         * @deprecated The accent is an emphasis, not a tone (ADR 0026): kept one
         * release with its accent fill, then removed. Use a tone, or `neutral`.
         */
        readonly brand: {
            readonly root: "bg-[var(--reddb-color-primary)] text-[var(--reddb-color-on-primary)]";
            readonly header: "text-[var(--reddb-color-on-primary)]";
            readonly title: "text-[var(--reddb-color-on-primary)]";
            readonly description: "text-[var(--reddb-color-on-primary)]";
            readonly body: "text-[var(--reddb-color-on-primary)]";
            readonly footer: "text-[var(--reddb-color-on-primary)]";
        };
    };
    padding: {
        readonly none: {
            readonly header: "p-0";
            readonly body: "p-0";
            readonly footer: "p-0";
        };
        readonly sm: {
            readonly header: "p-[var(--reddb-spatial-inset-sm)]";
            readonly body: "p-[var(--reddb-spatial-inset-sm)]";
            readonly footer: "p-[var(--reddb-spatial-inset-sm)]";
        };
        readonly md: {
            readonly header: "p-[var(--reddb-spatial-inset-md)]";
            readonly body: "p-[var(--reddb-spatial-inset-md)]";
            readonly footer: "p-[var(--reddb-spatial-inset-md)]";
        };
    };
    actionsAlign: {
        readonly start: {
            readonly footer: "justify-start";
        };
        readonly center: {
            readonly footer: "justify-center";
        };
        readonly end: {
            readonly footer: "justify-end";
        };
        readonly between: {
            readonly footer: "justify-between";
        };
    };
    orientation: {
        readonly vertical: {
            readonly root: "flex flex-col";
            readonly layout: "flex min-w-0 flex-1 flex-col";
            readonly media: "w-full";
            readonly content: "flex min-w-0 flex-1 flex-col";
        };
        readonly horizontal: {
            readonly root: "";
            readonly layout: "flex min-w-0 flex-1 flex-col @sm/card:flex-row";
            readonly content: "flex min-w-0 flex-1 flex-col";
        };
    };
    fit: {
        readonly cover: {
            readonly media: "[&>*]:object-cover";
        };
        readonly contain: {
            readonly media: "[&>*]:object-contain";
        };
    };
    position: {
        readonly center: {
            readonly media: "[&>*]:object-center";
        };
        readonly top: {
            readonly media: "[&>*]:object-top";
        };
        readonly bottom: {
            readonly media: "[&>*]:object-bottom";
        };
        readonly start: {
            readonly media: "[&>*]:object-left";
        };
        readonly end: {
            readonly media: "[&>*]:object-right";
        };
    };
    ratio: {
        readonly "16/9": {
            readonly media: "aspect-video [&>*]:h-full";
        };
        readonly "4/3": {
            readonly media: "aspect-[4/3] [&>*]:h-full";
        };
        readonly "1/1": {
            readonly media: "aspect-square [&>*]:h-full";
        };
        readonly auto: {
            readonly media: "aspect-auto [&>*]:h-auto";
        };
    };
    span: {
        readonly third: {};
        readonly "two-fifths": {};
        readonly half: {};
        readonly background: {
            readonly root: "relative isolate";
            readonly media: "absolute inset-0 size-full";
            readonly content: "relative z-10";
        };
    };
}, {
    root: string;
    layout: string;
    media: string;
    content: string;
    header: string;
    titleRow: string;
    icon: string;
    title: string;
    description: string;
    body: string;
    footer: string;
}>>;
export type CardVariants = VariantProps<typeof card>;
export type CardVariant = NonNullable<CardVariants["variant"]>;
export type CardTone = Tone;
/** @deprecated `brand` is an emphasis, not a tone (ADR 0026). Removed next release. */
export type DeprecatedCardTone = (typeof DEPRECATED_CARD_TONES)[number];
export type CardPadding = NonNullable<CardVariants["padding"]>;
export type CardActionsAlign = NonNullable<CardVariants["actionsAlign"]>;
export type CardOrientation = NonNullable<CardVariants["orientation"]>;
export type CardMediaFit = NonNullable<CardVariants["fit"]>;
export type CardMediaPosition = NonNullable<CardVariants["position"]>;
export type CardMediaRatio = NonNullable<CardVariants["ratio"]>;
export type CardMediaSpan = NonNullable<CardVariants["span"]>;
export declare const CARD_VARIANTS: readonly CardVariant[];
/** The tones a Card accepts: the shared vocabulary (ADR 0026). */
export declare const CARD_TONES: readonly ["neutral", "info", "success", "warning", "danger"];
/** Tone values kept for one release (ADR 0026): `brand` still draws its accent fill, and warns. */
export declare const DEPRECATED_CARD_TONES: readonly ["brand"];
export declare const CARD_PADDINGS: readonly CardPadding[];
export declare const CARD_ACTIONS_ALIGNMENTS: readonly CardActionsAlign[];
export declare const CARD_ORIENTATIONS: readonly CardOrientation[];
export declare const CARD_MEDIA_FITS: readonly CardMediaFit[];
export declare const CARD_MEDIA_POSITIONS: readonly CardMediaPosition[];
export declare const CARD_MEDIA_RATIOS: readonly CardMediaRatio[];
export declare const CARD_MEDIA_SPANS: readonly CardMediaSpan[];
/** Numeric image ratios shared by native Card adapters. */
export declare const CARD_RATIO_VALUES: {
    readonly "16/9": number;
    readonly "4/3": number;
    readonly "1/1": 1;
};
