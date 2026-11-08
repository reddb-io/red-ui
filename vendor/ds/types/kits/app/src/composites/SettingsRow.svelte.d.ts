import type { Snippet } from "svelte";
import type { SettingsRowContract } from "../core/contracts/settingsrow";
import { type FieldControlProps } from "../core/settings-row";
interface Props extends SettingsRowContract {
    /** Field content receiving only its native id, requirement and description/error association. */
    children?: Snippet<[FieldControlProps]>;
    /** Independently named actions or controls. Their visible labels are never overwritten by the row. */
    actions?: Snippet;
    /** Additional classes on the row's container. */
    class?: string;
}
declare const SettingsRow: import("svelte").Component<Props, {}, "">;
type SettingsRow = ReturnType<typeof SettingsRow>;
export default SettingsRow;
