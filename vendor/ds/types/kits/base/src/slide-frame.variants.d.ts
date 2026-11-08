import { type VariantProps } from "tailwind-variants";
/** The canvas a slide is composed on, in rem: 60rem × 33.75rem (16:9). */
export declare const SLIDE_CANVAS_WIDTH_REM = 60;
export declare const slideFrame: import("tailwind-variants").TVReturnType<{
    surface: {
        readonly background: {
            readonly root: "bg-background after:border-muted";
        };
        readonly raised: {
            readonly root: "bg-elevation-raised-surface after:border-elevation-raised-border shadow-elevation-raised";
        };
    };
}, {
    root: string;
    stage: string;
    safeArea: string;
    number: string;
}, undefined, {
    surface: {
        readonly background: {
            readonly root: "bg-background after:border-muted";
        };
        readonly raised: {
            readonly root: "bg-elevation-raised-surface after:border-elevation-raised-border shadow-elevation-raised";
        };
    };
}, {
    root: string;
    stage: string;
    safeArea: string;
    number: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    surface: {
        readonly background: {
            readonly root: "bg-background after:border-muted";
        };
        readonly raised: {
            readonly root: "bg-elevation-raised-surface after:border-elevation-raised-border shadow-elevation-raised";
        };
    };
}, {
    root: string;
    stage: string;
    safeArea: string;
    number: string;
}>>;
export type SlideFrameVariants = VariantProps<typeof slideFrame>;
export type SlideSurface = NonNullable<SlideFrameVariants["surface"]>;
export declare const SLIDE_SURFACES: readonly SlideSurface[];
