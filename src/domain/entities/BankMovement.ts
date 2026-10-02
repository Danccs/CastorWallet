export type BankMovementType = 'income' | 'expense';

export interface BankMovement {
  id: string;
  date: Date;
  dateStr: string; // YYYY-MM-DD
  operationNumber?: string;
  description: string;
  amount: number; // Monto absoluto positivo
  type: BankMovementType;
  balance?: number;
  rawText?: string;
}
