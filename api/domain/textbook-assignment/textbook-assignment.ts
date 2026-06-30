import { DomainError } from '../shared/domain-error';
import { DateOnly } from '../shared/value-objects';
import { MemberId } from '../member/member';
import { TextbookId } from '../textbook/textbook';

export interface CreateTextbookAssignmentInput {
  memberId: string;
  textbookId: string;
  dailyGoalMinutes?: number | null;
  note?: string;
  graduatedOn?: string | null;
}

export interface UpdateTextbookAssignmentInput {
  dailyGoalMinutes?: number | null;
  note?: string;
}

// ═══════════════════════ 集約ルート：TextbookAssignment ═══════════════════════
// 会員⨯教材の割り当て。memberId・textbookId・1日目標分数・メモ・卒業日を持つ。
// 「現役か卒業か」は graduatedOn から compute-on-read（状態は別に持たない）。
export class TextbookAssignment {
  constructor(
    readonly memberId: MemberId,
    readonly textbookId: TextbookId,
    /** 教材ごとの1日の目標分数。未設定は null。 */
    readonly dailyGoalMinutes: number | null,
    readonly note: string,
    /** 卒業日。null=現役 / 日付あり=卒業済み。 */
    readonly graduatedOn: DateOnly | null,
  ) {}

  /** 現役か（卒業していないか）。compute-on-read。 */
  get isActive(): boolean {
    return this.graduatedOn === null;
  }

  /** 目標・メモの変更（卒業日は変えない）。 */
  update(patch: UpdateTextbookAssignmentInput): TextbookAssignment {
    return new TextbookAssignment(
      this.memberId,
      this.textbookId,
      patch.dailyGoalMinutes === undefined ? this.dailyGoalMinutes : TextbookAssignment.goal(patch.dailyGoalMinutes),
      patch.note ?? this.note,
      this.graduatedOn,
    );
  }

  /** 卒業させる（卒業日をセット）。既に卒業済みなら据え置き。 */
  graduate(graduatedOn: string): TextbookAssignment {
    return new TextbookAssignment(
      this.memberId,
      this.textbookId,
      this.dailyGoalMinutes,
      this.note,
      this.graduatedOn ?? DateOnly.create(graduatedOn),
    );
  }

  static create(input: CreateTextbookAssignmentInput): TextbookAssignment {
    return new TextbookAssignment(
      MemberId.create(input.memberId),
      TextbookId.create(input.textbookId),
      TextbookAssignment.goal(input.dailyGoalMinutes),
      input.note ?? '',
      TextbookAssignment.graduatedFrom(input.graduatedOn),
    );
  }

  static fromRecord(r: {
    memberId: string;
    textbookId: string;
    dailyGoalMinutes?: number | null;
    note?: string;
    graduatedOn?: string | null;
  }): TextbookAssignment {
    return TextbookAssignment.create(r);
  }

  private static goal(minutes: number | null | undefined): number | null {
    if (minutes === null || minutes === undefined || (minutes as unknown) === '') return null;
    if (!Number.isFinite(minutes) || minutes < 0) {
      throw new DomainError('教材の1日目標分数は0以上で指定してください');
    }
    return minutes;
  }

  private static graduatedFrom(raw: string | null | undefined): DateOnly | null {
    if (raw === null || raw === undefined || raw === '') return null;
    return DateOnly.create(raw);
  }
}
