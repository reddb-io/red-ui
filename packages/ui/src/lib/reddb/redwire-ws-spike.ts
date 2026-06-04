const REDWIRE_MAGIC = 0xfe;
const REDWIRE_MINOR = 0x01;
const FRAME_HEADER_SIZE = 16;
const MAX_FRAME_SIZE = 16 * 1024 * 1024;
const KNOWN_FLAGS = 0b0000_0011;
const WS_CONNECTING = 0;
const WS_OPEN = 1;

export const REDWIRE_WS_PATH = "/redwire";
export const REDWIRE_WS_SUBPROTOCOL = "reddb.redwire.v1";

export const MessageKind = {
  Query: 0x01,
  Result: 0x02,
  Error: 0x03,
  QueryBinary: 0x07,
  Hello: 0x10,
  HelloAck: 0x11,
  AuthResponse: 0x13,
  AuthOk: 0x14,
  AuthFail: 0x15,
  Bye: 0x16,
} as const;

export type RedWireMessageKind = (typeof MessageKind)[keyof typeof MessageKind];

const KIND_NAME = new Map<number, string>(
  Object.entries(MessageKind).map(([name, value]) => [value, name])
);

export interface RedWireFrame {
  kind: RedWireMessageKind | number;
  flags: number;
  streamId: number;
  correlationId: bigint;
  payload: Uint8Array;
}

export interface DecodedRedWireFrame extends RedWireFrame {
  consumed: number;
}

export interface RedWireQueryResult {
  ok: boolean;
  statement?: string;
  affected?: number;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  raw: unknown;
}

export interface RedWireWsSpikeResult {
  endpoint: string;
  subprotocol: string;
  session: Record<string, unknown>;
  helloAck: Record<string, unknown>;
  query: RedWireQueryResult;
}

export class RedWireSpikeError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "RedWireSpikeError";
  }
}

export function redwireWsUrlFromHttp(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol === "wss:") return parsed.toString();
  if (parsed.protocol === "https:") {
    parsed.protocol = "wss:";
  } else if (parsed.protocol === "http:") {
    parsed.protocol = "ws:";
  }
  if (parsed.pathname === "/" || parsed.pathname === "") {
    parsed.pathname = REDWIRE_WS_PATH;
  }
  return parsed.toString();
}

export function encodeFrame(
  kind: RedWireMessageKind | number,
  correlationId: bigint | number,
  payload: Uint8Array | ArrayBuffer | ArrayLike<number>,
  flags = 0,
  streamId = 0
): Uint8Array {
  const body =
    payload instanceof Uint8Array ? payload : new Uint8Array(payload);
  const length = FRAME_HEADER_SIZE + body.byteLength;
  if (length > MAX_FRAME_SIZE) {
    throw new RedWireSpikeError(
      "FRAME_TOO_LARGE",
      `frame ${length} exceeds ${MAX_FRAME_SIZE}`
    );
  }
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, length, true);
  bytes[4] = kind & 0xff;
  bytes[5] = flags & KNOWN_FLAGS;
  view.setUint16(6, streamId, true);
  view.setBigUint64(8, BigInt(correlationId), true);
  bytes.set(body, FRAME_HEADER_SIZE);
  return bytes;
}

export function decodeFrame(bytes: Uint8Array): DecodedRedWireFrame | null {
  if (bytes.byteLength < FRAME_HEADER_SIZE) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(0, true);
  if (length < FRAME_HEADER_SIZE || length > MAX_FRAME_SIZE) {
    throw new RedWireSpikeError("FRAME_INVALID_LENGTH", `length=${length}`);
  }
  if (bytes.byteLength < length) return null;
  const flags = bytes[5];
  if (flags & ~KNOWN_FLAGS) {
    throw new RedWireSpikeError(
      "FRAME_UNKNOWN_FLAGS",
      `flags=0x${flags.toString(16)}`
    );
  }
  return {
    kind: bytes[4],
    flags,
    streamId: view.getUint16(6, true),
    correlationId: view.getBigUint64(8, true),
    payload: bytes.slice(FRAME_HEADER_SIZE, length),
    consumed: length,
  };
}

