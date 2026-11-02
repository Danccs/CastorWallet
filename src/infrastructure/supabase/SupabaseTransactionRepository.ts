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

  async getAllInDateRange(userId: string, startDate: string, endDate: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions in range:', error);
      throw new Error(error.message);
    }

    return (data || []).map(TransactionMapper.toDomain);
  }

  async getNetBalanceBefore(userId: string, beforeDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .lt('date', beforeDate);

    if (error) {
      console.error('Error fetching net balance before date:', error);
      throw new Error(error.message);
    }

    return (data || []).reduce((sum, row) => {
      const amount = parseFloat(row.amount);
      return row.type === 'income' ? sum + amount : sum - amount;
    }, 0);
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

  async createBatch(transactions: Omit<Transaction, 'id' | 'createdAt'>[]): Promise<Transaction[]> {
    if (transactions.length === 0) return [];
    const raws = transactions.map(TransactionMapper.toPersistence);
    const { data, error } = await supabase
      .from('transactions')
      .insert(raws)
      .select();

    if (error) {
      console.error('Error creating batch transactions:', error);
      throw new Error(error.message);
    }

    return (data || []).map(TransactionMapper.toDomain);
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
