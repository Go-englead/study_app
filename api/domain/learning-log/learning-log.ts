import { DomainError } from '../shared/domain-error';
import { DateOnly } from '../shared/value-objects';
import { MemberId } from '../member/member';
import { TextbookId } from '../textbook/textbook';

export class LearningLogId {
  private constructor(readonly value: string) {}
  static create(raw: string): LearningLogId {
    const v = (raw ?? '').trim();
    if (!v) throw new DomainError('学習記録IDは必須です');
    return new LearningLogId(v);
  }
}

export interface CreateLearningLogInput {
  id: string;
  memberId: string;
  textbookId: string;
  date: string;
  durationMinutes: number;
  comment?: string;
}

/** 編集：日付・学習時間・コメントのみ変更可（教材は変更不可）。 */
export interface UpdateLearningLogInput {
  date?: string;
  durationMinutes?: number;
  comment?: string;
}

// ═══════════════════════ 集約ルート：LearningLog ═══════════════════════
export class LearningLog {
  constructor(
    readonly id: LearningLogId,
    readonly memberId: MemberId,
    /** 学習した教材。作成後は変更不可。 */
    readonly textbookId: TextbookId,
    readonly date: DateOnly,
    readonly durationMinutes: number,
    readonly comment: string,
  ) {}

  /** 編集：日付・学習時間・コメントのみ変更可（教材は変更不可）。 */
  update(patch: UpdateLearningLogInput, today: DateOnly = DateOnly.today()): LearningLog {
    return new LearningLog(
      this.id,
      this.memberId,
      this.textbookId,
      patch.date ? LearningLog.notFuture(DateOnly.create(patch.date), today) : this.date,
      patch.durationMinutes !== undefined ? LearningLog.duration(patch.durationMinutes) : this.durationMinutes,
      patch.comment ?? this.comment,
    );
  }

  static create(input: CreateLearningLogInput, today: DateOnly = DateOnly.today()): LearningLog {
    return new LearningLog(
      LearningLogId.create(input.id),
      MemberId.create(input.memberId),
      TextbookId.create(input.textbookId),
      LearningLog.notFuture(DateOnly.create(input.date), today),
      LearningLog.duration(input.durationMinutes),
      input.comment ?? '',
    );
  }

  static fromRecord(r: {
    id: string;
    memberId: string;
    textbookId: string;
    date: string;
    durationMinutes: number;
    comment?: string;
  }): LearningLog {
    return new LearningLog(
      LearningLogId.create(r.id),
      MemberId.create(r.memberId),
      TextbookId.create(r.textbookId),
      DateOnly.create(r.date),
      r.durationMinutes,
      r.comment ?? '',
    );
  }

  private static duration(minutes: number): number {
    if (!Number.isFinite(minutes) || minutes < 1) {
      throw new DomainError('学習時間は1分以上で指定してください');
    }
    return minutes;
  }

  private static notFuture(date: DateOnly, today: DateOnly): DateOnly {
    if (date.isFuture(today)) {
      throw new DomainError('未来日の学習記録は登録できません');
    }
    return date;
  }
}
