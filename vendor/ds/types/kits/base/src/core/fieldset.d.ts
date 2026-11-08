import { type FieldControlProps } from "./field";
/** A group association leaves every native control's id and requirement intact. */
export type FieldsetControlProps = Omit<FieldControlProps, "id" | "required">;
/** Group help/error links use the same normalization as a single Field. */
export declare function fieldsetAssociation(options: {
    id: string;
    help?: string;
    error?: string;
}): {
    control: {
        "aria-describedby"?: string;
        "aria-invalid"?: "true";
        "aria-errormessage"?: string;
    };
    helpId: string;
    errorId: string;
};
