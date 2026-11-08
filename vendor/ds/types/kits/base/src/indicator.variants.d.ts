import { type VariantProps } from "tailwind-variants";
export declare const INDICATOR_POSITIONS: readonly ["top-start", "top-center", "top-end", "middle-start", "middle-end", "bottom-start", "bottom-center", "bottom-end"];
export type IndicatorPosition = (typeof INDICATOR_POSITIONS)[number];
export declare const indicator: import("tailwind-variants").TVReturnType<{
    position: Record<"top-start" | "top-center" | "top-end" | "middle-start" | "middle-end" | "bottom-start" | "bottom-center" | "bottom-end", {
        marker: string;
    }>;
}, {
    root: string;
    marker: string;
}, undefined, {
    position: Record<"top-start" | "top-center" | "top-end" | "middle-start" | "middle-end" | "bottom-start" | "bottom-center" | "bottom-end", {
        marker: string;
    }>;
}, {
    root: string;
    marker: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    position: Record<"top-start" | "top-center" | "top-end" | "middle-start" | "middle-end" | "bottom-start" | "bottom-center" | "bottom-end", {
        marker: string;
    }>;
}, {
    root: string;
    marker: string;
}>>;
export type IndicatorVariants = VariantProps<typeof indicator>;
