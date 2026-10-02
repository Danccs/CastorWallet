import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction } from '@domain/entities/Transaction';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  TrendingUp, 
  TrendingDown,
  ArrowRightLeft
} from 'lucide-react';
import { formatMoney } from '../utils/format';

interface HistoryViewProps {
  onEditClick: (tx: Transaction) => void;
  onOpenReconciliation?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onEditClick, onOpenReconciliation }) => {
  const { currentPeriod, setCurrentPeriod, transactions } = useApp();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [groupBy, setGroupBy] = useState<'date' | 'category'>('date');

  // Month switching
  const changeMonth = (offset: number) => {
    const [yearStr, monthStr] = currentPeriod.split('-');
    const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1 + offset, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    setCurrentPeriod(`${y}-${m}`);
  };

  const getPeriodDisplayName = () => {
    const [year, month] = currentPeriod.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  // Monthly summary calculations
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netFlow = totalIncome - totalExpense;

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group transactions by day
  const groupTransactionsByDay = (txs: Transaction[]) => {
    const groups: Record<string, Transaction[]> = {};
    txs.forEach(tx => {
      // Use YYYY-MM-DD local format
      const dateStr = new Date(tx.date).toISOString().split('T')[0];
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(tx);
    });
    return groups;
  };

  // Group transactions by category/partida
  const groupTransactionsByCategory = (txs: Transaction[]) => {
    const groups: Record<string, Transaction[]> = {};
    txs.forEach(tx => {
      const cat = tx.category;
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(tx);
    });
    // Sort transactions within each category group descending by date
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    return groups;
  };

  const dayGroups = groupTransactionsByDay(filteredTransactions);
  // Sort days descending
  const sortedDays = Object.keys(dayGroups).sort((a, b) => b.localeCompare(a));

  const categoryGroups = groupTransactionsByCategory(filteredTransactions);
  const sortedCategories = Object.keys(categoryGroups).sort((a, b) => a.localeCompare(b, 'es-ES'));

  const getDayLabel = (dateStr: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Hoy';
    if (dateStr === yesterdayStr) return 'Ayer';

    // Format as "Martes, 7 de jun"
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const renderTransactionItem = (tx: Transaction, showDate: boolean = false) => {
    const formattedDate = new Date(tx.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return (
      <div
        key={tx.id}
        onClick={() => onEditClick(tx)}
        className="transaction-item"
        style={{ 
          cursor: 'pointer',
          transition: 'transform 0.15s ease',
          marginBottom: '0px'
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={`transaction-icon ${tx.type}`}>
            {tx.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {tx.description || 'Sin descripción'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {tx.category}{showDate && ` • ${formattedDate}`}
            </div>
          </div>
        </div>
        
        <div className={`amount ${tx.type}`} style={{ fontSize: '0.95rem' }}>
          {tx.type === 'income' ? '+' : '-'}${formatMoney(tx.amount)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Month Summary Header */}
      <section style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--card-bg)',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)'
      }}>
        <button 
          onClick={() => changeMonth(-1)}
          style={{
            border: 'none',
            background: 'var(--bg-secondary)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)'
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--color-primary)' }}>
            {getPeriodDisplayName()}
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Balance del mes:{' '}
            <strong style={{ color: netFlow >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {netFlow >= 0 ? '+' : '-'}${formatMoney(Math.abs(netFlow))}
            </strong>
          </p>
        </div>

        <button 
          onClick={() => changeMonth(1)}
          style={{
            border: 'none',
            background: 'var(--bg-secondary)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)'
          }}
        >
          <ChevronRight size={18} />
        </button>
      </section>

      {/* Quick Reconciliation Banner */}
      {onOpenReconciliation && (
        <div style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: '14px',
          border: '1px solid var(--card-border)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: 'var(--card-shadow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ArrowRightLeft size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Conciliación Bancaria
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Compara tu PDF de banco contra este mes
              </div>
            </div>
          </div>

          <button
            onClick={onOpenReconciliation}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Conciliar
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            className="form-input"
            placeholder="Buscar movimientos o categorías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          backgroundColor: 'var(--bg-secondary)',
          padding: '4px',
          borderRadius: '12px'
        }}>
          <button
            onClick={() => setTypeFilter('all')}
            style={{
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              background: typeFilter === 'all' ? 'var(--card-bg)' : 'transparent',
              color: typeFilter === 'all' ? 'var(--color-primary)' : 'var(--text-secondary)',
              boxShadow: typeFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Todos
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            style={{
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              background: typeFilter === 'income' ? 'var(--card-bg)' : 'transparent',
              color: typeFilter === 'income' ? 'var(--color-success)' : 'var(--text-secondary)',
              boxShadow: typeFilter === 'income' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Ingresos
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            style={{
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              background: typeFilter === 'expense' ? 'var(--card-bg)' : 'transparent',
              color: typeFilter === 'expense' ? 'var(--color-danger)' : 'var(--text-secondary)',
              boxShadow: typeFilter === 'expense' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Gastos
          </button>
        </div>

        {/* Group By Selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 4px',
          marginTop: '4px'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Agrupar por:</span>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-tertiary)',
            padding: '2px',
            borderRadius: '8px'
          }}>
            <button
              onClick={() => setGroupBy('category')}
              style={{
                border: 'none',
                padding: '4px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: groupBy === 'category' ? 'var(--card-bg)' : 'transparent',
                color: groupBy === 'category' ? 'var(--color-primary)' : 'var(--text-muted)',
                boxShadow: groupBy === 'category' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Partida
            </button>
            <button
              onClick={() => setGroupBy('date')}
              style={{
                border: 'none',
                padding: '4px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: groupBy === 'date' ? 'var(--card-bg)' : 'transparent',
                color: groupBy === 'date' ? 'var(--color-primary)' : 'var(--text-muted)',
                boxShadow: groupBy === 'date' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Fecha
            </button>
          </div>
        </div>
      </section>

      {/* Chronological Transaction List */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredTransactions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--card-border)'
          }}>
            No se encontraron movimientos registrados para este período.
          </div>
        ) : groupBy === 'date' ? (
          sortedDays.map(dateStr => {
            const txs = dayGroups[dateStr];
            return (
              <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                {/* Day Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingLeft: '4px',
                  marginBottom: '2px'
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}></div>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: 'var(--text-secondary)', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {getDayLabel(dateStr)}
                  </span>
                </div>

                {/* Day Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {txs.map(tx => renderTransactionItem(tx, false))}
                </div>

              </div>
            );
          })
        ) : (
          sortedCategories.map(catName => {
            const txs = categoryGroups[catName];
            const catTotal = txs.reduce((sum, t) => sum + t.amount, 0);
            const isIncome = txs[0]?.type === 'income';
            const dotColor = isIncome ? 'var(--color-success)' : 'var(--color-danger)';
            const textColor = isIncome ? 'var(--color-success)' : 'var(--color-danger)';
            const sign = isIncome ? '+' : '-';

            return (
              <div key={catName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                {/* Category Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingLeft: '4px',
                  marginBottom: '2px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }}></div>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 700, 
                      color: 'var(--text-primary)', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {catName}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: textColor }}>
                    {sign}${formatMoney(catTotal)}
                  </span>
                </div>

                {/* Category Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {txs.map(tx => renderTransactionItem(tx, true))}
                </div>

              </div>
            );
          })
        )}
      </section>

    </div>
  );
};
