import { type VariantProps } from "tailwind-variants";
export declare const avatar: import("tailwind-variants").TVReturnType<{
    size: {
        readonly sm: {
            readonly root: "size-[var(--reddb-spatial-control-height-sm)] text-xs";
        };
        readonly md: {
            readonly root: "size-[var(--reddb-spatial-control-height-md)] text-sm";
        };
        readonly lg: {
            readonly root: "size-[var(--reddb-spatial-control-height-lg)] text-base";
        };
    };
}, {
    root: string;
    image: string;
    fallback: string;
}, undefined, {
    size: {
        readonly sm: {
            readonly root: "size-[var(--reddb-spatial-control-height-sm)] text-xs";
        };
        readonly md: {
            readonly root: "size-[var(--reddb-spatial-control-height-md)] text-sm";
        };
        readonly lg: {
            readonly root: "size-[var(--reddb-spatial-control-height-lg)] text-base";
        };
    };
}, {
    root: string;
    image: string;
    fallback: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    size: {
        readonly sm: {
            readonly root: "size-[var(--reddb-spatial-control-height-sm)] text-xs";
        };
        readonly md: {
            readonly root: "size-[var(--reddb-spatial-control-height-md)] text-sm";
        };
        readonly lg: {
            readonly root: "size-[var(--reddb-spatial-control-height-lg)] text-base";
        };
    };
}, {
    root: string;
    image: string;
    fallback: string;
}>>;
export type AvatarVariants = VariantProps<typeof avatar>;
export type AvatarSize = NonNullable<AvatarVariants["size"]>;
export declare const AVATAR_SIZES: readonly AvatarSize[];
