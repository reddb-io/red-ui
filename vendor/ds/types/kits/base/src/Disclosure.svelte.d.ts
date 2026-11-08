import type { DisclosureContract } from "./core/contracts/disclosure";
import type { Snippet } from "svelte";
interface Props extends DisclosureContract {
    /** Called with the next open state (ADR 0026's open dialect). */
    onopenchange?: (open: boolean) => void;
    /** @deprecated Renamed `onopenchange` (ADR 0026); removed next release. */
    onchange?: (open: boolean) => void;
    /** Content of the expandable region, rendered only while it is open. */
    children?: Snippet;
    /** Extra classes merged onto the disclosure root. */
    class?: string;
}
declare const Disclosure: import("svelte").Component<Props, {}, "open">;
type Disclosure = ReturnType<typeof Disclosure>;
export default Disclosure;
