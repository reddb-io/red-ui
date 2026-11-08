export interface QueueMessage {
    index: number;
    id: string;
    messageColumn: string | null;
    message: unknown;
    state: string;
    consumer: string | null;
    dlc: string | null;
    values: Record<string, unknown>;
}
export interface QueueEvent {
    messageId: string;
    collection: string;
    op: string;
    entityId: string;
    lsn: number | null;
    ts: number | null;
    before: unknown;
    after: unknown;
    payload: Record<string, unknown>;
}
export interface QueueCommand {
    label: string;
    query: string;
    mutates: boolean;
    note: string;
}
export declare function queueSummary(messages: readonly QueueMessage[]): {
    activeConsumers: number;
    states: [string, number][];
    dlcs: string[];
    operations: [string, number][];
    sources: string[];
};
export declare function filterQueueMessages(messages: readonly QueueMessage[], filter: string): QueueMessage[];
export declare function queuePayload(text: string): unknown;
export declare function displayQueueValue(value: unknown): string;
export declare function queueEventTime(value: unknown): string;
export declare function queueEmptyReason(total: number, filtered: number, events: number, mode: string): "empty" | "filtered" | "unsupported" | null;
export declare const queueEmptyCopy: {
    empty: {
        title: string;
        description: string;
    };
    filtered: {
        title: string;
        description: string;
    };
    unsupported: {
        title: string;
        description: string;
    };
};
