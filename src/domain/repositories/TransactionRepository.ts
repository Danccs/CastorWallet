import type { Transaction } from '../entities/Transaction';

export interface TransactionRepository {
  getAllByUserId(userId: string, period?: string): Promise<Transaction[]>;
  create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  update(id: string, transaction: Partial<Omit<Transaction, 'id' | 'createdAt' | 'userId'>>): Promise<Transaction>;
  delete(id: string): Promise<void>;
}
