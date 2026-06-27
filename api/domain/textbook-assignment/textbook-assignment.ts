import { DomainError } from '../shared/domain-error';
import { DateOnly, createDateOnly } from '../shared/value-objects';
import { MemberId, createMemberId } from '../member/member';
import { TextbookId, createTextbookId } from '../textbook/textbook';

// ═══════════════════════ 集約ルート：TextbookAssignment ═══════════════════════
// 会員⨯教材の割り当て。memberId・textbookId・1日目標分数・メモ・卒業日を持つ。
// 「現役か卒業か」は graduatedOn から compute-on-read（状態は別に持たない）。
export interface TextbookAssignment {
  readonly memberId: MemberId;
  readonly textbookId: TextbookId;
  /** 教材ごとの1日の目標分数。未設定は null。 */
  readonly dailyGoalMinutes: number | null;
  readonly note: string;
  /** 卒業日。null=現役 / 日付あり=卒業済み。 */
  readonly graduatedOn: DateOnly | null;
}

function validateGoal(minutes: number | null | undefined): number | null {
  if (minutes === null || minutes === undefined || (minutes as unknown) === '') return null;
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new DomainError('教材の1日目標分数は0以上で指定してください');
  }
  return minutes;
}

function toGraduatedOn(raw: string | null | undefined): DateOnly | null {
  if (raw === null || raw === undefined || raw === '') return null;
  return createDateOnly(raw);
}

export interface CreateTextbookAssignmentInput {
  memberId: string;
  textbookId: string;
  dailyGoalMinutes?: number | null;
  note?: string;
  graduatedOn?: string | null;
}

export function createTextbookAssignment(input: CreateTextbookAssignmentInput): TextbookAssignment {
  return {
    memberId: createMemberId(input.memberId),
    textbookId: createTextbookId(input.textbookId),
    dailyGoalMinutes: validateGoal(input.dailyGoalMinutes),
    note: input.note ?? '',
    graduatedOn: toGraduatedOn(input.graduatedOn),
  };
}

export interface UpdateTextbookAssignmentInput {
  dailyGoalMinutes?: number | null;
  note?: string;
}

/** 目標・メモの変更（卒業日は変えない）。 */
export function updateTextbookAssignment(
  current: TextbookAssignment,
  patch: UpdateTextbookAssignmentInput,
): TextbookAssignment {
  return {
    ...current,
    dailyGoalMinutes:
      patch.dailyGoalMinutes === undefined
        ? current.dailyGoalMinutes
        : validateGoal(patch.dailyGoalMinutes),
    note: patch.note ?? current.note,
  };
}

/** 卒業させる（卒業日をセット）。既に卒業済みなら据え置き。 */
export function graduateTextbookAssignment(
  current: TextbookAssignment,
  graduatedOn: string,
): TextbookAssignment {
  return { ...current, graduatedOn: current.graduatedOn ?? createDateOnly(graduatedOn) };
}

/** 現役か（卒業していないか）。 */
export function isActive(a: TextbookAssignment): boolean {
  return a.graduatedOn === null;
}
