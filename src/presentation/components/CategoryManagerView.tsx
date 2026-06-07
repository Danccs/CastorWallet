import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Category } from '@domain/entities/Category';
import { 
  Plus, 
  Search, 
  Edit2, 
  Eye, 
  EyeOff 
} from 'lucide-react';

export const CategoryManagerView: React.FC = () => {
  const { categories, addCategory, toggleCategory, updateCategoryName } = useApp();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Adding Category Form State
  const [newCatName, setNewCatName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Editing Category State
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editNameVal, setEditNameVal] = useState<string>('');
  const [editErrorMsg, setEditErrorMsg] = useState<string>('');

  // Filter categories
  const filteredCategories = categories.filter(c => {
    const matchesTab = c.type === activeTab;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const name = newCatName.trim();
    if (!name) return;

    try {
      await addCategory(name, activeTab);
      setNewCatName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al agregar la categoría');
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingCat(cat);
    setEditNameVal(cat.name);
    setEditErrorMsg('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;
    setEditErrorMsg('');

    try {
      if (editNameVal.trim().toLowerCase() !== editingCat.name.toLowerCase()) {
        await updateCategoryName(editingCat.name, editNameVal, editingCat.type);
      }
      setEditingCat(null);
    } catch (err: any) {
      setEditErrorMsg(err.message || 'Error al actualizar la categoría');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Header */}
      <div style={{ padding: '0 4px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          Gestionar Categorías
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Configura tus clasificadores y actívalos o desactívalos según necesites.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '4px',
        borderRadius: '12px'
      }}>
        <button
          onClick={() => setActiveTab('expense')}
          style={{
            border: 'none',
            padding: '10px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
            background: activeTab === 'expense' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'expense' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'expense' ? '0 4px 10px rgba(22, 52, 40, 0.15)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          Gastos (Egresos)
        </button>
        <button
          onClick={() => setActiveTab('income')}
          style={{
            border: 'none',
            padding: '10px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
            background: activeTab === 'income' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'income' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeTab === 'income' ? '0 4px 10px rgba(22, 52, 40, 0.15)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          Ingresos
        </button>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
        <input 
          type="text"
          className="form-input"
          placeholder="Buscar categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Add Category Form (Bento Style Card) */}
      <section className="card" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>
          Nueva Categoría de {activeTab === 'expense' ? 'Gasto' : 'Ingreso'}
        </h3>
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Ej. Gimnasio, Inversiones..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            style={{ flex: 1 }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px' }}>
            <Plus size={18} />
          </button>
        </form>
        {errorMsg && (
          <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '6px', fontWeight: 500 }}>
            {errorMsg}
          </p>
        )}
      </section>

      {/* Category List */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredCategories.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '30px 20px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--card-border)'
          }}>
            No se encontraron categorías.
          </div>
        ) : (
          filteredCategories.map(cat => (
            <div 
              key={cat.name} 
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                opacity: cat.active ? 1 : 0.6,
                transition: 'opacity 0.2s',
                marginBottom: '0px'
              }}
            >
              <div>
                <span style={{ 
                  fontWeight: 600, 
                  fontSize: '0.92rem',
                  textDecoration: cat.active ? 'none' : 'line-through',
                  color: cat.active ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {cat.name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Edit Action */}
                <button
                  onClick={() => handleStartEdit(cat)}
                  style={{
                    border: 'none',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Editar nombre de categoría"
                >
                  <Edit2 size={14} />
                </button>

                {/* Toggle Active Status */}
                <button
                  onClick={() => toggleCategory(cat.name, cat.type)}
                  style={{
                    border: 'none',
                    background: cat.active ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                    color: cat.active ? 'var(--color-success)' : 'var(--color-danger)',
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title={cat.active ? 'Desactivar' : 'Activar'}
                >
                  {cat.active ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Edit Category Modal Overlay */}
      {editingCat && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '320px',
            backgroundColor: 'var(--card-bg)',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Editar Nombre</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Modifica el nombre de la categoría <strong>{editingCat.name}</strong>.
            </p>
            
            <form onSubmit={handleSaveEdit}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input 
                  type="text" 
                  className="form-input"
                  value={editNameVal}
                  onChange={(e) => setEditNameVal(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              
              {editErrorMsg && (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '10px', fontWeight: 500 }}>
                  {editErrorMsg}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingCat(null)}
                  style={{ padding: '10px', fontSize: '0.9rem' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '10px', fontSize: '0.9rem' }}
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
