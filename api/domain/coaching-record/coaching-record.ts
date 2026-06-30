import { DomainError } from '../shared/domain-error';
import { DateOnly } from '../shared/value-objects';
import { MemberId } from '../member/member';
import { TextbookId } from '../textbook/textbook';

export class CoachingRecordId {
  private constructor(readonly value: string) {}
  static create(raw: string): CoachingRecordId {
    const v = (raw ?? '').trim();
    if (!v) throw new DomainError('コーチング記録IDは必須です');
    return new CoachingRecordId(v);
  }
}

// ───────────────────── 教材割り当てへの効果（effects） ─────────────────────
// コーチング記録集約は「教材割り当て集約をどう操作すべきか」を純粋に値で返す。
// 実際の永続化（textbook_assignments の追加/解除/卒業）は usecase が冪等に適用する。
export interface AssignmentEffect {
  readonly textbookId: TextbookId;
  readonly dailyGoalMinutes: number | null;
  readonly note: string;
}

export interface AssignmentEffects {
  /** 新しく割り当てる（教材選定の教材・セッションでの新教材追加）。 */
  readonly toAdd: readonly AssignmentEffect[];
  /** 割り当てから外す（教材選定の編集で外した教材）。 */
  readonly toRemove: readonly TextbookId[];
  /** 卒業させる（テストで nextStatus='卒業' の教材）。 */
  readonly toGraduate: readonly TextbookId[];
}

/** create/update の戻り値：自分自身の記録＋教材割り当てへの効果。 */
export interface CoachingResult<T extends CoachingRecord> {
  readonly record: T;
  readonly effects: AssignmentEffects;
}

// ───────────────────── 値オブジェクト（構造体は interface・検証は CoachingRecords の static に集約） ─────────────────────
/** 教材選定で選ぶ教材（割り当ての元データ）。 */
export interface SelectedTextbook {
  readonly textbookId: TextbookId;
  readonly dailyGoalMinutes: number | null;
  readonly note: string;
}

export type SelectedTextbookInput = {
  textbookId: string;
  dailyGoalMinutes?: number | null;
  note?: string;
};

/** テスト実施状態（未選択はそもそも保存しない）。 */
export type TestStatus = '実施済み' | '未実施';
/** テスト後の教材の扱い。 */
export type NextTextbookStatus = '卒業' | '継続';

/** 初回・通常コーチングでのテスト記録。 */
export interface TextbookTest {
  readonly textbookId: TextbookId;
  readonly testStatus: TestStatus;
  readonly range: string;
  readonly format: string;
  readonly score: string;
  readonly note: string;
  readonly nextStatus: NextTextbookStatus;
}

export type TextbookTestInput = {
  textbookId: string;
  testStatus: TestStatus;
  range?: string;
  format?: string;
  score?: string;
  note?: string;
  nextStatus?: NextTextbookStatus;
};

// ───────────────────── 種別ごとの具象型（判別可能ユニオン） ─────────────────────
export type CoachingType =
  | '教材選定'
  | 'オリエンテーション'
  | '初回コーチング'
  | '通常コーチング'
  | 'その他';

interface CoachingRecordBase {
  readonly id: CoachingRecordId;
  readonly memberId: MemberId;
  readonly date: DateOnly;
  readonly coachName: string;
}

/** 自由記述3項目（オリエン・初回・通常・その他が共通で持つ）。 */
interface FreeTextFields {
  readonly monthlyReview: string;
  readonly coachAdvice: string;
  readonly otherNotes: string;
}

/** 教材選定 */
export interface TextbookSelectionRecord extends CoachingRecordBase {
  readonly type: '教材選定';
  readonly selectedTextbooks: readonly SelectedTextbook[];
  readonly sharedNote: string;
}

/** オリエンテーション（自由記述のみ・テストなし） */
export interface OrientationRecord extends CoachingRecordBase, FreeTextFields {
  readonly type: 'オリエンテーション';
}

/** その他（自由記述のみ・テストなし） */
export interface OtherRecord extends CoachingRecordBase, FreeTextFields {
  readonly type: 'その他';
}

