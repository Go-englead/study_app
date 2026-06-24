import { Brand } from '../shared/brand';
import { DomainError } from '../shared/domain-error';
import {
  Email,
  createEmail,
  DateOnly,
  createDateOnly,
  dateLte,
  isFuture,
  todayDateOnly,
} from '../shared/value-objects';

// ═══════════════════════ 識別子 ═══════════════════════
export type MemberId = Brand<string, 'MemberId'>;

export function createMemberId(raw: string): MemberId {
  const value = (raw ?? '').trim();
  if (!value) throw new DomainError('会員IDは必須です');
  return value as MemberId;
}

// ═══════════════════════ 値オブジェクト ═══════════════════════

/** 氏名（漢字・カナ・アルファベットの3表記） */
export interface PersonName {
  readonly lastNameKanji: string;
  readonly firstNameKanji: string;
  readonly lastNameKana: string;
  readonly firstNameKana: string;
  readonly lastNameAlpha: string;
  readonly firstNameAlpha: string;
  readonly nickname?: string;
}

export function createPersonName(input: {
  lastNameKanji: string;
  firstNameKanji: string;
  lastNameKana: string;
  firstNameKana: string;
  lastNameAlpha: string;
  firstNameAlpha: string;
  nickname?: string;
}): PersonName {
  if (!input.lastNameKanji?.trim() || !input.firstNameKanji?.trim()) {
    throw new DomainError('姓・名（漢字）は必須です');
  }
  return { ...input };
}

export function displayName(n: PersonName): string {
  return `${n.lastNameKanji} ${n.firstNameKanji}`;
}

export function initial(n: PersonName): string {
  return n.lastNameKanji.charAt(0);
}

/** 認証情報（パスワード＋初回変更要否） */
export interface Credential {
  readonly password: string;
  readonly requirePasswordChange: boolean;
}

const MIN_PASSWORD_LENGTH = 8;

export function createCredential(password: string, requirePasswordChange = false): Credential {
  if ((password ?? '').length < MIN_PASSWORD_LENGTH) {
    throw new DomainError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上で設定してください`);
  }
  return { password, requirePasswordChange };
}

/** 初回ログイン時などのパスワード変更。仮PWと異なる・8文字以上が条件。 */
export function changePassword(current: Credential, newPassword: string): Credential {
  if ((newPassword ?? '').length < MIN_PASSWORD_LENGTH) {
    throw new DomainError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上で設定してください`);
  }
  if (newPassword === current.password) {
    throw new DomainError('仮パスワードと異なるパスワードを設定してください');
  }
  return { password: newPassword, requirePasswordChange: false };
}

/** プラン種別 */
export type PlanType =
  | '6ヶ月プラン'
  | '給付金6ヶ月プラン'
  | '給付金9ヶ月プラン'
  | '給付金12ヶ月プラン';

const PLAN_TYPES: readonly PlanType[] = [
  '6ヶ月プラン',
  '給付金6ヶ月プラン',
  '給付金9ヶ月プラン',
  '給付金12ヶ月プラン',
];

export function createPlanType(raw: string): PlanType {
  if (!(PLAN_TYPES as readonly string[]).includes(raw)) {
    throw new DomainError(`プラン種別が不正です: ${raw}`);
  }
  return raw as PlanType;
}

/** クラスレベル（入学時／現在） */
export interface ClassLevel {
  readonly initial: string;
  readonly current: string;
}

export function createClassLevel(initialClass: string, currentClass: string): ClassLevel {
  if (!initialClass?.trim() || !currentClass?.trim()) {
    throw new DomainError('クラス（入学時・現在）は必須です');
  }
  return { initial: initialClass, current: currentClass };
}

export type NativecampStatus = '導入済み' | '未導入' | '未選択';

/** 受講期間 */
export interface EnrollmentPeriod {
  readonly startDate?: DateOnly;
  readonly graduateDate?: DateOnly;
}

