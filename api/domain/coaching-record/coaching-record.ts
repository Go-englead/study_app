import { Brand } from '../shared/brand';
import { DomainError } from '../shared/domain-error';
import { DateOnly, createDateOnly } from '../shared/value-objects';
import { MemberId, createMemberId } from '../member/member';
import { TextbookId, createTextbookId } from '../textbook/textbook';

export type CoachingRecordId = Brand<string, 'CoachingRecordId'>;

export function createCoachingRecordId(raw: string): CoachingRecordId {
  const value = (raw ?? '').trim();
  if (!value) throw new DomainError('コーチング記録IDは必須です');
  return value as CoachingRecordId;
}

// ───────────────────── 値オブジェクト ─────────────────────

/** 教材選定で選ぶ教材（割り当ての元データ） */
export interface SelectedTextbook {
  readonly textbookId: TextbookId;
  readonly dailyGoalMinutes: number | null;
  readonly note: string;
}

export function createSelectedTextbook(input: {
  textbookId: string;
  dailyGoalMinutes?: number | null;
  note?: string;
}): SelectedTextbook {
  const goal = input.dailyGoalMinutes;
  if (goal !== null && goal !== undefined && (!Number.isFinite(goal) || goal < 0)) {
    throw new DomainError('教材の1日目標分数は0以上で指定してください');
  }
  return {
    textbookId: createTextbookId(input.textbookId),
    dailyGoalMinutes: goal ?? null,
    note: input.note ?? '',
  };
}

export type TestStatus = '実施済み' | '未実施' | '未選択';
export type NextTextbookStatus = '卒業' | '継続' | '未選択';

/** 初回・通常コーチングでのテスト記録 */
export interface TextbookTest {
  readonly textbookId: TextbookId;
  readonly testStatus: TestStatus;
  readonly range: string;
  readonly format: string;
  readonly score: string;
  readonly note: string;
  readonly nextStatus: NextTextbookStatus;
}

export function createTextbookTest(input: {
  textbookId: string;
  testStatus?: TestStatus;
  range?: string;
  format?: string;
  score?: string;
  note?: string;
  nextStatus?: NextTextbookStatus;
}): TextbookTest {
  return {
    textbookId: createTextbookId(input.textbookId),
    testStatus: input.testStatus ?? '未選択',
    range: input.range ?? '',
    format: input.format ?? '',
    score: input.score ?? '',
    note: input.note ?? '',
    nextStatus: input.nextStatus ?? '未選択',
  };
}

// ───────────────────── 種別ごとの具象型（判別可能ユニオン） ─────────────────────

export type CoachingType = '教材選定' | 'オリエンテーション' | '初回コーチング' | '通常コーチング';

interface CoachingRecordBase {
  readonly id: CoachingRecordId;
  readonly memberId: MemberId;
  readonly date: DateOnly;
  readonly coachName: string;
}

/** 教材選定 */
export interface TextbookSelectionRecord extends CoachingRecordBase {
  readonly type: '教材選定';
  readonly selectedTextbooks: readonly SelectedTextbook[];
  readonly sharedNote: string;
}

/** 面談系（オリエン／初回／通常）が共通で持つフィールド */
interface CoachingSessionBase extends CoachingRecordBase {
  readonly monthlyReview: string;
  readonly coachAdvice: string;
  readonly otherNotes: string;
  readonly textbookTests: readonly TextbookTest[];
}

/** オリエンテーション */
export interface OrientationRecord extends CoachingSessionBase {
  readonly type: 'オリエンテーション';
}

/** 初回コーチング */
export interface FirstCoachingRecord extends CoachingSessionBase {
  readonly type: '初回コーチング';
}

/** 通常コーチング（2回目以降） */
export interface RegularCoachingRecord extends CoachingSessionBase {
  readonly type: '通常コーチング';
  readonly coachingNumber: number;
}

/** コーチング記録（種別の和） */
export type CoachingRecord =
  | TextbookSelectionRecord
  | OrientationRecord
  | FirstCoachingRecord
  | RegularCoachingRecord;

/** 面談系の3種 */
export type CoachingSessionRecord = OrientationRecord | FirstCoachingRecord | RegularCoachingRecord;

// ───────────────────── 共通バリデーション ─────────────────────
function baseFrom(input: { id: string; memberId: string; date: string; coachName: string }): CoachingRecordBase {
  if (!input.coachName?.trim()) throw new DomainError('担当コーチは必須です');
  return {
    id: createCoachingRecordId(input.id),
    memberId: createMemberId(input.memberId),
    date: createDateOnly(input.date),
    coachName: input.coachName,
  };
}

