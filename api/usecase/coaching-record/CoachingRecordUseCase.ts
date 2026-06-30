import { randomUUID } from 'node:crypto';
import { MemberId } from '../../domain/member/member';
import { TextbookId } from '../../domain/textbook/textbook';
import { MemberRepository } from '../../domain/member/member-repository';
import { TextbookRepository } from '../../domain/textbook/textbook-repository';
import { TextbookAssignmentRepository } from '../../domain/textbook-assignment/textbook-assignment-repository';
import { TextbookAssignment } from '../../domain/textbook-assignment/textbook-assignment';
import { DomainError } from '../../domain/shared/domain-error';
import {
  CoachingRecord,
  CoachingRecordId,
  CoachingResult,
  AssignmentEffects,
  SelectedTextbookInput,
  TextbookTestInput,
  CoachingRecords,
} from '../../domain/coaching-record/coaching-record';
import { CoachingRecordRepository } from '../../domain/coaching-record/coaching-record-repository';
import { CoachingRecordDto } from './CoachingRecordDto';

/** create/update 共通の入力（PUT は全置換セマンティクス）。 */
export interface CoachingRecordWriteInput {
  type: string;
  date: string;
  coachName: string;
  selectedTextbooks?: SelectedTextbookInput[];
  sharedNote?: string;
  /** 通常コーチングの回数。未指定なら自動採番（既存の最大+1、最低2）。 */
  coachingNumber?: number;
  textbookTests?: TextbookTestInput[];
  newAssignments?: SelectedTextbookInput[];
  monthlyReview?: string;
  coachAdvice?: string;
  otherNotes?: string;
}

/**
 * コーチング記録ユースケース。
 * ドメイン（純粋）が返す effects を見て、教材割り当て集約を**冪等に**適用する（imperative shell）。
 * 自集約の CTI 保存は repo 内で1トランザクション、割り当て適用は順次（冪等なのでリトライで収束）。
 */
export class CoachingRecordUseCase {
  constructor(
    private readonly records: CoachingRecordRepository,
    private readonly assignments: TextbookAssignmentRepository,
    private readonly textbooks: TextbookRepository,
    private readonly members: MemberRepository,
  ) {}

  /** 会員のコーチング記録一覧（カルテ履歴）。 */
  async listByMember(memberId: string): Promise<CoachingRecordDto[]> {
    const list = await this.records.findByMember(MemberId.create(memberId));
    return list.map(toDto);
  }

  /** 1件取得（詳細・編集プリセット用）。 */
  async getById(id: string): Promise<CoachingRecordDto | undefined> {
    const record = await this.records.findById(CoachingRecordId.create(id));
    return record ? toDto(record) : undefined;
  }

  /** 登録。 */
  async create(memberId: string, input: CoachingRecordWriteInput): Promise<CoachingRecordDto> {
    const member = await this.members.findById(MemberId.create(memberId));
    if (!member) throw new DomainError('会員が見つかりません');

    const existing = await this.records.findByMember(MemberId.create(memberId));
    const result = this.build(randomUUID(), memberId, input, existing);

    await this.persist(memberId, result);
    return toDto(result.record);
  }

  /** 編集（全置換。種別変更も可＝旧種別の子テーブルは置き換えられる）。 */
  async update(id: string, input: CoachingRecordWriteInput): Promise<CoachingRecordDto> {
    const current = await this.records.findById(CoachingRecordId.create(id));
    if (!current) throw new DomainError('コーチング記録が見つかりません');

    const memberId = current.memberId.value;
    const all = await this.records.findByMember(MemberId.create(memberId));
    const existingExceptSelf = all.filter((r) => r.id.value !== id);
    const result = this.build(id, memberId, input, existingExceptSelf);

    // 編集後の集合が整合するか（依存先を壊す型変更などを拒否）
    CoachingRecords.assertSetConsistent([...existingExceptSelf, result.record]);

    await this.persist(memberId, result);
    return toDto(result.record);
  }

  /** 削除（子テーブルは CASCADE）。依存先を孤児化する削除は拒否。 */
  async delete(id: string): Promise<void> {
    const target = await this.records.findById(CoachingRecordId.create(id));
    if (!target) return; // 冪等
    const all = await this.records.findByMember(target.memberId);
    const remaining = all.filter((r) => r.id.value !== id);
    CoachingRecords.assertSetConsistent(remaining);
    await this.records.delete(CoachingRecordId.create(id));
  }

  // ───────────────────── 内部 ─────────────────────

