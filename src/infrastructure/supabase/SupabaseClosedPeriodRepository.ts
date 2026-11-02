import { supabase } from './client';
import type { ClosedPeriodRepository } from '@domain/repositories/ClosedPeriodRepository';
import type { ClosedPeriod } from '@domain/entities/ClosedPeriod';
import { ClosedPeriodMapper } from '@data/mappers/ClosedPeriodMapper';

export class SupabaseClosedPeriodRepository implements ClosedPeriodRepository {
  async getAllByUserId(userId: string): Promise<ClosedPeriod[]> {
    const { data, error } = await supabase
      .from('closed_periods')
      .select('*')
      .eq('user_id', userId)
      .order('period', { ascending: false });

    if (error) {
      console.error('Error fetching closed periods:', error);
      throw new Error(error.message);
    }

    return (data || []).map(ClosedPeriodMapper.toDomain);
  }

  async close(userId: string, period: string): Promise<ClosedPeriod> {
    const raw = ClosedPeriodMapper.toPersistence(userId, period);
    const { data, error } = await supabase
      .from('closed_periods')
      .upsert([raw], { onConflict: 'user_id,period' })
      .select()
      .single();

    if (error) {
      console.error('Error closing period:', error);
      throw new Error(error.message);
    }

    return ClosedPeriodMapper.toDomain(data);
  }

  async reopen(userId: string, period: string): Promise<void> {
    const { error } = await supabase
      .from('closed_periods')
      .delete()
      .eq('user_id', userId)
      .eq('period', period);

    if (error) {
      console.error('Error reopening period:', error);
      throw new Error(error.message);
    }
  }
}
