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
export function openWorkspaceDocument<Document extends WorkspaceDocument>(
  state: WorkspaceDocuments<Document>,
  spec: Omit<Document, "id">,
  createId: () => string,
  forceNew = false,
): { state: WorkspaceDocuments<Document>; document: Document } {
  const previous = forceNew ? undefined : state.items.find(item => item.kind === spec.kind && item.key === spec.key);
  const document = { ...previous, ...spec, id: previous?.id ?? createId() } as Document;
  const items = previous ? state.items.map(item => item === previous ? document : item) : [...state.items, document];
  return { state: { items, activeId: document.id }, document };
}

/** Focus an existing document; an unknown identity leaves state unchanged. */
export function focusWorkspaceDocument<Document extends WorkspaceDocument>(
  state: WorkspaceDocuments<Document>, id: string,
): WorkspaceDocuments<Document> {
  return state.items.some(item => item.id === id) ? { ...state, activeId: id } : state;
}

/** Close one document and restore a remembered focus, or choose its left neighbour. */
export function closeWorkspaceDocument<Document extends WorkspaceDocument>(
  state: WorkspaceDocuments<Document>, id: string, previousActiveId?: string | null,
): WorkspaceDocuments<Document> {
  const index = state.items.findIndex(item => item.id === id);
  if (index < 0) return state;
  const items = state.items.filter(item => item.id !== id);
  if (state.activeId !== id) return { items, activeId: state.activeId };
  const previous = previousActiveId && items.some(item => item.id === previousActiveId) ? previousActiveId : null;
  return { items, activeId: previous ?? items[Math.max(0, index - 1)]?.id ?? null };
}

/** Update caller-owned metadata without changing the document's identity. */
export function updateWorkspaceDocument<Document extends WorkspaceDocument>(
  state: WorkspaceDocuments<Document>, id: string, patch: Partial<Omit<Document, "id">>,
): WorkspaceDocuments<Document> {
  if (!state.items.some(item => item.id === id)) return state;
  return { ...state, items: state.items.map(item => item.id === id ? { ...item, ...patch, id: item.id } : item) };
}
