import React, { useState, useEffect, useCallback } from 'react';
import {
  Category,
  CategoryTreeNode,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types/category';
import categoryService from '../services/categoryService';
import { CategoryTree } from '../components/CategoryTree';
import { CategoryForm } from '../components/CategoryForm';
import { CategoryEditDialog } from '../components/CategoryEditDialog';
import { CategoryDeleteConfirm } from '../components/CategoryDeleteConfirm';

export const CategoriesPage: React.FC = () => {
  // Main state
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Operation state
  const [operationError, setOperationError] = useState<string | null>(null);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);

  // Form/Dialog state
  const [showCreateRootForm, setShowCreateRootForm] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null
  );

  const handleLoadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tree = await categoryService.getTree();
      setCategoryTree(tree);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Nie udało się załadować kategorii.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void handleLoadTree();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [handleLoadTree]);

  // Reset operation error after 5 seconds
  useEffect(() => {
    if (operationError) {
      const timer = setTimeout(() => setOperationError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [operationError]);

  const handleCreateRoot = async (payload: CreateCategoryPayload) => {
    try {
      setOperationError(null);
      await categoryService.create(payload);
      setShowCreateRootForm(false);
      await handleLoadTree();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Błąd przy tworzeniu kategorii.';
      setOperationError(message);
    }
  };

  const handleCreateSubcategory = async (
    parentId: number,
    payload: CreateCategoryPayload
  ) => {
    try {
      setOperationError(null);
      setLoadingIds((prev) => [...prev, parentId]);

      const createPayload: CreateCategoryPayload = {
        ...payload,
        parentId,
      };

      await categoryService.create(createPayload);
      setSelectedParentId(null);
      await handleLoadTree();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Błąd przy tworzeniu podkategorii.';
      setOperationError(message);
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== parentId));
    }
  };

  const handleUpdateCategory = async (
    id: number,
    payload: UpdateCategoryPayload
  ) => {
    try {
      setOperationError(null);
      setLoadingIds((prev) => [...prev, id]);

      await categoryService.update(id, payload);
      setEditingCategory(null);
      await handleLoadTree();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Błąd przy aktualizacji kategorii.';
      setOperationError(message);
    } finally {
      setLoadingIds((prev) => prev.filter((categoryId) => categoryId !== id));
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      setOperationError(null);
      setLoadingIds((prev) => [...prev, id]);

      await categoryService.remove(id);
      setDeletingCategory(null);
      await handleLoadTree();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Błąd przy usuwaniu kategorii.';
      setOperationError(message);
    } finally {
      setLoadingIds((prev) => prev.filter((categoryId) => categoryId !== id));
    }
  };

  const getChildCount = (parentId: number): number => {
    if (!categoryTree) return 0;

    const countChildren = (node: CategoryTreeNode): number => {
      let count = 0;
      if (node.category.id === parentId && node.children) {
        count = node.children.length;
      }
      if (node.children) {
        for (const child of node.children) {
          count += countChildren(child);
        }
      }
      return count;
    };

    return countChildren(categoryTree);
  };

  // Show loading spinner
  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <h1 style={styles.title}>Zarządzanie Kategoriami</h1>
        <div className="loading-state">
          <div className="spinner" />
          <span>Ładowanie kategorii...</span>
        </div>
      </div>
    );
  }

  // Show error if initial load failed
  if (error) {
    return (
      <div style={styles.pageContainer}>
        <h1 style={styles.title}>Zarządzanie Kategoriami</h1>
        <div style={styles.errorContainer}>
          <div className="alert alert-error">{error}</div>
          <button
            onClick={handleLoadTree}
            className="btn btn-primary"
            style={{ marginTop: 12 }}
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Zarządzanie Kategoriami</h1>
          <p className="page-subtitle">
            Zarządzaj strukturą kategorii wyposażenia laboratoryjnego
          </p>
        </div>
        <button
          onClick={() => setShowCreateRootForm(true)}
          disabled={showCreateRootForm || selectedParentId !== null}
          className="btn btn-primary"
        >
          + Nowa kategoria główna
        </button>
      </div>

      {operationError && (
        <div className="alert alert-error">{operationError}</div>
      )}

      <div style={styles.contentContainer}>
        {/* Left: Tree */}
        <div style={styles.treeContainer}>
          <h2 style={styles.sectionTitle}>Struktura kategorii</h2>
          {categoryTree && categoryTree.children.length > 0 ? (
            <div style={styles.treeContent}>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
              <CategoryTree
                tree={{
                  category: categoryTree.category,
                  children: categoryTree.children,
                }}
                onAddSubcategory={(parentId) => setSelectedParentId(parentId)}
                onEdit={(category) => setEditingCategory(category)}
                onDelete={(categoryId) => {
                  const categoryToDelete = findCategoryById(
                    categoryTree,
                    categoryId
                  );
                  if (categoryToDelete) {
                    setDeletingCategory(categoryToDelete);
                  }
                }}
                loadingIds={loadingIds}
              />
            </div>
          ) : (
            <div style={styles.emptyMessage}>
              Brak kategorii. Utwórz nową kategorię główną, aby zacząć.
            </div>
          )}
        </div>

        {/* Right: Form */}
        {(showCreateRootForm || selectedParentId !== null) && (
          <div style={styles.formContainer}>
            <CategoryForm
              mode={showCreateRootForm ? 'root' : 'subcategory'}
              parentCategoryId={selectedParentId ?? undefined}
              onSubmit={(payload) => {
                if (showCreateRootForm) {
                  handleCreateRoot(payload);
                } else if (selectedParentId !== null) {
                  handleCreateSubcategory(selectedParentId, payload);
                }
              }}
              onCancel={() => {
                setShowCreateRootForm(false);
                setSelectedParentId(null);
              }}
              loading={
                selectedParentId !== null &&
                loadingIds.includes(selectedParentId)
              }
              error={operationError}
            />
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingCategory && (
        <CategoryEditDialog
          key={editingCategory.id}
          category={editingCategory}
          onSave={handleUpdateCategory}
          onCancel={() => setEditingCategory(null)}
          loading={loadingIds.includes(editingCategory.id)}
          error={operationError}
        />
      )}

      {/* Delete Confirmation */}
      {deletingCategory && (
        <CategoryDeleteConfirm
          category={deletingCategory}
          childCount={getChildCount(deletingCategory.id)}
          onConfirm={() => handleDeleteCategory(deletingCategory.id)}
          onCancel={() => setDeletingCategory(null)}
          loading={loadingIds.includes(deletingCategory.id)}
        />
      )}
    </div>
  );
};

// Helper function to find a category in the tree by ID
const findCategoryById = (
  tree: CategoryTreeNode,
  id: number
): Category | null => {
  if (tree.category.id === id) {
    return tree.category;
  }
  if (tree.children) {
    for (const child of tree.children) {
      const found = findCategoryById(child, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const styles = {
  pageContainer: {
    maxWidth: '1400px',
  } as React.CSSProperties,
  title: {
    marginTop: 0,
    marginBottom: '30px',
    color: 'var(--text)',
    fontSize: '28px',
  } as React.CSSProperties,
  sectionTitle: {
    marginTop: 0,
    marginBottom: '15px',
    color: 'var(--text)',
    fontSize: '16px',
    fontWeight: 700,
  } as React.CSSProperties,
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '20px',
    color: 'var(--text-muted)',
  } as React.CSSProperties,
  errorContainer: {
    padding: '20px',
    backgroundColor: 'var(--danger-muted)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius)',
    color: 'var(--danger)',
  } as React.CSSProperties,
  errorMessage: {
    marginBottom: '15px',
    padding: '10px 12px',
    backgroundColor: 'var(--danger-muted)',
    color: 'var(--danger)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-sm)',
  } as React.CSSProperties,
  retryButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--accent)',
    color: '#000',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font)',
  } as React.CSSProperties,
  contentContainer: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) 1fr',
    gap: '20px',
  } as React.CSSProperties,
  treeContainer: {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '24px',
    backgroundColor: 'var(--surface)',
  } as React.CSSProperties,
  treeContent: {
    minHeight: '200px',
  } as React.CSSProperties,
  formContainer: {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '24px',
    backgroundColor: 'var(--surface)',
    height: 'fit-content',
    position: 'sticky',
    top: '20px',
  } as React.CSSProperties,
  emptyMessage: {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px',
    backgroundColor: 'var(--surface-2)',
    borderRadius: 'var(--radius-sm)',
  } as React.CSSProperties,
};

export default CategoriesPage;
