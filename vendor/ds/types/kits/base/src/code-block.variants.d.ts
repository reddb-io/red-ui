import { type VariantProps } from "tailwind-variants";
export declare const codeBlock: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            toolbar?: import("tailwind-variants").ClassValue;
            language?: import("tailwind-variants").ClassValue;
            gutter?: import("tailwind-variants").ClassValue;
            code?: import("tailwind-variants").ClassValue;
            pre?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            toolbar?: import("tailwind-variants").ClassValue;
            language?: import("tailwind-variants").ClassValue;
            gutter?: import("tailwind-variants").ClassValue;
            code?: import("tailwind-variants").ClassValue;
            pre?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    toolbar: string;
    language: string;
    pre: string;
    gutter: string;
    code: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            root?: import("tailwind-variants").ClassValue;
            toolbar?: import("tailwind-variants").ClassValue;
            language?: import("tailwind-variants").ClassValue;
            gutter?: import("tailwind-variants").ClassValue;
            code?: import("tailwind-variants").ClassValue;
            pre?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    root: string;
    toolbar: string;
    language: string;
    pre: string;
    gutter: string;
    code: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    root: string;
    toolbar: string;
    language: string;
    pre: string;
    gutter: string;
    code: string;
}>>;
export type CodeBlockVariants = VariantProps<typeof codeBlock>;
/** One span of highlighted source: its exact text and the grammar's kind for it. */
export interface CodeToken {
    /** Grammar-owned kind; `keyword`, `string`, `number` and `comment` have a role, the rest read as text. */
    kind: string;
    /** Exact source text of the span; the spans concatenate back to the code. */
    value: string;
}
/**
 * A synchronous tokenizer. It runs wherever the CodeBlock renders — on the
 * server too — so the highlighted spans are in the prerendered HTML and
 * hydration adopts them instead of repainting the block. The Data Kit's
 * `CodeFieldGrammar` satisfies it, so one grammar highlights both.
 */
export interface CodeTokenizer {
    tokenize(code: string): readonly CodeToken[];
}
/** Token kinds with a highlight role; every other kind keeps the block's foreground. */
export declare const CODE_TOKEN_CLASSES: Readonly<Record<string, string>>;
/** The tokens, or the whole code as one text token when they would not reproduce it. */
export declare function codeTokens(code: string, tokenizer?: CodeTokenizer): readonly CodeToken[];
