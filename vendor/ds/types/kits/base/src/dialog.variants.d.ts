import { type VariantProps } from "tailwind-variants";
/** Token-only modal surface appearance; behavior remains in Dialog.svelte. */
export declare const dialog: import("tailwind-variants").TVReturnType<{
    size: {
        sm: "max-w-sm";
        md: "max-w-lg";
        lg: "max-w-2xl";
        xl: "max-w-[var(--reddb-container-wide)]";
    };
}, undefined, string, {
    size: {
        sm: "max-w-sm";
        md: "max-w-lg";
        lg: "max-w-2xl";
        xl: "max-w-[var(--reddb-container-wide)]";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        sm: "max-w-sm";
        md: "max-w-lg";
        lg: "max-w-2xl";
        xl: "max-w-[var(--reddb-container-wide)]";
    };
}, undefined>>;
/** The standard close control, pinned to the surface's top trailing corner. */
export declare const dialogClose: import("tailwind-variants").TVReturnType<{} | {} | {}, undefined, "absolute top-[var(--reddb-spatial-inset-sm)] right-[var(--reddb-spatial-inset-sm)]", {} | {}, undefined, import("tailwind-variants").TVReturnTypeLike<unknown, undefined>>;
export type DialogVariants = VariantProps<typeof dialog>;
export type DialogSize = NonNullable<DialogVariants["size"]>;
export declare const DIALOG_SIZES: readonly ["sm", "md", "lg", "xl"];
