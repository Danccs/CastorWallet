import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Transaction } from '@domain/entities/Transaction';
import type { BankMovement } from '@domain/entities/BankMovement';
import type { ManualReconciliationLink } from '@domain/entities/Reconciliation';
import { PdfTextExtractor } from '@infrastructure/pdf/PdfTextExtractor';
import { BankMovementParser } from '@domain/services/BankMovementParser';
import { ReconciliationEngine } from '@domain/services/ReconciliationEngine';
import { formatMoney } from '../utils/format';
import { alerts } from '../utils/alerts';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRightLeft,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Edit2,
  Link2,
  X
} from 'lucide-react';

type MergeSelection =
  | { side: 'bank'; bank: BankMovement }
  | { side: 'wallet'; tx: Transaction };

interface BankReconciliationViewProps {
  onClose?: () => void;
  onEditTransaction?: (tx: Transaction) => void;
}

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  onClose,
  onEditTransaction
}) => {
  const {
    currentPeriod,
    setCurrentPeriod,
    transactions,
    categories,
    addTransaction,
    addTransactionsBatch,
    editTransaction,
    deleteTransaction
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsing & reconciliation state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [bankMovements, setBankMovements] = useState<BankMovement[]>([]);
  const [accountInfo, setAccountInfo] = useState<{
    accountNumber?: string;
    clientName?: string;
    detectedPeriod?: string;
  }>({});

  // Active filter tab in comparison view
  const [activeTab, setActiveTab] = useState<'all' | 'missing' | 'extra' | 'matched'>('missing');

  // Custom category selections per missing item (defaults to suggested category)
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({});

  // Manual merges: keep app details, bank amount wins
  const [manualLinks, setManualLinks] = useState<ManualReconciliationLink[]>([]);
  const [mergeSelection, setMergeSelection] = useState<MergeSelection | null>(null);

  // Month navigation
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

  // Reconcile current bank movements against current transactions for this period
  const reconciliation = useMemo(() => {
    if (bankMovements.length === 0) return null;
    return ReconciliationEngine.reconcile(
      bankMovements,
      transactions,
      currentPeriod,
      categories,
      manualLinks
    );
  }, [bankMovements, transactions, currentPeriod, categories, manualLinks]);

  // Handle PDF upload
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alerts.error('Formato no soportado', 'Por favor selecciona un archivo PDF de tu banco.');
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const extractedPages = await PdfTextExtractor.extractLinesFromPdf(arrayBuffer);
      const allLines = extractedPages.flatMap(p => p.lines);

      if (allLines.length === 0) {
        throw new Error('No se pudo extraer texto del documento PDF.');
      }

      const parseResult = BankMovementParser.parseLines(allLines);

      if (parseResult.movements.length === 0) {
        alerts.warning(
          'Sin movimientos detectados',
          'No pudimos identificar la tabla de movimientos en este PDF. Asegúrate de subir una cartola o extracto bancario con columnas de Fecha y Montos.'
        );
        setIsProcessing(false);
        return;
      }

      setBankMovements(parseResult.movements);
      setAccountInfo({
        accountNumber: parseResult.accountNumber,
        clientName: parseResult.clientName,
        detectedPeriod: parseResult.detectedPeriod
      });

      // Initialize custom categories for missing items
      setSelectedCategories({});
      setManualLinks([]);
      setMergeSelection(null);

      // Check if PDF period matches currentPeriod
      if (parseResult.detectedPeriod && parseResult.detectedPeriod !== currentPeriod) {
        const [pYear, pMonth] = parseResult.detectedPeriod.split('-');
        const detectedDate = new Date(parseInt(pYear), parseInt(pMonth) - 1, 1);
        const detectedName = detectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

        const shouldSwitch = await alerts.confirm(
          'Cambiar de Mes',
          `El extracto PDF corresponde a ${detectedName}. ¿Deseas cambiar el periodo activo a ${detectedName} para conciliar?`,
          'Sí, cambiar mes',
          'Mantener mes actual'
        );

        if (shouldSwitch) {
          setCurrentPeriod(parseResult.detectedPeriod);
        }
      }

      alerts.success(
        '¡Extracto Cargado!',
        `Se extrajeron ${parseResult.movements.length} movimientos bancarios correctamente.`
      );
    } catch (err: any) {
      console.error('Error procesando PDF bancario:', err);
      alerts.error(
        'Error al procesar PDF',
        err.message || 'Ocurrió un problema leyendo el archivo PDF.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Add a single missing movement to CastorWallet
  const handleAddSingleMissing = async (movement: BankMovement, suggestedCat: string) => {
    const chosenCat = selectedCategories[movement.id] || suggestedCat;
    try {
      await addTransaction({
        amount: movement.amount,
        type: movement.type,
        description: movement.description,
        category: chosenCat,
        date: movement.date
      });
      alerts.success('Registrado', `Se agregó "$${formatMoney(movement.amount)}" a ${chosenCat}.`);
    } catch (err: any) {
      alerts.error('Error', err.message || 'No se pudo guardar la transacción.');
    }
  };

  // Batch add all missing movements
  const handleAddAllMissing = async () => {
    if (!reconciliation || reconciliation.missingInWallet.length === 0) return;

    const count = reconciliation.missingInWallet.length;
    const confirmed = await alerts.confirm(
      'Agregar Movimientos Faltantes',
      `¿Deseas registrar automáticamente los ${count} movimientos faltantes en CastorWallet con sus categorías sugeridas?`,
      `Sí, agregar los ${count}`,
      'Cancelar'
    );

    if (!confirmed) return;

    try {
      const itemsToAdd = reconciliation.missingInWallet.map(item => {
        const cat = selectedCategories[item.bankMovement.id] || item.suggestedCategory;
        return {
          amount: item.bankMovement.amount,
          type: item.bankMovement.type,
          description: item.bankMovement.description,
          category: cat,
          date: item.bankMovement.date
        };
      });

      await addTransactionsBatch(itemsToAdd);
      alerts.success('¡Conciliación Exitosa!', `Se han registrado los ${count} movimientos en tu billetera.`);
    } catch (err: any) {
      alerts.error('Error', err.message || 'Ocurrió un error al guardar los movimientos.');
    }
  };

  // Delete an extra transaction from wallet
  const handleDeleteExtra = async (tx: Transaction) => {
    const confirmed = await alerts.confirmDanger(
      'Eliminar Movimiento',
      `¿Estás seguro de eliminar "${tx.description || tx.category}" por $${formatMoney(tx.amount)}? No aparece en el extracto bancario.`
    );

    if (!confirmed) return;

    try {
      await deleteTransaction(tx.id);
      setManualLinks(prev => prev.filter(l => l.walletTransactionId !== tx.id));
      alerts.success('Eliminado', 'El movimiento fue quitado de CastorWallet.');
    } catch (err: any) {
      alerts.error('Error', err.message || 'No se pudo eliminar el movimiento.');
    }
  };

  const startMergeFromBank = (bank: BankMovement) => {
    setMergeSelection({ side: 'bank', bank });
    setActiveTab('extra');
  };

  const startMergeFromWallet = (tx: Transaction) => {
    setMergeSelection({ side: 'wallet', tx });
    setActiveTab('missing');
  };

  const cancelMerge = () => setMergeSelection(null);

  const handleManualMerge = async (bank: BankMovement, walletTx: Transaction) => {
    if (bank.type !== walletTx.type) {
      alerts.warning(
        'Tipos distintos',
        'Solo puedes fusionar movimientos del mismo tipo (ingreso con ingreso, o gasto con gasto).'
      );
      return;
    }

    const appLabel = walletTx.description || walletTx.category;
    const amountDiff = Math.abs(Math.round(bank.amount) - Math.round(walletTx.amount));
    const confirmed = await alerts.confirm(
      'Fusionar movimientos',
      `Se mantendrá el detalle de la App ("${appLabel}" · ${walletTx.category}) y el monto pasará a $${formatMoney(bank.amount)} del banco${amountDiff > 0 ? ` (diferencia de $${formatMoney(amountDiff)})` : ''}. ¿Continuar?`,
      'Sí, fusionar',
      'Cancelar'
    );

    if (!confirmed) return;

    try {
      // Force the pair in-session first so both leave pending lists immediately
      setManualLinks(prev => {
        const withoutConflicts = prev.filter(
          l => l.bankMovementId !== bank.id && l.walletTransactionId !== walletTx.id
        );
        return [
          ...withoutConflicts,
          { bankMovementId: bank.id, walletTransactionId: walletTx.id }
        ];
      });
      setMergeSelection(null);
      setActiveTab('matched');

      // Bank amount always wins; keep app description/category/date
      if (Math.round(walletTx.amount) !== Math.round(bank.amount)) {
        await editTransaction(walletTx.id, { amount: bank.amount });
      }

      alerts.success(
        'Movimiento conciliado',
        `Quedó fusionado con el monto del banco ($${formatMoney(bank.amount)}).`
      );
    } catch (err: any) {
      alerts.error('Error', err.message || 'No se pudo fusionar el movimiento.');
    }
  };

  const handlePickForMerge = async (bank: BankMovement, walletTx: Transaction) => {
    await handleManualMerge(bank, walletTx);
  };

  // Reset loaded statement
  const handleResetPdf = () => {
    setBankMovements([]);
    setFileName(null);
    setAccountInfo({});
    setManualLinks([]);
    setMergeSelection(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0',
        marginBottom: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--card-border)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
              title="Volver"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRightLeft size={20} color="var(--color-primary)" />
              Conciliación Bancaria
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              Compara tu extracto PDF vs CastorWallet
            </p>
          </div>
        </div>
      </div>

      {/* Month Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--card-bg)',
        padding: '12px 16px',
        borderRadius: '14px',
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
          title="Mes anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mes a Conciliar
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {getPeriodDisplayName()}
          </div>
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
          title="Mes siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* PDF Upload / Loaded Banner */}
      {bankMovements.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '2px dashed var(--card-border)',
            borderRadius: '16px',
            padding: '30px 20px',
            textAlign: 'center',
            cursor: isProcessing ? 'wait' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--card-shadow)'
          }}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--card-border)'; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'var(--card-border)';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          {isProcessing ? (
            <>
              <div className="spinner" style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(22, 52, 40, 0.15)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Procesando extracto PDF...
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                Extrayendo tabla de cargos, abonos y fechas del banco.
              </p>
            </>
          ) : (
            <>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px'
              }}>
                <UploadCloud size={28} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Cargar Extracto Bancario en PDF
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: 1.4 }}>
                  Toca aquí para seleccionar el PDF descargado de tu banco (ej: BancoEstado CuentaRUT, Cuenta Corriente, Santander, BCI, etc.).
                </p>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '20px',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 600
              }}>
                <FileText size={14} />
                Solo archivos .PDF • Procesamiento 100% privado en tu dispositivo
              </div>
            </>
          )}
        </div>
      ) : (
        /* Loaded PDF Info Box */
        <div style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: '14px',
          border: '1px solid var(--card-border)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: 'var(--card-shadow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {fileName || 'Extracto Bancario'}
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                {accountInfo.clientName && `${accountInfo.clientName} • `}
                {bankMovements.length} movimientos detectados
              </div>
            </div>
          </div>

          <button
            onClick={handleResetPdf}
            style={{
              background: 'none',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0
            }}
            title="Cargar otro archivo"
          >
            <RefreshCw size={12} />
            Cambiar
          </button>
        </div>
      )}

      {/* Summary KPI Cards & Reconciliation Dashboard */}
      {reconciliation && (
        <>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--card-border)',
            padding: '16px',
            boxShadow: 'var(--card-shadow)'
          }}>
            {/* Header: Reconciled Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              paddingBottom: '10px',
              borderBottom: '1px solid var(--card-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {reconciliation.summary.isFullyReconciled ? (
                  <CheckCircle2 size={20} color="var(--color-success)" />
                ) : (
                  <AlertTriangle size={20} color="var(--color-warning)" />
                )}
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {reconciliation.summary.isFullyReconciled
                    ? '¡Mes 100% Conciliado!'
                    : `${reconciliation.summary.missingCount} pendientes por conciliar`}
                </span>
              </div>

              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: reconciliation.summary.isFullyReconciled ? 'var(--color-success)' : 'var(--text-muted)'
              }}>
                {reconciliation.summary.matchedCount} de {bankMovements.length} conciliados
              </span>
            </div>

            {/* Comparison Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '14px'
            }}>
              {/* Banco Totals */}
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '10px 12px',
                border: '1px solid var(--card-border)'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                  EXTRACTO BANCO
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                  Egresos: -${formatMoney(reconciliation.summary.totalBankExpense)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 600, marginTop: '2px' }}>
                  Ingresos: +${formatMoney(reconciliation.summary.totalBankIncome)}
                </div>
              </div>

              {/* CastorWallet Totals */}
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '10px 12px',
                border: '1px solid var(--card-border)'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                  CASTOR WALLET
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                  Egresos: -${formatMoney(reconciliation.summary.totalWalletExpense)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 600, marginTop: '2px' }}>
                  Ingresos: +${formatMoney(reconciliation.summary.totalWalletIncome)}
                </div>
              </div>
            </div>

            {/* Quick Action Button: Add all missing */}
            {reconciliation.missingInWallet.length > 0 && (
              <button
                className="btn btn-primary"
                onClick={handleAddAllMissing}
                style={{
                  fontSize: '0.85rem',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  gap: '6px',
                  width: '100%'
                }}
              >
                <Plus size={16} />
                Agregar los {reconciliation.missingInWallet.length} faltantes a la billetera
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px'
          }}>
            <button
              onClick={() => setActiveTab('missing')}
              style={{
                flex: 1,
                minWidth: '110px',
                padding: '8px 10px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: activeTab === 'missing' ? 'var(--color-primary)' : 'var(--card-border)',
                backgroundColor: activeTab === 'missing' ? 'var(--color-primary)' : 'var(--card-bg)',
                color: activeTab === 'missing' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              Faltan en App
              <span style={{
                backgroundColor: activeTab === 'missing' ? 'rgba(255,255,255,0.25)' : 'var(--color-danger-bg)',
                color: activeTab === 'missing' ? '#ffffff' : 'var(--color-danger)',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.68rem',
                fontWeight: 700
              }}>
                {reconciliation.summary.missingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('extra')}
              style={{
                flex: 1,
                minWidth: '110px',
                padding: '8px 10px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: activeTab === 'extra' ? 'var(--color-primary)' : 'var(--card-border)',
                backgroundColor: activeTab === 'extra' ? 'var(--color-primary)' : 'var(--card-bg)',
                color: activeTab === 'extra' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              Solo en App
              <span style={{
                backgroundColor: activeTab === 'extra' ? 'rgba(255,255,255,0.25)' : 'var(--bg-tertiary)',
                color: activeTab === 'extra' ? '#ffffff' : 'var(--text-secondary)',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.68rem',
                fontWeight: 700
              }}>
                {reconciliation.summary.extraCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('matched')}
              style={{
                flex: 1,
                minWidth: '110px',
                padding: '8px 10px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: activeTab === 'matched' ? 'var(--color-primary)' : 'var(--card-border)',
                backgroundColor: activeTab === 'matched' ? 'var(--color-primary)' : 'var(--card-bg)',
                color: activeTab === 'matched' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              Conciliados
              <span style={{
                backgroundColor: activeTab === 'matched' ? 'rgba(255,255,255,0.25)' : 'var(--color-success-bg)',
                color: activeTab === 'matched' ? '#ffffff' : 'var(--color-success)',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.68rem',
                fontWeight: 700
              }}>
                {reconciliation.summary.matchedCount}
              </span>
            </button>
          </div>

          {/* Merge mode banner */}
          {mergeSelection && (
            <div style={{
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Link2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    Modo fusión activo
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.9, marginTop: '2px', lineHeight: 1.35 }}>
                    {mergeSelection.side === 'bank'
                      ? `Banco: "${mergeSelection.bank.description}" ($${formatMoney(mergeSelection.bank.amount)}). Elige el movimiento de la App para fusionar.`
                      : `App: "${mergeSelection.tx.description || mergeSelection.tx.category}" ($${formatMoney(mergeSelection.tx.amount)}). Elige el cargo del banco para fusionar.`}
                    {' '}Se mantiene el detalle de la App; el monto del banco manda.
                  </div>
                </div>
              </div>
              <button
                onClick={cancelMerge}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0
                }}
                title="Cancelar fusión"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* List of Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* MISSING IN WALLET */}
            {activeTab === 'missing' && (
              <>
                {reconciliation.missingInWallet.length === 0 ? (
                  <div style={{
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: '16px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    border: '1px solid var(--card-border)'
                  }}>
                    <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      ¡Ningún movimiento pendiente!
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Todos los movimientos del extracto bancario se encuentran registrados en CastorWallet.
                    </p>
                  </div>
                ) : (
                  reconciliation.missingInWallet.map(item => {
                    const movement = item.bankMovement;
                    const chosenCategory = selectedCategories[movement.id] || item.suggestedCategory;
                    const dateFormatted = movement.date.toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short'
                    });
                    const isMergeTarget =
                      mergeSelection?.side === 'wallet' &&
                      mergeSelection.tx.type === movement.type;
                    const isMergeSource =
                      mergeSelection?.side === 'bank' &&
                      mergeSelection.bank.id === movement.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (mergeSelection?.side === 'wallet') {
                            if (mergeSelection.tx.type !== movement.type) {
                              alerts.warning(
                                'Tipos distintos',
                                'Solo puedes fusionar movimientos del mismo tipo.'
                              );
                              return;
                            }
                            handlePickForMerge(movement, mergeSelection.tx);
                          }
                        }}
                        style={{
                          backgroundColor: isMergeSource || isMergeTarget
                            ? 'var(--color-success-bg)'
                            : 'var(--card-bg)',
                          borderRadius: '14px',
                          border: isMergeTarget
                            ? '2px solid var(--color-primary)'
                            : '1px solid var(--card-border)',
                          padding: '14px',
                          boxShadow: 'var(--card-shadow)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          cursor: mergeSelection?.side === 'wallet' ? 'pointer' : 'default',
                          transition: 'border-color 0.15s ease, background-color 0.15s ease'
                        }}
                      >
                        {/* Top Row: Info and Amount */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: movement.type === 'income' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                              color: movement.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px'
                            }}>
                              {movement.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            </div>

                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                {movement.description}
                              </div>
                              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {dateFormatted} {movement.operationNumber && `• Op: ${movement.operationNumber}`}
                                {isMergeTarget && (
                                  <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                                    {' '}• Toca para fusionar
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: movement.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)',
                            textAlign: 'right',
                            flexShrink: 0
                          }}>
                            {movement.type === 'income' ? '+' : '-'}${formatMoney(movement.amount)}
                          </div>
                        </div>

                        {/* Bottom Row: Category Selector & Actions */}
                        {!mergeSelection && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            borderTop: '1px solid var(--bg-tertiary)',
                            paddingTop: '8px'
                          }}>
                            {/* Category select */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                              <Sparkles size={14} color="var(--color-primary)" />
                              <select
                                value={chosenCategory}
                                onChange={(e) => {
                                  setSelectedCategories({
                                    ...selectedCategories,
                                    [movement.id]: e.target.value
                                  });
                                }}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--card-border)',
                                  backgroundColor: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.78rem',
                                  fontWeight: 500,
                                  outline: 'none'
                                }}
                              >
                                {categories
                                  .filter(c => c.type === movement.type && c.active)
                                  .map(c => (
                                    <option key={c.name} value={c.name}>
                                      {c.name}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <button
                              onClick={() => startMergeFromBank(movement)}
                              style={{
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--color-primary)',
                                border: '1px solid var(--card-border)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0
                              }}
                              title="Fusionar con un movimiento de la App"
                            >
                              <Link2 size={14} />
                              Fusionar
                            </button>

                            {/* Quick Add Button */}
                            <button
                              onClick={() => handleAddSingleMissing(movement, item.suggestedCategory)}
                              style={{
                                backgroundColor: 'var(--color-primary)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0
                              }}
                            >
                              <Plus size={14} />
                              Agregar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* EXTRA IN WALLET (NOT IN BANK) */}
            {activeTab === 'extra' && (
              <>
                {reconciliation.extraInWallet.length === 0 ? (
                  <div style={{
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: '16px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    border: '1px solid var(--card-border)'
                  }}>
                    <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      ¡Sin movimientos sobrantes!
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Todos tus movimientos registrados en CastorWallet coinciden con el extracto bancario.
                    </p>
                  </div>
                ) : (
                  reconciliation.extraInWallet.map(item => {
                    const tx = item.walletTransaction;
                    const dateFormatted = new Date(tx.date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short'
                    });
                    const isMergeTarget =
                      mergeSelection?.side === 'bank' &&
                      mergeSelection.bank.type === tx.type;
                    const isMergeSource =
                      mergeSelection?.side === 'wallet' &&
                      mergeSelection.tx.id === tx.id;
                    const amountDiff =
                      mergeSelection?.side === 'bank'
                        ? Math.abs(Math.round(mergeSelection.bank.amount) - Math.round(tx.amount))
                        : null;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (mergeSelection?.side === 'bank') {
                            if (mergeSelection.bank.type !== tx.type) {
                              alerts.warning(
                                'Tipos distintos',
                                'Solo puedes fusionar movimientos del mismo tipo.'
                              );
                              return;
                            }
                            handlePickForMerge(mergeSelection.bank, tx);
                          }
                        }}
                        style={{
                          backgroundColor: isMergeSource || isMergeTarget
                            ? 'var(--color-success-bg)'
                            : 'var(--card-bg)',
                          borderRadius: '14px',
                          border: isMergeTarget
                            ? '2px solid var(--color-primary)'
                            : '1px solid var(--card-border)',
                          padding: '14px',
                          boxShadow: 'var(--card-shadow)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          cursor: mergeSelection?.side === 'bank' ? 'pointer' : 'default',
                          transition: 'border-color 0.15s ease, background-color 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {tx.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {tx.description || tx.category}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {dateFormatted} • {tx.category} • <span style={{ color: 'var(--color-warning)' }}>Solo en App</span>
                              {isMergeTarget && (
                                <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                                  {' '}• Toca para fusionar
                                  {amountDiff !== null && amountDiff > 0
                                    ? ` (dif. $${formatMoney(amountDiff)})`
                                    : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <div style={{
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            color: tx.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)',
                            textAlign: 'right'
                          }}>
                            {tx.type === 'income' ? '+' : '-'}${formatMoney(tx.amount)}
                          </div>

                          {!mergeSelection && (
                            <>
                              <button
                                onClick={() => startMergeFromWallet(tx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-primary)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Fusionar con un cargo del banco"
                              >
                                <Link2 size={16} />
                              </button>

                              {onEditTransaction && (
                                <button
                                  onClick={() => onEditTransaction(tx)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteExtra(tx)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-danger)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Eliminar de CastorWallet"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* MATCHED PAIRS */}
            {activeTab === 'matched' && (
              <>
                {reconciliation.matchedPairs.length === 0 ? (
                  <div style={{
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: '16px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    border: '1px solid var(--card-border)'
                  }}>
                    <HelpCircle size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      Aún no hay movimientos conciliados
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Revisa los movimientos faltantes para agregarlos a tu billetera.
                    </p>
                  </div>
                ) : (
                  reconciliation.matchedPairs.map(match => {
                    const bank = match.bankMovement;
                    const wallet = match.walletTransaction;
                    const dateFormatted = bank.date.toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short'
                    });
                    const isManual = match.matchSource === 'manual';

                    return (
                      <div
                        key={match.id}
                        style={{
                          backgroundColor: 'var(--card-bg)',
                          borderRadius: '14px',
                          border: '1px solid var(--card-border)',
                          padding: '12px 14px',
                          boxShadow: 'var(--card-shadow)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--color-success-bg)',
                            color: 'var(--color-success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isManual ? <Link2 size={16} /> : <CheckCircle2 size={16} />}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {wallet.description || bank.description}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {dateFormatted} • {wallet.category}
                              {isManual && (
                                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                                  {' '}• Fusionado
                                </span>
                              )}
                              {!isManual && wallet.description && ` (${bank.description})`}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: bank.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)'
                          }}>
                            {bank.type === 'income' ? '+' : '-'}${formatMoney(bank.amount)}
                          </div>
                          <div style={{
                            fontSize: '0.65rem',
                            color: 'var(--color-success)',
                            fontWeight: 600,
                            marginTop: '2px'
                          }}>
                            {isManual
                              ? 'Monto banco'
                              : match.dateDiffDays === 0
                                ? 'Misma fecha'
                                : `±${match.dateDiffDays}d`}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
