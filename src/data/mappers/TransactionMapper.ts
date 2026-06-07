import type { Transaction } from '@domain/entities/Transaction';

export class TransactionMapper {
  static toDomain(raw: any): Transaction {
    return {
      id: raw.id,
      userId: raw.user_id,
      amount: parseFloat(raw.amount),
      type: raw.type,
      description: raw.description || '',
      category: raw.category || 'Varios',
      date: new Date(raw.date),
      createdAt: new Date(raw.created_at),
    };
  }

  static toPersistence(domain: Omit<Transaction, 'id' | 'createdAt'>) {
    return {
      user_id: domain.userId,
      amount: domain.amount,
      type: domain.type,
      description: domain.description,
      category: domain.category,
      date: domain.date.toISOString().split('T')[0], // yyyy-mm-dd
    };
  }
}
