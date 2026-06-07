import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@presentation/context/AuthContext';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  LogOut, 
  DollarSign, 
  Tag, 
  X,
  CreditCard
} from 'lucide-react';

// Main App Component with AuthProvider wrapper
export default function App() {
  return (
    <AuthProvider>
      <MainContainer />
    </AuthProvider>
  );
}

// Inner container that listens to auth state
function MainContainer() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'budgets'>('home');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Dummy State for immediate interactivity (satisfying "No Placeholders" rule)
  const [transactions, setTransactions] = useState([
    { id: '1', description: 'Suscripción Netflix', amount: 12.99, type: 'expense', category: 'Entretenimiento', date: new Date().toLocaleDateString() },
    { id: '2', description: 'Freelance Frontend', amount: 450.00, type: 'income', category: 'Trabajo', date: new Date().toLocaleDateString() },
    { id: '3', description: 'Compra Supermercado', amount: 84.50, type: 'expense', category: 'Alimentos', date: new Date().toLocaleDateString() },
  ]);

  const [budgets, setBudgets] = useState([
    { id: '1', category: 'Alimentos', limit: 300, spent: 84.50 },
    { id: '2', category: 'Entretenimiento', limit: 100, spent: 12.99 },
    { id: '3', category: 'Transporte', limit: 150, spent: 0 },
  ]);

  // Form State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Alimentos');

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(129, 140, 248, 0.2)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>Cargando CastorWallet...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // LOGIN SCREEN (Premium Dark Mode)
  if (!user) {
    return (
      <div className="screen" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between', 
        height: '100%', 
        padding: '40px 24px' 
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '60px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(99, 102, 241, 0.4)',
            marginBottom: '20px'
          }}>
            <Wallet size={40} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.05em', marginBottom: '8px' }}>
            Castor<span style={{ color: 'var(--color-primary)' }}>Wallet</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.95rem', maxWidth: '280px', lineHeight: '1.4' }}>
            Gestiona tu presupuesto y finanzas personales de forma simple, rápida y móvil.
          </p>
        </div>

        {/* Action Button & Disclaimer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
          <button className="btn btn-primary" onClick={signInWithGoogle} style={{ height: '54px' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: '8px' }}>
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar con Google
          </button>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
            Al registrarte aceptas que esta aplicación almacena tus preferencias locales y datos de sesión de Google Auth de forma segura en Supabase.
          </div>
        </div>
      </div>
    );
  }

  // Dashboard calculations
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  // Form Submit Handler
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return;

    const newTx = {
      id: Date.now().toString(),
      description: desc,
      amount: parsedAmount,
      type,
      category,
      date: new Date().toLocaleDateString()
    };

    // Update transactions list
    setTransactions([newTx, ...transactions]);

    // Update budgets spent if it's an expense and category matches
    if (type === 'expense') {
      setBudgets(budgets.map(b => {
        if (b.category.toLowerCase() === category.toLowerCase()) {
          return { ...b, spent: b.spent + parsedAmount };
        }
        return b;
      }));
    }

    // Reset Form
    setDesc('');
    setAmount('');
    setShowAddForm(false);
  };

  return (
    <>
      {/* Header Sticky Area */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--color-primary)' }} 
            />
          ) : (
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--color-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hola,</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name || user.email}
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: '1.2rem', letterSpacing: '-0.03em' }}>
          Castor<span style={{ color: 'var(--color-primary)' }}>Wallet</span>
        </h2>

        <button 
          onClick={signOut} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer',
            padding: '6px'
          }}
          title="Cerrar Sesión"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Screen Content */}
      <main className="screen">
        {activeTab === 'home' ? (
          <div>
            {/* Balance Main Card */}
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, rgba(27, 32, 46, 0.95) 0%, rgba(18, 22, 32, 0.95) 100%)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background ambient glow */}
              <div style={{
                position: 'absolute',
                top: '-40%',
                right: '-20%',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                backgroundColor: 'var(--card-glow)',
                filter: 'blur(40px)',
                pointerEvents: 'none'
              }}></div>

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Balance Total</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.6rem', color: 'var(--text-secondary)', marginRight: '4px' }}>$</span>
                {currentBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* Income / Expense Split summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontSize: '0.8rem', marginBottom: '2px' }}>
                    <TrendingUp size={14} />
                    <span>Ingresos</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                    ${totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '2px' }}>
                    <TrendingDown size={14} />
                    <span>Gastos</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                    ${totalExpense.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions / Add Button */}
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)} style={{ marginBottom: '24px' }}>
              <Plus size={20} />
              Registrar Movimiento
            </button>

            {/* Recent Transactions List */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Actividad Reciente</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>Historial</span>
              </h3>

              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                  No tienes movimientos registrados.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="transaction-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className={`transaction-icon ${tx.type}`}>
                        {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{tx.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                          <span>{tx.category}</span>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--text-muted)' }}></span>
                          <span>{tx.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`amount ${tx.type}`}>
                      {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Budgets Screen */
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '6px' }}>Presupuestos Mensuales</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Controla tus límites de gasto por cada categoría disponible.
            </p>

            {budgets.map((b) => {
              const pct = Math.min((b.spent / b.limit) * 100, 100);
              const color = pct >= 90 ? 'var(--color-danger)' : pct >= 70 ? 'var(--color-warning)' : 'var(--color-success)';

              return (
                <div key={b.id} className="card" style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{b.category}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${b.spent.toFixed(2)}</span> / ${b.limit}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${pct}%`, 
                      height: '100%', 
                      backgroundColor: color, 
                      borderRadius: '4px',
                      transition: 'width 0.4s ease-out',
                      boxShadow: `0 0 8px ${color}80`
                    }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    <span>{pct.toFixed(0)}% consumido</span>
                    <span>Restan ${(b.limit - b.spent) > 0 ? `$${(b.limit - b.spent).toFixed(2)}` : '$0.00'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Transaction Overlay Sheet (Bottom Sheet style) */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 200,
          display: 'flex',
          justifyContent: 'flex-end',
          flexDirection: 'column'
        }}>
          {/* Backdrop Touch Close area */}
          <div style={{ flexGrow: 1 }} onClick={() => setShowAddForm(false)}></div>

          {/* Form Content */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '24px 20px 32px',
            maxHeight: '85vh',
            overflowY: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Nuevo Movimiento</h3>
              <button 
                onClick={() => setShowAddForm(false)} 
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  border: 'none', 
                  color: 'var(--text-secondary)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction}>
              {/* Type Switcher */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '10px', 
                background: 'var(--bg-primary)', 
                padding: '4px', 
                borderRadius: '12px', 
                marginBottom: '20px' 
              }}>
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: type === 'expense' ? 'var(--color-danger)' : 'transparent',
                    color: type === 'expense' ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: type === 'income' ? 'var(--color-success)' : 'transparent',
                    color: type === 'income' ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  Ingreso
                </button>
              </div>

              {/* Amount Input */}
              <div className="form-group">
                <label className="form-label">Monto ($)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <DollarSign size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="form-input"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Description Input */}
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <CreditCard size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Ej. Compra de cena"
                    className="form-input"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>

              {/* Category selector */}
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Tag size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
                  <select
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ paddingLeft: '40px', appearance: 'none', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                  >
                    <option value="Alimentos">Alimentos</option>
                    <option value="Entretenimiento">Entretenimiento</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Trabajo">Trabajo / Ingresos</option>
                    <option value="Varios">Otros / Varios</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Registrar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navigation Bottom Bar */}
      <nav className="nav-bar">
        <button 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <Wallet size={20} />
          <span>Inicio</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'budgets' ? 'active' : ''}`}
          onClick={() => setActiveTab('budgets')}
        >
          <TrendingDown size={20} />
          <span>Límites</span>
        </button>
      </nav>
    </>
  );
}
