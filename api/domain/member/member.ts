import { DomainError } from '../shared/domain-error';
import { Email, DateOnly } from '../shared/value-objects';
import { ContinuationPlan, ContinuationPlanId } from '../continuation-plan/continuation-plan';

// ═══════════════════════ 識別子（VO クラス） ═══════════════════════
export class MemberId {
  private constructor(readonly value: string) {}
  static create(raw: string): MemberId {
    const v = (raw ?? '').trim();
    if (!v) throw new DomainError('会員IDは必須です');
    return new MemberId(v);
  }
}

// ═══════════════════════ 値オブジェクト（構造体は interface・検証は Member の static に集約） ═══════════════════════
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
export type PersonNameInput = {
  lastNameKanji: string;
  firstNameKanji: string;
  lastNameKana: string;
  firstNameKana: string;
  lastNameAlpha: string;
  firstNameAlpha: string;
  nickname?: string;
};

/** 認証情報（パスワード＋初回変更要否） */
export interface Credential {
  readonly password: string;
  readonly requirePasswordChange: boolean;
}

/** プラン種別（VO クラス） */
export type PlanTypeName =
  | '6ヶ月プラン'
  | '給付金6ヶ月プラン'
  | '給付金9ヶ月プラン'
  | '給付金12ヶ月プラン';
export class PlanType {
  private static readonly NAMES: readonly PlanTypeName[] = [
    '6ヶ月プラン',
    '給付金6ヶ月プラン',
    '給付金9ヶ月プラン',
    '給付金12ヶ月プラン',
  ];
  private constructor(readonly name: PlanTypeName) {}
  static create(raw: string): PlanType {
    if (!(PlanType.NAMES as readonly string[]).includes(raw)) {
      throw new DomainError(`プラン種別が不正です: ${raw}`);
    }
    return new PlanType(raw as PlanTypeName);
  }
}

/** クラスレベル（入学時／現在） */
export interface ClassLevel {
  readonly initial: string;
  readonly current: string;
}

export type NativecampStatus = '導入済み' | '未導入' | '未選択';

/** 受講期間 */
export interface EnrollmentPeriod {
  readonly startDate?: DateOnly;
  readonly graduateDate?: DateOnly;
}

/** 休会期間 */
export interface SuspensionPeriod {
  readonly from: DateOnly;
  readonly until: DateOnly;
}

/** 渡航計画 */
export interface TravelPlan {
  readonly country?: string;
  readonly city?: string;
  readonly travelDate?: DateOnly;
  readonly reason?: string;
  readonly note?: string;
}
export type TravelPlanInput = {
  country?: string;
  city?: string;
  travelDate?: string;
  reason?: string;
  note?: string;
};

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

const MIN_PASSWORD_LENGTH = 8;

export interface CreateMemberInput {
  /** UUID（アプリ側で採番して渡す） */
  id: string;
  /** 会員番号（業務コード。フォーム入力） */
  code: string;
  name: PersonNameInput;
  email: string;
  /** パスワードは任意（登録フォームに無い。指定時のみ認証情報を持つ） */
  password?: string;
  requirePasswordChange?: boolean;
  plan: string;
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
  travel?: TravelPlanInput;
  englishScores?: EnglishScores;
  coachLearningGoal?: string;
  note?: string;
  consultantStaffId?: string;
  csStaffId?: string;
  orientStaffId?: string;
}

export interface UpdateMemberInput {
  name?: PersonNameInput;
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
  travel?: TravelPlanInput;
  englishScores?: EnglishScores;
  coachLearningGoal?: string;
  note?: string;
  consultantStaffId?: string;
  csStaffId?: string;
  orientStaffId?: string;
  /** 手動ステータス変更（途中退会 等）。null を渡すと解除 */
  manualStatusOverride?: MemberStatus | null;
}

