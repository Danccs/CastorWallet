import { supabase } from './client';
import type { BudgetRepository } from '@domain/repositories/BudgetRepository';
import type { Budget } from '@domain/entities/Budget';
import { BudgetMapper } from '@data/mappers/BudgetMapper';

export class SupabaseBudgetRepository implements BudgetRepository {
  async getAllByUserId(userId: string, period: string): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period);

    if (error) {
      console.error('Error fetching budgets:', error);
      throw new Error(error.message);
    }

    return (data || []).map(BudgetMapper.toDomain);
  }

  async getAllForPeriods(userId: string, periods: string[]): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .in('period', periods);

    if (error) {
      console.error('Error fetching budgets for multiple periods:', error);
      throw new Error(error.message);
    }

    return (data || []).map(BudgetMapper.toDomain);
  }

  async create(budget: Omit<Budget, 'id' | 'createdAt' | 'spent'>): Promise<Budget> {
    const raw = BudgetMapper.toPersistence(budget);
    const { data, error } = await supabase
      .from('budgets')
      .insert([raw])
      .select()
      .single();

    if (error) {
      console.error('Error creating budget:', error);
      throw new Error(error.message);
    }

    return BudgetMapper.toDomain(data);
  }

  async updateAmount(id: string, amount: number): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .update({ amount })
      .eq('id', id);

    if (error) {
      console.error('Error updating budget amount:', error);
      throw new Error(error.message);
    }
  }

  async updateSpent(id: string, spent: number): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .update({ spent })
      .eq('id', id);

    if (error) {
      console.error('Error updating budget spent:', error);
      throw new Error(error.message);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting budget:', error);
      throw new Error(error.message);
    }
  }
}
