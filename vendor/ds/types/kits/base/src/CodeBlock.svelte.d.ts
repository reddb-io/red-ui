import type { HTMLAttributes } from "svelte/elements";
import { type CodeTokenizer } from "./code-block.variants";
interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** Exact source shown and copied; whitespace is never normalised. */
    code: string;
    /** Optional human-readable language label. */
    language?: string;
    /**
     * A synchronous tokenizer (a Data Kit `CodeFieldGrammar` fits) that highlights the code into
     * token spans during render — on the server too, so the prerendered HTML is already highlighted.
     * Omitted, the code renders as plain text.
     */
    grammar?: CodeTokenizer;
    /** Show non-selectable, decorative line numbers. */
    lineNumbers?: boolean;
    /** Accessible and visible copy labels. */
    copyLabel?: string;
    /** Label shown and announced after the code is copied. Defaults to `Copied`. */
    copiedLabel?: string;
    /** Retry label announced if clipboard access fails. Defaults to `Copy failed. Try again.`. */
    copyErrorLabel?: string;
    /**
     * Accessible name of the scrolling code region, announced when a keyboard user tabs into a
     * block too wide to show at once. Defaults to `<language> code`, or `Code sample` without one.
     */
    regionLabel?: string;
    /** Extra classes merged onto the code block root. */
    class?: string;
}
declare const CodeBlock: import("svelte").Component<Props, {}, "">;
type CodeBlock = ReturnType<typeof CodeBlock>;
export default CodeBlock;
