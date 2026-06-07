import type { Transaction } from '../entities/Transaction';

export interface TransactionRepository {
  getAllByUserId(userId: string): Promise<Transaction[]>;
  create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  delete(id: string): Promise<void>;
}
