import { DomainError } from '../shared/domain-error';
import { DateOnly } from '../shared/value-objects';

export class ContinuationPlanId {
  private constructor(readonly value: string) {}
  static create(raw: string): ContinuationPlanId {
    const v = (raw ?? '').trim();
    if (!v) throw new DomainError('継続プランIDは必須です');
    return new ContinuationPlanId(v);
  }
}

export type ContinuationPlanTypeName = 'タビプラプラン' | '英語講座プラン' | '英語コーチングプラン';

export class ContinuationPlanType {
  private static readonly NAMES: readonly ContinuationPlanTypeName[] = [
    'タビプラプラン',
    '英語講座プラン',
    '英語コーチングプラン',
  ];
  private constructor(readonly name: ContinuationPlanTypeName) {}
  static create(raw: string): ContinuationPlanType {
    if (!(ContinuationPlanType.NAMES as readonly string[]).includes(raw)) {
      throw new DomainError(`継続プラン種別が不正です: ${raw}`);
    }
    return new ContinuationPlanType(raw as ContinuationPlanTypeName);
  }
}

/** 新規/編集の入力。終了日は開始日＋月数−1日で自動算出するため受け取らない。 */
export interface ContinuationPlanInput {
  id: string;
  planType: string;
  months: number;
  startDate: string;
  note?: string;
}

// ═══════════════════════ 継続プラン（Member 集約のサテライト） ═══════════════════════
// 会員の「再入会・継続」の履歴1件。終了日＝開始日＋月数−1日。
export class ContinuationPlan {
  constructor(
    readonly id: ContinuationPlanId,
    readonly planType: ContinuationPlanType,
    readonly months: number,
    readonly startDate: DateOnly,
    /** = 開始日 + 月数 − 1日（自動算出） */
    readonly endDate: DateOnly,
    readonly note?: string,
  ) {}

  static create(input: ContinuationPlanInput): ContinuationPlan {
    const months = ContinuationPlan.validMonths(input.months);
    const startDate = DateOnly.create(input.startDate);
    return new ContinuationPlan(
      ContinuationPlanId.create(input.id),
      ContinuationPlanType.create(input.planType),
      months,
      startDate,
      startDate.addMonthsMinusOneDay(months),
      input.note,
    );
  }

  /** 永続データから復元（終了日は保存値を信頼）。 */
  static fromRecord(r: {
    id: string;
    planType: string;
    months: number;
    startDate: string;
    endDate: string;
    note?: string;
  }): ContinuationPlan {
    return new ContinuationPlan(
      ContinuationPlanId.create(r.id),
      ContinuationPlanType.create(r.planType),
      r.months,
      DateOnly.create(r.startDate),
      DateOnly.create(r.endDate),
      r.note,
    );
  }

  private static validMonths(months: number): number {
    if (!Number.isInteger(months) || months < 1 || months > 6) {
      throw new DomainError('継続プランの期間は1〜6ヶ月で指定してください');
    }
    return months;
  }
}