export function encodePreamble(): Uint8Array {
  return Uint8Array.from([REDWIRE_MAGIC, REDWIRE_MINOR]);
}

export function decodeResultPayload(payload: Uint8Array): RedWireQueryResult {
  const json = parseJson(payload);
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    const columns = Array.isArray(obj.columns)
      ? obj.columns.filter((c): c is string => typeof c === "string")
      : [];
    const rows = Array.isArray(obj.rows)
      ? obj.rows.filter(isRecord)
      : Array.isArray(
            (obj.result as Record<string, unknown> | undefined)?.records
          )
        ? ((obj.result as Record<string, unknown>).records as unknown[]).filter(
            isRecord
          )
        : [];
    return {
      ok: obj.ok !== false,
      statement: stringField(obj.statement) ?? stringField(obj.query),
      affected: numberField(obj.affected),
      columns,
      rows,
      raw: json,
    };
  }
  return decodeBinaryResultPayload(payload);
}

export async function runRedWireWsSpike({
  url,
  token,
  query,
  timeoutMs = 10_000,
  WebSocketImpl = globalThis.WebSocket,
}: {
  url: string;
  token: string;
  query: string;
  timeoutMs?: number;
  WebSocketImpl?: typeof WebSocket;
}): Promise<RedWireWsSpikeResult> {
  if (typeof WebSocketImpl !== "function") {
    throw new RedWireSpikeError("NO_WEBSOCKET", "WebSocket is unavailable");
  }
  if (!url.startsWith("wss://")) {
    throw new RedWireSpikeError(
      "WSS_REQUIRED",
      `RedWire WS requires wss://, got ${url}`
    );
  }
  if (!token.trim()) {
    throw new RedWireSpikeError("TOKEN_REQUIRED", "Bearer token is required");
  }

  const socket = new BrowserWebSocketDuplex(
    new WebSocketImpl(url, REDWIRE_WS_SUBPROTOCOL)
  );
  await socket.open(timeoutMs);
  const reader = new FrameReader(socket);
  const enc = new TextEncoder();

  try {
    socket.write(encodePreamble());
    socket.write(
      encodeFrame(
        MessageKind.Hello,
        1n,
        jsonBytes({
          versions: [REDWIRE_MINOR],
          auth_methods: ["bearer"],
          features: 0,
          client_name: "red-ui/redwire-ws-spike",
        })
      )
    );

    const helloAck = await expectFrame(
      reader,
      [MessageKind.HelloAck, MessageKind.AuthFail],
      "HelloAck"
    );
    if (helloAck.kind === MessageKind.AuthFail) {
      throw new RedWireSpikeError(
        "AUTH_REFUSED",
        parseReason(helloAck.payload) ?? "AuthFail at HelloAck"
      );
    }
    const helloAckPayload = expectJsonObject(helloAck.payload, "HelloAck");
    if (helloAckPayload.auth !== "bearer") {
      throw new RedWireSpikeError(
        "AUTH_UNSUPPORTED",
        `server picked ${String(helloAckPayload.auth)}, expected bearer`
      );
    }

    socket.write(
      encodeFrame(
        MessageKind.AuthResponse,
        2n,
        jsonBytes({ token: token.trim() })
      )
    );
    const authOk = await expectFrame(
      reader,
      [MessageKind.AuthOk, MessageKind.AuthFail],
      "AuthOk"
    );
    if (authOk.kind === MessageKind.AuthFail) {
      throw new RedWireSpikeError(
        "AUTH_REFUSED",
        parseReason(authOk.payload) ?? "auth refused"
      );
    }
    const session = expectJsonObject(authOk.payload, "AuthOk");

    const correlationId = 3n;
    socket.write(
      encodeFrame(
        MessageKind.QueryBinary,
        correlationId,
        enc.encode(query),
        0,
        1
      )
    );
    const reply = await expectFrame(
      reader,
      [MessageKind.Result, MessageKind.Error],
      "query result"
    );
    if (reply.correlationId !== correlationId) {
      throw new RedWireSpikeError(
        "CORRELATION_MISMATCH",
        `expected correlation ${correlationId}, got ${reply.correlationId}`
      );
    }
    if (reply.kind === MessageKind.Error) {
      throw new RedWireSpikeError(
        "QUERY_FAILED",
        new TextDecoder().decode(reply.payload)
      );
    }

    return {
      endpoint: url,
      subprotocol: REDWIRE_WS_SUBPROTOCOL,
      session,
      helloAck: helloAckPayload,
      query: decodeResultPayload(reply.payload),
    };
  } finally {
    socket.close();
  }
}