/** Member の全プロパティ（構築・再構成・差分更新の単位）。 */
export interface MemberProps {
  id: MemberId;
  code: string;
  name: PersonName;
  email: Email;
  credential?: Credential;
  gender?: string;
  birthDate?: DateOnly;
  phone?: string;
  occupation?: string;
  occupationNote?: string;
  residence?: string;
  residenceOverseas?: string;
  plan: PlanType;
  manualStatusOverride?: MemberStatus;
  enrollmentDate?: DateOnly;
  enrollmentPeriod: EnrollmentPeriod;
  classLevel: ClassLevel;
  nativecamp: NativecampStatus;
  dailyTargetMinutes: number;
  travelPlan?: TravelPlan;
  suspension?: SuspensionPeriod;
  englishScores?: EnglishScores;
  coachLearningGoal?: string;
  note?: string;
  consultantStaffId?: string;
  csStaffId?: string;
  orientStaffId?: string;
  dismissedCoachingReminderId?: string;
  /** 継続プラン履歴（サテライト。会員保存トランザクションで一緒に永続化）。 */
  continuationPlans: readonly ContinuationPlan[];
}

// ═══════════════════════ 集約ルート：Member ═══════════════════════
export class Member {
  readonly id!: MemberId;
  readonly code!: string;
  readonly name!: PersonName;
  readonly email!: Email;
  /** 認証情報。会員登録フォームにパスワード欄は無く、別途発行されるため任意。 */
  readonly credential?: Credential;
  readonly gender?: string;
  readonly birthDate?: DateOnly;
  readonly phone?: string;
  readonly occupation?: string;
  readonly occupationNote?: string;
  readonly residence?: string;
  readonly residenceOverseas?: string;
  readonly plan!: PlanType;
  /** 手動で設定したステータス（途中退会 等）。設定時のみ保持し、実効ステータス算出で最優先。 */
  readonly manualStatusOverride?: MemberStatus;
  /** オリエンテーション実施日 */
  readonly enrollmentDate?: DateOnly;
  readonly enrollmentPeriod!: EnrollmentPeriod;
  readonly classLevel!: ClassLevel;
  readonly nativecamp!: NativecampStatus;
  readonly dailyTargetMinutes!: number;
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
  /** 継続プラン履歴（開始日昇順）。 */
  readonly continuationPlans!: readonly ContinuationPlan[];

  private constructor(props: MemberProps) {
    Object.assign(this, props);
  }

  /** 表示名（姓 名・漢字）。 */
  get displayName(): string {
    return `${this.name.lastNameKanji} ${this.name.firstNameKanji}`;
  }
  /** イニシャル（姓・漢字の先頭1文字）。 */
  get initial(): string {
    return this.name.lastNameKanji.charAt(0);
  }

  update(patch: UpdateMemberInput): Member {
    if (
      patch.dailyTargetMinutes !== undefined &&
      (!Number.isFinite(patch.dailyTargetMinutes) || patch.dailyTargetMinutes < 0)
    ) {
      throw new DomainError('1日の目標学習時間は0以上で指定してください');
    }
    return new Member({
      ...this,
      name: patch.name ? Member.personName(patch.name) : this.name,
      email: patch.email ? Email.create(patch.email) : this.email,
      plan: patch.plan ? PlanType.create(patch.plan) : this.plan,
      enrollmentDate: patch.enrollmentDate ? DateOnly.create(patch.enrollmentDate) : this.enrollmentDate,
      enrollmentPeriod:
        patch.startDate !== undefined || patch.graduateDate !== undefined
          ? Member.enrollmentPeriod(
              patch.startDate ?? (this.enrollmentPeriod.startDate as string | undefined),
              patch.graduateDate ?? (this.enrollmentPeriod.graduateDate as string | undefined),
            )
          : this.enrollmentPeriod,
      classLevel:
        patch.initialClass !== undefined || patch.currentClass !== undefined
          ? Member.classLevel(
              patch.initialClass ?? this.classLevel.initial,
              patch.currentClass ?? this.classLevel.current,
            )
          : this.classLevel,
      nativecamp: patch.nativecamp ?? this.nativecamp,
      dailyTargetMinutes: patch.dailyTargetMinutes ?? this.dailyTargetMinutes,
      gender: patch.gender ?? this.gender,
      birthDate: patch.birthDate ? DateOnly.create(patch.birthDate) : this.birthDate,
      phone: patch.phone ?? this.phone,
      occupation: patch.occupation ?? this.occupation,
      occupationNote: patch.occupationNote ?? this.occupationNote,
      residence: patch.residence ?? this.residence,
      residenceOverseas: patch.residenceOverseas ?? this.residenceOverseas,
      travelPlan: patch.travel ? Member.travelPlan(patch.travel) : this.travelPlan,
      englishScores: patch.englishScores ?? this.englishScores,
      coachLearningGoal: patch.coachLearningGoal ?? this.coachLearningGoal,
      note: patch.note ?? this.note,
      consultantStaffId: patch.consultantStaffId ?? this.consultantStaffId,
      csStaffId: patch.csStaffId ?? this.csStaffId,
      orientStaffId: patch.orientStaffId ?? this.orientStaffId,
      manualStatusOverride:
        patch.manualStatusOverride === undefined
          ? this.manualStatusOverride
          : patch.manualStatusOverride === null
            ? undefined
            : patch.manualStatusOverride,
    });
  }

