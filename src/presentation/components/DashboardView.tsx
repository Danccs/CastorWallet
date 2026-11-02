import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingDown, 
  Edit2,
  X,
  Lock,
  Unlock
} from 'lucide-react';
import type { Transaction } from '@domain/entities/Transaction';
import { formatMoney } from '../utils/format';
import { alerts } from '@presentation/utils/alerts';
import { computeFinalBalance } from '@domain/services/MonthlyBalance';

interface DashboardViewProps {
  onEditClick?: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onEditClick }) => {
  const { 
    currentPeriod, 
    setCurrentPeriod, 
    transactions, 
    budgets, 
    categories, 
    setBudgetLimit,
    saldoInicial,
    isPeriodClosed,
    closeCurrentPeriod,
    reopenCurrentPeriod,
  } = useApp();

  const [editingBudgetCategory, setEditingBudgetCategory] = useState<string | null>(null);
  const [newBudgetVal, setNewBudgetVal] = useState<string>('');
  const [viewingCategory, setViewingCategory] = useState<string | null>(null);

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

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldoLiquido = computeFinalBalance(saldoInicial, totalIncome, totalExpense);

  const handleTogglePeriodLock = async () => {
    try {
      if (isPeriodClosed) {
        const confirmed = await alerts.confirm(
          '¿Reabrir mes?',
          'Al reabrir el mes podrás modificar movimientos y presupuestos de este período.',
          'Reabrir',
          'Cancelar'
        );
        if (!confirmed) return;
        await reopenCurrentPeriod();
        await alerts.success('Mes reabierto');
      } else {
        const confirmed = await alerts.confirm(
          '¿Cerrar mes?',
          'No se podrán crear, editar ni eliminar movimientos ni presupuestos de este mes hasta que lo reabras.',
          'Cerrar mes',
          'Cancelar'
        );
        if (!confirmed) return;
        await closeCurrentPeriod();
        await alerts.success('Mes cerrado');
      }
    } catch (err) {
      alerts.error('Error', err instanceof Error ? err.message : 'No se pudo actualizar el cierre del mes');
    }
  };

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
  }).filter(item => item.budgetLimit > 0 || item.realSpent > 0);

  const handleEditBudgetClick = (category: string, currentLimit: number) => {
    if (isPeriodClosed) {
      alerts.warning('Mes cerrado', 'Reabre el mes para editar presupuestos.');
      return;
    }
    setEditingBudgetCategory(category);
    setNewBudgetVal(currentLimit > 0 ? currentLimit.toString() : '');
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudgetCategory) return;
    const parsed = parseFloat(newBudgetVal);
    if (!isNaN(parsed) && parsed >= 0) {
      try {
        await setBudgetLimit(editingBudgetCategory, parsed);
      } catch (err) {
        alerts.error('Error', err instanceof Error ? err.message : 'No se pudo guardar el presupuesto');
      }
    }
    setEditingBudgetCategory(null);
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Month Selector */}
      <section style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--card-bg)',
        padding: '6px 12px',
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 700, 
            fontSize: '1.1rem', 
            color: 'var(--color-primary)', 
            textTransform: 'capitalize' 
          }}>
            {getPeriodDisplayName()}
          </span>
          {isPeriodClosed && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.68rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'none'
            }}>
              <Lock size={10} /> Mes cerrado
            </span>
          )}
        </div>
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
        padding: '16px'
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
              ${formatMoney(totalExpense)}
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

        {/* Opening / income / final liquid balance */}
        <div style={{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px 16px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Saldo Inicial</span>
            <p style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              marginTop: '2px',
              color: saldoInicial >= 0 ? '#c0ecda' : '#ffdbd1'
            }}>
              {saldoInicial >= 0 ? '+' : '-'}${formatMoney(Math.abs(saldoInicial))}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Ingresos</span>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginTop: '2px', color: '#c0ecda' }}>
              +${formatMoney(totalIncome)}
            </p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Saldo Líquido Final</span>
            <p style={{ 
              fontSize: '1.35rem', 
              fontWeight: 700, 
              fontFamily: 'var(--font-display)', 
              marginTop: '2px', 
              color: saldoLiquido >= 0 ? '#c0ecda' : '#ffdbd1' 
            }}>
              {saldoLiquido >= 0 ? '+' : '-'}${formatMoney(Math.abs(saldoLiquido))}
            </p>
          </div>
        </div>

        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            onClick={handleTogglePeriodLock}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              borderRadius: '999px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isPeriodClosed ? <Unlock size={14} /> : <Lock size={14} />}
            {isPeriodClosed ? 'Reabrir mes' : 'Cerrar mes'}
          </button>
        </div>

        {/* Inner dividers for Budgeted and Remaining */}
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Presupuesto Total</span>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-display)', marginTop: '2px' }}>
              ${formatMoney(totalBudgeted)}
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
              ${formatMoney(Math.abs(remainingBudget))}
            </p>
          </div>
        </div>

        {/* Global Progress Bar */}
        {totalBudgeted > 0 && (
          <div style={{ marginTop: '12px' }}>
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
              <span>Límite: ${formatMoney(totalBudgeted)}</span>
            </div>
          </div>
        )}
      </section>

      {/* Category Budget Breakdown Table */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Límites por Categoría</h2>
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
                        <td 
                          onClick={() => cat.realSpent > 0 && setViewingCategory(cat.name)}
                          style={{ 
                            padding: '12px 10px', 
                            textAlign: 'right', 
                            fontWeight: 600, 
                            color: cat.realSpent > 0 ? 'var(--color-primary)' : 'var(--text-primary)',
                            cursor: cat.realSpent > 0 ? 'pointer' : 'default',
                            textDecoration: cat.realSpent > 0 ? 'underline dotted' : 'none'
                          }}
                          title={cat.realSpent > 0 ? "Ver movimientos" : undefined}
                        >
                          ${formatMoney(cat.realSpent)}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: cat.budgetLimit > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: cat.budgetLimit > 0 ? 'normal' : 'italic' }}>
                          {cat.budgetLimit > 0 ? `$${formatMoney(cat.budgetLimit)}` : 'Sin límite'}
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

      {/* Category Spent Movements Modal Overlay */}
      {viewingCategory && (() => {
        const categoryTransactions = transactions
          .filter(t => t.type === 'expense' && t.category.toLowerCase() === viewingCategory.toLowerCase())
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalSpent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);

        return (
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
            <div style={{ flexGrow: 1 }} onClick={() => setViewingCategory(null)}></div>
            
            {/* Modal content sliding from bottom */}
            <div style={{
              backgroundColor: 'var(--card-bg)',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              padding: '20px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              borderTop: '1px solid var(--card-border)',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Movimientos: {viewingCategory}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Total gastado en {getPeriodDisplayName()}: <strong>${formatMoney(totalSpent)}</strong>
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setViewingCategory(null)}
                  style={{ 
                    border: 'none', 
                    background: 'var(--bg-secondary)', 
                    color: 'var(--text-secondary)', 
                    cursor: 'pointer', 
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable list of movements */}
              <div style={{ 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                maxHeight: '55vh', 
                paddingRight: '4px',
                paddingBottom: '20px'
              }}>
                {categoryTransactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No se encontraron gastos registrados para esta categoría.
                  </div>
                ) : (
                  categoryTransactions.map(tx => (
                    <div
                      key={tx.id}
                      onClick={() => {
                        setViewingCategory(null);
                        onEditClick?.(tx);
                      }}
                      className="transaction-item"
                      style={{ 
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease',
                        marginBottom: '0px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={`transaction-icon ${tx.type}`}>
                          <TrendingDown size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {tx.description || 'Sin descripción'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {new Date(tx.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      </div>
                      
                      <div className={`amount ${tx.type}`} style={{ fontSize: '0.95rem' }}>
                        -${formatMoney(tx.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
