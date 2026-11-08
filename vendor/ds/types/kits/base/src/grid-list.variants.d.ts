import { type VariantProps } from "tailwind-variants";
export declare const GRID_LIST_COLUMNS: readonly [1, 2, 3, 4];
export type GridListColumn = (typeof GRID_LIST_COLUMNS)[number];
export declare const gridList: import("tailwind-variants").TVReturnType<{
    columns: {
        1: "grid-cols-1";
        2: "grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_var(--reddb-spatial-gap-lg))_/_2_-_1px),min(calc(100%_-_1px),calc((var(--reddb-container-lg)_-_100%)*9999))),1fr))]";
        3: "grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_2*var(--reddb-spatial-gap-lg))_/_3_-_1px),min(calc((100%_-_var(--reddb-spatial-gap-lg))_/_2_-_1px),calc((var(--reddb-container-3xl)_-_100%)*9999)),min(calc(100%_-_1px),calc((var(--reddb-container-lg)_-_100%)*9999))),1fr))]";
        4: "grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_3*var(--reddb-spatial-gap-lg))_/_4_-_1px),min(calc((100%_-_var(--reddb-spatial-gap-lg))_/_2_-_1px),calc((var(--reddb-container-5xl)_-_100%)*9999)),min(calc(100%_-_1px),calc((var(--reddb-container-lg)_-_100%)*9999))),1fr))]";
    };
}, undefined, "grid w-full", {
    columns: {
        1: "grid-cols-1";
        2: "grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_var(--reddb-spatial-gap-lg))_/_2_-_1px),min(calc(100%_-_1px),calc((var(--reddb-container-lg)_-_100%)*9999))),1fr))]";
        3: "grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_2*var(--reddb-spatial-gap-lg))_/_3_-_1px),min(calc((100%_-_var(--reddb-spatial-gap-lg))_/_2_-_1px),calc((var(--reddb-container-3xl)_-_100%)*9999)),min(calc(100%_-_1px),calc((var(--reddb-container-lg)_-_100%)*9999))),1fr))]";
        4: "grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_3*var(--reddb-spatial-gap-lg))_/_4_-_1px),min(calc((100%_-_var(--reddb-spatial-gap-lg))_/_2_-_1px),calc((var(--reddb-container-5xl)_-_100%)*9999)),min(calc(100%_-_1px),calc((var(--reddb-container-lg)_-_100%)*9999))),1fr))]";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    columns: {
        1: "grid-cols-1";
        2: "grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_var(--reddb-spatial-gap-lg))_/_2_-_1px),min(calc(100%_-_1px),calc((var(--reddb-container-lg)_-_100%)*9999))),1fr))]";
        3: "grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_2*var(--reddb-spatial-gap-lg))_/_3_-_1px),min(calc((100%_-_var(--reddb-spatial-gap-lg))_/_2_-_1px),calc((var(--reddb-container-3xl)_-_100%)*9999)),min(calc(100%_-_1px),calc((var(--reddb-container-lg)_-_100%)*9999))),1fr))]";
        4: "grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_3*var(--reddb-spatial-gap-lg))_/_4_-_1px),min(calc((100%_-_var(--reddb-spatial-gap-lg))_/_2_-_1px),calc((var(--reddb-container-5xl)_-_100%)*9999)),min(calc(100%_-_1px),calc((var(--reddb-container-lg)_-_100%)*9999))),1fr))]";
    };
}, undefined>>;
export type GridListVariants = VariantProps<typeof gridList>;
