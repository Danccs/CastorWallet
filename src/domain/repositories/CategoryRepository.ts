import type { Category } from '../entities/Category';

export interface CategoryRepository {
  getAll(userId: string): Promise<Category[]>;
  create(userId: string, category: Category): Promise<Category>;
  update(userId: string, name: string, type: 'income' | 'expense', updates: Partial<Category>): Promise<void>;
}
