import { type VariantProps } from "tailwind-variants";
export declare const carousel: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            controls?: import("tailwind-variants").ClassValue;
            viewport?: import("tailwind-variants").ClassValue;
            position?: import("tailwind-variants").ClassValue;
            slide?: import("tailwind-variants").ClassValue;
            rotation?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            controls?: import("tailwind-variants").ClassValue;
            viewport?: import("tailwind-variants").ClassValue;
            position?: import("tailwind-variants").ClassValue;
            slide?: import("tailwind-variants").ClassValue;
            rotation?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    viewport: string;
    slide: string;
    controls: string;
    position: string;
    rotation: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            controls?: import("tailwind-variants").ClassValue;
            viewport?: import("tailwind-variants").ClassValue;
            position?: import("tailwind-variants").ClassValue;
            slide?: import("tailwind-variants").ClassValue;
            rotation?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    viewport: string;
    slide: string;
    controls: string;
    position: string;
    rotation: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    viewport: string;
    slide: string;
    controls: string;
    position: string;
    rotation: string;
}>>;
export type CarouselVariants = VariantProps<typeof carousel>;