// ───────────────────── create（種別ごと） ─────────────────────

export interface CreateTextbookSelectionInput {
  id: string;
  memberId: string;
  date: string;
  coachName: string;
  selectedTextbooks: Parameters<typeof createSelectedTextbook>[0][];
  sharedNote?: string;
}

export function createTextbookSelectionRecord(
  input: CreateTextbookSelectionInput,
): TextbookSelectionRecord {
  const selected = (input.selectedTextbooks ?? []).map(createSelectedTextbook);
  // (memberId, textbookId) の重複は許さない
  const ids = selected.map((s) => s.textbookId);
  if (new Set(ids).size !== ids.length) {
    throw new DomainError('同一教材を重複して選定することはできません');
  }
  return {
    ...baseFrom(input),
    type: '教材選定',
    selectedTextbooks: selected,
    sharedNote: input.sharedNote ?? '',
  };
}

interface CreateSessionInput {
  id: string;
  memberId: string;
  date: string;
  coachName: string;
  monthlyReview?: string;
  coachAdvice?: string;
  otherNotes?: string;
  textbookTests?: Parameters<typeof createTextbookTest>[0][];
}

function sessionFieldsFrom(input: CreateSessionInput) {
  return {
    monthlyReview: input.monthlyReview ?? '',
    coachAdvice: input.coachAdvice ?? '',
    otherNotes: input.otherNotes ?? '',
    textbookTests: (input.textbookTests ?? []).map(createTextbookTest),
  };
}

export function createOrientationRecord(input: CreateSessionInput): OrientationRecord {
  return { ...baseFrom(input), type: 'オリエンテーション', ...sessionFieldsFrom(input) };
}

export function createFirstCoachingRecord(input: CreateSessionInput): FirstCoachingRecord {
  return { ...baseFrom(input), type: '初回コーチング', ...sessionFieldsFrom(input) };
}

export interface CreateRegularCoachingInput extends CreateSessionInput {
  coachingNumber: number;
}

export function createRegularCoachingRecord(
  input: CreateRegularCoachingInput,
): RegularCoachingRecord {
  if (!Number.isInteger(input.coachingNumber) || input.coachingNumber < 2) {
    throw new DomainError('通常コーチングの回数は2以上で指定してください');
  }
  return {
    ...baseFrom(input),
    type: '通常コーチング',
    coachingNumber: input.coachingNumber,
    ...sessionFieldsFrom(input),
  };
}

// ───────────────────── update（種別ごと） ─────────────────────

export interface UpdateTextbookSelectionInput {
  date?: string;
  coachName?: string;
  selectedTextbooks?: Parameters<typeof createSelectedTextbook>[0][];
  sharedNote?: string;
}

export function updateTextbookSelectionRecord(
  current: TextbookSelectionRecord,
  patch: UpdateTextbookSelectionInput,
): TextbookSelectionRecord {
  let selectedTextbooks = current.selectedTextbooks;
  if (patch.selectedTextbooks) {
    const selected = patch.selectedTextbooks.map(createSelectedTextbook);
    const ids = selected.map((s) => s.textbookId);
    if (new Set(ids).size !== ids.length) {
      throw new DomainError('同一教材を重複して選定することはできません');
    }
    selectedTextbooks = selected;
  }
  return {
    ...current,
    date: patch.date ? createDateOnly(patch.date) : current.date,
    coachName: patch.coachName ?? current.coachName,
    selectedTextbooks,
    sharedNote: patch.sharedNote ?? current.sharedNote,
  };
}

export interface UpdateCoachingSessionInput {
  date?: string;
  coachName?: string;
  monthlyReview?: string;
  coachAdvice?: string;
  otherNotes?: string;
  textbookTests?: Parameters<typeof createTextbookTest>[0][];
}

/** 面談系3種を型を保ったまま更新する（コーチング回数・種別は変更不可）。 */
export function updateCoachingSessionRecord<T extends CoachingSessionRecord>(
  current: T,
  patch: UpdateCoachingSessionInput,
): T {
  return {
    ...current,
    date: patch.date ? createDateOnly(patch.date) : current.date,
    coachName: patch.coachName ?? current.coachName,
    monthlyReview: patch.monthlyReview ?? current.monthlyReview,
    coachAdvice: patch.coachAdvice ?? current.coachAdvice,
    otherNotes: patch.otherNotes ?? current.otherNotes,
    textbookTests: patch.textbookTests
      ? patch.textbookTests.map(createTextbookTest)
      : current.textbookTests,
  };
}
