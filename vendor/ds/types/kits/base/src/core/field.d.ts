/** Field's layout vocabulary is shared by every renderer. */
export declare const FIELD_LAYOUTS: readonly ["stacked", "inline"];
export type FieldLayout = (typeof FIELD_LAYOUTS)[number];
/** Semantic Field props; class, children and id generation belong to adapters. */
export interface FieldContractProps {
    /** Visible label text. */
    label: string;
    /** Supporting text announced with the control. */
    help?: string;
    /** Current validation error, announced and associated with the control. */
    error?: string;
    /** Makes the requirement visible and native. */
    required?: boolean;
    /** Explicit control id; otherwise the renderer supplies a stable generated one. */
    id?: string;
    /** Label placement: stacked above the control, or inline beside a binary choice. */
    layout?: FieldLayout;
}
/** The framework-neutral association passed by Field to its control. */
export interface FieldControlProps {
    /** The id the label targets. */
    id: string;
    /** Native required semantics, when the Field declares them. */
    required?: true;
    /** Space-separated help and error ids. */
    "aria-describedby"?: string;
    /** Present only while the Field has an error. */
    "aria-invalid"?: "true";
    /** The Field's current error id. */
    "aria-errormessage"?: string;
}
export interface FieldAssociationOptions {
    /** Framework-generated or application-supplied stable control id. */
    id: string;
    /** Supporting text, if present. */
    help?: string;
    /** Validation error, if present. */
    error?: string;
    /** Whether the native control is required. */
    required?: boolean;
}
/** Pure association logic; frameworks own id generation and reactive updates. */
export declare function fieldAssociation({ id, help, error, required }: FieldAssociationOptions): {
    control: FieldControlProps;
    helpId: string;
    errorId: string;
};
