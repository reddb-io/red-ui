import { type FieldControlProps } from "@reddb-io/design-system/base/recipes";
import type { SettingsRowContract } from "./contracts/settingsrow";
/** The setting name and description belong to fields; actions receive no naming overrides. */
export declare function settingsRowAssociation(props: SettingsRowContract & {
    id: string;
}): {
    labelId: string;
    control: FieldControlProps;
    helpId: string;
    errorId: string;
};
export type { FieldControlProps };
