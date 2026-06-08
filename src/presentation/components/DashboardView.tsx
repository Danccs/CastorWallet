import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { alerts } from '@presentation/utils/alerts';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  TrendingDown, 
  Edit2,
  Copy
} from 'lucide-react';

interface DashboardViewProps {
  onAddClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onAddClick }) => {
  const { 
    currentPeriod, 
    setCurrentPeriod, 
    transactions, 
    budgets, 
    categories, 
    setBudgetLimit,
    applyBudgetTemplate
  } = useApp();

  const [editingBudgetCategory, setEditingBudgetCategory] = useState<string | null>(null);
  const [newBudgetVal, setNewBudgetVal] = useState<string>('');

  // 1. Calculate Active Month Display Name
  const getPeriodDisplayName = () => {
    const [year, month] = currentPeriod.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const changeMonth = (offset: number) => {
    const [yearStr, monthStr] = currentPeriod.split('-');
    const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1 + offset, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    setCurrentPeriod(`${y}-${m}`);
  };

  // 2. Calculations
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const remainingBudget = totalBudgeted - totalExpense;
  const overallProgress = totalBudgeted > 0 ? Math.min((totalExpense / totalBudgeted) * 100, 100) : 0;

  // 3. Category Breakdown Data
  const expenseCategories = categories
    .filter(c => c.type === 'expense' && c.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'es-ES'));
  
  const categoryBreakdown = expenseCategories.map(cat => {
    const budget = budgets.find(b => b.category.toLowerCase() === cat.name.toLowerCase());
    const realSpent = transactions
      .filter(t => t.type === 'expense' && t.category.toLowerCase() === cat.name.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      name: cat.name,
      budgetLimit: budget ? budget.amount : 0,
      realSpent,
      percent: budget && budget.amount > 0 ? (realSpent / budget.amount) * 100 : 0
    };
  });

  const handleEditBudgetClick = (category: string, currentLimit: number) => {
    setEditingBudgetCategory(category);
    setNewBudgetVal(currentLimit > 0 ? currentLimit.toString() : '');
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudgetCategory) return;
    const parsed = parseFloat(newBudgetVal);
    if (!isNaN(parsed) && parsed >= 0) {
      await setBudgetLimit(editingBudgetCategory, parsed);
    }
    setEditingBudgetCategory(null);
  };

  const handleApplyTemplate = async () => {
    const confirmed = await alerts.confirm(
      '¿Aplicar plantilla?',
      '¿Deseas aplicar la plantilla de presupuestos en el mes actual? Esto creará o actualizará los presupuestos de las categorías activas.'
    );
    if (confirmed) {
      try {
        await applyBudgetTemplate();
        alerts.success('¡Aplicado!', 'Plantilla de presupuestos aplicada correctamente para este mes.');
      } catch (err: any) {
        alerts.error('Error', err.message || 'Error al aplicar la plantilla de presupuestos.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Month Selector */}
      <section style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--card-bg)',
        padding: '8px 16px',
        borderRadius: '999px',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)'
      }}>
        <button 
          onClick={() => changeMonth(-1)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)'
          }}
          className="btn-secondary"
        >
          <ChevronLeft size={20} />
        </button>
        <span style={{ 
          fontFamily: 'var(--font-display)', 
          fontWeight: 700, 
          fontSize: '1.1rem', 
          color: 'var(--color-primary)', 
          textTransform: 'capitalize' 
        }}>
          {getPeriodDisplayName()}
        </span>
        <button 
          onClick={() => changeMonth(1)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)'
          }}
          className="btn-secondary"
        >
          <ChevronRight size={20} />
        </button>
      </section>

      {/* Balance Summary Card */}
      <section className="card" style={{
        background: 'linear-gradient(135deg, #163428 0%, #2d4b3e 100%)',
        color: '#ffffff',
        border: 'none',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px'
      }}>
        {/* Glow ambient background */}
        <div style={{
          position: 'absolute',
          top: '-30%',
          right: '-10%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          backgroundColor: 'rgba(192, 236, 218, 0.15)',
          filter: 'blur(30px)',
          pointerEvents: 'none'
        }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>Gastos Reales</span>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              ${totalExpense.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            </span>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              backgroundColor: 'rgba(255,255,255,0.12)', 
              padding: '4px 10px', 
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              <TrendingDown size={14} style={{ color: '#ffdbd1' }} />
              <span>Gastado</span>
            </div>
          </div>
        </div>

        {/* Inner dividers for Budgeted and Remaining */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Presupuesto Total</span>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-display)', marginTop: '2px' }}>
              ${totalBudgeted.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              {remainingBudget >= 0 ? 'Disponible' : 'Excedido'}
            </span>
            <p style={{ 
              fontSize: '1.1rem', 
              fontWeight: 600, 
              fontFamily: 'var(--font-display)', 
              marginTop: '2px',
              color: remainingBudget >= 0 ? '#c0ecda' : '#ffdbd1'
            }}>
              ${Math.abs(remainingBudget).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Global Progress Bar */}
        {totalBudgeted > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${overallProgress}%`, 
                height: '100%', 
                backgroundColor: remainingBudget >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger)', 
                borderRadius: '4px',
                transition: 'width 0.4s ease'
              }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', opacity: 0.8, marginTop: '6px' }}>
              <span>{overallProgress.toFixed(0)}% consumido</span>
              <span>Límite: ${totalBudgeted.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        )}
      </section>

      {/* Category Budget Breakdown Table */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Límites por Categoría</h2>
          <button 
            onClick={handleApplyTemplate}
            style={{ 
              fontSize: '0.75rem', 
              color: 'var(--color-success)', 
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'underline'
            }}
          >
            <Copy size={12} />
            Aplicar Plantilla
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categoryBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', backgroundColor: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
              No hay categorías activas configuradas.
            </div>
          ) : (
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
                minWidth: '320px'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', backgroundColor: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>Categoría</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>Real</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>Presupuesto</th>
                    <th style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>% Avance</th>
                    <th style={{ padding: '12px 10px', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map(cat => {
                    const pct = cat.percent;
                    let progressColor = 'var(--color-success)';
                    let progressBg = 'var(--color-success-bg)';
                    if (pct >= 90) {
                      progressColor = 'var(--color-danger)';
                      progressBg = 'var(--color-danger-bg)';
                    } else if (pct >= 70) {
                      progressColor = 'var(--color-warning)';
                      progressBg = 'var(--color-warning-bg)';
                    }

                    return (
                      <tr key={cat.name} style={{ borderBottom: '1px solid rgba(22, 52, 40, 0.05)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {cat.name}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                          ${cat.realSpent.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: cat.budgetLimit > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: cat.budgetLimit > 0 ? 'normal' : 'italic' }}>
                          {cat.budgetLimit > 0 ? `$${cat.budgetLimit.toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : 'Sin límite'}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {cat.budgetLimit > 0 ? (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: progressBg,
                              color: progressColor,
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              whiteSpace: 'nowrap'
                            }}>
                              {pct.toFixed(0)}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleEditBudgetClick(cat.name, cat.budgetLimit)}
                            style={{
                              border: 'none',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-secondary)',
                              borderRadius: '6px',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Configurar presupuesto"
                          >
                            <Edit2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Edit Budget Modal Overlay */}
      {editingBudgetCategory && (
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
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Define el límite para <strong>{editingBudgetCategory}</strong>
            </p>
            
            <form onSubmit={handleSaveBudget}>
              <div className="form-group">
                <label className="form-label">Límite Mensual ($)</label>
                <input 
                  type="number" 
                  step="1"
                  className="form-input"
                  placeholder="Ej: 500"
                  value={newBudgetVal}
                  onChange={(e) => setNewBudgetVal(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingBudgetCategory(null)}
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

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={onAddClick}
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '90px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          boxShadow: '0 4px 16px rgba(22, 52, 40, 0.3)',
          cursor: 'pointer',
          zIndex: 90,
          transition: 'transform 0.15s ease'
        }}
        className="fab-btn"
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Plus size={24} />
      </button>
    </div>
  );
};
