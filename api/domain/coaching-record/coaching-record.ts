import { Brand } from '../shared/brand';
import { DomainError } from '../shared/domain-error';
import { DateOnly, createDateOnly, dateLte, isFuture } from '../shared/value-objects';
import { MemberId, createMemberId } from '../member/member';
import { TextbookId, createTextbookId } from '../textbook/textbook';

export type CoachingRecordId = Brand<string, 'CoachingRecordId'>;

export function createCoachingRecordId(raw: string): CoachingRecordId {
  const value = (raw ?? '').trim();
  if (!value) throw new DomainError('コーチング記録IDは必須です');
  return value as CoachingRecordId;
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

const NO_EFFECTS: AssignmentEffects = { toAdd: [], toRemove: [], toGraduate: [] };

/** create/update の戻り値：自分自身の記録＋教材割り当てへの効果。 */
export interface CoachingResult<T extends CoachingRecord> {
  readonly record: T;
  readonly effects: AssignmentEffects;
}

// ───────────────────── 値オブジェクト ─────────────────────

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

export function createSelectedTextbook(input: SelectedTextbookInput): SelectedTextbook {
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

function toEffect(s: SelectedTextbook): AssignmentEffect {
  return { textbookId: s.textbookId, dailyGoalMinutes: s.dailyGoalMinutes, note: s.note };
}

function assertNoDuplicateTextbooks(items: readonly { textbookId: TextbookId }[]): void {
  const ids = items.map((s) => s.textbookId);
  if (new Set(ids).size !== ids.length) {
    throw new DomainError('同一教材を重複して指定することはできません');
  }
}

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

export function createTextbookTest(input: TextbookTestInput): TextbookTest {
  if (input.testStatus !== '実施済み' && input.testStatus !== '未実施') {
    throw new DomainError('テスト状態は「実施済み」または「未実施」で指定してください');
  }
  return {
    textbookId: createTextbookId(input.textbookId),
    testStatus: input.testStatus,
    range: input.range ?? '',
    format: input.format ?? '',
    score: input.score ?? '',
    note: input.note ?? '',
    nextStatus: input.nextStatus ?? '継続',
  };
}

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

// ───────────────────── 共通ヘルパー ─────────────────────

function baseFrom(input: { id: string; memberId: string; date: string; coachName: string }): CoachingRecordBase {
  if (!input.coachName?.trim()) throw new DomainError('担当コーチは必須です');
  const date = createDateOnly(input.date);
  if (isFuture(date)) throw new DomainError('実施日は本日以前の日付を指定してください');
  return {
    id: createCoachingRecordId(input.id),
    memberId: createMemberId(input.memberId),
    date,
    coachName: input.coachName,
  };
}

function freeTextFrom(input: { monthlyReview?: string; coachAdvice?: string; otherNotes?: string }): FreeTextFields {
  return {
    monthlyReview: input.monthlyReview ?? '',
    coachAdvice: input.coachAdvice ?? '',
    otherNotes: input.otherNotes ?? '',
  };
}

function findByType<T extends CoachingType>(
  existing: readonly CoachingRecord[],
  type: T,
): Extract<CoachingRecord, { type: T }> | undefined {
  return existing.find((r) => r.type === type) as Extract<CoachingRecord, { type: T }> | undefined;
}

/** セッションのテスト内容から教材割り当てへの効果を導く。 */
function sessionEffects(
  newAssignments: readonly SelectedTextbook[],
  tests: readonly TextbookTest[],
): AssignmentEffects {
  return {
    toAdd: newAssignments.map(toEffect),
    toRemove: [],
    toGraduate: tests.filter((t) => t.nextStatus === '卒業').map((t) => t.textbookId),
  };
}

// ───────────────────── create（種別ごと。existing は会員の全コーチング記録） ─────────────────────

export interface CreateTextbookSelectionInput {
  id: string;
  memberId: string;
  date: string;
  coachName: string;
  selectedTextbooks: SelectedTextbookInput[];
  sharedNote?: string;
}

export function createTextbookSelectionRecord(
  input: CreateTextbookSelectionInput,
  existing: readonly CoachingRecord[] = [],
): CoachingResult<TextbookSelectionRecord> {
  if (findByType(existing, '教材選定')) {
    throw new DomainError('教材選定は既に登録されています（1回のみ登録可能です）');
  }
  const selected = (input.selectedTextbooks ?? []).map(createSelectedTextbook);
  assertNoDuplicateTextbooks(selected);
  const record: TextbookSelectionRecord = {
    ...baseFrom(input),
    type: '教材選定',
    selectedTextbooks: selected,
    sharedNote: input.sharedNote ?? '',
  };
  const effects: AssignmentEffects = { toAdd: selected.map(toEffect), toRemove: [], toGraduate: [] };
  return { record, effects };
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

export function createOrientationRecord(
  input: CreateSessionInput,
  existing: readonly CoachingRecord[] = [],
): CoachingResult<OrientationRecord> {
  if (findByType(existing, 'オリエンテーション')) {
    throw new DomainError('オリエンテーションは既に登録されています（1回のみ登録可能です）');
  }
  const record: OrientationRecord = {
    ...baseFrom(input),
    type: 'オリエンテーション',
    ...freeTextFrom(input),
  };
  return { record, effects: NO_EFFECTS };
}

export function createFirstCoachingRecord(
  input: CreateSessionInput,
  existing: readonly CoachingRecord[] = [],
): CoachingResult<FirstCoachingRecord> {
  if (findByType(existing, '初回コーチング')) {
    throw new DomainError('初回コーチングは既に登録されています（1回のみ登録可能です）');
  }
  const orient = findByType(existing, 'オリエンテーション');
  if (!orient) {
    throw new DomainError('オリエンテーションが完了していないので、初回コーチングは登録できません');
  }
  const base = baseFrom(input);
  if (!dateLte(orient.date, base.date)) {
    throw new DomainError('初回コーチングの実施日はオリエンテーションの実施日以降である必要があります');
  }
  const tests = (input.textbookTests ?? []).map(createTextbookTest);
  assertNoDuplicateTextbooks(tests);
  const newAssignments = (input.newAssignments ?? []).map(createSelectedTextbook);
  const record: FirstCoachingRecord = {
    ...base,
    type: '初回コーチング',
    coachingNumber: 1,
    ...freeTextFrom(input),
    textbookTests: tests,
  };
  return { record, effects: sessionEffects(newAssignments, tests) };
}

export interface CreateRegularCoachingInput extends CreateSessionInput {
  coachingNumber: number;
}

export function createRegularCoachingRecord(
  input: CreateRegularCoachingInput,
  existing: readonly CoachingRecord[] = [],
): CoachingResult<RegularCoachingRecord> {
  if (!Number.isInteger(input.coachingNumber) || input.coachingNumber < 2) {
    throw new DomainError('通常コーチングの回数は2以上で指定してください');
  }
  const orient = findByType(existing, 'オリエンテーション');
  const first = findByType(existing, '初回コーチング');
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
  const base = baseFrom(input);
  if (!dateLte(first.date, base.date)) {
    throw new DomainError('通常コーチングの実施日は初回コーチングの実施日以降である必要があります');
  }
  const tests = (input.textbookTests ?? []).map(createTextbookTest);
  assertNoDuplicateTextbooks(tests);
  const newAssignments = (input.newAssignments ?? []).map(createSelectedTextbook);
  const record: RegularCoachingRecord = {
    ...base,
    type: '通常コーチング',
    coachingNumber: input.coachingNumber,
    ...freeTextFrom(input),
    textbookTests: tests,
  };
  return { record, effects: sessionEffects(newAssignments, tests) };
}

export function createOtherRecord(
  input: CreateSessionInput,
  _existing: readonly CoachingRecord[] = [],
): CoachingResult<OtherRecord> {
  // その他は制約なし（複数登録可）。
  const record: OtherRecord = { ...baseFrom(input), type: 'その他', ...freeTextFrom(input) };
  return { record, effects: NO_EFFECTS };
}

// ───────────────────── update（種別・回数は変更不可。existing は自分を除く既存記録） ─────────────────────

export interface UpdateTextbookSelectionInput {
  date?: string;
  coachName?: string;
  selectedTextbooks?: SelectedTextbookInput[];
  sharedNote?: string;
}

export function updateTextbookSelectionRecord(
  current: TextbookSelectionRecord,
  patch: UpdateTextbookSelectionInput,
): CoachingResult<TextbookSelectionRecord> {
  let selectedTextbooks = current.selectedTextbooks;
  if (patch.selectedTextbooks) {
    const selected = patch.selectedTextbooks.map(createSelectedTextbook);
    assertNoDuplicateTextbooks(selected);
    selectedTextbooks = selected;
  }
  const date = patch.date ? withFutureCheck(createDateOnly(patch.date)) : current.date;
  const record: TextbookSelectionRecord = {
    ...current,
    date,
    coachName: patch.coachName ?? current.coachName,
    selectedTextbooks,
    sharedNote: patch.sharedNote ?? current.sharedNote,
  };
  // 効果：新しい選定を全て upsert（冪等）／前回あって今回ない教材は解除。
  const prevIds = new Set(current.selectedTextbooks.map((s) => s.textbookId as string));
  const nextIds = new Set(selectedTextbooks.map((s) => s.textbookId as string));
  const toRemove = [...prevIds].filter((id) => !nextIds.has(id)) as TextbookId[];
  const effects: AssignmentEffects = {
    toAdd: selectedTextbooks.map(toEffect),
    toRemove,
    toGraduate: [],
  };
  return { record, effects };
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

/** 初回・通常を型を保ったまま更新（種別・回数は変更不可）。日付の順序制約を再検証。 */
export function updateCoachingSessionRecord<T extends CoachingSessionRecord>(
  current: T,
  patch: UpdateCoachingSessionInput,
  existing: readonly CoachingRecord[] = [],
): CoachingResult<T> {
  const date = patch.date ? withFutureCheck(createDateOnly(patch.date)) : current.date;
  if (current.type === '初回コーチング') {
    const orient = findByType(existing, 'オリエンテーション');
    if (orient && !dateLte(orient.date, date)) {
      throw new DomainError('初回コーチングの実施日はオリエンテーションの実施日以降である必要があります');
    }
  } else {
    const first = findByType(existing, '初回コーチング');
    if (first && !dateLte(first.date, date)) {
      throw new DomainError('通常コーチングの実施日は初回コーチングの実施日以降である必要があります');
    }
  }
  let tests = current.textbookTests;
  if (patch.textbookTests) {
    tests = patch.textbookTests.map(createTextbookTest);
    assertNoDuplicateTextbooks(tests);
  }
  const newAssignments = (patch.newAssignments ?? []).map(createSelectedTextbook);
  const record: T = {
    ...current,
    date,
    coachName: patch.coachName ?? current.coachName,
    monthlyReview: patch.monthlyReview ?? current.monthlyReview,
    coachAdvice: patch.coachAdvice ?? current.coachAdvice,
    otherNotes: patch.otherNotes ?? current.otherNotes,
    textbookTests: tests,
  };
  return { record, effects: sessionEffects(newAssignments, tests) };
}

export interface UpdateFreeTextInput {
  date?: string;
  coachName?: string;
  monthlyReview?: string;
  coachAdvice?: string;
  otherNotes?: string;
}

/** オリエン・その他を型を保ったまま更新（自由記述のみ・効果なし）。 */
export function updateFreeTextRecord<T extends FreeTextRecord>(
  current: T,
  patch: UpdateFreeTextInput,
): CoachingResult<T> {
  const date = patch.date ? withFutureCheck(createDateOnly(patch.date)) : current.date;
  const record: T = {
    ...current,
    date,
    coachName: patch.coachName ?? current.coachName,
    monthlyReview: patch.monthlyReview ?? current.monthlyReview,
    coachAdvice: patch.coachAdvice ?? current.coachAdvice,
    otherNotes: patch.otherNotes ?? current.otherNotes,
  };
  return { record, effects: NO_EFFECTS };
}

function withFutureCheck(date: DateOnly): DateOnly {
  if (isFuture(date)) throw new DomainError('実施日は本日以前の日付を指定してください');
  return date;
}
