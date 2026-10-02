import type { BankMovement } from '../entities/BankMovement';
import type { Transaction } from '../entities/Transaction';
import type { Category } from '../entities/Category';
import type {
  ReconciliationResult,
  MatchedPair,
  MissingInWalletItem,
  ExtraInWalletItem,
  ReconciliationSummary,
  ManualReconciliationLink
} from '../entities/Reconciliation';
import { CategoryGuesser } from './CategoryGuesser';

export class ReconciliationEngine {
  /**
   * Reconciles bank movements against CastorWallet transactions for a given period.
   * Primary criteria: Amount and Type.
   * Secondary criteria: Date proximity.
   * Manual links are applied first and always win over auto-matching.
   */
  static reconcile(
    bankMovements: BankMovement[],
    walletTransactions: Transaction[],
    period: string,
    availableCategories: Category[] = [],
    manualLinks: ManualReconciliationLink[] = []
  ): ReconciliationResult {
    // Filter wallet transactions to the period (in case caller passed all)
    const [periodYear, periodMonth] = period.split('-').map(Number);
    const targetTransactions = walletTransactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getUTCFullYear() === periodYear && (d.getUTCMonth() + 1) === periodMonth;
    });

    const usedWalletTxIds = new Set<string>();
    const usedBankMovementIds = new Set<string>();
    const matchedPairs: MatchedPair[] = [];

    const bankById = new Map(bankMovements.map(b => [b.id, b]));
    const txById = new Map(targetTransactions.map(t => [t.id, t]));

    // Apply manual merges first (bank amount may already be synced on the wallet tx)
    for (const link of manualLinks) {
      const bank = bankById.get(link.bankMovementId);
      const tx = txById.get(link.walletTransactionId);
      if (!bank || !tx) continue;
      if (usedBankMovementIds.has(bank.id) || usedWalletTxIds.has(tx.id)) continue;

      const bankTime = bank.date.getTime();
      const txTime = new Date(tx.date).getTime();
      const diffDays = Math.round(Math.abs(bankTime - txTime) / (1000 * 60 * 60 * 24));

      usedBankMovementIds.add(bank.id);
      usedWalletTxIds.add(tx.id);

      matchedPairs.push({
        id: `match-${bank.id}-${tx.id}`,
        status: 'matched',
        bankMovement: bank,
        walletTransaction: tx,
        matchScore: 100,
        dateDiffDays: diffDays,
        matchSource: 'manual'
      });
    }

    interface CandidateMatch {
      bankMovement: BankMovement;
      walletTransaction: Transaction;
      dateDiffDays: number;
      score: number;
    }

    const candidateMatches: CandidateMatch[] = [];

    // Find all possible candidate matches by amount and type
    for (const bank of bankMovements) {
      if (usedBankMovementIds.has(bank.id)) continue;
      for (const tx of targetTransactions) {
        if (usedWalletTxIds.has(tx.id)) continue;
        if (bank.type === tx.type && Math.round(bank.amount) === Math.round(tx.amount)) {
          const bankTime = bank.date.getTime();
          const txTime = new Date(tx.date).getTime();
          const diffDays = Math.round(Math.abs(bankTime - txTime) / (1000 * 60 * 60 * 24));

          let score = 50;
          if (diffDays === 0) score = 100;
          else if (diffDays <= 1) score = 90;
          else if (diffDays <= 3) score = 80;
          else if (diffDays <= 7) score = 70;

          candidateMatches.push({
            bankMovement: bank,
            walletTransaction: tx,
            dateDiffDays: diffDays,
            score
          });
        }
      }
    }

    // Sort candidates by score descending (highest confidence first), then smallest date difference
    candidateMatches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.dateDiffDays - b.dateDiffDays;
    });

    // Greedily pair 1-to-1
    for (const cand of candidateMatches) {
      if (
        !usedBankMovementIds.has(cand.bankMovement.id) &&
        !usedWalletTxIds.has(cand.walletTransaction.id)
      ) {
        usedBankMovementIds.add(cand.bankMovement.id);
        usedWalletTxIds.add(cand.walletTransaction.id);

        matchedPairs.push({
          id: `match-${cand.bankMovement.id}-${cand.walletTransaction.id}`,
          status: 'matched',
          bankMovement: cand.bankMovement,
          walletTransaction: cand.walletTransaction,
          matchScore: cand.score,
          dateDiffDays: cand.dateDiffDays,
          matchSource: 'auto'
        });
      }
    }

    // Sort matched pairs descending by bank movement date
    matchedPairs.sort((a, b) => b.bankMovement.date.getTime() - a.bankMovement.date.getTime());

    // Movements in bank but missing in wallet
    const missingInWallet: MissingInWalletItem[] = [];
    for (const bank of bankMovements) {
      if (!usedBankMovementIds.has(bank.id)) {
        const suggested = CategoryGuesser.guessCategory(
          bank.description,
          bank.type,
          availableCategories
        );
        missingInWallet.push({
          id: `missing-${bank.id}`,
          status: 'missing_in_wallet',
          bankMovement: bank,
          suggestedCategory: suggested
        });
      }
    }
    missingInWallet.sort((a, b) => b.bankMovement.date.getTime() - a.bankMovement.date.getTime());

    // Transactions in wallet but not in bank
    const extraInWallet: ExtraInWalletItem[] = [];
    for (const tx of targetTransactions) {
      if (!usedWalletTxIds.has(tx.id)) {
        extraInWallet.push({
          id: `extra-${tx.id}`,
          status: 'extra_in_wallet',
          walletTransaction: tx
        });
      }
    }
    extraInWallet.sort((a, b) => new Date(b.walletTransaction.date).getTime() - new Date(a.walletTransaction.date).getTime());

    // Financial calculations
    const totalBankIncome = bankMovements
      .filter(m => m.type === 'income')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalBankExpense = bankMovements
      .filter(m => m.type === 'expense')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalWalletIncome = targetTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWalletExpense = targetTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const summary: ReconciliationSummary = {
      period,
      totalBankIncome,
      totalBankExpense,
      totalBankNet: totalBankIncome - totalBankExpense,
      totalWalletIncome,
      totalWalletExpense,
      totalWalletNet: totalWalletIncome - totalWalletExpense,
      matchedCount: matchedPairs.length,
      missingCount: missingInWallet.length,
      extraCount: extraInWallet.length,
      isFullyReconciled: missingInWallet.length === 0 && extraInWallet.length === 0
    };

    return {
      summary,
      matchedPairs,
      missingInWallet,
      extraInWallet
    };
  }
}
