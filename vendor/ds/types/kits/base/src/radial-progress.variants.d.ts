import { type VariantProps } from "tailwind-variants";
export declare const radialProgress: import("tailwind-variants").TVReturnType<{
    size: {
        readonly sm: {
            readonly root: "size-[calc(var(--reddb-spatial-control-height-sm)*2)]";
            readonly value: "text-xs";
        };
        readonly md: {
            readonly root: "size-[calc(var(--reddb-spatial-control-height-md)*2)]";
            readonly value: "text-sm";
        };
        readonly lg: {
            readonly root: "size-[calc(var(--reddb-spatial-control-height-lg)*2.4)]";
            readonly value: "text-base";
        };
    };
    tone: {
        neutral: {
            indicator: string;
        };
        info: {
            indicator: string;
        };
        success: {
            indicator: string;
        };
        warning: {
            indicator: string;
        };
        danger: {
            indicator: string;
        };
    };
    indeterminate: {
        true: {
            svg: string;
            value: string;
        };
        false: {
            svg: string;
            value: string;
        };
    };
}, {
    root: string;
    svg: string;
    track: string;
    indicator: string;
    value: string;
}, undefined, {
    size: {
        readonly sm: {
            readonly root: "size-[calc(var(--reddb-spatial-control-height-sm)*2)]";
            readonly value: "text-xs";
        };
        readonly md: {
            readonly root: "size-[calc(var(--reddb-spatial-control-height-md)*2)]";
            readonly value: "text-sm";
        };
        readonly lg: {
            readonly root: "size-[calc(var(--reddb-spatial-control-height-lg)*2.4)]";
            readonly value: "text-base";
        };
    };
    tone: {
        neutral: {
            indicator: string;
        };
        info: {
            indicator: string;
        };
        success: {
            indicator: string;
        };
        warning: {
            indicator: string;
        };
        danger: {
            indicator: string;
        };
    };
    indeterminate: {
        true: {
            svg: string;
            value: string;
        };
        false: {
            svg: string;
            value: string;
        };
    };
}, {
    root: string;
    svg: string;
    track: string;
    indicator: string;
    value: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        readonly sm: {
            readonly root: "size-[calc(var(--reddb-spatial-control-height-sm)*2)]";
            readonly value: "text-xs";
        };
        readonly md: {
            readonly root: "size-[calc(var(--reddb-spatial-control-height-md)*2)]";
            readonly value: "text-sm";
        };
        readonly lg: {
            readonly root: "size-[calc(var(--reddb-spatial-control-height-lg)*2.4)]";
            readonly value: "text-base";
        };
    };
    tone: {
        neutral: {
            indicator: string;
        };
        info: {
            indicator: string;
        };
        success: {
            indicator: string;
        };
        warning: {
            indicator: string;
        };
        danger: {
            indicator: string;
        };
    };
    indeterminate: {
        true: {
            svg: string;
            value: string;
        };
        false: {
            svg: string;
            value: string;
        };
    };
}, {
    root: string;
    svg: string;
    track: string;
    indicator: string;
    value: string;
}>>;
export type RadialProgressVariants = VariantProps<typeof radialProgress>;
export type RadialProgressSize = NonNullable<RadialProgressVariants["size"]>;
export declare const RADIAL_PROGRESS_SIZES: readonly RadialProgressSize[];
