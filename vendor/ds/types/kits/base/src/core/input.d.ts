/** The numeric native input types report numbers; an empty number reports null. */
export type InputValue<Type extends string> = string extends Type ? string | number | null : Type extends "number" | "range" ? number | null : string;
/** Read a platform input without depending on a rendering framework or globals. */
export declare function inputValue<Type extends string>(input: {
    type: Type;
    value: string;
    valueAsNumber: number;
}): InputValue<Type>;
