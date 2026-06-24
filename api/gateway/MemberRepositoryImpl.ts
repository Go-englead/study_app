import { Database } from '../db/client';
import * as memberDriver from '../driver/memberDriver';
import { MemberFullRow, MemberRowBundle } from '../driver/memberDriver';
import { NewMemberStaffAssignmentRow } from '../db/schema';
import { Email, DateOnly } from '../domain/shared/value-objects';
import {
  Member,
  MemberId,
  MemberStatus,
  NativecampStatus,
  PlanType,
  EnglishScores,
} from '../domain/member/member';
import { MemberRepository, MemberSearchCriteria } from '../domain/member/member-repository';

// ───────────────────── Row → ドメイン（保存済みデータは検証済みとして信頼） ─────────────────────
function toEnglishScores(r: MemberFullRow): EnglishScores | undefined {
  const es: EnglishScores = {
    toeicLR: r.toeicLr ?? undefined,
    toeicSW: r.toeicSw ?? undefined,
    toefl: r.toefl ?? undefined,
    ielts: r.ielts ?? undefined,
    eiken: r.eiken ?? undefined,
    other: r.englishOther ?? undefined,
  };
  return Object.values(es).some((v) => v !== undefined) ? es : undefined;
}

function toDomain(r: MemberFullRow): Member {
  const hasTravel =
    r.travelCountry || r.travelCity || r.travelDate || r.travelReason || r.travelNote;
  const staffIdOf = (role: string) => r.assignments.find((a) => a.role === role)?.staffId;
  return {
    id: r.id as MemberId,
    code: r.memberCode,
    name: {
      lastNameKanji: r.lastNameKanji,
      firstNameKanji: r.firstNameKanji,
      lastNameKana: r.lastNameKana,
      firstNameKana: r.firstNameKana,
      lastNameAlpha: r.lastNameAlpha,
      firstNameAlpha: r.firstNameAlpha,
      nickname: r.nickname ?? undefined,
    },
    // 連絡先メール（member_contacts 由来）。認証情報は member_credentials 由来。
    email: r.email as Email,
    credential:
      r.passwordHash != null
        ? { password: r.passwordHash, requirePasswordChange: r.requirePasswordChange ?? false }
        : undefined,
    gender: r.gender ?? undefined,
    birthDate: (r.birthDate ?? undefined) as DateOnly | undefined,
    phone: r.phone ?? undefined,
    occupation: r.occupation ?? undefined,
    occupationNote: r.occupationNote ?? undefined,
    residence: r.residence ?? undefined,
    residenceOverseas: r.residenceOverseas ?? undefined,
    plan: r.plan as PlanType,
    manualStatusOverride: (r.manualStatusOverride ?? undefined) as MemberStatus | undefined,
    enrollmentDate: (r.enrollmentDate ?? undefined) as DateOnly | undefined,
    enrollmentPeriod: {
      startDate: (r.startDate ?? undefined) as DateOnly | undefined,
      graduateDate: (r.graduateDate ?? undefined) as DateOnly | undefined,
    },
    classLevel: { initial: r.initialClass, current: r.currentClass },
    nativecamp: r.nativecamp as NativecampStatus,
    dailyTargetMinutes: r.dailyTargetMinutes,
    travelPlan: hasTravel
      ? {
          country: r.travelCountry ?? undefined,
          city: r.travelCity ?? undefined,
          travelDate: (r.travelDate ?? undefined) as DateOnly | undefined,
          reason: r.travelReason ?? undefined,
          note: r.travelNote ?? undefined,
        }
      : undefined,
    englishScores: toEnglishScores(r),
    coachLearningGoal: r.coachLearningGoal ?? undefined,
    note: r.note ?? undefined,
    consultantStaffId: staffIdOf('Consultant'),
    csStaffId: staffIdOf('CS'),
    orientStaffId: staffIdOf('Orient'),
    dismissedCoachingReminderId: r.dismissedCoachingReminderId ?? undefined,
  };
}

