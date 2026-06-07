import type { Budget } from '@domain/entities/Budget';

export class BudgetMapper {
  static toDomain(raw: any): Budget {
    return {
      id: raw.id,
      userId: raw.user_id,
      category: raw.category,
      amount: parseFloat(raw.amount),
      spent: parseFloat(raw.spent || 0),
      period: raw.period,
      createdAt: new Date(raw.created_at),
    };
  }

  static toPersistence(domain: Omit<Budget, 'id' | 'createdAt' | 'spent'>) {
    return {
      user_id: domain.userId,
      category: domain.category,
      amount: domain.amount,
      period: domain.period,
    };
  }
}
