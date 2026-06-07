import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction, TransactionType } from '@domain/entities/Transaction';
import { 
  ArrowLeft, 
  Search, 
  Tag, 
  Calendar, 
  FileText, 
  Trash2,
  Check
} from 'lucide-react';

interface TransactionFormViewProps {
  transactionToEdit?: Transaction;
  onClose: () => void;
}

export const TransactionFormView: React.FC<TransactionFormViewProps> = ({ 
  transactionToEdit, 
  onClose 
}) => {
  const { categories, addTransaction, editTransaction, deleteTransaction } = useApp();

  const isEditing = !!transactionToEdit;

  // Form State
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');
  
  // Category Selector Modal State
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [catSearch, setCatSearch] = useState<string>('');

  // Initializing state
  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount.toString());
      setCategory(transactionToEdit.category);
      setDescription(transactionToEdit.description);
      
      // Prevent timezone offset shifts
      const d = new Date(transactionToEdit.date);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localDate = new Date(d.getTime() - tzOffset);
      setDate(localDate.toISOString().split('T')[0]);
    } else {
      setType('expense');
      setAmount('');
      setCategory('');
      setDescription('');
      
      // Default to today
      const today = new Date();
      const tzOffset = today.getTimezoneOffset() * 60000;
      const localDate = new Date(today.getTime() - tzOffset);
      setDate(localDate.toISOString().split('T')[0]);
    }
  }, [transactionToEdit]);

  // Set default category when type changes
  useEffect(() => {
    if (isEditing) return; // Don't override on edit
    const activeCats = categories.filter(c => c.type === type && c.active);
    if (activeCats.length > 0) {
      setCategory(activeCats[0].name);
    } else {
      setCategory('');
    }
  }, [type, categories]);

  // Filter categories for the modal list
  const activeCategories = categories.filter(
    c => c.type === type && c.active && c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.round(parseFloat(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor introduce un monto válido mayor a 0');
      return;
    }
    if (!category) {
      alert('Por favor selecciona una categoría');
      return;
    }

    const payload = {
      amount: parsedAmount,
      type,
      category,
      description: description.trim(),
      date: new Date(date + 'T00:00:00')
    };

    try {
      if (isEditing && transactionToEdit) {
        await editTransaction(transactionToEdit.id, payload);
      } else {
        await addTransaction(payload);
      }
      onClose();
    } catch (err) {
      alert('Ocurrió un error al guardar el movimiento');
    }
  };

  const handleDelete = async () => {
    if (!transactionToEdit) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar este movimiento?')) {
      try {
        await deleteTransaction(transactionToEdit.id);
        onClose();
      } catch (err) {
        alert('Error al eliminar el movimiento');
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      backgroundColor: 'var(--bg-primary)',
      paddingBottom: '120px'
    }}>
      
      {/* Top Header Bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid var(--card-border)',
        backgroundColor: 'var(--card-bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            {isEditing ? 'Editar Movimiento' : 'Registrar Movimiento'}
          </h2>
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            style={{
              border: 'none',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            <Trash2 size={14} />
            Eliminar
          </button>
        )}
      </header>

      {/* Form Content */}
      <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* 1. Type Switcher Segmented Control */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          backgroundColor: 'var(--bg-secondary)',
          padding: '4px',
          borderRadius: '12px'
        }}>
          <button
            type="button"
            onClick={() => setType('expense')}
            style={{
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: type === 'expense' ? 'var(--color-danger)' : 'transparent',
              color: type === 'expense' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            Gasto (Egreso)
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            style={{
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: type === 'income' ? 'var(--color-success)' : 'transparent',
              color: type === 'income' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            Ingreso
          </button>
        </div>

        {/* 2. Big Centered Amount Input */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          borderBottom: '2px solid var(--color-primary-hover)',
          maxWidth: '280px',
          margin: '0 auto',
          width: '100%'
        }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Monto ($)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '6px' }}>$</span>
            <input
              type="number"
              step="1"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                textAlign: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%',
                color: type === 'expense' ? 'var(--color-danger)' : 'var(--color-success)'
              }}
              required
              autoFocus={!isEditing}
            />
          </div>
        </div>

        {/* Form Fields Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* 3. Category Selector Trigger Button */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Categoría</label>
            <button
              type="button"
              onClick={() => {
                setCatSearch('');
                setShowCategoryModal(true);
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                <Tag size={18} style={{ color: 'var(--color-success)' }} />
                <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                  {category || 'Selecciona una Categoría'}
                </span>
              </div>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* 4. Description Field */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Descripción (Opcional)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FileText size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)', top: '14px' }} />
              <textarea
                className="form-input"
                placeholder="Añade detalles sobre la transacción..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{ paddingLeft: '40px', resize: 'none' }}
              />
            </div>
          </div>

          {/* 5. Date Picker */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fecha</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

        </div>

        {/* Fixed Save Button Area */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 'var(--mobile-max-width)',
          padding: '16px 20px 24px',
          background: 'linear-gradient(to top, var(--bg-primary) 80%, rgba(250,249,247,0))',
          zIndex: 100,
          borderTop: '1px solid var(--card-border)'
        }}>
          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ height: '52px', fontWeight: 600, fontSize: '1.05rem' }}
          >
            {isEditing ? 'Guardar Cambios' : 'Registrar Movimiento'}
          </button>
        </div>

      </form>

      {/* Category Search Overlay Modal */}
      {showCategoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
        }}>
          {/* Touch backdrop to dismiss */}
          <div style={{ flexGrow: 1 }} onClick={() => setShowCategoryModal(false)}></div>
          
          {/* Modal content sliding from bottom */}
          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            padding: '20px',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            borderTop: '1px solid var(--card-border)',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Selecciona Categoría</h3>
              <button 
                type="button" 
                onClick={() => setShowCategoryModal(false)}
                style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cerrar
              </button>
            </div>

            {/* Search filter in modal */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por nombre..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px' }}
                autoFocus
              />
            </div>

            {/* Scrollable list of categories */}
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '40vh', paddingRight: '4px' }}>
              {activeCategories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No se encontraron categorías activas.
                </div>
              ) : (
                activeCategories.map(cat => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      setCategory(cat.name);
                      setShowCategoryModal(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: category === cat.name ? 'var(--bg-secondary)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <span>{cat.name}</span>
                    {category === cat.name && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