/** コーチング（初回/通常）が共通で持つ：自由記述＋回数＋テスト内容。 */
interface CoachingSessionBase extends CoachingRecordBase, FreeTextFields {
  /** 何回目か。初回=1 / 通常>=2。 */
  readonly coachingNumber: number;
  readonly textbookTests: readonly TextbookTest[];
}

/** 初回コーチング（coachingNumber=1） */
export interface FirstCoachingRecord extends CoachingSessionBase {
  readonly type: '初回コーチング';
}

/** 通常コーチング（coachingNumber>=2） */
export interface RegularCoachingRecord extends CoachingSessionBase {
  readonly type: '通常コーチング';
}

/** コーチング記録（種別の和）。 */
export type CoachingRecord =
  | TextbookSelectionRecord
  | OrientationRecord
  | FirstCoachingRecord
  | RegularCoachingRecord
  | OtherRecord;

/** テスト内容を持つ種別（初回・通常）。 */
export type CoachingSessionRecord = FirstCoachingRecord | RegularCoachingRecord;
/** 自由記述のみの種別（オリエン・その他）。 */
export type FreeTextRecord = OrientationRecord | OtherRecord;

// ───────────────────── 入力型 ─────────────────────
export interface CreateTextbookSelectionInput {
  id: string;
  memberId: string;
  date: string;
  coachName: string;
  selectedTextbooks: SelectedTextbookInput[];
  sharedNote?: string;
}

export interface CreateSessionInput {
  id: string;
  memberId: string;
  date: string;
  coachName: string;
  monthlyReview?: string;
  coachAdvice?: string;
  otherNotes?: string;
  textbookTests?: TextbookTestInput[];
  /** 「＋新教材を追加」で新規割り当てする教材（テスト内容とは別入力）。 */
  newAssignments?: SelectedTextbookInput[];
}

export interface CreateRegularCoachingInput extends CreateSessionInput {
  coachingNumber: number;
}

export interface UpdateTextbookSelectionInput {
  date?: string;
  coachName?: string;
  selectedTextbooks?: SelectedTextbookInput[];
  sharedNote?: string;
}

export interface UpdateCoachingSessionInput {
  date?: string;
  coachName?: string;
  monthlyReview?: string;
  coachAdvice?: string;
  otherNotes?: string;
  textbookTests?: TextbookTestInput[];
  newAssignments?: SelectedTextbookInput[];
}

export interface UpdateFreeTextInput {
  date?: string;
  coachName?: string;
  monthlyReview?: string;
  coachAdvice?: string;
  otherNotes?: string;
}

// ═══════════════════════ コーチング記録の生成・更新・整合性（全て static に集約） ═══════════════════════
export class CoachingRecords {
  private static readonly NO_EFFECTS: AssignmentEffects = { toAdd: [], toRemove: [], toGraduate: [] };

  // ── 値オブジェクト生成 ──
  static selectedTextbook(input: SelectedTextbookInput): SelectedTextbook {
    const goal = input.dailyGoalMinutes;
    if (goal !== null && goal !== undefined && (!Number.isFinite(goal) || goal < 0)) {
      throw new DomainError('教材の1日目標分数は0以上で指定してください');
    }
    return {
      textbookId: TextbookId.create(input.textbookId),
      dailyGoalMinutes: goal ?? null,
      note: input.note ?? '',
    };
  }

  static textbookTest(input: TextbookTestInput): TextbookTest {
    if (input.testStatus !== '実施済み' && input.testStatus !== '未実施') {
      throw new DomainError('テスト状態は「実施済み」または「未実施」で指定してください');
    }
    return {
      textbookId: TextbookId.create(input.textbookId),
      testStatus: input.testStatus,
      range: input.range ?? '',
      format: input.format ?? '',
      score: input.score ?? '',
      note: input.note ?? '',
      nextStatus: input.nextStatus ?? '継続',
    };
  }

