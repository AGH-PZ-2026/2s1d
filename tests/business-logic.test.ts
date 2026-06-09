import { describe, it, expect } from "vitest";
import { slugify, DEFAULT_LOCATIONS } from "../src/db/seed";

describe("slugify", () => {
  it("converts to lowercase and replaces spaces with hyphens", () => {
    expect(slugify("Dostępny")).toBe("dostpny");
    expect(slugify("Oczekuje zatwierdzenia")).toBe("oczekuje-zatwierdzenia");
  });

  it("removes special characters", () => {
    expect(slugify("Test!@#")).toBe("test");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("trims whitespace", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
  });
});

describe("DEFAULT_LOCATIONS", () => {
  it("has at least 3 default locations", () => {
    expect(DEFAULT_LOCATIONS.length).toBeGreaterThanOrEqual(3);
  });

  it("all locations have name and kind", () => {
    for (const loc of DEFAULT_LOCATIONS) {
      expect(loc.name).toBeTruthy();
      expect(loc.kind).toBe("internal");
    }
  });
});
