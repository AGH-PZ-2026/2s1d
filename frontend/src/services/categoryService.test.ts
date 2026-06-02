import { describe, it, expect } from 'vitest';
import { categoryService } from './categoryService';

describe('categoryService - Testy Integracyjne', () => {
  let createdRootId: number;
  let createdChildId: number;

  it('powinien pobrać drzewo kategorii jako tablicę', async () => {
    const tree = await categoryService.getTree();
    expect(Array.isArray(tree)).toBe(true);
  });

  it('powinien utworzyć nową kategorię główną (parent_id: null)', async () => {
    const root = await categoryService.create({
      name: 'Kategoria Integracyjna Root',
      parent_id: null,
    });

    expect(root).toHaveProperty('id');
    expect(root.name).toBe('Kategoria Integracyjna Root');
    expect(root.parent_id).toBeNull();

    createdRootId = root.id;
  });

  it('powinien utworzyć podkategorię podpiętą pod nową kategorię główną', async () => {
    const child = await categoryService.create({
      name: 'Podkategoria Integracyjna Child',
      parent_id: createdRootId,
    });

    expect(child).toHaveProperty('id');
    expect(child.name).toBe('Podkategoria Integracyjna Child');
    expect(child.parent_id).toBe(createdRootId);

    createdChildId = child.id;
  });

  it('powinien zaktualizować nazwę utworzonej kategorii głównej (PATCH)', async () => {
    const updated = await categoryService.update(createdRootId, {
      name: 'Zmieniona Kategoria Integracyjna',
    });

    expect(updated.name).toBe('Zmieniona Kategoria Integracyjna');
  });

  it('powinien bezbłędnie usunąć podkategorię oraz kategorię główną, sprzątając bazę danych', async () => {
    await expect(categoryService.remove(createdChildId)).resolves.not.toThrow();
    await expect(categoryService.remove(createdRootId)).resolves.not.toThrow();
  });

  it('powinien rzucić błąd walidacji serwera przy próbie wysłania pustej nazwy', async () => {
    await expect(
      categoryService.create({ name: '', parent_id: null })
    ).rejects.toThrow();
  });
});
