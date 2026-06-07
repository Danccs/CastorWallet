import type { Budget } from '../entities/Budget';

export interface BudgetRepository {
  getAllByUserId(userId: string, period: string): Promise<Budget[]>;
  getAllForPeriods(userId: string, periods: string[]): Promise<Budget[]>;
  create(budget: Omit<Budget, 'id' | 'createdAt' | 'spent'>): Promise<Budget>;
  updateAmount(id: string, amount: number): Promise<void>;
  updateSpent(id: string, spent: number): Promise<void>;
  delete(id: string): Promise<void>;
}
