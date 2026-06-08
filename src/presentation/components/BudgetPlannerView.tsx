import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Category } from '@domain/entities/Category';
import { alerts } from '@presentation/utils/alerts';
import { 
  Edit2, 
  Copy
} from 'lucide-react';

export const BudgetPlannerView: React.FC = () => {
  const { 
    currentPeriod, 
    categories, 
    sixMonthBudgets, 
    updateCategoryBudget, 
    setBudgetLimitForPeriod, 
    applyBudgetTemplate 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'template' | 'planning'>('planning');

  // Modal Editing Template Budget
  const [editingTemplateCat, setEditingTemplateCat] = useState<Category | null>(null);
  const [templateBudgetVal, setTemplateBudgetVal] = useState<string>('');
  const [templateErrorMsg, setTemplateErrorMsg] = useState<string>('');

  // Modal Editing Month Specific Budget
  const [editingCell, setEditingCell] = useState<{ category: string; period: string; currentAmount: number } | null>(null);
  const [cellBudgetVal, setCellBudgetVal] = useState<string>('');
  const [cellErrorMsg, setCellErrorMsg] = useState<string>('');

  const expenseCategories = categories.filter(c => c.type === 'expense' && c.active);

  // Generate the next 6 periods starting from currentPeriod
  const getNextSixPeriods = () => {
    const [yearStr, monthStr] = currentPeriod.split('-');
    const periods = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1 + i, 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      periods.push(`${y}-${m}`);
    }
    return periods;
  };

  const nextSixPeriods = getNextSixPeriods();

  const formatPeriodShort = (p: string) => {
    const [year, month] = p.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    // e.g. "Jun 26"
    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
  };

  const formatPeriodLong = (p: string) => {
    const [year, month] = p.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  // 1. Template Budget Actions
  const handleStartEditTemplate = (cat: Category) => {
    setEditingTemplateCat(cat);
    setTemplateBudgetVal(cat.defaultBudget > 0 ? cat.defaultBudget.toString() : '0');
    setTemplateErrorMsg('');
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplateCat) return;
    setTemplateErrorMsg('');

    const parsed = parseFloat(templateBudgetVal);
    if (isNaN(parsed) || parsed < 0) {
      setTemplateErrorMsg('Introduce un presupuesto plantilla válido (>= 0)');
      return;
    }

    try {
      await updateCategoryBudget(editingTemplateCat.name, editingTemplateCat.type, parsed);
      setEditingTemplateCat(null);
    } catch (err: any) {
      setTemplateErrorMsg(err.message || 'Error al guardar la plantilla');
    }
  };

  // 2. Planning Grid Cell Actions
  const handleCellClick = (category: string, period: string) => {
    const existingBudget = sixMonthBudgets.find(
      b => b.category.toLowerCase() === category.toLowerCase() && b.period === period
    );
    const amount = existingBudget ? existingBudget.amount : 0;
    setEditingCell({ category, period, currentAmount: amount });
    setCellBudgetVal(amount > 0 ? amount.toString() : '');
    setCellErrorMsg('');
  };

  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell) return;
    setCellErrorMsg('');

    const parsed = parseFloat(cellBudgetVal);
    if (isNaN(parsed) || parsed < 0) {
      setCellErrorMsg('Introduce un presupuesto mensual válido (>= 0)');
      return;
    }

    try {
      await setBudgetLimitForPeriod(editingCell.category, editingCell.period, parsed);
      setEditingCell(null);
    } catch (err: any) {
      setCellErrorMsg(err.message || 'Error al actualizar el presupuesto');
    }
  };

  // 3. Quick Seeding Actions
  const handleApplyTemplateToMonth = async (period: string) => {
    const count = expenseCategories.filter(c => c.defaultBudget > 0).length;
    if (count === 0) {
      alerts.warning('Sin plantillas', 'Primero debes configurar montos mayores a $0 en la pestaña de Plantillas.');
      return;
    }
    const displayName = formatPeriodLong(period);
    const confirmed = await alerts.confirm(
      '¿Aplicar plantilla?',
      `¿Quieres aplicar los presupuestos de la plantilla en el mes de ${displayName}?`
    );
    if (confirmed) {
      try {
        await applyBudgetTemplate(period);
        alerts.success('¡Aplicado!', `Plantilla aplicada con éxito para ${displayName}.`);
      } catch (err: any) {
        alerts.error('Error', err.message || 'Error al aplicar la plantilla.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Header */}
      <div style={{ padding: '0 4px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          Presupuestos Mensuales
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Define tus metas de gastos y planifica a mediano plazo.
        </p>
      </div>

      {/* Navigation Sub Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '4px',
        borderRadius: '12px'
      }}>
        <button
          onClick={() => setActiveSubTab('planning')}
          style={{
            border: 'none',
            padding: '10px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
            background: activeSubTab === 'planning' ? 'var(--color-primary)' : 'transparent',
            color: activeSubTab === 'planning' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeSubTab === 'planning' ? '0 4px 10px rgba(22, 52, 40, 0.15)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          Vista 6 Meses
        </button>
        <button
          onClick={() => setActiveSubTab('template')}
          style={{
            border: 'none',
            padding: '10px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
            background: activeSubTab === 'template' ? 'var(--color-primary)' : 'transparent',
            color: activeSubTab === 'template' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: activeSubTab === 'template' ? '0 4px 10px rgba(22, 52, 40, 0.15)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          Plantilla Presupuesto
        </button>
      </div>

      {/* Content Rendering based on Tab */}
      {activeSubTab === 'template' ? (
        
        /* 1. Template Setup View */
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="card" style={{ padding: '16px', backgroundColor: 'var(--color-primary-hover)', color: '#ffffff', border: 'none' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px', color: '#ffffff' }}>¿Qué es el Presupuesto Plantilla?</h3>
            <p style={{ fontSize: '0.78rem', lineHeight: 1.4, opacity: 0.9 }}>
              Define montos de gastos estándar por categoría. Luego podrás duplicar y aplicar estos límites en cualquier mes con un solo clic.
            </p>
          </div>

          {expenseCategories.map(cat => (
            <div 
              key={cat.name} 
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                marginBottom: '0px'
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {cat.name}
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Límite estándar:{' '}
                  <strong style={{ color: cat.defaultBudget > 0 ? 'var(--color-success)' : 'var(--color-muted)' }}>
                    {cat.defaultBudget > 0 ? `$${cat.defaultBudget.toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : 'Sin definir'}
                  </strong>
                </p>
              </div>

              <button
                onClick={() => handleStartEditTemplate(cat)}
                style={{
                  border: 'none',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Editar límite plantilla"
              >
                <Edit2 size={14} />
              </button>
            </div>
          ))}
        </section>
        
      ) : (
        
        /* 2. 6-Month Planning Grid View */
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Quick apply header controls */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
              <Copy size={16} />
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Duplicar Plantilla en Mes Específico</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px' }} className="no-scrollbar">
              {nextSixPeriods.map(period => (
                <button
                  key={period}
                  onClick={() => handleApplyTemplateToMonth(period)}
                  style={{
                    border: '1px solid var(--card-border)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)'
                  }}
                >
                  Aplicar en {formatPeriodShort(period)}
                </button>
              ))}
            </div>
          </div>

          {/* Planning Grid Table Container with horizontal scroll */}
          <div style={{
            width: '100%',
            overflowX: 'auto',
            border: '1px solid var(--card-border)',
            borderRadius: '16px',
            backgroundColor: 'var(--card-bg)',
            boxShadow: 'var(--card-shadow)',
            WebkitOverflowScrolling: 'touch'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              textAlign: 'left',
              minWidth: '580px' // Ensures it stretches nicely to scroll
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', backgroundColor: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>Categoría</th>
                  {nextSixPeriods.map(p => (
                    <th 
                      key={p} 
                      style={{ 
                        padding: '12px 10px', 
                        fontWeight: 700, 
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        textTransform: 'capitalize'
                      }}
                    >
                      {formatPeriodShort(p)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenseCategories.map(cat => (
                  <tr key={cat.name} style={{ borderBottom: '1px solid rgba(22, 52, 40, 0.05)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cat.name}
                    </td>
                    
                    {nextSixPeriods.map(period => {
                      const budget = sixMonthBudgets.find(
                        b => b.category.toLowerCase() === cat.name.toLowerCase() && b.period === period
                      );
                      const amount = budget ? budget.amount : 0;

                      return (
                        <td 
                          key={period}
                          onClick={() => handleCellClick(cat.name, period)}
                          style={{ 
                            padding: '8px 6px',
                            textAlign: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{
                            padding: '6px',
                            borderRadius: '8px',
                            backgroundColor: amount > 0 ? 'var(--color-success-bg)' : 'var(--bg-secondary)',
                            color: amount > 0 ? 'var(--color-success)' : 'var(--text-muted)',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            transition: 'all 0.15s'
                          }}
                          className="grid-cell"
                          onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
                          onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                          >
                            {amount > 0 ? `$${amount.toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : '-'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 4px' }}>
            * Haz clic en cualquier celda para definir o editar el límite de ese mes específico.
          </div>
        </section>
      )}

      {/* Edit Template Budget Modal */}
      {editingTemplateCat && (
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
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Presupuesto Plantilla</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Define el monto por defecto mensual para <strong>{editingTemplateCat.name}</strong>.
            </p>
            
            <form onSubmit={handleSaveTemplate}>
              <div className="form-group">
                <label className="form-label">Límite por Defecto ($)</label>
                <input 
                  type="number" 
                  step="1"
                  className="form-input"
                  placeholder="Ej: 300"
                  value={templateBudgetVal}
                  onChange={(e) => setTemplateBudgetVal(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              
              {templateErrorMsg && (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginBottom: '10px', fontWeight: 500 }}>
                  {templateErrorMsg}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingTemplateCat(null)}
                  style={{ padding: '10px', fontSize: '0.9rem' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '10px', fontSize: '0.9rem' }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Month Specific Cell Budget Modal */}
      {editingCell && (
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
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Presupuesto Mensual</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
              Categoría: <strong>{editingCell.category}</strong><br/>
              Período: <strong style={{ textTransform: 'capitalize' }}>{formatPeriodLong(editingCell.period)}</strong>
            </div>
            
            <form onSubmit={handleSaveCell}>
              <div className="form-group">
                <label className="form-label">Límite para este mes ($)</label>
                <input 
                  type="number" 
                  step="1"
                  className="form-input"
                  placeholder="Ej: 400"
                  value={cellBudgetVal}
                  onChange={(e) => setCellBudgetVal(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              
              {cellErrorMsg && (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginBottom: '10px', fontWeight: 500 }}>
                  {cellErrorMsg}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingCell(null)}
                  style={{ padding: '10px', fontSize: '0.9rem' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '10px', fontSize: '0.9rem' }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
