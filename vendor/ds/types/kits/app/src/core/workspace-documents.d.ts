/** A caller-owned document, identified independently from its content. */
export interface WorkspaceDocument {
    /** Unique within a workspace. */
    id: string;
    /** Document category, defined by the host. */
    kind: string;
    /** Stable identity within the category, used to reopen the same document. */
    key: string;
    /** Visible document label. */
    label: string;
}
/** Portable state; the host owns persistence and reactive subscriptions. */
export interface WorkspaceDocuments<Document extends WorkspaceDocument> {
    items: Document[];
    activeId: string | null;
}
/** Open or refocus a document; an explicit duplicate receives a fresh identity. */
export declare function openWorkspaceDocument<Document extends WorkspaceDocument>(state: WorkspaceDocuments<Document>, spec: Omit<Document, "id">, createId: () => string, forceNew?: boolean): {
    state: WorkspaceDocuments<Document>;
    document: Document;
};
/** Focus an existing document; an unknown identity leaves state unchanged. */
export declare function focusWorkspaceDocument<Document extends WorkspaceDocument>(state: WorkspaceDocuments<Document>, id: string): WorkspaceDocuments<Document>;
/** Close one document and restore a remembered focus, or choose its left neighbour. */
export declare function closeWorkspaceDocument<Document extends WorkspaceDocument>(state: WorkspaceDocuments<Document>, id: string, previousActiveId?: string | null): WorkspaceDocuments<Document>;
/** Update caller-owned metadata without changing the document's identity. */
export declare function updateWorkspaceDocument<Document extends WorkspaceDocument>(state: WorkspaceDocuments<Document>, id: string, patch: Partial<Omit<Document, "id">>): WorkspaceDocuments<Document>;
