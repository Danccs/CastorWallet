import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import type { Transaction } from '@domain/entities/Transaction';
import type { Budget } from '@domain/entities/Budget';
import type { Category } from '@domain/entities/Category';
import { SupabaseTransactionRepository } from '@infrastructure/supabase/SupabaseTransactionRepository';
import { SupabaseBudgetRepository } from '@infrastructure/supabase/SupabaseBudgetRepository';
import { SupabaseCategoryRepository } from '@infrastructure/supabase/SupabaseCategoryRepository';
import { SupabaseClosedPeriodRepository } from '@infrastructure/supabase/SupabaseClosedPeriodRepository';
import { supabase } from '@infrastructure/supabase/client';
import {
  CLOSED_PERIOD_ERROR,
  periodStartDate,
  toPeriodKey,
} from '@domain/services/MonthlyBalance';

interface AppContextType {
  currentPeriod: string; // YYYY-MM
  setCurrentPeriod: (period: string) => void;
  budgetStartPeriod: string; // NUEVO
  setBudgetStartPeriod: (period: string) => void; // NUEVO
  transactions: Transaction[];
  budgets: Budget[];
  sixMonthBudgets: Budget[]; // NUEVO
  categories: Category[];
  loading: boolean;
  saldoInicial: number;
  isPeriodClosed: boolean;
  isPeriodClosedFor: (periodOrDate: string | Date) => boolean;
  closeCurrentPeriod: () => Promise<void>;
  reopenCurrentPeriod: () => Promise<void>;
  
