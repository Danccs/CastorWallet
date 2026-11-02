import type { ClosedPeriod } from '@domain/entities/ClosedPeriod';

export class ClosedPeriodMapper {
  static toDomain(raw: any): ClosedPeriod {
    return {
      id: raw.id,
      userId: raw.user_id,
      period: raw.period,
      closedAt: new Date(raw.closed_at),
    };
  }

  static toPersistence(userId: string, period: string) {
    return {
      user_id: userId,
      period,
    };
  }
}
