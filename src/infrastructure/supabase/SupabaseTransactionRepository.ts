import { supabase } from './client';
import type { TransactionRepository } from '@domain/repositories/TransactionRepository';
import type { Transaction } from '@domain/entities/Transaction';
import { TransactionMapper } from '@data/mappers/TransactionMapper';

export class SupabaseTransactionRepository implements TransactionRepository {
  async getAllByUserId(userId: string, period?: string): Promise<Transaction[]> {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (period) {
      const [year, month] = period.split('-').map(Number);
      const startDate = `${period}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${period}-${String(lastDay).padStart(2, '0')}`;

      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(error.message);
    }

    return (data || []).map(TransactionMapper.toDomain);
  }

  async create(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const raw = TransactionMapper.toPersistence(transaction);
    const { data, error } = await supabase
      .from('transactions')
      .insert([raw])
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      throw new Error(error.message);
    }

    return TransactionMapper.toDomain(data);
  }

  async update(
    id: string,
    transaction: Partial<Omit<Transaction, 'id' | 'createdAt' | 'userId'>>
  ): Promise<Transaction> {
    const raw: any = {};
    if (transaction.amount !== undefined) raw.amount = transaction.amount;
    if (transaction.type !== undefined) raw.type = transaction.type;
    if (transaction.description !== undefined) raw.description = transaction.description;
    if (transaction.category !== undefined) raw.category = transaction.category;
    if (transaction.date !== undefined) {
      const d = new Date(transaction.date);
      raw.date = d.toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(raw)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      throw new Error(error.message);
    }

    return TransactionMapper.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      throw new Error(error.message);
    }
  }
}
