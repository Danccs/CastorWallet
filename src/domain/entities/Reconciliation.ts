import type { BankMovement } from './BankMovement';
import type { Transaction } from './Transaction';

export type ReconciliationStatus = 'matched' | 'missing_in_wallet' | 'extra_in_wallet';

export type MatchSource = 'auto' | 'manual';

export interface ManualReconciliationLink {
  bankMovementId: string;
  walletTransactionId: string;
}

export interface MatchedPair {
  id: string;
  status: 'matched';
  bankMovement: BankMovement;
  walletTransaction: Transaction;
  matchScore: number; // 100 for exact date, lower for date variance
  dateDiffDays: number;
  matchSource?: MatchSource;
}

export interface MissingInWalletItem {
  id: string;
  status: 'missing_in_wallet';
  bankMovement: BankMovement;
  suggestedCategory: string;
}

export interface ExtraInWalletItem {
  id: string;
  status: 'extra_in_wallet';
  walletTransaction: Transaction;
}

export type ReconciliationItem = MatchedPair | MissingInWalletItem | ExtraInWalletItem;

export interface ReconciliationSummary {
  period: string; // YYYY-MM
  totalBankIncome: number;
  totalBankExpense: number;
  totalBankNet: number;
  totalWalletIncome: number;
  totalWalletExpense: number;
  totalWalletNet: number;
  matchedCount: number;
  missingCount: number;
  extraCount: number;
  isFullyReconciled: boolean;
}

export interface ReconciliationResult {
  summary: ReconciliationSummary;
  matchedPairs: MatchedPair[];
  missingInWallet: MissingInWalletItem[];
  extraInWallet: ExtraInWalletItem[];
}
