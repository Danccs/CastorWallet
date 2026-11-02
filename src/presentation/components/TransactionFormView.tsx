import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction, TransactionType } from '@domain/entities/Transaction';
import { alerts } from '@presentation/utils/alerts';
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
  const {
    categories,
    addTransaction,
    editTransaction,
    deleteTransaction,
    isPeriodClosedFor,
  } = useApp();

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
      
      // Prevent timezone offset shifts by reading the date in UTC format
      const d = new Date(transactionToEdit.date);
      setDate(d.toISOString().split('T')[0]);
    } else {
      setType('expense');
      setAmount('');
      setCategory('');
      setDescription('');
      
      // Default to today's date in local calendar format
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
    }
  }, [transactionToEdit]);

  // Reset category when type changes (do not preselect any category)
  useEffect(() => {
    if (isEditing) return; // Don't override on edit
    setCategory('');
  }, [type]);

  // Filter categories for the modal list
  const activeCategories = categories.filter(
    c => c.type === type && c.active && c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const selectedPeriodClosed = date ? isPeriodClosedFor(date) : false;
  const originalPeriodClosed = transactionToEdit
    ? isPeriodClosedFor(transactionToEdit.date)
    : false;
  /** Editing a tx that already belongs to a closed month: fully read-only. */
  const isFullyReadOnly = originalPeriodClosed;
  /** Save/delete blocked if target or original period is closed. */
  const isMutationBlocked = selectedPeriodClosed || originalPeriodClosed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMutationBlocked) {
      alerts.warning('Mes cerrado', 'Reabre el mes para crear o editar movimientos.');
      return;
    }
    const parsedAmount = Math.round(parseFloat(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alerts.warning('Monto inválido', 'Por favor introduce un monto válido mayor a 0');
      return;
    }
    if (!category) {
      alerts.warning('Falta categoría', 'Por favor selecciona una categoría');
      return;
    }

    const payload = {
      amount: parsedAmount,
      type,
      category,
      description: description.trim(),
      date: new Date(date)
    };

    try {
      if (isEditing && transactionToEdit) {
        await editTransaction(transactionToEdit.id, payload);
      } else {
        await addTransaction(payload);
      }
      onClose();
    } catch (err) {
      alerts.error('Error', err instanceof Error ? err.message : 'Ocurrió un error al guardar el movimiento');
    }
  };

  const handleDelete = async () => {
    if (!transactionToEdit) return;
    if (isMutationBlocked) {
      alerts.warning('Mes cerrado', 'Reabre el mes para eliminar movimientos.');
      return;
    }
    const confirmed = await alerts.confirmDanger(
      '¿Eliminar movimiento?',
      '¿Estás seguro de que deseas eliminar este movimiento? Esta acción no se puede deshacer.'
    );
    if (confirmed) {
      try {
        await deleteTransaction(transactionToEdit.id);
        onClose();
      } catch (err) {
        alerts.error('Error', err instanceof Error ? err.message : 'Error al eliminar el movimiento');
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

        {isEditing && !isFullyReadOnly && (
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
        {isMutationBlocked && (
          <div style={{
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '0.82rem',
            fontWeight: 600
          }}>
            {isFullyReadOnly
              ? 'Este mes está cerrado. Reábrelo desde Inicio para modificar movimientos.'
              : 'La fecha pertenece a un mes cerrado. Elige otra fecha o reabre ese mes.'}
          </div>
        )}
        
        {/* 1. Type Switcher Segmented Control with Label */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Seleccione un Tipo de Movimiento</label>
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
              onClick={() => !isFullyReadOnly && setType('expense')}
              disabled={isFullyReadOnly}
              style={{
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                cursor: isFullyReadOnly ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: type === 'expense' ? 'var(--color-danger)' : 'transparent',
                color: type === 'expense' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                opacity: isFullyReadOnly ? 0.7 : 1
              }}
            >
              Gasto (Egreso)
            </button>
            <button
              type="button"
              onClick={() => !isFullyReadOnly && setType('income')}
              disabled={isFullyReadOnly}
              style={{
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                cursor: isFullyReadOnly ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: type === 'income' ? 'var(--color-success)' : 'transparent',
                color: type === 'income' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                opacity: isFullyReadOnly ? 0.7 : 1
              }}
            >
              Ingreso
            </button>
          </div>
        </div>

        {/* 2. Category Selector Trigger Button */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Categoría</label>
          <button
            type="button"
            onClick={() => {
              if (isFullyReadOnly) return;
              setCatSearch('');
              setShowCategoryModal(true);
            }}
            disabled={isFullyReadOnly}
            style={{
              width: '100%',
              padding: '14px 16px',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: isFullyReadOnly ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              opacity: isFullyReadOnly ? 0.7 : 1
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

        {/* 3. Big Centered Amount Input */}
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
              disabled={isFullyReadOnly}
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                textAlign: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%',
                color: type === 'expense' ? 'var(--color-danger)' : 'var(--color-success)',
                opacity: isFullyReadOnly ? 0.7 : 1
              }}
              required
              autoFocus={!isEditing && !isFullyReadOnly}
            />
          </div>
        </div>

        {/* Form Fields Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

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
                disabled={isFullyReadOnly}
                style={{ paddingLeft: '40px', resize: 'none', opacity: isFullyReadOnly ? 0.7 : 1 }}
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
                disabled={isFullyReadOnly}
                style={{ paddingLeft: '40px', opacity: isFullyReadOnly ? 0.7 : 1 }}
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
            disabled={isMutationBlocked}
            style={{
              height: '52px',
              fontWeight: 600,
              fontSize: '1.05rem',
              opacity: isMutationBlocked ? 0.55 : 1,
              cursor: isMutationBlocked ? 'not-allowed' : 'pointer'
            }}
          >
            {isMutationBlocked
              ? 'Mes cerrado'
              : isEditing
                ? 'Guardar Cambios'
                : 'Registrar Movimiento'}
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
