import { DomainError } from '../shared/domain-error';
import { MemberId, createMemberId } from '../member/member';
import { TextbookId, createTextbookId } from '../textbook/textbook';

// ═══════════════════════ 集約ルート：TextbookAssignment ═══════════════════════
// 会員⨯教材の割り当て。memberId・textbookId・1日目標分数・メモを持つ（状態は持たない）。
export interface TextbookAssignment {
  readonly memberId: MemberId;
  readonly textbookId: TextbookId;
  /** 教材ごとの1日の目標分数。未設定は null。 */
  readonly dailyGoalMinutes: number | null;
  readonly note: string;
}

function validateGoal(minutes: number | null | undefined): number | null {
  if (minutes === null || minutes === undefined || (minutes as unknown) === '') return null;
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new DomainError('教材の1日目標分数は0以上で指定してください');
  }
  return minutes;
}

export interface CreateTextbookAssignmentInput {
  memberId: string;
  textbookId: string;
  dailyGoalMinutes?: number | null;
  note?: string;
}

export function createTextbookAssignment(input: CreateTextbookAssignmentInput): TextbookAssignment {
  return {
    memberId: createMemberId(input.memberId),
    textbookId: createTextbookId(input.textbookId),
    dailyGoalMinutes: validateGoal(input.dailyGoalMinutes),
    note: input.note ?? '',
  };
}

export interface UpdateTextbookAssignmentInput {
  dailyGoalMinutes?: number | null;
  note?: string;
}

/** 目標・メモの変更。 */
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
