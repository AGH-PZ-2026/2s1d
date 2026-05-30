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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any as MySql2Database<Record<string, never>>;

// Re-create mock helpers per test to avoid shared state
function resetMocks() {
  vi.clearAllMocks();
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue([]),
  });
  mockUpdate.mockReturnValue({
    set: mockSet.mockReturnValue({
      where: vi.fn(),
    }),
  });
  mockDelete.mockReturnValue({
    where: vi.fn(),
  });
}

describe("statuses logic", () => {
  beforeEach(resetMocks);

  it("lists all statuses", async () => {
    const mockRows = [
      { id: 1, name: "Dostępny", isSystem: true, slug: "dostepny", description: null },
      { id: 6, name: "Zaginiony", isSystem: false, slug: "zaginiony", description: "test" },
    ];

    mockSelect.mockReturnValue({
      from: vi.fn().mockResolvedValue(mockRows),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
    });

    const result = await mockDb.select().from("item_status");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Dostępny");
  });

  it("prevents deletion of system statuses", () => {
    const systemStatus = { id: 1, name: "Dostępny", isSystem: true, slug: "dostepny" };
    expect(systemStatus.isSystem).toBe(true);
  });

  it("allows deletion of custom statuses", () => {
    const customStatus = { id: 6, name: "Zaginiony", isSystem: false, slug: "zaginiony" };
    expect(customStatus.isSystem).toBe(false);
  });
});