  // ── create（種別ごと。existing は会員の全コーチング記録） ──
  static textbookSelection(
    input: CreateTextbookSelectionInput,
    existing: readonly CoachingRecord[] = [],
  ): CoachingResult<TextbookSelectionRecord> {
    if (CoachingRecords.findByType(existing, '教材選定')) {
      throw new DomainError('教材選定は既に登録されています（1回のみ登録可能です）');
    }
    const selected = (input.selectedTextbooks ?? []).map((s) => CoachingRecords.selectedTextbook(s));
    CoachingRecords.assertNoDuplicate(selected);
    const record: TextbookSelectionRecord = {
      ...CoachingRecords.baseFrom(input),
      type: '教材選定',
      selectedTextbooks: selected,
      sharedNote: input.sharedNote ?? '',
    };
    const effects: AssignmentEffects = { toAdd: selected.map(CoachingRecords.toEffect), toRemove: [], toGraduate: [] };
    return { record, effects };
  }

  static orientation(
    input: CreateSessionInput,
    existing: readonly CoachingRecord[] = [],
  ): CoachingResult<OrientationRecord> {
    if (CoachingRecords.findByType(existing, 'オリエンテーション')) {
      throw new DomainError('オリエンテーションは既に登録されています（1回のみ登録可能です）');
    }
    const record: OrientationRecord = {
      ...CoachingRecords.baseFrom(input),
      type: 'オリエンテーション',
      ...CoachingRecords.freeTextFrom(input),
    };
    return { record, effects: CoachingRecords.NO_EFFECTS };
  }

  static firstCoaching(
    input: CreateSessionInput,
    existing: readonly CoachingRecord[] = [],
  ): CoachingResult<FirstCoachingRecord> {
    if (CoachingRecords.findByType(existing, '初回コーチング')) {
      throw new DomainError('初回コーチングは既に登録されています（1回のみ登録可能です）');
    }
    const orient = CoachingRecords.findByType(existing, 'オリエンテーション');
    if (!orient) {
      throw new DomainError('オリエンテーションが完了していないので、初回コーチングは登録できません');
    }
    const base = CoachingRecords.baseFrom(input);
    if (!orient.date.lte(base.date)) {
      throw new DomainError('初回コーチングの実施日はオリエンテーションの実施日以降である必要があります');
    }
    const tests = (input.textbookTests ?? []).map((t) => CoachingRecords.textbookTest(t));
    CoachingRecords.assertNoDuplicate(tests);
    const newAssignments = (input.newAssignments ?? []).map((s) => CoachingRecords.selectedTextbook(s));
    const record: FirstCoachingRecord = {
      ...base,
      type: '初回コーチング',
      coachingNumber: 1,
      ...CoachingRecords.freeTextFrom(input),
      textbookTests: tests,
    };
    return { record, effects: CoachingRecords.sessionEffects(newAssignments, tests) };
  }

  static regularCoaching(
    input: CreateRegularCoachingInput,
    existing: readonly CoachingRecord[] = [],
  ): CoachingResult<RegularCoachingRecord> {
    if (!Number.isInteger(input.coachingNumber) || input.coachingNumber < 2) {
      throw new DomainError('通常コーチングの回数は2以上で指定してください');
    }
    const orient = CoachingRecords.findByType(existing, 'オリエンテーション');
    const first = CoachingRecords.findByType(existing, '初回コーチング');
    if (!orient) {
      throw new DomainError('オリエンテーションが完了していないので、通常コーチングは登録できません');
    }
    if (!first) {
      throw new DomainError('初回コーチングが完了していないので、通常コーチングは登録できません');
    }
    const duplicated = existing.some(
      (r) => r.type === '通常コーチング' && r.coachingNumber === input.coachingNumber,
    );
    if (duplicated) {
      throw new DomainError(`${input.coachingNumber}回目の通常コーチングは既に登録されています`);
    }
    const base = CoachingRecords.baseFrom(input);
    if (!first.date.lte(base.date)) {
      throw new DomainError('通常コーチングの実施日は初回コーチングの実施日以降である必要があります');
    }
    const tests = (input.textbookTests ?? []).map((t) => CoachingRecords.textbookTest(t));
    CoachingRecords.assertNoDuplicate(tests);
    const newAssignments = (input.newAssignments ?? []).map((s) => CoachingRecords.selectedTextbook(s));
    const record: RegularCoachingRecord = {
      ...base,
      type: '通常コーチング',
      coachingNumber: input.coachingNumber,
      ...CoachingRecords.freeTextFrom(input),
      textbookTests: tests,
    };
    return { record, effects: CoachingRecords.sessionEffects(newAssignments, tests) };
  }

