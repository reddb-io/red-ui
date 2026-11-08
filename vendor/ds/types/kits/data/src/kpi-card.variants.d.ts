import { type Tone } from "@reddb-io/design-system/base/recipes";
import { type VariantProps } from "tailwind-variants";
export declare const kpiCard: import("tailwind-variants").TVReturnType<{
    trend: {
        true: {
            root: string;
            sparkline: string;
        };
    };
    tone: {
        neutral: {
            root: string;
            label: string;
            description: string;
        };
        /**
         * @deprecated The accent is an emphasis, not a tone (ADR 0026): kept one
         * release with its accent fill, then removed. Use a tone, or `neutral`.
         */
        brand: {
            root: string;
        };
        success: {
            root: string;
        };
        warning: {
            root: string;
        };
        danger: {
            root: string;
        };
        info: {
            root: string;
        };
    };
    /** The delta's meaning under the card's polarity, never its bare sign. */
    sentiment: {
        improvement: {};
        regression: {};
        neutral: {};
    };
}, {
    root: string;
    reading: string;
    details: string;
    label: string;
    value: string;
    delta: string;
    context: string;
    description: string;
    sparkline: string;
}, undefined, {
    trend: {
        true: {
            root: string;
            sparkline: string;
        };
    };
    tone: {
        neutral: {
            root: string;
            label: string;
            description: string;
        };
        /**
         * @deprecated The accent is an emphasis, not a tone (ADR 0026): kept one
         * release with its accent fill, then removed. Use a tone, or `neutral`.
         */
        brand: {
            root: string;
        };
        success: {
            root: string;
        };
        warning: {
            root: string;
        };
        danger: {
            root: string;
        };
        info: {
            root: string;
        };
    };
    /** The delta's meaning under the card's polarity, never its bare sign. */
    sentiment: {
        improvement: {};
        regression: {};
        neutral: {};
    };
}, {
    root: string;
    reading: string;
    details: string;
    label: string;
    value: string;
    delta: string;
    context: string;
    description: string;
    sparkline: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    trend: {
        true: {
            root: string;
            sparkline: string;
        };
    };
    tone: {
        neutral: {
            root: string;
            label: string;
            description: string;
        };
        /**
         * @deprecated The accent is an emphasis, not a tone (ADR 0026): kept one
         * release with its accent fill, then removed. Use a tone, or `neutral`.
         */
        brand: {
            root: string;
        };
        success: {
            root: string;
        };
        warning: {
            root: string;
        };
        danger: {
            root: string;
        };
        info: {
            root: string;
        };
    };
    /** The delta's meaning under the card's polarity, never its bare sign. */
    sentiment: {
        improvement: {};
        regression: {};
        neutral: {};
    };
}, {
    root: string;
    reading: string;
    details: string;
    label: string;
    value: string;
    delta: string;
    context: string;
    description: string;
    sparkline: string;
}>>;
export type KpiCardVariants = VariantProps<typeof kpiCard>;
/** The tones a KpiCard accepts: the shared vocabulary Base exports (ADR 0026). */
export type KpiCardTone = Tone;
/** Tone values kept for one release (ADR 0026): `brand` still draws its accent fill, and warns. */
export declare const DEPRECATED_KPI_CARD_TONES: readonly ["brand"];
/** @deprecated `brand` is an emphasis, not a tone (ADR 0026). Removed next release. */
export type DeprecatedKpiCardTone = (typeof DEPRECATED_KPI_CARD_TONES)[number];
/** The tones a KpiCard accepts, in the shared order. */
export declare const KPI_CARD_TONES: readonly ["neutral", "info", "success", "warning", "danger"];
