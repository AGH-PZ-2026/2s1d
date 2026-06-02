import React, { useEffect, useState } from 'react';
import { categoryService } from '../services/categoryService';
import type { CategoryTree } from '../types/category';

export const CategoriesPage: React.FC = () => {
  const [treeData, setTreeData] = useState<CategoryTree[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    categoryService
      .getTree()
      .then((data) => setTreeData(data))
      .catch((err) => setError(err.message || 'Błąd ładowania API'));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>[PLACEHOLDER] Integracja API Kategorii</h1>
      <p>
        Status połączenia z backendem: <strong>{error ? 'Błąd' : 'OK'}</strong>
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h3>Surowe dane zagnieżdżone pobrane z bazy:</h3>
      <pre
        style={{
          background: '#1e1e1e',
          color: '#4af626',
          padding: '15px',
          borderRadius: '8px',
          border: '1px border #333',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
        }}
      >
        {JSON.stringify(treeData, null, 2)}
      </pre>
    </div>
  );
};
