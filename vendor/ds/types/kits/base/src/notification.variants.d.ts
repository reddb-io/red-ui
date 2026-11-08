import { type VariantProps } from "tailwind-variants";
export declare const notification: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            announcement?: import("tailwind-variants").ClassValue;
            dismiss?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            announcement?: import("tailwind-variants").ClassValue;
            dismiss?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    announcement: string;
    dismiss: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            announcement?: import("tailwind-variants").ClassValue;
            dismiss?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    announcement: string;
    dismiss: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    announcement: string;
    dismiss: string;
}>>;
export type NotificationVariants = VariantProps<typeof notification>;
