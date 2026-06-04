import { describe, expect, it, beforeEach } from "vitest";
import {
  REDWIRE_WS_SUBPROTOCOL,
  MessageKind,
  decodeFrame,
  encodeFrame,
  encodePreamble,
  redwireWsUrlFromHttp,
  runRedWireWsSpike,
} from "./redwire-ws-spike";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readyState = 0;
  binaryType = "blob";
  sent: Uint8Array[] = [];
  readonly url: string;
  readonly protocol: string;
  readonly listeners = new Map<string, Set<(event?: unknown) => void>>();

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocol = Array.isArray(protocols) ? protocols[0] : (protocols ?? "");
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = 1;
      this.emit("open");
    });
  }

  addEventListener(type: string, cb: (event?: unknown) => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(cb);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, cb: (event?: unknown) => void): void {
    this.listeners.get(type)?.delete(cb);
  }

  send(data: Uint8Array | ArrayBuffer): void {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.sent.push(bytes);
    if (bytes.byteLength === 2) return;

    const frame = decodeFrame(bytes);
    if (!frame) return;
    if (frame.kind === MessageKind.Hello) {
      this.deliver(
        encodeFrame(
          MessageKind.HelloAck,
          frame.correlationId,
          jsonBytes({ auth: "bearer", features: 0 })
        )
      );
    } else if (frame.kind === MessageKind.AuthResponse) {
      this.deliver(
        encodeFrame(
          MessageKind.AuthOk,
          frame.correlationId,
          jsonBytes({ session_id: "mock-session", features: 0 })
        )
      );
    } else if (frame.kind === MessageKind.QueryBinary) {
      const query = new TextDecoder().decode(frame.payload);
      this.deliver(
        encodeFrame(
          MessageKind.Result,
          frame.correlationId,
          jsonBytes({
            ok: true,
            query,
            columns: ["x"],
            rows: [{ x: 1 }],
          }),
          0,
          frame.streamId
        )
      );
    }
  }

  close(): void {
    this.readyState = 3;
    this.emit("close");
  }

  private deliver(bytes: Uint8Array): void {
    queueMicrotask(() => {
      const data = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      );
      this.emit("message", { data });
    });
  }

  private emit(type: string, event?: unknown): void {
    for (const cb of this.listeners.get(type) ?? []) cb(event);
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
});

describe("RedWire WS frame codec", () => {
  it("encodes the native preamble", () => {
    expect([...encodePreamble()]).toEqual([0xfe, 0x01]);
  });

  it("encodes and decodes the 16-byte header with stream and correlation ids", () => {
    const payload = new TextEncoder().encode("SELECT 1");
    const encoded = encodeFrame(MessageKind.QueryBinary, 42n, payload, 0b10, 7);
    const view = new DataView(encoded.buffer);

    expect(view.getUint32(0, true)).toBe(16 + payload.byteLength);
    expect(encoded[4]).toBe(MessageKind.QueryBinary);
    expect(encoded[5]).toBe(0b10);
    expect(view.getUint16(6, true)).toBe(7);
    expect(view.getBigUint64(8, true)).toBe(42n);

    const decoded = decodeFrame(encoded);
    expect(decoded?.kind).toBe(MessageKind.QueryBinary);
    expect(decoded?.flags).toBe(0b10);
    expect(decoded?.streamId).toBe(7);
    expect(decoded?.correlationId).toBe(42n);
    expect(new TextDecoder().decode(decoded?.payload)).toBe("SELECT 1");
    expect(decoded?.consumed).toBe(encoded.byteLength);
  });

  it("waits for partial frames", () => {
    const encoded = encodeFrame(MessageKind.Hello, 1n, jsonBytes({}));
    expect(decodeFrame(encoded.slice(0, 8))).toBeNull();
  });

  it("resolves HTTPS origins to the RedWire WSS route", () => {
    expect(redwireWsUrlFromHttp("https://example.test")).toBe(
      "wss://example.test/redwire"
    );
    expect(redwireWsUrlFromHttp("wss://example.test/redwire")).toBe(
      "wss://example.test/redwire"
    );
  });
});

describe("runRedWireWsSpike", () => {
  it("opens with the RedWire subprotocol, handshakes, sends one query, and decodes the result", async () => {
    const result = await runRedWireWsSpike({
      url: "wss://example.test/redwire",
      token: "secret-token",
      query: "SELECT 1",
      WebSocketImpl: MockWebSocket as unknown as typeof WebSocket,
    });

    expect(result.endpoint).toBe("wss://example.test/redwire");
    expect(result.subprotocol).toBe(REDWIRE_WS_SUBPROTOCOL);
    expect(result.session.session_id).toBe("mock-session");
    expect(result.query).toMatchObject({
      ok: true,
      statement: "SELECT 1",
      columns: ["x"],
      rows: [{ x: 1 }],
    });

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe("wss://example.test/redwire");
    expect(ws.protocol).toBe(REDWIRE_WS_SUBPROTOCOL);
    expect([...ws.sent[0]]).toEqual([0xfe, 0x01]);

    const hello = decodeFrame(ws.sent[1]);
    const auth = decodeFrame(ws.sent[2]);
    const query = decodeFrame(ws.sent[3]);
    expect(hello?.kind).toBe(MessageKind.Hello);
    expect(auth?.kind).toBe(MessageKind.AuthResponse);
    expect(query?.kind).toBe(MessageKind.QueryBinary);
    expect(query?.streamId).toBe(1);
    expect(query?.correlationId).toBe(3n);
    expect(new TextDecoder().decode(query?.payload)).toBe("SELECT 1");
  });
});

function jsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}
