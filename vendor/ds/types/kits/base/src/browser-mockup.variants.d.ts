import { type VariantProps } from "tailwind-variants";
export declare const DEFAULT_BROWSER_MOCKUP_RATIO: number;
export declare const browserMockup: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            chrome?: import("tailwind-variants").ClassValue;
            controls?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            address?: import("tailwind-variants").ClassValue;
            viewport?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            chrome?: import("tailwind-variants").ClassValue;
            controls?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            address?: import("tailwind-variants").ClassValue;
            viewport?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    chrome: string;
    controls: string;
    control: string;
    address: string;
    viewport: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            chrome?: import("tailwind-variants").ClassValue;
            controls?: import("tailwind-variants").ClassValue;
            control?: import("tailwind-variants").ClassValue;
            address?: import("tailwind-variants").ClassValue;
            viewport?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    chrome: string;
    controls: string;
    control: string;
    address: string;
    viewport: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    chrome: string;
    controls: string;
    control: string;
    address: string;
    viewport: string;
}>>;
export type BrowserMockupVariants = VariantProps<typeof browserMockup>;