  static other(
    input: CreateSessionInput,
    _existing: readonly CoachingRecord[] = [],
  ): CoachingResult<OtherRecord> {
    // その他は制約なし（複数登録可）。
    const record: OtherRecord = { ...CoachingRecords.baseFrom(input), type: 'その他', ...CoachingRecords.freeTextFrom(input) };
    return { record, effects: CoachingRecords.NO_EFFECTS };
  }

  // ── update（種別・回数は変更不可。existing は自分を除く既存記録） ──
  static updateTextbookSelection(
    current: TextbookSelectionRecord,
    patch: UpdateTextbookSelectionInput,
  ): CoachingResult<TextbookSelectionRecord> {
    let selectedTextbooks = current.selectedTextbooks;
    if (patch.selectedTextbooks) {
      const selected = patch.selectedTextbooks.map((s) => CoachingRecords.selectedTextbook(s));
      CoachingRecords.assertNoDuplicate(selected);
      selectedTextbooks = selected;
    }
    const date = patch.date ? CoachingRecords.notFuture(DateOnly.create(patch.date)) : current.date;
    const record: TextbookSelectionRecord = {
      ...current,
      date,
      coachName: patch.coachName ?? current.coachName,
      selectedTextbooks,
      sharedNote: patch.sharedNote ?? current.sharedNote,
    };
    const prevIds = new Set(current.selectedTextbooks.map((s) => s.textbookId.value));
    const nextIds = new Set(selectedTextbooks.map((s) => s.textbookId.value));
    const toRemove = [...prevIds].filter((id) => !nextIds.has(id)).map((id) => TextbookId.create(id));
    const effects: AssignmentEffects = {
      toAdd: selectedTextbooks.map(CoachingRecords.toEffect),
      toRemove,
      toGraduate: [],
    };
    return { record, effects };
  }

  /** 初回・通常を型を保ったまま更新（種別・回数は変更不可）。日付の順序制約を再検証。 */
  static updateCoachingSession<T extends CoachingSessionRecord>(
    current: T,
    patch: UpdateCoachingSessionInput,
    existing: readonly CoachingRecord[] = [],
  ): CoachingResult<T> {
    const date = patch.date ? CoachingRecords.notFuture(DateOnly.create(patch.date)) : current.date;
    if (current.type === '初回コーチング') {
      const orient = CoachingRecords.findByType(existing, 'オリエンテーション');
      if (orient && !orient.date.lte(date)) {
        throw new DomainError('初回コーチングの実施日はオリエンテーションの実施日以降である必要があります');
      }
    } else {
      const first = CoachingRecords.findByType(existing, '初回コーチング');
      if (first && !first.date.lte(date)) {
        throw new DomainError('通常コーチングの実施日は初回コーチングの実施日以降である必要があります');
      }
    }
    let tests = current.textbookTests;
    if (patch.textbookTests) {
      tests = patch.textbookTests.map((t) => CoachingRecords.textbookTest(t));
      CoachingRecords.assertNoDuplicate(tests);
    }
    const newAssignments = (patch.newAssignments ?? []).map((s) => CoachingRecords.selectedTextbook(s));
    const record: T = {
      ...current,
      date,
      coachName: patch.coachName ?? current.coachName,
      monthlyReview: patch.monthlyReview ?? current.monthlyReview,
      coachAdvice: patch.coachAdvice ?? current.coachAdvice,
      otherNotes: patch.otherNotes ?? current.otherNotes,
      textbookTests: tests,
    };
    return { record, effects: CoachingRecords.sessionEffects(newAssignments, tests) };
  }

  /** オリエン・その他を型を保ったまま更新（自由記述のみ・効果なし）。 */
  static updateFreeText<T extends FreeTextRecord>(
    current: T,
    patch: UpdateFreeTextInput,
  ): CoachingResult<T> {
    const date = patch.date ? CoachingRecords.notFuture(DateOnly.create(patch.date)) : current.date;
    const record: T = {
      ...current,
      date,
      coachName: patch.coachName ?? current.coachName,
      monthlyReview: patch.monthlyReview ?? current.monthlyReview,
      coachAdvice: patch.coachAdvice ?? current.coachAdvice,
      otherNotes: patch.otherNotes ?? current.otherNotes,
    };
    return { record, effects: CoachingRecords.NO_EFFECTS };
  }