  // Transaction operations
  addTransaction: (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  addTransactionsBatch: (txs: Omit<Transaction, 'id' | 'userId' | 'createdAt'>[]) => Promise<void>;
  editTransaction: (id: string, tx: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Category operations
  addCategory: (name: string, type: 'income' | 'expense') => Promise<void>;
  toggleCategory: (name: string, type: 'income' | 'expense') => Promise<void>;
  updateCategoryName: (oldName: string, newName: string, type: 'income' | 'expense') => Promise<void>;
  updateCategoryBudget: (name: string, type: 'income' | 'expense', budget: number) => Promise<void>;
  deleteCategory: (name: string, type: 'income' | 'expense') => Promise<void>;
  
  // Budget operations
  setBudgetLimit: (category: string, limit: number) => Promise<void>;
  setBudgetLimitForPeriod: (category: string, period: string, limit: number) => Promise<void>; // NUEVO
  copyBudgetPeriod: (sourcePeriod: string, targetPeriod: string) => Promise<void>; // NUEVO

  // Stats / analytics
  fetchTransactionsInDateRange: (startDate: string, endDate: string) => Promise<Transaction[]>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const transactionRepo = new SupabaseTransactionRepository();
const budgetRepo = new SupabaseBudgetRepository();
const categoryRepo = new SupabaseCategoryRepository();
const closedPeriodRepo = new SupabaseClosedPeriodRepository();

const DEFAULT_CATEGORIES: Category[] = [
  // Egresos (Expenses)
  { name: 'Arriendo', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Gastos Comunes', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Supermercado', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Alimentación', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Internet Hogar', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Plan Celular', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Suscripciones Streaming', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Suscripciones Web', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Medicamentos', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Seguro Médico', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Consultas Medicas', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Examenes laboratorios', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Lavanderia', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Luz', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Agua', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Gas', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Taxis (Uber)', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Cine/Entretenimiendos', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Regalos', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Otros', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Café/Snacks', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Transporte Publico', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Gasolina', type: 'expense', active: true, defaultBudget: 0 },
  { name: 'Estacionamientos', type: 'expense', active: true, defaultBudget: 0 },
  
  // Ingresos (Income)
  { name: 'Sueldo', type: 'income', active: true, defaultBudget: 0 },
  { name: 'Prestamos', type: 'income', active: true, defaultBudget: 0 },
  { name: 'Ganancias', type: 'income', active: true, defaultBudget: 0 },
  { name: 'Otros', type: 'income', active: true, defaultBudget: 0 },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const getInitialPeriod = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const getNextSixPeriods = (startPeriod: string) => {
    const [yearStr, monthStr] = startPeriod.split('-');
    const periods = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1 + i, 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      periods.push(`${y}-${m}`);
    }
    return periods;
  };

  const [currentPeriod, setCurrentPeriod] = useState<string>(getInitialPeriod());
  const [budgetStartPeriod, setBudgetStartPeriod] = useState<string>(getInitialPeriod()); // NUEVO
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [sixMonthBudgets, setSixMonthBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saldoInicial, setSaldoInicial] = useState<number>(0);
  const [closedPeriods, setClosedPeriods] = useState<string[]>([]);

  const isPeriodClosedFor = (periodOrDate: string | Date): boolean => {
    const period =
      typeof periodOrDate === 'string' && /^\d{4}-\d{2}$/.test(periodOrDate)
        ? periodOrDate
        : toPeriodKey(periodOrDate);
    return closedPeriods.includes(period);
  };

  const isPeriodClosed = isPeriodClosedFor(currentPeriod);

  const assertPeriodOpen = (periodOrDate: string | Date) => {
    if (isPeriodClosedFor(periodOrDate)) {
      throw new Error(CLOSED_PERIOD_ERROR);
    }
  };

  // Load and Seed Categories once user is authenticated
  useEffect(() => {
    if (!user) {
      setCategories([]);
      return;
    }
    
    const loadCategories = async () => {
      try {
        let list = await categoryRepo.getAll(user.id);
        if (list.length === 0) {
          console.log('Seeding default categories in Supabase for user:', user.id);
          await Promise.all(
            DEFAULT_CATEGORIES.map(cat => categoryRepo.create(user.id, cat))
          );
          list = await categoryRepo.getAll(user.id);
        }
        setCategories(list);
      } catch (err) {
        console.error('Error loading/seeding categories:', err);
      }
    };
    loadCategories();
  }, [user]);

  // Load Transactions and Budgets when user or period changes
  const loadData = async () => {
    if (!user) {
      setTransactions([]);
      setBudgets([]);
      setSixMonthBudgets([]);
      setSaldoInicial(0);
      setClosedPeriods([]);
      return;
    }

    setLoading(true);
    try {
      const periodsToFetch = getNextSixPeriods(budgetStartPeriod);
      
      const [fetchedTx, fetchedBudgets, fetchedSixMonthBudgets, openingBalance, closed] = await Promise.all([
        transactionRepo.getAllByUserId(user.id, currentPeriod),
        budgetRepo.getAllByUserId(user.id, currentPeriod),
        budgetRepo.getAllForPeriods(user.id, periodsToFetch),
        transactionRepo.getNetBalanceBefore(user.id, periodStartDate(currentPeriod)),
        closedPeriodRepo.getAllByUserId(user.id),
      ]);

      // Calculate spent dynamically based on loaded transactions of this month
      const spentByCategory: Record<string, number> = {};
      fetchedTx.forEach(tx => {
        if (tx.type === 'expense') {
          spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + tx.amount;
        }
      });

      // Map budgets and synchronize spent column for active month
      const enrichedBudgets = fetchedBudgets.map(b => {
        const calculatedSpent = spentByCategory[b.category] || 0;
        if (Math.abs(b.spent - calculatedSpent) > 0.01) {
          budgetRepo.updateSpent(b.id, calculatedSpent).catch(err => {
            console.error('Failed to sync budget spent in background:', err);
          });
        }
        return {
          ...b,
          spent: calculatedSpent
        };
      });

      setTransactions(fetchedTx);
      setBudgets(enrichedBudgets);
      setSixMonthBudgets(fetchedSixMonthBudgets);
      setSaldoInicial(openingBalance);
      setClosedPeriods(closed.map(c => c.period));
    } catch (err) {
      console.error('Error loading budgets or transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, currentPeriod, budgetStartPeriod]);

  // Transactions Operations
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      assertPeriodOpen(tx.date);
      await transactionRepo.create({ ...tx, userId: user.id });
      await loadData();
    } catch (err) {
      console.error('Error creating transaction:', err);
      throw err;
    }
  };

  const addTransactionsBatch = async (txs: Omit<Transaction, 'id' | 'userId' | 'createdAt'>[]) => {
    if (!user || txs.length === 0) return;
    try {
      for (const tx of txs) {
        assertPeriodOpen(tx.date);
      }
      if (transactionRepo.createBatch) {
        await transactionRepo.createBatch(txs.map(tx => ({ ...tx, userId: user.id })));
      } else {
        await Promise.all(txs.map(tx => transactionRepo.create({ ...tx, userId: user.id })));
      }
      await loadData();
    } catch (err) {
      console.error('Error creating batch transactions:', err);
      throw err;
    }
  };

  const editTransaction = async (id: string, tx: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>) => {
    if (!user) return;
    try {
      const existing = transactions.find(t => t.id === id);
      if (existing) {
        assertPeriodOpen(existing.date);
      }
      if (tx.date !== undefined) {
        assertPeriodOpen(tx.date);
      }
      await transactionRepo.update(id, tx);
      await loadData();
    } catch (err) {
      console.error('Error editing transaction:', err);
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      const existing = transactions.find(t => t.id === id);
      if (existing) {
        assertPeriodOpen(existing.date);
      }
      await transactionRepo.delete(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      throw err;
    }
  };

  const closeCurrentPeriod = async () => {
    if (!user) return;
    try {
      await closedPeriodRepo.close(user.id, currentPeriod);
      await loadData();
    } catch (err) {
      console.error('Error closing period:', err);
      throw err;
    }
  };

  const reopenCurrentPeriod = async () => {
    if (!user) return;
    try {
      await closedPeriodRepo.reopen(user.id, currentPeriod);
      await loadData();
    } catch (err) {
      console.error('Error reopening period:', err);
      throw err;
    }
  };

  // Categories Operations
  const addCategory = async (name: string, type: 'income' | 'expense') => {
    if (!user) return;
    const cleanName = name.trim();
    if (!cleanName) return;
    
    // Prevent duplicates
    const exists = categories.some(
      c => c.name.toLowerCase() === cleanName.toLowerCase() && c.type === type
    );
    if (exists) {
      throw new Error('La categoría ya existe');
    }

    const newCat = { name: cleanName, type, active: true, defaultBudget: 0 };
    try {
      await categoryRepo.create(user.id, newCat);
      setCategories([...categories, newCat]);
    } catch (err) {
      console.error('Error adding category:', err);
      throw err;
    }
  };

  const toggleCategory = async (name: string, type: 'income' | 'expense') => {
    if (!user) return;
    const cat = categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.type === type);
    if (!cat) return;
    
    const newActive = !cat.active;
    try {
      await categoryRepo.update(user.id, name, type, { active: newActive });
      setCategories(categories.map(c => {
        if (c.name.toLowerCase() === name.toLowerCase() && c.type === type) {
          return { ...c, active: newActive };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error toggling category active status:', err);
    }
  };

  const updateCategoryName = async (oldName: string, newName: string, type: 'income' | 'expense') => {
    if (!user) return;
    const cleanNewName = newName.trim();
    if (!cleanNewName || cleanNewName.toLowerCase() === oldName.toLowerCase()) return;

    // Check duplicate of new name
    const exists = categories.some(
      c => c.name.toLowerCase() === cleanNewName.toLowerCase() && c.type === type
    );
    if (exists) {
      throw new Error('Ya existe una categoría con ese nombre');
    }

    try {
      // 1. Update categories table
      await categoryRepo.update(user.id, oldName, type, { name: cleanNewName });

      // 2. Update transactions
      await supabase
        .from('transactions')
        .update({ category: cleanNewName })
        .eq('user_id', user.id)
        .eq('category', oldName)
        .eq('type', type);

      // 3. Update budgets
      await supabase
        .from('budgets')
        .update({ category: cleanNewName })
        .eq('user_id', user.id)
        .eq('category', oldName);

      setCategories(categories.map(c => {
        if (c.name.toLowerCase() === oldName.toLowerCase() && c.type === type) {
          return { ...c, name: cleanNewName };
        }
        return c;
      }));
      await loadData();
    } catch (err) {
      console.error('Error updating references for renamed category:', err);
      throw err;
    }
  };

  const updateCategoryBudget = async (name: string, type: 'income' | 'expense', budget: number) => {
    if (!user) return;
    try {
      await categoryRepo.update(user.id, name, type, { defaultBudget: budget });
      setCategories(categories.map(c => {
        if (c.name.toLowerCase() === name.toLowerCase() && c.type === type) {
          return { ...c, defaultBudget: budget };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error updating category default budget:', err);
      throw err;
    }
  };

  const deleteCategory = async (name: string, type: 'income' | 'expense') => {
    if (!user) return;
    try {
      // 1. Verify if there are any transactions associated with this category (all time)
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('category', name)
        .eq('type', type);

      if (countError) {
        throw new Error(countError.message);
      }

      if (count && count > 0) {
        throw new Error('No se puede eliminar la categoría porque tiene movimientos asociados. Puedes desactivarla en su lugar.');
      }

      // 2. Delete budgets associated with this category (if any)
      await supabase
        .from('budgets')
        .delete()
        .eq('user_id', user.id)
        .eq('category', name);

      // 3. Delete category from Supabase
      await categoryRepo.delete(user.id, name, type);

      // 4. Update state locally
      setCategories(categories.filter(c => !(c.name.toLowerCase() === name.toLowerCase() && c.type === type)));
      await loadData();
    } catch (err) {
      console.error('Error deleting category:', err);
      throw err;
    }
  };

  // Budgets Operations
  const setBudgetLimit = async (category: string, limit: number) => {
    await setBudgetLimitForPeriod(category, currentPeriod, limit);
  };

  const setBudgetLimitForPeriod = async (category: string, period: string, limit: number) => {
    if (!user) return;
    try {
      assertPeriodOpen(period);
      // Check in the list of loaded 6-month budgets
      const existing = sixMonthBudgets.find(
        b => b.category.toLowerCase() === category.toLowerCase() && b.period === period
      );

      if (existing) {
        await budgetRepo.updateAmount(existing.id, limit);
      } else {
        await budgetRepo.create({
          userId: user.id,
          category,
          amount: limit,
          period
        });
      }
      await loadData();
    } catch (err) {
      console.error(`Error setting budget limit for period ${period}:`, err);
      throw err;
    }
  };



  const copyBudgetPeriod = async (sourcePeriod: string, targetPeriod: string) => {
    if (!user) return;
    try {
      assertPeriodOpen(targetPeriod);
      const [sourceBudgets, targetBudgets] = await Promise.all([
        budgetRepo.getAllByUserId(user.id, sourcePeriod),
        budgetRepo.getAllByUserId(user.id, targetPeriod)
      ]);

      const operations: Promise<any>[] = [];
      const sourceMap = new Map(sourceBudgets.map(b => [b.category.toLowerCase(), b]));
      const targetMap = new Map(targetBudgets.map(b => [b.category.toLowerCase(), b]));

      for (const sourceBudget of sourceBudgets) {
        if (sourceBudget.amount <= 0) continue;
        const existingTarget = targetMap.get(sourceBudget.category.toLowerCase());
        if (existingTarget) {
          if (existingTarget.amount !== sourceBudget.amount) {
            operations.push(budgetRepo.updateAmount(existingTarget.id, sourceBudget.amount));
          }
        } else {
          operations.push(budgetRepo.create({
            userId: user.id,
            category: sourceBudget.category,
            amount: sourceBudget.amount,
            period: targetPeriod
          }));
        }
      }

      for (const targetBudget of targetBudgets) {
        const sourceBudget = sourceMap.get(targetBudget.category.toLowerCase());
        if (!sourceBudget || sourceBudget.amount <= 0) {
          operations.push(budgetRepo.delete(targetBudget.id));
        }
      }

      await Promise.all(operations);
      await loadData();
    } catch (err) {
      console.error(`Error copying budget from ${sourcePeriod} to ${targetPeriod}:`, err);
      throw err;
    }
  };

  const fetchTransactionsInDateRange = async (startDate: string, endDate: string): Promise<Transaction[]> => {
    if (!user) return [];
    try {
      return await transactionRepo.getAllInDateRange(user.id, startDate, endDate);
    } catch (err) {
      console.error('Error fetching transactions in date range:', err);
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentPeriod,
        setCurrentPeriod,
        budgetStartPeriod,
        setBudgetStartPeriod,
        transactions,
        budgets,
        sixMonthBudgets,
        categories,
        loading,
        saldoInicial,
        isPeriodClosed,
        isPeriodClosedFor,
        closeCurrentPeriod,
        reopenCurrentPeriod,
        addTransaction,
        addTransactionsBatch,
        editTransaction,
        deleteTransaction,
        addCategory,
        toggleCategory,
        updateCategoryName,
        updateCategoryBudget,
        deleteCategory,
        setBudgetLimit,
        setBudgetLimitForPeriod,
        copyBudgetPeriod,
        fetchTransactionsInDateRange
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
};
