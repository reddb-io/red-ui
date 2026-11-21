export declare const CONTROL_SIZES: readonly ["sm", "md", "lg"];
export type ControlSize = (typeof CONTROL_SIZES)[number];
/** The context key both adapters use to provide a group's size. */
export declare const CONTROL_SIZE_CONTEXT: unique symbol;
/** A control's size: its own, else its group's, else `md`. */
export declare function resolveControlSize(own?: ControlSize, group?: ControlSize, fallback?: ControlSize): ControlSize;