export function createEnrollmentPeriod(startDate?: string, graduateDate?: string): EnrollmentPeriod {
  const start = startDate ? createDateOnly(startDate) : undefined;
  const graduate = graduateDate ? createDateOnly(graduateDate) : undefined;
  if (start && graduate && !dateLte(start, graduate)) {
    throw new DomainError('受講開始日は卒業予定日以前である必要があります');
  }
  return { startDate: start, graduateDate: graduate };
}

/** 休会期間 */
export interface SuspensionPeriod {
  readonly from: DateOnly;
  readonly until: DateOnly;
}

export function createSuspensionPeriod(from: string, until: string): SuspensionPeriod {
  const f = createDateOnly(from);
  const u = createDateOnly(until);
  if (!dateLte(f, u)) {
    throw new DomainError('休会開始日は終了日以前である必要があります');
  }
  return { from: f, until: u };
}

/** 渡航計画 */
export interface TravelPlan {
  readonly country?: string;
  readonly city?: string;
  readonly travelDate?: DateOnly;
  readonly reason?: string;
  readonly note?: string;
}

export function createTravelPlan(input: {
  country?: string;
  city?: string;
  travelDate?: string;
  reason?: string;
  note?: string;
}): TravelPlan {
  const travelDate = input.travelDate ? createDateOnly(input.travelDate) : undefined;
  if (travelDate && !isFuture(travelDate)) {
    throw new DomainError('渡航時期は未来日で設定してください');
  }
  return {
    country: input.country,
    city: input.city,
    travelDate,
    reason: input.reason,
    note: input.note,
  };
}

export interface EnglishScores {
  readonly toeicLR?: number;
  readonly toeicSW?: number;
  readonly toefl?: number;
  readonly ielts?: string;
  readonly eiken?: string;
  readonly other?: string;
}

/** 会員ステータス（DBには保存しない計算値。手動オーバーライドのみ保存） */
export type MemberStatus =
  | '入学手続き中'
  | '受講中'
  | '休会中'
  | '卒業'
  | '継続中'
  | '再入学手続き中'
  | '途中退会';

// ═══════════════════════ 集約ルート：Member ═══════════════════════
export interface Member {
  readonly id: MemberId;
  /** 会員番号（業務コード。例 '10001'）。id(UUID) とは別の自然キー。 */
  readonly code: string;
  readonly name: PersonName;
  readonly email: Email;
  /** 認証情報。会員登録フォームにパスワード欄は無く、別途発行されるため任意。 */
  readonly credential?: Credential;
  readonly gender?: string;
  readonly birthDate?: DateOnly;
  readonly phone?: string;
  readonly occupation?: string;
  readonly occupationNote?: string;
  readonly residence?: string;
  readonly residenceOverseas?: string;
  readonly plan: PlanType;
  /** 手動で設定したステータス（途中退会 等）。設定時のみ保持し、実効ステータス算出で最優先。 */
  readonly manualStatusOverride?: MemberStatus;
  /** オリエンテーション実施日 */
  readonly enrollmentDate?: DateOnly;
  readonly enrollmentPeriod: EnrollmentPeriod;
  readonly classLevel: ClassLevel;
  readonly nativecamp: NativecampStatus;
  readonly dailyTargetMinutes: number;
  readonly travelPlan?: TravelPlan;
  readonly suspension?: SuspensionPeriod;
  readonly englishScores?: EnglishScores;
  readonly coachLearningGoal?: string;
  readonly note?: string;
  /** 担当コンサルタントのスタッフID。「その他」/未割り当ては undefined（担当行を作らない） */
  readonly consultantStaffId?: string;
  /** 担当CSのスタッフID。同上 */
  readonly csStaffId?: string;
  /** オリエン担当のスタッフID。同上 */
  readonly orientStaffId?: string;
  /** 予約完了で消したコーチング予約リマインダーの対象コーチングID（抑制用） */
  readonly dismissedCoachingReminderId?: string;
}

