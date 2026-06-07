export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  spent: number;
  period: string; // e.g., 'YYYY-MM'
  createdAt: Date;
}
