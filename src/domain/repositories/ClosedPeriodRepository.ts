import type { ClosedPeriod } from '../entities/ClosedPeriod';

export interface ClosedPeriodRepository {
  getAllByUserId(userId: string): Promise<ClosedPeriod[]>;
  close(userId: string, period: string): Promise<ClosedPeriod>;
  reopen(userId: string, period: string): Promise<void>;
}