  /** コーチング予約リマインダーを「予約完了」で抑制する。 */
  dismissCoachingReminder(latestCoachingId: string): Member {
    return new Member({ ...this, dismissedCoachingReminderId: latestCoachingId });
  }

  /**
   * 実効ステータスを読み取り時に計算する（保存しない）。
   * 優先順位：手動オーバーライド(途中退会) > 休会 > 継続/再入学 > 受講期間
   */
  computeStatus(today: DateOnly = DateOnly.today()): MemberStatus {
    if (this.manualStatusOverride) return this.manualStatusOverride;

    const s = this.suspension;
    if (s && s.from.lte(today) && today.lte(s.until)) return '休会中';

    // 継続プラン：開始日が最も新しいプランで判定。
    //  開始日が未来 → 再入学手続き中 / 開始済みで期間中 → 継続中 / 期間終了 → 日付ベースへ。
    const latest = [...this.continuationPlans].sort((a, b) => (a.startDate.lt(b.startDate) ? 1 : -1))[0];
    if (latest) {
      if (latest.startDate.isFuture(today)) return '再入学手続き中';
      if (today.lte(latest.endDate)) return '継続中';
    }

    const { startDate, graduateDate } = this.enrollmentPeriod;
    if (!startDate || startDate.isFuture(today)) return '入学手続き中';
    // 卒業予定日「当日」までは受講中（today ≤ 卒業予定日）。翌日以降（卒業予定日 < today）が卒業。
    if (!graduateDate || today.lte(graduateDate)) return '受講中';
    return '卒業';
  }

  /** 途中退会にする（唯一の手動ステータス。日付では判断できないため人が操作）。 */
  withdraw(): Member {
    return new Member({ ...this, manualStatusOverride: '途中退会' });
  }

  /** 途中退会を取り消す（手動オーバーライドを解除し、ステータスを日付からの自動算出へ戻す）。 */
  reinstate(): Member {
    return new Member({ ...this, manualStatusOverride: undefined });
  }

  // ── 継続プラン（サテライト操作。開始日昇順で保持） ──
  private withPlans(plans: readonly ContinuationPlan[], applyGraduateDate: boolean, endDate?: DateOnly): Member {
    const sorted = [...plans].sort((a, b) => (a.startDate.lt(b.startDate) ? -1 : 1));
    // 「卒業予定日に反映」が ON のときは会員の卒業予定日をプラン終了日へ更新。
    const enrollmentPeriod =
      applyGraduateDate && endDate
        ? { startDate: this.enrollmentPeriod.startDate, graduateDate: endDate }
        : this.enrollmentPeriod;
    return new Member({ ...this, continuationPlans: sorted, enrollmentPeriod });
  }

  /** 継続プランを追加（applyGraduateDate=true で卒業予定日を終了日に反映）。 */
  addContinuationPlan(plan: ContinuationPlan, applyGraduateDate = false): Member {
    return this.withPlans([...this.continuationPlans, plan], applyGraduateDate, plan.endDate);
  }

