import { describe, it, expect } from "vitest";
import {
  classifyDesktopError,
  desktopErrorMessage,
  isDesktopCommandError,
  DesktopError,
  UNKNOWN_DESKTOP_ERROR_CODE,
} from "./desktop-error";

describe("isDesktopCommandError", () => {
  it("accepts the structured { code, message } shape", () => {
    expect(isDesktopCommandError({ code: "KEYCHAIN", message: "boom" })).toBe(
      true
    );
    expect(
      isDesktopCommandError({ code: "X", message: "m", detail: "d" })
    ).toBe(true);
  });

  it("rejects strings, Errors, and partial shapes", () => {
    expect(isDesktopCommandError("boom")).toBe(false);
    expect(isDesktopCommandError(new Error("boom"))).toBe(false);
    expect(isDesktopCommandError({ code: "X" })).toBe(false);
    expect(isDesktopCommandError({ message: "m" })).toBe(false);
    expect(isDesktopCommandError({ code: 1, message: 2 })).toBe(false);
    expect(isDesktopCommandError(null)).toBe(false);
    expect(isDesktopCommandError(undefined)).toBe(false);
  });
});

describe("classifyDesktopError", () => {
  it("passes a structured command error through", () => {
    const c = classifyDesktopError({
      code: "EMBEDDED_TIMEOUT",
      message: "embedded reddb did not become ready within 20s",
    });
    expect(c).toEqual({
      code: "EMBEDDED_TIMEOUT",
      message: "embedded reddb did not become ready within 20s",
    });
  });

  it("keeps a non-empty detail", () => {
    const c = classifyDesktopError({
      code: "SIDECAR_SPAWN",
      message: "failed to spawn `red`",
      detail: "No such file",
    });
    expect(c).toEqual({
      code: "SIDECAR_SPAWN",
      message: "failed to spawn `red`",
      detail: "No such file",
    });
  });

  it("drops an empty detail", () => {
    const c = classifyDesktopError({ code: "X", message: "m", detail: "" });
    expect(c.detail).toBeUndefined();
    expect(c).toEqual({ code: "X", message: "m" });
  });

  it("classifies a legacy bare string error as UNKNOWN", () => {
    expect(classifyDesktopError("HOME not set")).toEqual({
      code: UNKNOWN_DESKTOP_ERROR_CODE,
      message: "HOME not set",
    });
  });

  it("classifies an Error instance as UNKNOWN with its message", () => {
    expect(classifyDesktopError(new Error("sidecar unavailable"))).toEqual({
      code: UNKNOWN_DESKTOP_ERROR_CODE,
      message: "sidecar unavailable",
    });
  });

  it("falls back to String() for anything else", () => {
    expect(classifyDesktopError(42)).toEqual({
      code: UNKNOWN_DESKTOP_ERROR_CODE,
      message: "42",
    });
    expect(classifyDesktopError(null)).toEqual({
      code: UNKNOWN_DESKTOP_ERROR_CODE,
      message: "null",
    });
  });
});

describe("desktopErrorMessage", () => {
  it("joins message and detail when both present", () => {
    expect(
      desktopErrorMessage({
        code: "PORT_UNAVAILABLE",
        message: "could not allocate a local port",
        detail: "Address in use",
      })
    ).toBe("could not allocate a local port: Address in use");
  });

  it("returns the message alone when there is no detail", () => {
    expect(
      desktopErrorMessage({ code: "INTERNAL", message: "lock poisoned" })
    ).toBe("lock poisoned");
  });

  it("handles legacy string errors", () => {
    expect(desktopErrorMessage("boom")).toBe("boom");
  });
});

describe("DesktopError", () => {
  it("builds a human-readable Error carrying code and detail", () => {
    const err = DesktopError.from({
      code: "SIDECAR_SPAWN",
      message: "failed to spawn `red`",
      detail: "No such file",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("DesktopError");
    expect(err.code).toBe("SIDECAR_SPAWN");
    expect(err.detail).toBe("No such file");
    expect(err.message).toBe("failed to spawn `red`: No such file");
  });

  it("classifies a legacy string into an UNKNOWN DesktopError", () => {
    const err = DesktopError.from("Load failed");
    expect(err.code).toBe(UNKNOWN_DESKTOP_ERROR_CODE);
    expect(err.message).toBe("Load failed");
    expect(err.detail).toBeUndefined();
  });

  it("returns the same instance when given a DesktopError", () => {
    const original = DesktopError.from("x");
    expect(DesktopError.from(original)).toBe(original);
  });
});
