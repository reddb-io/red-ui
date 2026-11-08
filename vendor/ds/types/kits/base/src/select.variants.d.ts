import { type VariantProps } from "tailwind-variants";
export declare const select: import("tailwind-variants").TVReturnType<{
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
export type SelectVariants = VariantProps<typeof select>;
export type SelectSize = NonNullable<SelectVariants["size"]>;