  // ── 集合整合性（削除・編集後の検証） ──
  /**
   * 会員のコーチング記録「集合全体」が不変条件を満たすか検証する。
   * 削除後・編集後の集合に対して呼び、依存関係を壊す操作を拒否する。
   */
  static assertSetConsistent(records: readonly CoachingRecord[]): void {
    for (const t of ['教材選定', 'オリエンテーション', '初回コーチング'] as const) {
      if (records.filter((r) => r.type === t).length > 1) {
        throw new DomainError(`${t}が重複しています`);
      }
    }
    const numbers = records
      .filter((r): r is RegularCoachingRecord => r.type === '通常コーチング')
      .map((r) => r.coachingNumber);
    if (new Set(numbers).size !== numbers.length) {
      throw new DomainError('通常コーチングの回数が重複しています');
    }

    const orient = records.find((r) => r.type === 'オリエンテーション');
    const first = records.find((r) => r.type === '初回コーチング');
    const regulars = records.filter((r) => r.type === '通常コーチング');

    if (first) {
      if (!orient) {
        throw new DomainError('オリエンテーションは初回コーチングの前提のため、この操作はできません');
      }
      if (!orient.date.lte(first.date)) {
        throw new DomainError('実施日の順序が不正になります（オリエンテーション→初回コーチング）');
      }
    }
    if (regulars.length > 0) {
      if (!orient) {
        throw new DomainError('オリエンテーションは通常コーチングの前提のため、この操作はできません');
      }
      if (!first) {
        throw new DomainError('初回コーチングは通常コーチングの前提のため、この操作はできません');
      }
      for (const r of regulars) {
        if (!first.date.lte(r.date)) {
          throw new DomainError('実施日の順序が不正になります（初回コーチング→通常コーチング）');
        }
      }
    }
  }

  // ── 内部ヘルパー ──
  private static toEffect(s: SelectedTextbook): AssignmentEffect {
    return { textbookId: s.textbookId, dailyGoalMinutes: s.dailyGoalMinutes, note: s.note };
  }

  private static assertNoDuplicate(items: readonly { textbookId: TextbookId }[]): void {
    const ids = items.map((s) => s.textbookId.value);
    if (new Set(ids).size !== ids.length) {
      throw new DomainError('同一教材を重複して指定することはできません');
    }
  }

  private static baseFrom(input: { id: string; memberId: string; date: string; coachName: string }): CoachingRecordBase {
    if (!input.coachName?.trim()) throw new DomainError('担当コーチは必須です');
    const date = CoachingRecords.notFuture(DateOnly.create(input.date));
    return {
      id: CoachingRecordId.create(input.id),
      memberId: MemberId.create(input.memberId),
      date,
      coachName: input.coachName,
    };
  }

  private static freeTextFrom(input: { monthlyReview?: string; coachAdvice?: string; otherNotes?: string }): FreeTextFields {
    return {
      monthlyReview: input.monthlyReview ?? '',
      coachAdvice: input.coachAdvice ?? '',
      otherNotes: input.otherNotes ?? '',
    };
  }

  private static findByType<T extends CoachingType>(
    existing: readonly CoachingRecord[],
    type: T,
  ): Extract<CoachingRecord, { type: T }> | undefined {
    return existing.find((r) => r.type === type) as Extract<CoachingRecord, { type: T }> | undefined;
  }

  private static sessionEffects(
    newAssignments: readonly SelectedTextbook[],
    tests: readonly TextbookTest[],
  ): AssignmentEffects {
    return {
      toAdd: newAssignments.map(CoachingRecords.toEffect),
      toRemove: [],
      toGraduate: tests.filter((t) => t.nextStatus === '卒業').map((t) => t.textbookId),
    };
  }

  private static notFuture(date: DateOnly): DateOnly {
    if (date.isFuture()) throw new DomainError('実施日は本日以前の日付を指定してください');
    return date;
  }
}
