import { Brand } from '../shared/brand';
import { DomainError } from '../shared/domain-error';
import { DateOnly, createDateOnly, addMonthsMinusOneDay } from '../shared/value-objects';
import { MemberId, createMemberId } from '../member/member';

export type ContinuationPlanId = Brand<string, 'ContinuationPlanId'>;

export function createContinuationPlanId(raw: string): ContinuationPlanId {
  const value = (raw ?? '').trim();
  if (!value) throw new DomainError('継続プランIDは必須です');
  return value as ContinuationPlanId;
}

export type ContinuationPlanType = 'タビプラプラン' | '継続プランA' | '継続プランB';

const PLAN_TYPES: readonly ContinuationPlanType[] = ['タビプラプラン', '継続プランA', '継続プランB'];

export function createContinuationPlanType(raw: string): ContinuationPlanType {
  if (!(PLAN_TYPES as readonly string[]).includes(raw)) {
    throw new DomainError(`継続プラン種別が不正です: ${raw}`);
  }
  return raw as ContinuationPlanType;
}

// ═══════════════════════ 集約ルート：ContinuationPlan ═══════════════════════
export interface ContinuationPlan {
  readonly id: ContinuationPlanId;
  readonly memberId: MemberId;
  readonly planType: ContinuationPlanType;
  readonly months: number;
  readonly startDate: DateOnly;
  /** = startDate + months − 1日（自動算出） */
  readonly endDate: DateOnly;
  readonly note?: string;
}

function validateMonths(months: number): number {
  if (!Number.isInteger(months) || months < 1 || months > 6) {
    throw new DomainError('継続プランの期間は1〜6ヶ月で指定してください');
  }
  return months;
}

export interface CreateContinuationPlanInput {
  id: string;
  memberId: string;
  planType: string;
  months: number;
  startDate: string;
  note?: string;
}

export function createContinuationPlan(input: CreateContinuationPlanInput): ContinuationPlan {
  const months = validateMonths(input.months);
  const startDate = createDateOnly(input.startDate);
  return {
    id: createContinuationPlanId(input.id),
    memberId: createMemberId(input.memberId),
    planType: createContinuationPlanType(input.planType),
    months,
    startDate,
    endDate: addMonthsMinusOneDay(startDate, months),
    note: input.note,
  };
}

export interface UpdateContinuationPlanInput {
  planType?: string;
  months?: number;
  startDate?: string;
  note?: string;
}

export function updateContinuationPlan(
  current: ContinuationPlan,
  patch: UpdateContinuationPlanInput,
): ContinuationPlan {
  const months = patch.months !== undefined ? validateMonths(patch.months) : current.months;
  const startDate = patch.startDate ? createDateOnly(patch.startDate) : current.startDate;
  return {
    ...current,
    planType: patch.planType ? createContinuationPlanType(patch.planType) : current.planType,
    months,
    startDate,
    endDate: addMonthsMinusOneDay(startDate, months),
    note: patch.note ?? current.note,
  };
}
