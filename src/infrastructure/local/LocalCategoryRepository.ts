import type { Category } from '@domain/entities/Category';
import type { CategoryRepository } from '@domain/repositories/CategoryRepository';

const DEFAULT_CATEGORIES: Category[] = [
  // Egresos (Expenses)
  { name: 'Arriendo', type: 'expense', active: true },
  { name: 'Gastos Comunes', type: 'expense', active: true },
  { name: 'Supermercado', type: 'expense', active: true },
  { name: 'Alimentación', type: 'expense', active: true },
  { name: 'Internet Hogar', type: 'expense', active: true },
  { name: 'Plan Celular', type: 'expense', active: true },
  { name: 'Suscripciones Streaming', type: 'expense', active: true },
  { name: 'Suscripciones Web', type: 'expense', active: true },
  { name: 'Medicamentos', type: 'expense', active: true },
  { name: 'Seguro Médico', type: 'expense', active: true },
  { name: 'Consultas Medicas', type: 'expense', active: true },
  { name: 'Examenes laboratorios', type: 'expense', active: true },
  { name: 'Lavanderia', type: 'expense', active: true },
  { name: 'Luz', type: 'expense', active: true },
  { name: 'Agua', type: 'expense', active: true },
  { name: 'Gas', type: 'expense', active: true },
  { name: 'Taxis (Uber)', type: 'expense', active: true },
  { name: 'Cine/Entretenimiendos', type: 'expense', active: true },
  { name: 'Regalos', type: 'expense', active: true },
  { name: 'Otros', type: 'expense', active: true },
  { name: 'Café/Snacks', type: 'expense', active: true },
  { name: 'Transporte Publico', type: 'expense', active: true },
  { name: 'Gasolina', type: 'expense', active: true },
  { name: 'Estacionamientos', type: 'expense', active: true },
  
  // Ingresos (Income)
  { name: 'Sueldo', type: 'income', active: true },
  { name: 'Prestamos', type: 'income', active: true },
  { name: 'Ganancias', type: 'income', active: true },
  { name: 'Otros', type: 'income', active: true },
];

export class LocalCategoryRepository implements CategoryRepository {
  async getAll(userId: string): Promise<Category[]> {
    const key = `castor_wallet_categories_${userId}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      await this.saveAll(userId, DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing categories from local storage:', e);
      return DEFAULT_CATEGORIES;
    }
  }

  async saveAll(userId: string, categories: Category[]): Promise<void> {
    const key = `castor_wallet_categories_${userId}`;
    localStorage.setItem(key, JSON.stringify(categories));
  }
}
