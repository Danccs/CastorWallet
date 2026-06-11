import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@presentation/context/AuthContext';
import { AppProvider, useApp } from '@presentation/context/AppContext';
import {
  Wallet,
  History as HistoryIcon,
  Tag as TagIcon,
  LogOut,
  TrendingUp,
  Plus
} from 'lucide-react';
import { DashboardView } from '@presentation/components/DashboardView';
import { HistoryView } from '@presentation/components/HistoryView';
import { CategoryManagerView } from '@presentation/components/CategoryManagerView';
import { TransactionFormView } from '@presentation/components/TransactionFormView';
import { BudgetPlannerView } from '@presentation/components/BudgetPlannerView';
import type { Transaction } from '@domain/entities/Transaction';

// Main App Component with Providers
export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainContainer />
      </AppProvider>
    </AuthProvider>
  );
}

// Inner container
function MainContainer() {
  const { user, loading, signInWithGoogle, signInWithGoogleToken, signOut } = useAuth();
  const { loading: loadingApp, categories } = useApp();

  const [activeTab, setActiveTab] = useState<'home' | 'budgets' | 'history' | 'categories'>('home');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  // Initialize official Google Sign-In button
  useEffect(() => {
    const google = (window as any).google;
    if (google && !user && !loading) {
      try {
        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com',
          callback: (response: any) => {
            signInWithGoogleToken(response.credential);
          },
        });

        google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          {
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            width: 300
          }
        );

        google.accounts.id.prompt();
      } catch (err) {
        console.error('Error al inicializar el SDK de Google:', err);
      }
    }
  }, [user, loading]);

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
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>Cargando Castor Wallet...</p>
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
          <img
            src="/logo.png"
            alt="CastorWallet Logo"
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '48px',
              boxShadow: '0 8px 24px rgba(22, 52, 40, 0.12)',
              marginBottom: '20px',
              objectFit: 'cover'
            }}
          />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.05em', marginBottom: '8px' }}>
            Castor<span style={{ color: 'var(--color-primary)' }}> Wallet</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.95rem', maxWidth: '280px', lineHeight: '1.4' }}>
            Gestiona tu presupuesto y finanzas personales de forma simple, rápida y móvil.
          </p>
        </div>

        {/* Action Button & Disclaimer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '40px' }}>
            <div id="google-signin-btn"></div>
          </div>

          <button
            className="btn btn-secondary"
            onClick={signInWithGoogle}
            style={{
              height: '42px',
              fontSize: '0.85rem',
              padding: '6px 12px',
              borderRadius: '12px',
              width: '300px'
            }}
          >
            Entrar mediante redirección (Alternativo)
          </button>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4', width: '100%', maxWidth: '300px', marginTop: '8px' }}>
            Al registrarte aceptas que esta aplicación almacena tus preferencias locales y datos de sesión de Google Auth de forma segura en Supabase.
          </div>
        </div>
      </div>
    );
  }

  // Handle Edit click from History
  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setShowForm(true);
  };

  return (
    <>
      {showForm ? (
        <TransactionFormView
          transactionToEdit={editingTransaction}
          onClose={() => {
            setShowForm(false);
            setEditingTransaction(undefined);
          }}
        />
      ) : (
        <>
          {/* Header Sticky Area */}
          <header className="header">
            {/* Avatar Button container */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  outline: 'none'
                }}
                title="Menú de usuario"
              >
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
                    fontWeight: 'bold',
                    color: '#ffffff'
                  }}>
                    {user.name ? user.name.charAt(0) : 'U'}
                  </div>
                )}
              </button>

              {/* User Dropdown Menu Popover */}
              {showUserMenu && (
                <>
                  {/* Backdrop to close click outside */}
                  <div
                    onClick={() => setShowUserMenu(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 95,
                      background: 'transparent'
                    }}
                  />
                  {/* Dropdown Card */}
                  <div style={{
                    position: 'absolute',
                    top: '46px',
                    left: '0',
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    border: '1px solid var(--card-border)',
                    padding: '14px',
                    zIndex: 96,
                    minWidth: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sesión iniciada como</span>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                      {user.name || 'Usuario'}
                    </div>
                    {user.email && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', wordBreak: 'break-all' }}>
                        {user.email}
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid var(--bg-tertiary)', margin: '6px 0' }}></div>
                    <button
                      onClick={() => {
                        signOut();
                        setShowUserMenu(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        backgroundColor: 'var(--color-danger-bg)',
                        color: 'var(--color-danger)',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <LogOut size={14} />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Centered Application Name */}
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
              Castor<span style={{ color: 'var(--color-primary)' }}> Wallet</span>
            </h2>

            {/* "+" Button to register new transaction */}
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22, 52, 40, 0.15)',
                transition: 'transform 0.1s ease',
                padding: 0,
                outline: 'none'
              }}
              title="Registrar movimiento"
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Plus size={18} />
            </button>
          </header>

          {/* Main Content Area */}
          <main className="screen" style={{ position: 'relative' }}>
            {/* Subtle background syncing overlay indicator */}
            {loadingApp && categories.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 150,
                backgroundColor: 'var(--card-bg)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid var(--card-border)'
              }}>
                <div className="spinner" style={{
                  width: '10px',
                  height: '10px',
                  border: '1.5px solid rgba(129, 140, 248, 0.2)',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Sincronizando...
              </div>
            )}

            {categories.length === 0 && loadingApp ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
                <div className="spinner" style={{
                  width: '28px',
                  height: '28px',
                  border: '2.5px solid rgba(129, 140, 248, 0.2)',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'var(--font-display)' }}>Sincronizando datos...</p>
              </div>
            ) : (
              <>
                {activeTab === 'home' && (
                  <DashboardView onEditClick={handleEditClick} />
                )}
                {activeTab === 'budgets' && (
                  <BudgetPlannerView />
                )}
                {activeTab === 'history' && (
                  <HistoryView onEditClick={handleEditClick} />
                )}
                {activeTab === 'categories' && (
                  <CategoryManagerView />
                )}
              </>
            )}

            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </main>

          {/* Navigation Bottom Bar */}
          <nav className="nav-bar" style={{ padding: '0 4px', gap: '2px' }}>
            <button
              className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <Wallet size={18} />
              <span style={{ fontSize: '0.7rem' }}>Inicio</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'budgets' ? 'active' : ''}`}
              onClick={() => setActiveTab('budgets')}
            >
              <TrendingUp size={18} />
              <span style={{ fontSize: '0.7rem' }}>Presupuestos</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <HistoryIcon size={18} />
              <span style={{ fontSize: '0.7rem' }}>Historial</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              <TagIcon size={18} />
              <span style={{ fontSize: '0.7rem' }}>Categorías</span>
            </button>
          </nav>
        </>
      )}
    </>
  );
}
