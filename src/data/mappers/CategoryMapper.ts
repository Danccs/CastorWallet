import type { Category } from '@domain/entities/Category';

export class CategoryMapper {
  static toDomain(raw: any): Category {
    return {
      name: raw.name,
      type: raw.type as 'income' | 'expense',
      active: raw.active,
      defaultBudget: parseFloat(raw.default_budget || 0),
    };
  }

  static toPersistence(domain: Category, userId: string) {
    return {
      user_id: userId,
      name: domain.name,
      type: domain.type,
      active: domain.active,
      default_budget: domain.defaultBudget,
    };
  }
}
