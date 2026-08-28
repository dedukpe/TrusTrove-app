import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("concatenates multiple class strings", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("strips falsy values such as null, undefined, false, and empty string", () => {
    expect(cn("a", null, undefined, false, "", "b")).toBe("a b");
  });

  it("resolves conditional class objects", () => {
    expect(cn({ "p-2": true, "p-4": false, "m-1": true })).toBe("p-2 m-1");
  });

  it("merges conflicting Tailwind utility classes via tailwind-merge", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("flex", "block", "flex")).toBe("flex");
  });

  it("returns an empty string when no arguments are provided", () => {
    expect(cn()).toBe("");
  });
});
