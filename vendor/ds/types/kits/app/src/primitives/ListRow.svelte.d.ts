import type { ListRowContract } from "../core/contracts/listrow";
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type ListRowDensity } from "./list-row.variants";
interface Props extends ListRowContract, Omit<HTMLAttributes<HTMLElement>, keyof ListRowContract | "class" | "title"> {
    /** @deprecated Renamed `size` (ADR 0026): `comfortable` is `md`, `compact` is `sm`. Removed next release. */
    density?: ListRowDensity;
    /** Before the text: an icon, an avatar, a status dot. */
    leading?: Snippet;
    /** After the text, pushed to the end of the row. */
    trailing?: Snippet;
    /** Full control over the text block. Replaces `title`/`description`. */
    children?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
}
declare const ListRow: import("svelte").Component<Props, {}, "">;
type ListRow = ReturnType<typeof ListRow>;
export default ListRow;
