import { type VariantProps } from "tailwind-variants";
export declare const toaster: import("tailwind-variants").TVReturnType<{
    position: {
        "bottom-end": {
            region: string;
        };
        "bottom-start": {
            region: string;
        };
        "bottom-center": {
            region: string;
        };
        "top-end": {
            region: string;
        };
        "top-start": {
            region: string;
        };
        "top-center": {
            region: string;
        };
    };
}, {
    region: string;
    list: string;
    item: string;
    detail: string;
    action: string;
}, undefined, {
    position: {
        "bottom-end": {
            region: string;
        };
        "bottom-start": {
            region: string;
        };
        "bottom-center": {
            region: string;
        };
        "top-end": {
            region: string;
        };
        "top-start": {
            region: string;
        };
        "top-center": {
            region: string;
        };
    };
}, {
    region: string;
    list: string;
    item: string;
    detail: string;
    action: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    position: {
        "bottom-end": {
            region: string;
        };
        "bottom-start": {
            region: string;
        };
        "bottom-center": {
            region: string;
        };
        "top-end": {
            region: string;
        };
        "top-start": {
            region: string;
        };
        "top-center": {
            region: string;
        };
    };
}, {
    region: string;
    list: string;
    item: string;
    detail: string;
    action: string;
}>>;
export type ToasterVariants = VariantProps<typeof toaster>;
export type ToasterPosition = NonNullable<ToasterVariants["position"]>;
export declare const TOASTER_POSITIONS: readonly ["bottom-end", "bottom-start", "bottom-center", "top-end", "top-start", "top-center"];
