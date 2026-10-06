import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeBlock, codeBlock as codeBlockAppearance } from "@reddb-io/design-system/base";
import InlineTextContractFailures from "./fixtures/InlineTextContractFailures.svelte";
import { classes, classesOf, render, rendered } from "./mount";

const SOURCE = `function answer() {
  return 42;
}`;

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("the deliberately failing CodeBlock fixture", () => {
  it("demonstrates source whitespace lost outside preformatted semantics", () => {
    const code = rendered(
      render(InlineTextContractFailures, { failure: "collapsed-code", source: SOURCE }),
    );

    expect(code.tagName).toBe("CODE");
    expect(code.closest("pre")).toBeNull();
    expect(code.textContent).toBe("function answer() { return 42; }");
  });
});

describe("the Base CodeBlock", () => {
  it("preserves source whitespace with native pre and code semantics", () => {
    const root = rendered(render(CodeBlock, { code: SOURCE, language: "TypeScript" }));
    const pre = root.querySelector("pre")!;
    const code = pre.querySelector("code")!;

    expect(code.textContent).toBe(SOURCE);
    expect(root.querySelector("[data-code-block-language]")?.textContent).toBe("TypeScript");
    expect(classes(root)).toEqual(classesOf(codeBlockAppearance().root()));
  });

  it("copies the exact source from a keyboard-focusable canonical Button", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const root = rendered(render(CodeBlock, { code: SOURCE }));
    const copy = root.querySelector<HTMLButtonElement>("[data-code-block-copy]")!;

    copy.focus();
    expect(document.activeElement).toBe(copy);
    copy.click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(SOURCE));
    await vi.waitFor(() => expect(copy.textContent?.trim()).toBe("Copied"));
  });
});
