import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { alerts } from '@presentation/utils/alerts';
import { 
  Copy,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowRight
} from 'lucide-react';

export const BudgetPlannerView: React.FC = () => {
  const { 
    budgetStartPeriod,
    setBudgetStartPeriod,
    categories, 
    sixMonthBudgets, 
    setBudgetLimitForPeriod, 
    copyBudgetPeriod
  } = useApp();

  // Modal Editing Month Specific Budget
  const [editingCell, setEditingCell] = useState<{ category: string; period: string; currentAmount: number } | null>(null);
  const [cellBudgetVal, setCellBudgetVal] = useState<string>('');
  const [cellErrorMsg, setCellErrorMsg] = useState<string>('');

  // Modal Copy Budget Month
  const [showCopyModal, setShowCopyModal] = useState<boolean>(false);
  const [copySourcePeriod, setCopySourcePeriod] = useState<string>('');
  const [copyTargetPeriod, setCopyTargetPeriod] = useState<string>('');
  const [copyLoading, setCopyLoading] = useState<boolean>(false);
  const [copyErrorMsg, setCopyErrorMsg] = useState<string>('');

  const expenseCategories = categories
    .filter(c => c.type === 'expense' && c.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'es-ES'));

  const getActualCurrentPeriod = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  // Reset to actual current month on mount
  useEffect(() => {
    setBudgetStartPeriod(getActualCurrentPeriod());
  }, []);

  // Shift the start period of the 6-month budget grid
  const changeBudgetMonth = (offset: number) => {
    const [yearStr, monthStr] = budgetStartPeriod.split('-');
    const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1 + offset, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    setBudgetStartPeriod(`${y}-${m}`);
  };

  // Generate the next 6 periods starting from budgetStartPeriod
  const getNextSixPeriods = () => {
    const [yearStr, monthStr] = budgetStartPeriod.split('-');
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
    if (!p) return '';
    const [year, month] = p.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
  };

  const formatPeriodLong = (p: string) => {
    if (!p) return '';
    const [year, month] = p.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  // 1. Copy Budget Period Actions
  const getCopyPeriodOptions = () => {
    const options = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // 12 months back to 12 months forward (total 25 months)
    for (let i = -12; i <= 12; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const val = `${y}-${m}`;
      options.push({
        value: val,
        label: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      });
    }
    return options;
  };

  const copyPeriodOptions = getCopyPeriodOptions();

  const handleStartCopy = () => {
    setCopySourcePeriod(budgetStartPeriod);
    
    // Set target period to next month by default
    const [yearStr, monthStr] = budgetStartPeriod.split('-');
    const date = new Date(parseInt(yearStr), parseInt(monthStr), 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    setCopyTargetPeriod(`${y}-${m}`);
    
    setCopyErrorMsg('');
    setShowCopyModal(true);
  };

  const handleExecuteCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copySourcePeriod || !copyTargetPeriod) return;
    if (copySourcePeriod === copyTargetPeriod) {
      setCopyErrorMsg('El mes de origen y destino no pueden ser iguales.');
      return;
    }
    
    setCopyLoading(true);
    setCopyErrorMsg('');
    try {
      await copyBudgetPeriod(copySourcePeriod, copyTargetPeriod);
      setShowCopyModal(false);
      alerts.success('¡Copiado!', `Presupuestos copiados con éxito a ${formatPeriodLong(copyTargetPeriod)}.`);
    } catch (err: any) {
      setCopyErrorMsg(err.message || 'Error al copiar los presupuestos.');
    } finally {
      setCopyLoading(false);
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

      {/* 6-Month Planning Grid View */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button
              onClick={() => setBudgetStartPeriod(getActualCurrentPeriod())}
              style={{
                border: '1px solid var(--card-border)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Calendar size={12} />
              Mes Actual
            </button>
            
            <button
              onClick={handleStartCopy}
              style={{
                border: 'none',
                backgroundColor: 'var(--color-primary)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 6px rgba(22, 52, 40, 0.15)'
              }}
            >
              <Copy size={12} />
              Copiar Mes
            </button>
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
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)', minWidth: '150px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span>Categoría</span>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); changeBudgetMonth(-1); }}
                          style={{
                            border: 'none',
                            backgroundColor: 'rgba(255,255,255,0.4)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Retroceder 1 mes"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); changeBudgetMonth(1); }}
                          style={{
                            border: 'none',
                            backgroundColor: 'rgba(255,255,255,0.4)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Avanzar 1 mes"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </th>
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
              <tfoot>
                <tr style={{ borderTop: '2px double var(--card-border)', backgroundColor: 'var(--bg-secondary)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Total
                  </td>
                  {nextSixPeriods.map(period => {
                    const totalForPeriod = expenseCategories.reduce((sum, cat) => {
                      const budget = sixMonthBudgets.find(
                        b => b.category.toLowerCase() === cat.name.toLowerCase() && b.period === period
                      );
                      return sum + (budget ? budget.amount : 0);
                    }, 0);

                    return (
                      <td 
                        key={`total-${period}`}
                        style={{ 
                          padding: '12px 10px',
                          textAlign: 'center',
                          color: 'var(--color-primary)',
                          fontWeight: 700,
                          fontSize: '0.82rem'
                        }}
                      >
                        {totalForPeriod > 0 ? `$${totalForPeriod.toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : '$0'}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 4px' }}>
            * Haz clic en cualquier celda para definir o editar el límite de ese mes específico.
          </div>
        </section>

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

      {/* Copy Month Budget Modal */}
      {showCopyModal && (
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
            maxWidth: '350px',
            backgroundColor: 'var(--card-bg)',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Copiar Presupuesto</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Duplica todos los montos de un mes hacia otro mes destino.
            </p>
            
            <form onSubmit={handleExecuteCopy}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Mes de Origen</label>
                <select
                  className="form-input"
                  value={copySourcePeriod}
                  onChange={(e) => setCopySourcePeriod(e.target.value)}
                  style={{ textTransform: 'capitalize' }}
                  required
                >
                  {copyPeriodOptions.map(opt => (
                    <option key={`src-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)', margin: '4px 0' }}>
                <ArrowRight size={18} style={{ transform: 'rotate(90deg)' }} />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Mes de Destino</label>
                <select
                  className="form-input"
                  value={copyTargetPeriod}
                  onChange={(e) => setCopyTargetPeriod(e.target.value)}
                  style={{ textTransform: 'capitalize' }}
                  required
                >
                  {copyPeriodOptions.map(opt => (
                    <option key={`target-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {copyErrorMsg && (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginBottom: '12px', fontWeight: 500 }}>
                  {copyErrorMsg}
                </p>
              )}

              <div style={{ 
                backgroundColor: 'var(--color-danger-bg)', 
                color: 'var(--color-danger)', 
                padding: '10px 12px', 
                borderRadius: '8px', 
                fontSize: '0.75rem',
                lineHeight: '1.4',
                marginBottom: '16px',
                fontWeight: 500
              }}>
                <strong>¡Atención!</strong> Se sobrescribirán los límites del mes destino. Los presupuestos que existan en el destino y no en el origen serán eliminados.
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCopyModal(false)}
                  disabled={copyLoading}
                  style={{ padding: '10px', fontSize: '0.9rem' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={copyLoading}
                  style={{ 
                    padding: '10px', 
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {copyLoading ? 'Copiando...' : 'Copiar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
