export { warnA11y, hasAccessibleName, checkFieldName, checkButtonName, FIELD_NAME_FIX } from "./core/a11y";
/** What a Field tells the control rendered inside it. */
export interface FieldContext {
    /** The Field's visible label, which names the control through `<label for>`. */
    readonly label: string;
}
/** Called by Field so the control inside it knows its name is owned. */
export declare function setFieldContext(context: FieldContext): void;
/** The enclosing Field's context, or `undefined` outside one. */
export declare function getFieldContext(): FieldContext | undefined;