export interface CreateMemberInput {
  /** UUID（アプリ側で採番して渡す） */
  id: string;
  /** 会員番号（業務コード。フォーム入力） */
  code: string;
  name: Parameters<typeof createPersonName>[0];
  email: string;
  /** パスワードは任意（登録フォームに無い。指定時のみ認証情報を持つ） */
  password?: string;
  requirePasswordChange?: boolean;
  plan: string;
  /** 手動ステータス（途中退会 等）。日付から導けないもののみ指定。 */
  manualStatusOverride?: MemberStatus;
  enrollmentDate?: string;
  startDate?: string;
  graduateDate?: string;
  initialClass: string;
  currentClass: string;
  nativecamp?: NativecampStatus;
  dailyTargetMinutes: number;
  gender?: string;
  birthDate?: string;
  phone?: string;
  occupation?: string;
  occupationNote?: string;
  residence?: string;
  residenceOverseas?: string;
  travel?: Parameters<typeof createTravelPlan>[0];
  englishScores?: EnglishScores;
  coachLearningGoal?: string;
  note?: string;
  /** 担当コンサルタントのスタッフID（undefined なら担当行なし） */
  consultantStaffId?: string;
  /** 担当CSのスタッフID（undefined なら担当行なし） */
  csStaffId?: string;
  /** オリエン担当のスタッフID（undefined なら担当行なし） */
  orientStaffId?: string;
}

export function createMember(input: CreateMemberInput): Member {
  if (!Number.isFinite(input.dailyTargetMinutes) || input.dailyTargetMinutes < 0) {
    throw new DomainError('1日の目標学習時間は0以上で指定してください');
  }
  if (!input.code?.trim()) {
    throw new DomainError('会員番号は必須です');
  }
  return {
    id: createMemberId(input.id),
    code: input.code,
    name: createPersonName(input.name),
    email: createEmail(input.email),
    credential: input.password
      ? createCredential(input.password, input.requirePasswordChange ?? false)
      : undefined,
    plan: createPlanType(input.plan),
    manualStatusOverride: input.manualStatusOverride,
    enrollmentDate: input.enrollmentDate ? createDateOnly(input.enrollmentDate) : undefined,
    enrollmentPeriod: createEnrollmentPeriod(input.startDate, input.graduateDate),
    classLevel: createClassLevel(input.initialClass, input.currentClass),
    nativecamp: input.nativecamp ?? '未選択',
    dailyTargetMinutes: input.dailyTargetMinutes,
    gender: input.gender,
    birthDate: input.birthDate ? createDateOnly(input.birthDate) : undefined,
    phone: input.phone,
    occupation: input.occupation,
    occupationNote: input.occupationNote,
    residence: input.residence,
    residenceOverseas: input.residenceOverseas,
    travelPlan: input.travel ? createTravelPlan(input.travel) : undefined,
    englishScores: input.englishScores,
    coachLearningGoal: input.coachLearningGoal,
    note: input.note,
    consultantStaffId: input.consultantStaffId,
    csStaffId: input.csStaffId,
    orientStaffId: input.orientStaffId,
  };
}

export interface UpdateMemberInput {
  name?: Parameters<typeof createPersonName>[0];
  email?: string;
  plan?: string;
  enrollmentDate?: string;
  startDate?: string;
  graduateDate?: string;
  initialClass?: string;
  currentClass?: string;
  nativecamp?: NativecampStatus;
  dailyTargetMinutes?: number;
  gender?: string;
  birthDate?: string;
  phone?: string;
  occupation?: string;
  occupationNote?: string;
  residence?: string;
  residenceOverseas?: string;
  travel?: Parameters<typeof createTravelPlan>[0];
  englishScores?: EnglishScores;
  coachLearningGoal?: string;
  note?: string;
  consultantStaffId?: string;
  csStaffId?: string;
  orientStaffId?: string;
  /** 手動ステータス変更（途中退会 等）。null を渡すと解除 */
  manualStatusOverride?: MemberStatus | null;
}

