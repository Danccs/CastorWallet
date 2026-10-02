import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction } from '@domain/entities/Transaction';
import { formatMoney } from '../utils/format';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';

type StatsTypeFilter = 'expense' | 'income';

interface MonthBucket {
  period: string; // YYYY-MM
  label: string;  // "abr 25"
  total: number;
}

interface CategorySeries {
  category: string;
  type: StatsTypeFilter;
  months: MonthBucket[];
  total12: number;
  current: number;
  previous: number;
  momDelta: number;
  momPercent: number | null;
}

interface PieSlice {
  label: string;
  amount: number;
  percent: number;
  color: string;
}

const PIE_COLORS = [
  '#163428', // forest
  '#3e6658', // mint
  '#7d5a50', // earth
  '#ba1a1a', // clay red
  '#2d4b3e', // deep green
  '#9a8f84'  // otras / muted
];

function buildTop5Pie(items: { label: string; amount: number }[]): PieSlice[] {
  const positive = items
    .filter(i => i.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (positive.length === 0) return [];

  const total = positive.reduce((s, i) => s + i.amount, 0);
  if (total <= 0) return [];

  const top = positive.slice(0, 4);
  const rest = positive.slice(4);
  const restAmount = rest.reduce((s, i) => s + i.amount, 0);

  const slicesRaw = [...top];
  if (restAmount > 0) {
    slicesRaw.push({ label: 'Otras', amount: restAmount });
  }

  return slicesRaw.map((s, idx) => ({
    label: s.label,
    amount: s.amount,
    percent: (s.amount / total) * 100,
    color: PIE_COLORS[Math.min(idx, PIE_COLORS.length - 1)]
  }));
}

function pieConicGradient(slices: PieSlice[]): string {
  if (slices.length === 0) return 'var(--bg-tertiary)';
  let cursor = 0;
  const parts = slices.map(s => {
    const start = cursor;
    cursor += s.percent;
    return `${s.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  return `conic-gradient(${parts.join(', ')})`;
}

function buildLast12Periods(referencePeriod: string): string[] {
  const [y, m] = referencePeriod.split('-').map(Number);
  const periods: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return periods;
}

function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function txPeriod(tx: Transaction): string {
  const d = new Date(tx.date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const StatsView: React.FC = () => {
  const { currentPeriod, categories, fetchTransactionsInDateRange } = useApp();
  const [typeFilter, setTypeFilter] = useState<StatsTypeFilter>('expense');
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const periods = useMemo(() => buildLast12Periods(currentPeriod), [currentPeriod]);
  const periodsKey = periods.join(',');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const start = `${periods[0]}-01`;
        const [ey, em] = periods[periods.length - 1].split('-').map(Number);
        const lastDay = new Date(ey, em, 0).getDate();
        const end = `${periods[periods.length - 1]}-${String(lastDay).padStart(2, '0')}`;
        const data = await fetchTransactionsInDateRange(start, end);
        if (!cancelled) setTxs(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'No se pudieron cargar las estadísticas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
    // periodsKey captures the 12-month window; fetch fn is stable enough via repo singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodsKey]);

  const series = useMemo((): CategorySeries[] => {
    const filtered = txs.filter(t => t.type === typeFilter);
    const byCategory = new Map<string, Map<string, number>>();

    for (const tx of filtered) {
      const cat = tx.category || 'Sin categoría';
      const p = txPeriod(tx);
      if (!byCategory.has(cat)) byCategory.set(cat, new Map());
      const monthMap = byCategory.get(cat)!;
      monthMap.set(p, (monthMap.get(p) || 0) + tx.amount);
    }

    // Include active categories of this type even with zero activity if they appear in map
    const names = new Set<string>([
      ...Array.from(byCategory.keys()),
      ...categories.filter(c => c.type === typeFilter && c.active).map(c => c.name)
    ]);

    const result: CategorySeries[] = [];

    for (const category of names) {
      const monthMap = byCategory.get(category) || new Map();
      const months: MonthBucket[] = periods.map(period => ({
        period,
        label: periodLabel(period),
        total: monthMap.get(period) || 0
      }));
      const total12 = months.reduce((s, m) => s + m.total, 0);
      if (total12 <= 0) continue;

      const current = months[months.length - 1]?.total || 0;
      const previous = months[months.length - 2]?.total || 0;
      const momDelta = current - previous;
      const momPercent = previous > 0 ? (momDelta / previous) * 100 : current > 0 ? 100 : null;

      result.push({
        category,
        type: typeFilter,
        months,
        total12,
        current,
        previous,
        momDelta,
        momPercent
      });
    }

    return result.sort((a, b) => b.total12 - a.total12);
  }, [txs, typeFilter, periods, categories]);

  const overallCurrent = series.reduce((s, c) => s + c.current, 0);
  const overallPrevious = series.reduce((s, c) => s + c.previous, 0);
  const overallDelta = overallCurrent - overallPrevious;
  const overallPercent =
    overallPrevious > 0 ? (overallDelta / overallPrevious) * 100 : overallCurrent > 0 ? 100 : null;

  const pie12 = useMemo(
    () => buildTop5Pie(series.map(s => ({ label: s.category, amount: s.total12 }))),
    [series]
  );
  const pieCurrent = useMemo(
    () => buildTop5Pie(series.map(s => ({ label: s.category, amount: s.current }))),
    [series]
  );

  const renderPieCard = (title: string, subtitle: string, slices: PieSlice[], total: number) => {
    if (slices.length === 0 || total <= 0) {
      return (
        <div style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: '14px',
          border: '1px solid var(--card-border)',
          padding: '16px',
          boxShadow: 'var(--card-shadow)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem'
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</div>
          Sin datos para graficar
        </div>
      );
    }

    return (
      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: '14px',
        border: '1px solid var(--card-border)',
        padding: '14px',
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {subtitle} · ${formatMoney(total)}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            aria-hidden
            style={{
              width: '132px',
              height: '132px',
              borderRadius: '50%',
              background: pieConicGradient(slices),
              boxShadow: 'inset 0 0 0 1px rgba(22,52,40,0.06)'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {slices.map(slice => (
            <div
              key={slice.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                fontSize: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  backgroundColor: slice.color,
                  flexShrink: 0
                }} />
                <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: slice.label === 'Otras' ? 500 : 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {slice.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ color: 'var(--text-secondary)' }}>${formatMoney(slice.amount)}</span>
                <span style={{
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  minWidth: '36px',
                  textAlign: 'right'
                }}>
                  {Math.round(slice.percent)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDelta = (delta: number, percent: number | null) => {
    if (delta === 0) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600 }}>
          <Minus size={12} /> Sin cambio
        </span>
      );
    }
    const upIsBad = typeFilter === 'expense';
    const isUp = delta > 0;
    const color = (isUp && upIsBad) || (!isUp && !upIsBad)
      ? 'var(--color-danger)'
      : 'var(--color-success)';
    const Icon = isUp ? TrendingUp : TrendingDown;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color, fontSize: '0.72rem', fontWeight: 700 }}>
        <Icon size={12} />
        {isUp ? '+' : ''}{formatMoney(delta)}
        {percent !== null && (
          <span style={{ fontWeight: 600, opacity: 0.85 }}>
            ({isUp ? '+' : ''}{percent.toFixed(0)}%)
          </span>
        )}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '80px' }}>
      <div>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <BarChart3 size={20} color="var(--color-primary)" />
          Estadísticas
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Variación por partida · últimos 12 meses (hasta {periodLabel(currentPeriod)})
        </p>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {([
          { id: 'expense' as const, label: 'Egresos' },
          { id: 'income' as const, label: 'Ingresos' }
        ]).map(opt => (
          <button
            key={opt.id}
            onClick={() => {
              setTypeFilter(opt.id);
              setExpanded(null);
            }}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: typeFilter === opt.id ? 'var(--color-primary)' : 'var(--card-border)',
              backgroundColor: typeFilter === opt.id ? 'var(--color-primary)' : 'var(--card-bg)',
              color: typeFilter === opt.id ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Overall MoM summary */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: '14px',
        border: '1px solid var(--card-border)',
        padding: '14px 16px',
        boxShadow: 'var(--card-shadow)'
      }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Mes actual vs anterior
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px', gap: '12px' }}>
          <div>
            <div style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: typeFilter === 'expense' ? 'var(--color-danger)' : 'var(--color-success)'
            }}>
              ${formatMoney(overallCurrent)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Anterior: ${formatMoney(overallPrevious)}
            </div>
          </div>
          {renderDelta(overallDelta, overallPercent)}
        </div>
      </div>

      {/* Top 5 pie charts — highlighted for Egresos, also useful for Ingresos */}
      {!loading && !error && series.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            Distribución Top 5
            <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              (4 + Otras)
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '10px'
          }}>
            {renderPieCard(
              'Últimos 12 meses',
              `Top partidas de ${typeFilter === 'expense' ? 'egresos' : 'ingresos'}`,
              pie12,
              series.reduce((s, c) => s + c.total12, 0)
            )}
            {renderPieCard(
              'Mes actual',
              periodLabel(currentPeriod),
              pieCurrent,
              overallCurrent
            )}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Cargando últimos 12 meses...
        </div>
      )}

      {error && !loading && (
        <div style={{
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          borderRadius: '12px',
          padding: '14px',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          {error}
        </div>
      )}

      {!loading && !error && series.length === 0 && (
        <div style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: '16px',
          padding: '36px 20px',
          textAlign: 'center',
          border: '1px solid var(--card-border)'
        }}>
          <BarChart3 size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            Sin movimientos en 12 meses
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Cuando registres {typeFilter === 'expense' ? 'gastos' : 'ingresos'}, verás la variación por partida aquí.
          </p>
        </div>
      )}

      {!loading && !error && series.map(item => {
        const isOpen = expanded === item.category;
        const maxMonth = Math.max(...item.months.map(m => m.total), 1);

        return (
          <div
            key={item.category}
            style={{
              backgroundColor: 'var(--card-bg)',
              borderRadius: '14px',
              border: '1px solid var(--card-border)',
              boxShadow: 'var(--card-shadow)',
              overflow: 'hidden'
            }}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : item.category)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                textAlign: 'left'
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.category}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  12 meses: ${formatMoney(item.total12)} · Actual: ${formatMoney(item.current)}
                </div>
                <div style={{ marginTop: '4px' }}>
                  {renderDelta(item.momDelta, item.momPercent)}
                </div>
              </div>
              {isOpen ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
            </button>

            {isOpen && (
              <div style={{
                padding: '0 14px 14px',
                borderTop: '1px solid var(--bg-tertiary)'
              }}>
                {/* Mini bar chart */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '4px',
                  height: '88px',
                  marginTop: '12px',
                  paddingBottom: '4px'
                }}>
                  {item.months.map(m => {
                    const heightPct = (m.total / maxMonth) * 100;
                    return (
                      <div
                        key={m.period}
                        title={`${m.label}: $${formatMoney(m.total)}`}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          height: '100%',
                          gap: '4px'
                        }}
                      >
                        <div style={{
                          width: '100%',
                          maxWidth: '18px',
                          height: `${Math.max(heightPct, m.total > 0 ? 6 : 2)}%`,
                          borderRadius: '4px 4px 2px 2px',
                          backgroundColor: m.total > 0
                            ? (typeFilter === 'expense' ? 'var(--color-danger)' : 'var(--color-success)')
                            : 'var(--bg-tertiary)',
                          opacity: m.period === periods[periods.length - 1] ? 1 : 0.7
                        }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  marginTop: '2px'
                }}>
                  {item.months.map((m, idx) => (
                    <div
                      key={m.period}
                      style={{
                        flex: 1,
                        fontSize: '0.55rem',
                        color: idx === item.months.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: idx === item.months.length - 1 ? 700 : 500,
                        textAlign: 'center',
                        textTransform: 'capitalize',
                        lineHeight: 1.1
                      }}
                    >
                      {m.label.split(' ')[0]}
                    </div>
                  ))}
                </div>

                {/* Monthly table */}
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[...item.months].reverse().map((m, idx, arr) => {
                    const prev = arr[idx + 1];
                    const delta = prev ? m.total - prev.total : 0;
                    return (
                      <div
                        key={m.period}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          backgroundColor: idx === 0 ? 'var(--bg-secondary)' : 'transparent',
                          fontSize: '0.78rem'
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 600 }}>
                          {m.label}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {prev && m.total !== prev.total && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              color: (typeFilter === 'expense' ? m.total > prev.total : m.total < prev.total)
                                ? 'var(--color-danger)'
                                : 'var(--color-success)'
                            }}>
                              {delta > 0 ? '+' : ''}{formatMoney(delta)}
                            </span>
                          )}
                          <span style={{
                            fontWeight: 700,
                            color: typeFilter === 'expense' ? 'var(--color-danger)' : 'var(--color-success)',
                            minWidth: '64px',
                            textAlign: 'right'
                          }}>
                            ${formatMoney(m.total)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
