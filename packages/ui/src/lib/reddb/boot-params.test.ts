import { describe, expect, it } from "vitest";
import {
  OpenContractError,
  encodeOpenContract,
  hasBootEndpoint,
  hasBootRoute,
  parseBootParams,
  parseOpenContract,
} from "./boot-params";
import { LocalUrlProvider } from "./local-url-provider";

describe("Open Contract", () => {
  it("round-trips cs, to, and hash-only token", () => {
    const encoded = encodeOpenContract({
      cs: "http://localhost:5055",
      to: "/c/users/p/table",
      token: "secret token",
    });

    const [query] = encoded.split("#");
    expect(new URLSearchParams(query).has("token")).toBe(false);
    expect(parseOpenContract(encoded)).toEqual({
      cs: "http://localhost:5055",
      to: "/c/users/p/table",
      token: "secret token",
    });
  });

  it("reads token from the hash, never from the query string", () => {
    expect(
      parseOpenContract(
        "?cs=http://h:5055&token=query-secret#token=hash-secret"
      )
    ).toEqual({
      cs: "http://h:5055",
      token: "hash-secret",
    });
    expect(
      parseOpenContract("?cs=http://h:5055&token=query-secret").token
    ).toBeUndefined();
    expect(
      encodeOpenContract({ cs: "http://h:5055", token: "hash-secret" })
    ).toBe("?cs=http%3A%2F%2Fh%3A5055#token=hash-secret");
  });

  it("rejects tokens smuggled inside the cs URL query", () => {
    expect(() =>
      parseOpenContract("?cs=http%3A%2F%2Fh%3A5055%2F%3Ftoken%3Dquery-secret")
    ).toThrow(OpenContractError);
    expect(() =>
      encodeOpenContract({ cs: "http://h:5055/?api_key=query-secret" })
    ).toThrow(OpenContractError);
  });

  it("rejects malformed cs input", () => {
    expect(() => parseOpenContract("?cs=not a url")).toThrow(OpenContractError);
    expect(() => encodeOpenContract({ cs: "red://localhost" })).toThrow(
      OpenContractError
    );
  });

  it("rejects filesystem-looking cs input", () => {
    for (const cs of [
      "/tmp/reddb",
      "./reddb",
      "../reddb",
      "~/reddb",
      "C:\\data\\reddb",
      "file:///tmp/reddb",
    ]) {
      expect(() => parseOpenContract(`?cs=${encodeURIComponent(cs)}`)).toThrow(
        OpenContractError
      );
    }
  });
});

describe("parseBootParams", () => {
  it("reads Open Contract cs + to from the app URL query", () => {
    expect(parseBootParams("?cs=http://host:5055&to=/cluster")).toEqual({
      endpoint: "http://host:5055",
      to: "/cluster",
    });
  });

  it("keeps the legacy endpoint + view aliases", () => {
    expect(parseBootParams("?endpoint=http://host:5055&view=cluster")).toEqual({
      endpoint: "http://host:5055",
      view: "cluster",
    });
  });

  it("accepts the legacy endpoint aliases", () => {
    expect(parseBootParams("?connection=red://h").endpoint).toBe("red://h");
    expect(parseBootParams("?red_url=http://h").endpoint).toBe("http://h");
    expect(parseBootParams("?red=http://h").endpoint).toBe("http://h");
  });

  it("NEVER surfaces a token from the URL (query secrets dropped, hash token omitted)", () => {
    const b = parseBootParams(
      "?cs=http://h&token=supersecret&api_key=k&password=p",
      "#token=hash-secret"
    );
    expect(b.endpoint).toBe("http://h");
    expect(JSON.stringify(b)).not.toContain("supersecret");
    expect(JSON.stringify(b)).not.toContain("hash-secret");
    expect(JSON.stringify(b)).not.toContain('"k"');
    expect(Object.keys(b)).toEqual(["endpoint"]);
  });

  it("returns an empty object when nothing is seeded", () => {
    expect(parseBootParams("")).toEqual({});
    expect(hasBootEndpoint(parseBootParams(""))).toBe(false);
    expect(hasBootEndpoint(parseBootParams("?cs=http://h"))).toBe(true);
    expect(hasBootRoute(parseBootParams("?to=/cluster"))).toBe(true);
  });

  it("rejects a filesystem path cs by omitting the boot endpoint", () => {
    expect(parseBootParams("?cs=/tmp/reddb&to=/cluster")).toEqual({
      to: "/cluster",
    });
  });
});

describe("LocalUrlProvider.bootParams", () => {
  it("surfaces seeded params and ignores an empty seed", () => {
    const seeded = new LocalUrlProvider({
      bootParams: { endpoint: "http://h", to: "/query" },
    });
    expect(seeded.bootParams()).toEqual({ endpoint: "http://h", to: "/query" });

    const routeOnly = new LocalUrlProvider({ bootParams: { to: "/query" } });
    expect(routeOnly.bootParams()).toEqual({ to: "/query" });

    expect(new LocalUrlProvider().bootParams()).toBeNull();
  });
});