export function updateMember(current: Member, patch: UpdateMemberInput): Member {
  if (
    patch.dailyTargetMinutes !== undefined &&
    (!Number.isFinite(patch.dailyTargetMinutes) || patch.dailyTargetMinutes < 0)
  ) {
    throw new DomainError('1日の目標学習時間は0以上で指定してください');
  }
  const initialClass = patch.initialClass ?? current.classLevel.initial;
  const currentClass = patch.currentClass ?? current.classLevel.current;
  return {
    ...current,
    name: patch.name ? createPersonName(patch.name) : current.name,
    email: patch.email ? createEmail(patch.email) : current.email,
    plan: patch.plan ? createPlanType(patch.plan) : current.plan,
    enrollmentDate: patch.enrollmentDate
      ? createDateOnly(patch.enrollmentDate)
      : current.enrollmentDate,
    enrollmentPeriod:
      patch.startDate !== undefined || patch.graduateDate !== undefined
        ? createEnrollmentPeriod(
            patch.startDate ?? current.enrollmentPeriod.startDate,
            patch.graduateDate ?? current.enrollmentPeriod.graduateDate,
          )
        : current.enrollmentPeriod,
    classLevel:
      patch.initialClass !== undefined || patch.currentClass !== undefined
        ? createClassLevel(initialClass, currentClass)
        : current.classLevel,
    nativecamp: patch.nativecamp ?? current.nativecamp,
    dailyTargetMinutes: patch.dailyTargetMinutes ?? current.dailyTargetMinutes,
    gender: patch.gender ?? current.gender,
    birthDate: patch.birthDate ? createDateOnly(patch.birthDate) : current.birthDate,
    phone: patch.phone ?? current.phone,
    occupation: patch.occupation ?? current.occupation,
    occupationNote: patch.occupationNote ?? current.occupationNote,
    residence: patch.residence ?? current.residence,
    residenceOverseas: patch.residenceOverseas ?? current.residenceOverseas,
    travelPlan: patch.travel ? createTravelPlan(patch.travel) : current.travelPlan,
    englishScores: patch.englishScores ?? current.englishScores,
    coachLearningGoal: patch.coachLearningGoal ?? current.coachLearningGoal,
    note: patch.note ?? current.note,
    consultantStaffId: patch.consultantStaffId ?? current.consultantStaffId,
    csStaffId: patch.csStaffId ?? current.csStaffId,
    orientStaffId: patch.orientStaffId ?? current.orientStaffId,
    manualStatusOverride:
      patch.manualStatusOverride === undefined
        ? current.manualStatusOverride
        : patch.manualStatusOverride === null
          ? undefined
          : patch.manualStatusOverride,
  };
}

/** コーチング予約リマインダーを「予約完了」で抑制する */
export function dismissCoachingReminder(current: Member, latestCoachingId: string): Member {
  return { ...current, dismissedCoachingReminderId: latestCoachingId };
}

// ═══════════════════════ ドメインサービス：ステータス判定 ═══════════════════════
/**
 * 実効ステータスを読み取り時に計算する（保存しない）。
 * 優先順位：手動オーバーライド(途中退会) > 休会 > 継続 > 受講期間
 */
export function computeMemberStatus(
  member: Member,
  continuationPlans: readonly { startDate: DateOnly; endDate: DateOnly }[] = [],
  today: DateOnly = todayDateOnly(),
): MemberStatus {
  // 1. 手動オーバーライド（途中退会 等）
  if (member.manualStatusOverride) return member.manualStatusOverride;

  // 2. 休会
  const s = member.suspension;
  if (s && dateLte(s.from, today) && dateLte(today, s.until)) return '休会中';

  // 3. 継続（最新プランの終了日が今日以降）
  const latest = [...continuationPlans].sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
  if (latest && dateLte(today, latest.endDate)) return '継続中';

  // 4. 受講期間
  const { startDate, graduateDate } = member.enrollmentPeriod;
  if (!startDate || isFuture(startDate, today)) return '入学手続き中';
  if (!graduateDate || today < graduateDate) return '受講中';
  return '卒業';
}
