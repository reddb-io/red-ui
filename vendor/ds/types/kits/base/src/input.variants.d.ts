import { type VariantProps } from "tailwind-variants";
export declare const input: import("tailwind-variants").TVReturnType<{
    size: {
        sm: "h-[var(--reddb-spatial-control-height-sm)] px-[var(--reddb-spatial-inset-sm)] text-editable-sm";
        md: "h-[var(--reddb-spatial-control-height-md)] px-[var(--reddb-spatial-inset-md)] text-editable-md";
        lg: "h-[var(--reddb-spatial-control-height-lg)] px-[var(--reddb-spatial-inset-lg)] text-editable-lg";
    };
}, undefined, string, {
    size: {
        sm: "h-[var(--reddb-spatial-control-height-sm)] px-[var(--reddb-spatial-inset-sm)] text-editable-sm";
        md: "h-[var(--reddb-spatial-control-height-md)] px-[var(--reddb-spatial-inset-md)] text-editable-md";
        lg: "h-[var(--reddb-spatial-control-height-lg)] px-[var(--reddb-spatial-inset-lg)] text-editable-lg";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        sm: "h-[var(--reddb-spatial-control-height-sm)] px-[var(--reddb-spatial-inset-sm)] text-editable-sm";
        md: "h-[var(--reddb-spatial-control-height-md)] px-[var(--reddb-spatial-inset-md)] text-editable-md";
        lg: "h-[var(--reddb-spatial-control-height-lg)] px-[var(--reddb-spatial-inset-lg)] text-editable-lg";
    };
}, undefined>>;
export type InputVariants = VariantProps<typeof input>;
export type InputSize = NonNullable<InputVariants["size"]>;
export declare const INPUT_SIZES: readonly ["sm", "md", "lg"];
