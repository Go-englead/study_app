import { Brand } from '../shared/brand';
import { DomainError } from '../shared/domain-error';
import { DateOnly, createDateOnly, isFuture, todayDateOnly } from '../shared/value-objects';
import { MemberId, createMemberId } from '../member/member';
import { TextbookId, createTextbookId } from '../textbook/textbook';

export type LearningLogId = Brand<string, 'LearningLogId'>;

export function createLearningLogId(raw: string): LearningLogId {
  const value = (raw ?? '').trim();
  if (!value) throw new DomainError('学習記録IDは必須です');
  return value as LearningLogId;
}

// ═══════════════════════ 集約ルート：LearningLog ═══════════════════════
export interface LearningLog {
  readonly id: LearningLogId;
  readonly memberId: MemberId;
  /** 学習した教材。作成後は変更不可。 */
  readonly textbookId: TextbookId;
  readonly date: DateOnly;
  readonly durationMinutes: number;
  readonly comment: string;
}

function validateDuration(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 1) {
    throw new DomainError('学習時間は1分以上で指定してください');
  }
  return minutes;
}

function validateNotFuture(date: DateOnly, today: DateOnly): DateOnly {
  if (isFuture(date, today)) {
    throw new DomainError('未来日の学習記録は登録できません');
  }
  return date;
}

export interface CreateLearningLogInput {
  id: string;
  memberId: string;
  textbookId: string;
  date: string;
  durationMinutes: number;
  comment?: string;
}

export function createLearningLog(
  input: CreateLearningLogInput,
  today: DateOnly = todayDateOnly(),
): LearningLog {
  return {
    id: createLearningLogId(input.id),
    memberId: createMemberId(input.memberId),
    textbookId: createTextbookId(input.textbookId),
    date: validateNotFuture(createDateOnly(input.date), today),
    durationMinutes: validateDuration(input.durationMinutes),
    comment: input.comment ?? '',
  };
}

/** 編集：日付・学習時間・コメントのみ変更可（教材は変更不可）。 */
export interface UpdateLearningLogInput {
  date?: string;
  durationMinutes?: number;
  comment?: string;
}

export function updateLearningLog(
  current: LearningLog,
  patch: UpdateLearningLogInput,
  today: DateOnly = todayDateOnly(),
): LearningLog {
  return {
    ...current,
    date: patch.date ? validateNotFuture(createDateOnly(patch.date), today) : current.date,
    durationMinutes:
      patch.durationMinutes !== undefined
        ? validateDuration(patch.durationMinutes)
        : current.durationMinutes,
    comment: patch.comment ?? current.comment,
  };
}
