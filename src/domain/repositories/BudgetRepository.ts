import type { Budget } from '../entities/Budget';

export interface BudgetRepository {
  getAllByUserId(userId: string, period: string): Promise<Budget[]>;
  create(budget: Omit<Budget, 'id' | 'createdAt' | 'spent'>): Promise<Budget>;
  updateSpent(id: string, spent: number): Promise<void>;
  delete(id: string): Promise<void>;
}
