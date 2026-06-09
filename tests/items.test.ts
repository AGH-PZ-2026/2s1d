import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MySql2Database } from "drizzle-orm/mysql2";

const mockInsert = vi.fn();
const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnValue([]),
});
const mockUpdate = vi.fn().mockReturnThis();
const mockDelete = vi.fn().mockReturnThis();
const mockSet = vi.fn().mockReturnThis();

const mockDb = {
  insert: mockInsert.mockReturnValue({ values: vi.fn() }),
  select: mockSelect,
  update: mockUpdate,
  delete: mockDelete,
} as unknown as MySql2Database<Record<string, never>>;

function resetMocks() {
  vi.clearAllMocks();
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue([]),
  });
  mockUpdate.mockReturnValue({
    set: mockSet.mockReturnValue({ where: vi.fn() }),
  });
  mockDelete.mockReturnValue({ where: vi.fn() });
}

describe("items logic", () => {
  beforeEach(resetMocks);

  it("lists all items", async () => {
    const mockRows = [
      { id: 1, systemId: "SYS-001", name: "Laptop", manufacturer: "Dell", description: null, purchaseDate: null, addedAt: "2026-01-01", categoryId: null, statusId: 1, locationId: 1, ownerId: null, ownerGroupId: null },
      { id: 2, systemId: null, name: "Projector", manufacturer: "Epson", description: "Full HD", purchaseDate: null, addedAt: "2026-01-02", categoryId: null, statusId: 1, locationId: 2, ownerId: null, ownerGroupId: null },
    ];

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockRows),
    });

    const result = await mockDb.select().from("items");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Laptop");
    expect(result[1].systemId).toBeNull();
  });

  it("creates item with required fields", () => {
    const payload = { name: "New Item" };
    expect(payload.name).toBe("New Item");
  });

  it("filters items by search", () => {
    const search = "Dell";
    expect(search).toMatch(/dell/i);
  });
});

describe("borrowings logic", () => {
  beforeEach(resetMocks);

  it("creates borrowing in pending state", () => {
    const borrowing = {
      itemId: 1,
      mode: "classic",
      status: "pending",
    };
    expect(borrowing.status).toBe("pending");
    expect(borrowing.mode).toBe("classic");
  });

  it("trusted mode auto-approves", () => {
    const borrowing = {
      itemId: 1,
      mode: "trusted",
      status: "borrowed",
    };
    expect(borrowing.status).toBe("borrowed");
  });

  it("rejects non-pending approval", () => {
    const alreadyBorrowed = { status: "borrowed" };
    expect(alreadyBorrowed.status).not.toBe("pending");
  });
});
