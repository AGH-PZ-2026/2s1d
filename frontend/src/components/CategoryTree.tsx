import React, { useState } from 'react';
import { Category, CategoryTreeNode } from '../types/category';

interface CategoryTreeProps {
  tree: CategoryTreeNode;
  onAddSubcategory: (parentId: number) => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: number) => void;
  loadingIds?: number[];
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  tree,
  onAddSubcategory,
  onEdit,
  onDelete,
  loadingIds = [],
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (categoryId: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const isLoading = (categoryId: number) => loadingIds.includes(categoryId);

  const renderNode = (node: CategoryTreeNode, depth: number = 0) => {
    const { category, children } = node;
    const hasChildren = children && children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const loading = isLoading(category.id);
    const isVirtualRoot =
      category.id === 0 &&
      category.parentId === null &&
      category.name === 'Root' &&
      depth === 0;

    if (isVirtualRoot) {
      return (
        <div key="virtual-root">
          {hasChildren && children.map((child) => renderNode(child, depth))}
        </div>
      );
    }

    return (
      <div key={category.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 10px',
            marginBottom: '2px',
            backgroundColor: loading ? 'var(--surface-2)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
            gap: '8px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!loading)
              e.currentTarget.style.backgroundColor = 'var(--surface-2)';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {/* Expand/Collapse Toggle */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(category.id)}
              className="btn btn-ghost btn-sm"
              style={{
                width: 24,
                height: 24,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
              }}
              title={isExpanded ? 'Zwiń' : 'Rozwiń'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <div style={{ width: 24 }} />
          )}

          {/* Loading Spinner */}
          {loading && (
            <div
              className="spinner"
              style={{ width: 14, height: 14, borderWidth: 1.5 }}
            />
          )}

          {/* Category Name and Description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                opacity: loading ? 0.6 : 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {category.name}
            </div>
            {category.description && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {category.description}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onAddSubcategory(category.id)}
              disabled={loading}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: 11, padding: '3px 8px' }}
              title="Dodaj podkategorię"
            >
              + Dodaj
            </button>
            <button
              onClick={() => onEdit(category)}
              disabled={loading}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: 11, padding: '3px 8px' }}
              title="Edytuj"
            >
              Edytuj
            </button>
            <button
              onClick={() => onDelete(category.id)}
              disabled={loading}
              className="btn btn-sm btn-danger"
              style={{ fontSize: 11, padding: '3px 8px' }}
              title="Usuń"
            >
              Usuń
            </button>
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>{children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {renderNode(tree)}
    </div>
  );
};
