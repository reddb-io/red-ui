import { type VariantProps } from "tailwind-variants";
export declare const container: import("tailwind-variants").TVReturnType<{
    size: {
        readonly prose: "max-w-prose";
        readonly content: "max-w-content";
        readonly wide: "max-w-wide";
        readonly full: "max-w-none";
    };
}, undefined, "mx-auto box-border w-full px-[var(--reddb-spatial-inset-md)]", {
    size: {
        readonly prose: "max-w-prose";
        readonly content: "max-w-content";
        readonly wide: "max-w-wide";
        readonly full: "max-w-none";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        readonly prose: "max-w-prose";
        readonly content: "max-w-content";
        readonly wide: "max-w-wide";
        readonly full: "max-w-none";
    };
}, undefined>>;
export type ContainerVariants = VariantProps<typeof container>;
export type ContainerSize = NonNullable<ContainerVariants["size"]>;
export declare const CONTAINER_SIZES: readonly ContainerSize[];