// ───────────────────── ドメイン → 全テーブル行のバンドル ─────────────────────
function toBundle(m: Member): MemberRowBundle {
  const assignments: NewMemberStaffAssignmentRow[] = [];
  if (m.consultantStaffId)
    assignments.push({ memberId: m.id, role: 'Consultant', staffId: m.consultantStaffId });
  if (m.csStaffId) assignments.push({ memberId: m.id, role: 'CS', staffId: m.csStaffId });
  if (m.orientStaffId)
    assignments.push({ memberId: m.id, role: 'Orient', staffId: m.orientStaffId });

  return {
    // 1. 基本情報
    member: {
      id: m.id,
      memberCode: m.code,
      lastNameKanji: m.name.lastNameKanji,
      firstNameKanji: m.name.firstNameKanji,
      lastNameKana: m.name.lastNameKana,
      firstNameKana: m.name.firstNameKana,
      lastNameAlpha: m.name.lastNameAlpha,
      firstNameAlpha: m.name.firstNameAlpha,
      nickname: m.name.nickname ?? null,
      gender: m.gender ?? null,
      birthDate: m.birthDate ?? null,
      occupation: m.occupation ?? null,
      occupationNote: m.occupationNote ?? null,
      dismissedCoachingReminderId: m.dismissedCoachingReminderId ?? null,
    },
    // 2. 連絡先
    contact: {
      memberId: m.id,
      email: m.email,
      phone: m.phone ?? null,
    },
    // 3. 受講情報
    enrollment: {
      memberId: m.id,
      plan: m.plan,
      manualStatusOverride: m.manualStatusOverride ?? null,
      enrollmentDate: m.enrollmentDate ?? null,
      startDate: m.enrollmentPeriod.startDate ?? null,
      graduateDate: m.enrollmentPeriod.graduateDate ?? null,
      initialClass: m.classLevel.initial,
      currentClass: m.classLevel.current,
      nativecamp: m.nativecamp,
      dailyTargetMinutes: m.dailyTargetMinutes,
    },
    // 5. 在住・渡航
    residenceTravel: {
      memberId: m.id,
      residence: m.residence ?? null,
      residenceOverseas: m.residenceOverseas ?? null,
      travelCountry: m.travelPlan?.country ?? null,
      travelCity: m.travelPlan?.city ?? null,
      travelDate: m.travelPlan?.travelDate ?? null,
      travelReason: m.travelPlan?.reason ?? null,
      travelNote: m.travelPlan?.note ?? null,
    },
    // 6. 英語スコア
    englishScore: {
      memberId: m.id,
      toeicLr: m.englishScores?.toeicLR ?? null,
      toeicSw: m.englishScores?.toeicSW ?? null,
      toefl: m.englishScores?.toefl ?? null,
      ielts: m.englishScores?.ielts ?? null,
      eiken: m.englishScores?.eiken ?? null,
      englishOther: m.englishScores?.other ?? null,
    },
    // 7. コーチ入力
    coachInput: {
      memberId: m.id,
      coachLearningGoal: m.coachLearningGoal ?? null,
      note: m.note ?? null,
    },
    // 認証情報
    credential: {
      memberId: m.id,
      loginId: m.email,
      passwordHash: m.credential?.password ?? null,
      requirePasswordChange: m.credential?.requirePasswordChange ?? null,
    },
    // 4. 担当者（「その他」は含めない）
    assignments,
  };
}

/** MemberRepository の実装（gateway層）。driver で Row を取得し、ドメインを組み立てて返す。 */
export class MemberRepositoryImpl implements MemberRepository {
  constructor(private readonly db: Database) {}

  async findById(id: MemberId): Promise<Member | undefined> {
    const row = await memberDriver.findById(this.db, id);
    return row ? toDomain(row) : undefined;
  }

  async findByEmail(email: Email): Promise<Member | undefined> {
    const row = await memberDriver.findByEmail(this.db, email);
    return row ? toDomain(row) : undefined;
  }

  async findAll(): Promise<Member[]> {
    const rows = await memberDriver.findAll(this.db);
    return rows.map(toDomain);
  }

  async search(criteria: MemberSearchCriteria): Promise<Member[]> {
    const rows = await memberDriver.search(this.db, criteria);
    return rows.map(toDomain);
  }

  async save(member: Member): Promise<void> {
    await memberDriver.upsert(this.db, toBundle(member));
  }

  async saveAll(list: readonly Member[]): Promise<void> {
    for (const member of list) {
      await memberDriver.upsert(this.db, toBundle(member));
    }
  }

  async delete(id: MemberId): Promise<void> {
    await memberDriver.deleteById(this.db, id);
  }
}