  /** 入力の type からドメイン create を選び、記録＋effectsを作る（不変条件はドメインが検証）。 */
  private build(
    id: string,
    memberId: string,
    input: CoachingRecordWriteInput,
    existing: CoachingRecord[],
  ): CoachingResult<CoachingRecord> {
    const base = { id, memberId, date: input.date, coachName: input.coachName };
    const freeText = {
      monthlyReview: input.monthlyReview,
      coachAdvice: input.coachAdvice,
      otherNotes: input.otherNotes,
    };
    const session = { ...base, ...freeText, textbookTests: input.textbookTests, newAssignments: input.newAssignments };

    switch (input.type) {
      case '教材選定':
        return CoachingRecords.textbookSelection(
          { ...base, selectedTextbooks: input.selectedTextbooks ?? [], sharedNote: input.sharedNote },
          existing,
        );
      case 'オリエンテーション':
        return CoachingRecords.orientation(session, existing);
      case '初回コーチング':
        return CoachingRecords.firstCoaching(session, existing);
      case '通常コーチング':
        return CoachingRecords.regularCoaching(
          { ...session, coachingNumber: input.coachingNumber ?? nextCoachingNumber(existing) },
          existing,
        );
      case 'その他':
        return CoachingRecords.other(session, existing);
      default:
        throw new DomainError(`不明なコーチング種別です: ${input.type}`);
    }
  }

  /** 記録を保存し、effects を教材割り当てへ冪等適用する。 */
  private async persist(memberId: string, result: CoachingResult<CoachingRecord>): Promise<void> {
    await this.assertTextbooksExist(result.effects);
    await this.records.save(result.record);
    await this.applyEffects(memberId, result.effects, result.record.date.value);
  }

  /** 新規割り当て対象（toAdd）の教材がマスタに存在するか検証。 */
  private async assertTextbooksExist(effects: AssignmentEffects): Promise<void> {
    const ids = [...new Set(effects.toAdd.map((a) => a.textbookId.value))];
    for (const tid of ids) {
      const textbook = await this.textbooks.findById(TextbookId.create(tid));
      if (!textbook) throw new DomainError('教材が見つかりません');
    }
  }

  private async applyEffects(memberId: string, effects: AssignmentEffects, graduateDate: string): Promise<void> {
    for (const a of effects.toAdd) {
      const assignment = TextbookAssignment.create({
        memberId,
        textbookId: a.textbookId.value,
        dailyGoalMinutes: a.dailyGoalMinutes,
        note: a.note,
      });
      await this.assignments.save(assignment); // upsert（冪等）
    }
    for (const tid of effects.toRemove) {
      await this.assignments.delete(MemberId.create(memberId), tid);
    }
    for (const tid of effects.toGraduate) {
      const current = await this.assignments.find(MemberId.create(memberId), tid);
      if (current) {
        await this.assignments.save(current.graduate(graduateDate));
      }
    }
  }
}

/** 通常コーチングの次の回数（既存の最大+1、最低2）。 */
function nextCoachingNumber(existing: CoachingRecord[]): number {
  const numbers = existing
    .filter((r) => r.type === '通常コーチング')
    .map((r) => (r as { coachingNumber: number }).coachingNumber);
  return numbers.length ? Math.max(...numbers) + 1 : 2;
}

function toDto(r: CoachingRecord): CoachingRecordDto {
  const base: CoachingRecordDto = {
    id: r.id.value,
    memberId: r.memberId.value,
    type: r.type,
    date: r.date.value,
    coachName: r.coachName,
  };
  switch (r.type) {
    case '教材選定':
      return {
        ...base,
        selectedTextbooks: r.selectedTextbooks.map((s) => ({
          textbookId: s.textbookId.value,
          dailyGoalMinutes: s.dailyGoalMinutes,
          note: s.note,
        })),
        sharedNote: r.sharedNote,
      };
    case 'オリエンテーション':
    case 'その他':
      return {
        ...base,
        monthlyReview: r.monthlyReview,
        coachAdvice: r.coachAdvice,
        otherNotes: r.otherNotes,
      };
    case '初回コーチング':
    case '通常コーチング':
      return {
        ...base,
        coachingNumber: r.coachingNumber,
        monthlyReview: r.monthlyReview,
        coachAdvice: r.coachAdvice,
        otherNotes: r.otherNotes,
        textbookTests: r.textbookTests.map((t) => ({
          textbookId: t.textbookId.value,
          testStatus: t.testStatus,
          range: t.range,
          format: t.format,
          score: t.score,
          note: t.note,
          nextStatus: t.nextStatus,
        })),
      };
  }
}