type SocketEvent = "data" | "error" | "close";

class BrowserWebSocketDuplex {
  readonly #ws: WebSocket;
  readonly #handlers: Record<SocketEvent, Array<(arg?: unknown) => void>> = {
    data: [],
    error: [],
    close: [],
  };

  constructor(ws: WebSocket) {
    this.#ws = ws;
    this.#ws.binaryType = "arraybuffer";
    this.#ws.addEventListener("message", (event) => {
      const bytes = bytesFromMessage(event.data);
      if (bytes) this.#emit("data", bytes);
    });
    this.#ws.addEventListener("error", () => {
      this.#emit(
        "error",
        new RedWireSpikeError("WS_ERROR", "WebSocket transport error")
      );
    });
    this.#ws.addEventListener("close", () => this.#emit("close"));
  }

  on(event: SocketEvent, cb: (arg?: unknown) => void): void {
    this.#handlers[event].push(cb);
  }

  open(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.#ws.readyState === WS_OPEN) {
        resolve();
        return;
      }
      const timeout = setTimeout(() => {
        cleanup();
        reject(new RedWireSpikeError("WS_TIMEOUT", "WebSocket open timed out"));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timeout);
        this.#ws.removeEventListener("open", onOpen);
        this.#ws.removeEventListener("error", onError);
        this.#ws.removeEventListener("close", onClose);
      };
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(
          new RedWireSpikeError("WS_CONNECT_FAILED", "WebSocket failed to open")
        );
      };
      const onClose = () => {
        cleanup();
        reject(
          new RedWireSpikeError(
            "WS_CONNECT_FAILED",
            "WebSocket closed before opening"
          )
        );
      };
      this.#ws.addEventListener("open", onOpen);
      this.#ws.addEventListener("error", onError);
      this.#ws.addEventListener("close", onClose);
    });
  }

  write(bytes: Uint8Array): void {
    this.#ws.send(bytes);
  }

  close(): void {
    if (
      this.#ws.readyState === WS_OPEN ||
      this.#ws.readyState === WS_CONNECTING
    ) {
      this.#ws.close();
    }
  }

  #emit(event: SocketEvent, arg?: unknown): void {
    for (const cb of this.#handlers[event]) cb(arg);
  }
}

