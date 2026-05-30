import { describe, it, expect } from "vitest";
import { slugify } from "../src/db/seed";

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

describe("category tree building", () => {
  it("builds tree from flat list", () => {
    const flatCategories = [
      { id: 1, name: "Root", parentId: null },
      { id: 2, name: "Child", parentId: 1 },
      { id: 3, name: "Grandchild", parentId: 2 },
      { id: 4, name: "Sibling", parentId: 1 },
    ];

    const byId = new Map<number, { id: number; name: string; parentId: number | null; children: typeof treeNode[] }>();
    const roots: typeof treeNode[] = [];

    const treeNode = { id: 0, name: "", parentId: null as number | null, children: [] as typeof treeNode[] };

    for (const cat of flatCategories) {
      byId.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of flatCategories) {
      const node = byId.get(cat.id)!;
      if (cat.parentId !== null) {
        const parent = byId.get(cat.parentId);
        if (parent) parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    expect(roots).toHaveLength(1);
    expect(roots[0].name).toBe("Root");
    expect(roots[0].children).toHaveLength(2);
    expect(roots[0].children[0].children).toHaveLength(1);
    expect(roots[0].children[0].children[0].name).toBe("Grandchild");
  });
});
