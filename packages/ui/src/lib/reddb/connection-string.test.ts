import { describe, expect, it } from "vitest";
import {
  ConnectionStringError,
  decodeConnectionString,
  parseConnectionString,
} from "./connection-string";

const username = "alice+ops";
const password = "pä ss@:/+=%?#密碼";
const uri = `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@[::1]:8443`;
const encode = (s: string) => Buffer.from(s).toString("base64");

describe("connection strings", () => {
  it.each([
    uri,
    encode(uri),
    encode(uri).replace(/=+$/, ""),
    Buffer.from(uri).toString("base64url"),
    `base64:${encode(uri)}`,
    `base64url:${Buffer.from(uri).toString("base64url")}`,
  ])("extracts credentials and a safe IPv6 endpoint (%#)", (input) => {
    expect(parseConnectionString(input)).toEqual({
      url: "https://[::1]:8443",
      credentials: { username, password },
    });
  });

  it("decodes UTF-8 userinfo even when it was not percent-encoded before Base64", () => {
    expect(
      parseConnectionString(encode("https://bob:密碼@db.example")).credentials
        ?.password
    ).toBe("密碼");
  });

  it.each([
    "base64:%%invalid%%",
    "base64:a",
    "base64:aGVsbG8=",
    "base64:aHR0cHM6Ly9o===",
    "base64:aHR0cHM6Ly9p=", // Invalid padding length.
    "base64:aHR0cHM6Ly9pZh==", // Noncanonical trailing bits.
    encode(encode(uri)),
    "x".repeat(16385),
    "https://user@db.example",
    "https://:password@db.example",
    "https://alice:%XX@db.example",
    "https://db.example?token=secret",
    "https://db.example#secret",
    "ftp://db.example",
    "https://bad host",
  ])("rejects invalid or ambiguous input without echoing it (%#)", (input) => {
    expect(() => parseConnectionString(input)).toThrow(ConnectionStringError);
    try {
      parseConnectionString(input);
    } catch (e) {
      expect((e as Error).message).not.toContain(input);
    }
  });

  it.each(["http://h", "https://h", "red://h"])(
    "decodes short padded and unpadded strings (%s)",
    (cs) => {
      expect(parseConnectionString(Buffer.from(cs).toString("base64"))).toEqual(
        parseConnectionString(cs)
      );
      expect(
        parseConnectionString(Buffer.from(cs).toString("base64url"))
      ).toEqual(parseConnectionString(cs));
    }
  );

  it("preserves plain hostnames of different lengths", () => {
    for (const host of ["localhost", "db", "my-long-local-database-host"]) {
      expect(parseConnectionString(host).url).toBe(`http://${host}`);
    }
  });

  it.each(["reds", "red+tls", "red", "red+tcp", "red+wire"])(
    "uses the published HTTPS endpoint for managed %s connections, including Base64",
    (scheme) => {
      for (const domain of ["dev", "io"]) {
        const cs = `${scheme}://alice:${encodeURIComponent(password)}@orders.acme.dbs.reddb.${domain}:5050`;
        for (const input of [
          cs,
          encode(cs),
          Buffer.from(cs).toString("base64url"),
        ]) {
          expect(parseConnectionString(input)).toEqual({
            url: `https://orders.acme.dbs.reddb.${domain}`,
            credentials: { username: "alice", password },
          });
        }
      }
    }
  );

  it("matches only canonical managed database hosts and preserves explicit HTTPS ports", () => {
    for (const host of [
      "orders.acme.dbs.reddb.dev.evil.test",
      "dbs.reddb.dev",
      "acme.dbs.reddb.dev",
      "orders.acme.dbs.reddb.dev.attacker",
      "localhost",
      "[::1]",
    ]) {
      expect(parseConnectionString(`reds://${host}:5050`).url).toBe(
        `https://${host}:5055`
      );
    }
    expect(
      parseConnectionString("https://orders.acme.dbs.reddb.dev:8443").url
    ).toBe("https://orders.acme.dbs.reddb.dev:8443");
  });

  it("keeps the existing HTTP bridge and desktop transport contracts", () => {
    expect(parseConnectionString("reds://user:password@host:5050")).toEqual({
      url: "https://host:5055",
      credentials: { username: "user", password: "password" },
    });
    expect(parseConnectionString("file:///tmp/test.rdb")).toEqual({
      url: "file:///tmp/test.rdb",
    });
    expect(parseConnectionString("localhost:5055")).toEqual({
      url: "http://localhost:5055",
    });
    expect(decodeConnectionString("https://host")).toBe("https://host");
  });
});
