import type { Category } from '../entities/Category';
import type { BankMovementType } from '../entities/BankMovement';

interface CategoryRule {
  keywords: string[];
  categoryName: string;
}

const EXPENSE_RULES: CategoryRule[] = [
  {
    keywords: ['uber eats', 'pedidosya', 'rappi', 'restaurant', 'lapizzano', 'arepas', 'picando', 'pizza', 'comida', 'sol y pesos'],
    categoryName: 'Alimentación'
  },
  {
    keywords: ['uber trip', 'didi', 'cabify', 'taxi', 'beat'],
    categoryName: 'Taxis (Uber)'
  },
  {
    keywords: ['uber'], // Fallback if no eats/trip
    categoryName: 'Taxis (Uber)'
  },
  {
    keywords: ['spid', 'lider', 'jumbo', 'santa isabel', 'tottus', 'unimarc', 'supermercado'],
    categoryName: 'Supermercado'
  },
  {
    keywords: ['entel pcs', 'wom', 'claro', 'movistar', 'celular', 'plan movil'],
    categoryName: 'Plan Celular'
  },
  {
    keywords: ['entel s.a.', 'vtr', 'mundo pacifico', 'gtd', 'internet', 'fibra'],
    categoryName: 'Internet Hogar'
  },
  {
    keywords: ['enel', 'cge', 'chilquinta', 'luz', 'electricidad'],
    categoryName: 'Luz'
  },
  {
    keywords: ['aguas andinas', 'essbio', 'esval', 'agua'],
    categoryName: 'Agua'
  },
  {
    keywords: ['metrogas', 'gasco', 'lipigas', 'abastible', 'gas'],
    categoryName: 'Gas'
  },
  {
    keywords: ['openai', 'chatgpt', 'cursor', 'ai powere', 'github', 'aws', 'vercel', 'digitalocean', 'domain'],
    categoryName: 'Suscripciones Web'
  },
  {
    keywords: ['youtube', 'google play youtu', 'netflix', 'spotify', 'disney', 'prime video', 'max', 'hbo', 'crunchyroll', 'streaming'],
    categoryName: 'Suscripciones Streaming'
  },
  {
    keywords: ['salcobrand', 'cruz verde', 'ahumada', 'farmacia', 'medicamento', 'droga'],
    categoryName: 'Medicamentos'
  },
  {
    keywords: ['cinepolis', 'cinemark', 'cine', 'cineplanet', 'teatro'],
    categoryName: 'Cine/Entretenimiendos'
  },
  {
    keywords: ['gasolina', 'copec', 'shell', 'petrobras'],
    categoryName: 'Gasolina'
  },
  {
    keywords: ['metro', 'bip', 'red movilidad', 'transantiago'],
    categoryName: 'Transporte Publico'
  },
  {
    keywords: ['estacionamiento', 'parking', 'saba'],
    categoryName: 'Estacionamientos'
  },
  {
    keywords: ['starbucks', 'cafe', 'juan valdez', 'dunkin'],
    categoryName: 'Café/Snacks'
  },
  {
    keywords: ['comision', 'mantencion', 'cargo'],
    categoryName: 'Otros'
  }
];

const INCOME_RULES: CategoryRule[] = [
  {
    keywords: ['sueldo', 'remuneracion', 'abono convenio', 'nomina', 'honorarios', 'salario'],
    categoryName: 'Sueldo'
  },
  {
    keywords: ['prestamo', 'credito'],
    categoryName: 'Prestamos'
  },
  {
    keywords: ['dividendo', 'interes', 'ganancia', 'rendimiento', 'deposito a plazo'],
    categoryName: 'Ganancias'
  }
];

export class CategoryGuesser {
  static guessCategory(
    description: string,
    type: BankMovementType,
    availableCategories: Category[]
  ): string {
    const descLower = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const rules = type === 'income' ? INCOME_RULES : EXPENSE_RULES;

    for (const rule of rules) {
      const match = rule.keywords.some(kw => descLower.includes(kw));
      if (match) {
        // Verify this category exists in availableCategories
        const existing = availableCategories.find(
          c => c.type === type && c.active && c.name.toLowerCase() === rule.categoryName.toLowerCase()
        );
        if (existing) {
          return existing.name;
        }
      }
    }

    // Default to 'Otros' or first available category of matching type
    const fallbackCategory = availableCategories.find(
      c => c.type === type && c.active && c.name.toLowerCase() === 'otros'
    );
    if (fallbackCategory) {
      return fallbackCategory.name;
    }

    const firstActive = availableCategories.find(c => c.type === type && c.active);
    return firstActive ? firstActive.name : 'Otros';
  }
}