class FrameReader {
  #buffer = new Uint8Array();
  #waiters: Array<{
    resolve: (frame: DecodedRedWireFrame) => void;
    reject: (err: unknown) => void;
  }> = [];
  #error: unknown = null;
  #closed = false;

  constructor(socket: BrowserWebSocketDuplex) {
    socket.on("data", (chunk) => {
      if (!(chunk instanceof Uint8Array)) return;
      const next = new Uint8Array(this.#buffer.byteLength + chunk.byteLength);
      next.set(this.#buffer, 0);
      next.set(chunk, this.#buffer.byteLength);
      this.#buffer = next;
      this.#drain();
    });
    socket.on("error", (err) => {
      this.#error = err;
      this.#flush();
    });
    socket.on("close", () => {
      this.#closed = true;
      this.#flush();
    });
  }

  next(): Promise<DecodedRedWireFrame> {
    if (this.#error) return Promise.reject(this.#error);
    return new Promise((resolve, reject) => {
      this.#waiters.push({ resolve, reject });
      this.#drain();
    });
  }

  #drain(): void {
    while (this.#waiters.length > 0 && this.#buffer.byteLength > 0) {
      const frame = decodeFrame(this.#buffer);
      if (!frame) return;
      this.#buffer = this.#buffer.slice(frame.consumed);
      this.#waiters.shift()?.resolve(frame);
    }
    this.#flush();
  }

  #flush(): void {
    if (!this.#error && (!this.#closed || this.#buffer.byteLength > 0)) return;
    const err =
      this.#error ??
      new RedWireSpikeError("CONNECTION_CLOSED", "RedWire WS closed");
    while (this.#waiters.length > 0) this.#waiters.shift()?.reject(err);
  }
}

async function expectFrame(
  reader: FrameReader,
  kinds: number[],
  label: string
): Promise<DecodedRedWireFrame> {
  const frame = await reader.next();
  if (!kinds.includes(frame.kind)) {
    throw new RedWireSpikeError(
      "UNEXPECTED_FRAME",
      `expected ${label}, got ${KIND_NAME.get(frame.kind) ?? frame.kind}`
    );
  }
  return frame;
}

function jsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function parseJson(bytes: Uint8Array): unknown {
  if (bytes.byteLength === 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function expectJsonObject(
  bytes: Uint8Array,
  label: string
): Record<string, unknown> {
  const parsed = parseJson(bytes);
  if (!isRecord(parsed)) {
    throw new RedWireSpikeError("PROTOCOL", `${label} payload is not JSON`);
  }
  return parsed;
}

function parseReason(payload: Uint8Array): string | null {
  const parsed = parseJson(payload);
  if (!isRecord(parsed)) return null;
  return stringField(parsed.reason) ?? null;
}

function decodeBinaryResultPayload(payload: Uint8Array): RedWireQueryResult {
  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength
  );
  const dec = new TextDecoder();
  let pos = 0;
  const read = (n: number, label: string): number => {
    if (pos + n > payload.byteLength) {
      throw new RedWireSpikeError(
        "RESULT_TRUNCATED",
        `Result payload truncated while reading ${label}`
      );
    }
    const start = pos;
    pos += n;
    return start;
  };
  const readU16 = (label: string) => view.getUint16(read(2, label), true);
  const readU32 = (label: string) => view.getUint32(read(4, label), true);
  const readText = (n: number, label: string) =>
    dec.decode(payload.subarray(read(n, label), pos));
  const readI64 = (label: string) =>
    jsNumberOrBigInt(view.getBigInt64(read(8, label), true));
  const readU64 = (label: string) =>
    jsNumberOrBigInt(view.getBigUint64(read(8, label), true));

  const columnCount = readU16("column count");
  const columns: string[] = [];
  for (let i = 0; i < columnCount; i += 1) {
    const length = readU16(`column ${i} length`);
    columns.push(readText(length, `column ${i} name`));
  }
  const rowCount = readU32("row count");
  const rows: Array<Record<string, unknown>> = [];
  for (let r = 0; r < rowCount; r += 1) {
    const row: Record<string, unknown> = {};
    for (const column of columns) row[column] = readBinaryValue();
    rows.push(row);
  }
  return {
    ok: true,
    statement: "SELECT",
    affected: 0,
    columns,
    rows,
    raw: { columns, rows },
  };

  function readBinaryValue(): unknown {
    const tag = payload[read(1, "value tag")];
    switch (tag) {
      case 0:
        return null;
      case 1:
        return readI64("i64 value");
      case 2:
        return view.getFloat64(read(8, "f64 value"), true);
      case 3: {
        const length = readU32("text length");
        return readText(length, "text value");
      }
      case 4:
        return payload[read(1, "bool value")] !== 0;
      case 5:
        return readU64("u64 value");
      default:
        throw new RedWireSpikeError(
          "RESULT_UNKNOWN_TAG",
          `Result payload has unknown value tag ${tag}`
        );
    }
  }
}

function bytesFromMessage(data: unknown): Uint8Array | null {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function jsNumberOrBigInt(value: bigint): number | bigint {
  if (
    value >= BigInt(Number.MIN_SAFE_INTEGER) &&
    value <= BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    return Number(value);
  }
  return value;
}
