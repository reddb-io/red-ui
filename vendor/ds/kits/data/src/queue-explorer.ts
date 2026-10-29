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

export function queueSummary(messages: readonly QueueMessage[]) {
  const active = new Set<string>();
  const states = new Map<string, number>();
  const dlcs = new Set<string>();
  const operations = new Map<string, number>();
  const sources = new Set<string>();
  for (const msg of messages) {
    states.set(msg.state, (states.get(msg.state) ?? 0) + 1);
    if (msg.consumer && /active|leased|processing|running/i.test(msg.state))
      active.add(msg.consumer);
    if (msg.dlc) dlcs.add(msg.dlc);
    if (
      msg.message &&
      typeof msg.message === "object" &&
      !Array.isArray(msg.message)
    ) {
      const payload = msg.message as Record<string, unknown>;
      const op = payload.op;
      const source = payload.collection;
      if (typeof op === "string")
        operations.set(op, (operations.get(op) ?? 0) + 1);
      if (typeof source === "string") sources.add(source);
    }
  }
  return {
    activeConsumers: active.size,
    states: [...states.entries()],
    dlcs: [...dlcs],
    operations: [...operations.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    ),
    sources: [...sources].sort(),
  };
}

export function filterQueueMessages(
  messages: readonly QueueMessage[],
  filter: string,
): QueueMessage[] {
  const term = filter.trim().toLowerCase();
  return messages.filter(
    (message) =>
      !term ||
      message.id.toLowerCase().includes(term) ||
      message.state.toLowerCase().includes(term) ||
      displayQueueValue(message.message).toLowerCase().includes(term),
  );
}
export function queuePayload(text: string): unknown {
  try {
    return JSON.parse(text.trim());
  } catch {
    return text.trim();
  }
}
export function displayQueueValue(value: unknown): string {
  return typeof value === "string" ? value : (JSON.stringify(value) ?? "");
}
export function queueEventTime(value: unknown): string {
  if (typeof value !== "number") return "-";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString().replace("T", " ").slice(0, 19)
    : String(value);
}
export function queueEmptyReason(
  total: number,
  filtered: number,
  events: number,
  mode: string,
): "empty" | "filtered" | "unsupported" | null {
  if (mode === "commands") return null;
  if (!total) return "empty";
  if (!filtered) return "filtered";
  if (mode === "events" && !events) return "unsupported";
  return null;
}
export const queueEmptyCopy = {
  empty: {
    title: "No queue messages returned",
    description:
      "This result contains no messages. The queue may be empty or the query may exclude available messages.",
  },
  filtered: {
    title: "No messages match this filter",
    description: "Clear the search to show the returned queue messages.",
  },
  unsupported: {
    title: "No event envelopes in these messages",
    description:
      "Messages were returned without event envelopes. Inspect their message payloads instead.",
  },
};
