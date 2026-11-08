import { type VariantProps } from "tailwind-variants";
export { FIELD_LAYOUTS, type FieldLayout, type FieldControlProps } from "./core/field";
export declare const field: import("tailwind-variants").TVReturnType<{
    layout: {
        readonly stacked: {
            readonly root: "";
            readonly label: "";
            readonly help: "";
            readonly error: "";
        };
        readonly inline: {
            readonly root: "grid-cols-[auto_minmax(0,1fr)] items-center gap-x-[var(--reddb-spatial-gap-md)]";
            readonly label: "cursor-pointer";
            readonly help: "col-start-2";
            readonly error: "col-start-2";
        };
    };
}, {
    root: string;
    label: string;
    required: string;
    help: string;
    error: string;
}, undefined, {
    layout: {
        readonly stacked: {
            readonly root: "";
            readonly label: "";
            readonly help: "";
            readonly error: "";
        };
        readonly inline: {
            readonly root: "grid-cols-[auto_minmax(0,1fr)] items-center gap-x-[var(--reddb-spatial-gap-md)]";
            readonly label: "cursor-pointer";
            readonly help: "col-start-2";
            readonly error: "col-start-2";
        };
    };
}, {
    root: string;
    label: string;
    required: string;
    help: string;
    error: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    layout: {
        readonly stacked: {
            readonly root: "";
            readonly label: "";
            readonly help: "";
            readonly error: "";
        };
        readonly inline: {
            readonly root: "grid-cols-[auto_minmax(0,1fr)] items-center gap-x-[var(--reddb-spatial-gap-md)]";
            readonly label: "cursor-pointer";
            readonly help: "col-start-2";
            readonly error: "col-start-2";
        };
    };
}, {
    root: string;
    label: string;
    required: string;
    help: string;
    error: string;
}>>;
export type FieldVariants = VariantProps<typeof field>;
