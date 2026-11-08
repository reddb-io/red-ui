import { type VariantProps } from "tailwind-variants";
export declare const DEFAULT_PHONE_MOCKUP_RATIO: number;
export declare const phoneMockup: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            chrome?: import("tailwind-variants").ClassValue;
            viewport?: import("tailwind-variants").ClassValue;
            speaker?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            chrome?: import("tailwind-variants").ClassValue;
            viewport?: import("tailwind-variants").ClassValue;
            speaker?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    chrome: string;
    speaker: string;
    viewport: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            chrome?: import("tailwind-variants").ClassValue;
            viewport?: import("tailwind-variants").ClassValue;
            speaker?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    chrome: string;
    speaker: string;
    viewport: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    chrome: string;
    speaker: string;
    viewport: string;
}>>;
export type PhoneMockupVariants = VariantProps<typeof phoneMockup>;
