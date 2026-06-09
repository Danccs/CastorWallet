import { supabase } from './client';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';
import type { Category } from '@domain/entities/Category';
import { CategoryMapper } from '@data/mappers/CategoryMapper';

export class SupabaseCategoryRepository implements CategoryRepository {
  async getAll(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories from Supabase:', error);
      throw new Error(error.message);
    }

    return (data || []).map(CategoryMapper.toDomain);
  }

  async create(userId: string, category: Category): Promise<Category> {
    const raw = CategoryMapper.toPersistence(category, userId);
    const { data, error } = await supabase
      .from('categories')
      .insert([raw])
      .select()
      .single();

    if (error) {
      console.error('Error creating category in Supabase:', error);
      throw new Error(error.message);
    }

    return CategoryMapper.toDomain(data);
  }

  async update(
    userId: string,
    name: string,
    type: 'income' | 'expense',
    updates: Partial<Category>
  ): Promise<void> {
    const raw: any = {};
    if (updates.name !== undefined) raw.name = updates.name;
    if (updates.active !== undefined) raw.active = updates.active;
    if (updates.defaultBudget !== undefined) raw.default_budget = updates.defaultBudget;

    const { error } = await supabase
      .from('categories')
      .update(raw)
      .eq('user_id', userId)
      .eq('name', name)
      .eq('type', type);

    if (error) {
      console.error('Error updating category in Supabase:', error);
      throw new Error(error.message);
    }
  }

  async delete(userId: string, name: string, type: 'income' | 'expense'): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('user_id', userId)
      .eq('name', name)
      .eq('type', type);

    if (error) {
      console.error('Error deleting category in Supabase:', error);
      throw new Error(error.message);
    }
  }
}