  /** 継続プランを更新（同一IDを置換）。 */
  updateContinuationPlan(plan: ContinuationPlan, applyGraduateDate = false): Member {
    if (!this.continuationPlans.some((p) => p.id.value === plan.id.value)) {
      throw new DomainError('編集対象の継続プランが見つかりません');
    }
    const next = this.continuationPlans.map((p) => (p.id.value === plan.id.value ? plan : p));
    return this.withPlans(next, applyGraduateDate, plan.endDate);
  }

  /** 継続プランを削除。 */
  removeContinuationPlan(planId: ContinuationPlanId): Member {
    const next = this.continuationPlans.filter((p) => p.id.value !== planId.value);
    return this.withPlans(next, false);
  }

  static create(input: CreateMemberInput): Member {
    if (!Number.isFinite(input.dailyTargetMinutes) || input.dailyTargetMinutes < 0) {
      throw new DomainError('1日の目標学習時間は0以上で指定してください');
    }
    if (!input.code?.trim()) throw new DomainError('会員番号は必須です');
    return new Member({
      id: MemberId.create(input.id),
      code: input.code,
      name: Member.personName(input.name),
      email: Email.create(input.email),
      credential: input.password
        ? Member.credential(input.password, input.requirePasswordChange ?? false)
        : undefined,
      plan: PlanType.create(input.plan),
      manualStatusOverride: input.manualStatusOverride,
      enrollmentDate: input.enrollmentDate ? DateOnly.create(input.enrollmentDate) : undefined,
      enrollmentPeriod: Member.enrollmentPeriod(input.startDate, input.graduateDate),
      classLevel: Member.classLevel(input.initialClass, input.currentClass),
      nativecamp: input.nativecamp ?? '未選択',
      dailyTargetMinutes: input.dailyTargetMinutes,
      gender: input.gender,
      birthDate: input.birthDate ? DateOnly.create(input.birthDate) : undefined,
      phone: input.phone,
      occupation: input.occupation,
      occupationNote: input.occupationNote,
      residence: input.residence,
      residenceOverseas: input.residenceOverseas,
      travelPlan: input.travel ? Member.travelPlan(input.travel) : undefined,
      englishScores: input.englishScores,
      coachLearningGoal: input.coachLearningGoal,
      note: input.note,
      consultantStaffId: input.consultantStaffId,
      csStaffId: input.csStaffId,
      orientStaffId: input.orientStaffId,
      continuationPlans: [],
    });
  }

  /** 永続データから再構成（DB 値は検証済みとして信頼）。 */
  static reconstitute(props: MemberProps): Member {
    return new Member(props);
  }

  // ── 値オブジェクトの生成・検証（トップレベル関数にしない＝Member の static に集約） ──
  private static personName(input: PersonNameInput): PersonName {
    if (!input.lastNameKanji?.trim() || !input.firstNameKanji?.trim()) {
      throw new DomainError('姓・名（漢字）は必須です');
    }
    return { ...input };
  }

  private static credential(password: string, requirePasswordChange: boolean): Credential {
    if ((password ?? '').length < MIN_PASSWORD_LENGTH) {
      throw new DomainError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上で設定してください`);
    }
    return { password, requirePasswordChange };
  }

  private static classLevel(initialClass: string, currentClass: string): ClassLevel {
    if (!initialClass?.trim() || !currentClass?.trim()) {
      throw new DomainError('クラス（入学時・現在）は必須です');
    }
    return { initial: initialClass, current: currentClass };
  }

  private static enrollmentPeriod(startDate?: string, graduateDate?: string): EnrollmentPeriod {
    const start = startDate ? DateOnly.create(startDate) : undefined;
    const graduate = graduateDate ? DateOnly.create(graduateDate) : undefined;
    if (start && graduate && !start.lte(graduate)) {
      throw new DomainError('受講開始日は卒業予定日以前である必要があります');
    }
    return { startDate: start, graduateDate: graduate };
  }

  private static travelPlan(input: TravelPlanInput): TravelPlan {
    const travelDate = input.travelDate ? DateOnly.create(input.travelDate) : undefined;
    if (travelDate && !travelDate.isFuture()) {
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
}
