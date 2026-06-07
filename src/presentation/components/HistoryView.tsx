import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction } from '@domain/entities/Transaction';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';

interface HistoryViewProps {
  onEditClick: (tx: Transaction) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onEditClick }) => {
  const { currentPeriod, setCurrentPeriod, transactions } = useApp();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

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

  const dayGroups = groupTransactionsByDay(filteredTransactions);
  // Sort days descending
  const sortedDays = Object.keys(dayGroups).sort((a, b) => b.localeCompare(a));

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
              {netFlow >= 0 ? '+' : '-'}${Math.abs(netFlow).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
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
      </section>

      {/* Chronological Transaction List */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {sortedDays.length === 0 ? (
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
        ) : (
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
                  {txs.map(tx => (
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
                            {tx.description}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {tx.category}
                          </div>
                        </div>
                      </div>
                      
                      <div className={`amount ${tx.type}`} style={{ fontSize: '0.95rem' }}>
                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            );
          })
        )}
      </section>

    </div>
  );
};
