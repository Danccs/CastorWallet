export interface Category {
  name: string;
  type: 'income' | 'expense';
  active: boolean;
  defaultBudget: number;
}
