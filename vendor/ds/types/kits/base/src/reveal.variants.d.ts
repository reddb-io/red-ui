import { type VariantProps } from "tailwind-variants";
export declare const reveal: import("tailwind-variants").TVReturnType<{
    direction: {
        up: "[--reveal-x:0px] [--reveal-y:var(--reddb-spatial-inset-lg)]";
        down: "[--reveal-x:0px] [--reveal-y:calc(-1*var(--reddb-spatial-inset-lg))]";
        left: "[--reveal-x:calc(-1*var(--reddb-spatial-inset-lg))] [--reveal-y:0px]";
        right: "[--reveal-x:var(--reddb-spatial-inset-lg)] [--reveal-y:0px]";
        none: "[--reveal-x:0px] [--reveal-y:0px]";
    };
    path: {
        css: "";
        js: string[];
    };
    entered: {
        true: "opacity-100 transform-none";
        false: "";
    };
    debug: {
        true: "ring-1 ring-current";
        false: "";
    };
}, undefined, string[], {
    direction: {
        up: "[--reveal-x:0px] [--reveal-y:var(--reddb-spatial-inset-lg)]";
        down: "[--reveal-x:0px] [--reveal-y:calc(-1*var(--reddb-spatial-inset-lg))]";
        left: "[--reveal-x:calc(-1*var(--reddb-spatial-inset-lg))] [--reveal-y:0px]";
        right: "[--reveal-x:var(--reddb-spatial-inset-lg)] [--reveal-y:0px]";
        none: "[--reveal-x:0px] [--reveal-y:0px]";
    };
    path: {
        css: "";
        js: string[];
    };
    entered: {
        true: "opacity-100 transform-none";
        false: "";
    };
    debug: {
        true: "ring-1 ring-current";
        false: "";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    direction: {
        up: "[--reveal-x:0px] [--reveal-y:var(--reddb-spatial-inset-lg)]";
        down: "[--reveal-x:0px] [--reveal-y:calc(-1*var(--reddb-spatial-inset-lg))]";
        left: "[--reveal-x:calc(-1*var(--reddb-spatial-inset-lg))] [--reveal-y:0px]";
        right: "[--reveal-x:var(--reddb-spatial-inset-lg)] [--reveal-y:0px]";
        none: "[--reveal-x:0px] [--reveal-y:0px]";
    };
    path: {
        css: "";
        js: string[];
    };
    entered: {
        true: "opacity-100 transform-none";
        false: "";
    };
    debug: {
        true: "ring-1 ring-current";
        false: "";
    };
}, undefined>>;
export type RevealVariants = VariantProps<typeof reveal>;
