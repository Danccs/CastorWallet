import type { Transaction } from '../entities/Transaction';

export interface TransactionRepository {
  getAllByUserId(userId: string, period?: string): Promise<Transaction[]>;
  getAllInDateRange(userId: string, startDate: string, endDate: string): Promise<Transaction[]>;
  /** Net balance (income − expense) for all transactions with date strictly before beforeDate (YYYY-MM-DD). */
  getNetBalanceBefore(userId: string, beforeDate: string): Promise<number>;
  create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  createBatch?(transactions: Omit<Transaction, 'id' | 'createdAt'>[]): Promise<Transaction[]>;
  update(id: string, transaction: Partial<Omit<Transaction, 'id' | 'createdAt' | 'userId'>>): Promise<Transaction>;
  delete(id: string): Promise<void>;
}
