import { DomainError } from '../shared/domain-error';
import { MemberId, createMemberId } from '../member/member';
import { TextbookId, createTextbookId } from '../textbook/textbook';

/** 割り当て状態。卒業は終端（継続へ戻せない）。 */
export type AssignmentStatus = '継続' | '卒業';

// ═══════════════════════ 集約ルート：TextbookAssignment ═══════════════════════
export interface TextbookAssignment {
  readonly memberId: MemberId;
  readonly textbookId: TextbookId;
  /** 教材ごとの1日の目標分数。未設定は null。 */
  readonly dailyGoalMinutes: number | null;
  readonly note: string;
  readonly status: AssignmentStatus;
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
    status: '継続',
  };
}

export interface UpdateTextbookAssignmentInput {
  dailyGoalMinutes?: number | null;
  note?: string;
}

/** 目標・メモの変更。卒業済みの割り当ては変更不可。 */
export function updateTextbookAssignment(
  current: TextbookAssignment,
  patch: UpdateTextbookAssignmentInput,
): TextbookAssignment {
  if (current.status === '卒業') {
    throw new DomainError('卒業した教材の割り当ては変更できません');
  }
  return {
    ...current,
    dailyGoalMinutes:
      patch.dailyGoalMinutes === undefined
        ? current.dailyGoalMinutes
        : validateGoal(patch.dailyGoalMinutes),
    note: patch.note ?? current.note,
  };
}

/** 教材を卒業させる（終端遷移）。既に卒業なら不可。 */
export function graduateTextbookAssignment(current: TextbookAssignment): TextbookAssignment {
  if (current.status === '卒業') {
    throw new DomainError('この教材は既に卒業しています');
  }
  return { ...current, status: '卒業' };
}
