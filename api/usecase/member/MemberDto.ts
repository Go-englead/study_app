import {
  Member,
  MemberStatus,
  EnglishScores,
  displayName,
  initial,
  computeMemberStatus,
} from '../../domain/member/member';

/**
 * UseCase 専用 DTO（アプリケーション層の出力）。
 * ドメインの値オブジェクトを平坦化し、ステータスは計算済みで持つ。
 * Controller はこの DTO を OpenAPI の Response 型へ変換する。
 */
export interface MemberDto {
  id: string;
  /** 会員番号（業務コード） */
  code: string;
  /** 表示名（例「見本 一郎」） */
  name: string;
  /** 姓のイニシャル */
  initial: string;
  // 編集フォームのプリセット用に氏名6分割も持つ
  lastNameKanji: string;
  firstNameKanji: string;
  lastNameKana: string;
  firstNameKana: string;
  lastNameAlpha: string;
  firstNameAlpha: string;
  nickname?: string;
  email: string;
  /** 計算済みの会員ステータス */
  status: MemberStatus;
  plan: string;
  gender?: string;
  birthDate?: string;
  phone?: string;
  occupation?: string;
  occupationNote?: string;
  residence?: string;
  residenceOverseas?: string;
  enrollmentDate?: string;
  startDate?: string;
  graduateDate?: string;
  initialClass: string;
  currentClass: string;
  nativecamp: string;
  dailyTargetMinutes: number;
  travelCountry?: string;
  travelCity?: string;
  travelDate?: string;
  travelReason?: string;
  travelNote?: string;
  englishScores?: EnglishScores;
  coachLearningGoal?: string;
  note?: string;
  consultantStaffId?: string;
  csStaffId?: string;
  orientStaffId?: string;
}

/** ドメイン Member → UseCase DTO（ステータスは compute-on-read） */
export function toMemberDto(member: Member): MemberDto {
  return {
    id: member.id,
    code: member.code,
    name: displayName(member.name),
    initial: initial(member.name),
    lastNameKanji: member.name.lastNameKanji,
    firstNameKanji: member.name.firstNameKanji,
    lastNameKana: member.name.lastNameKana,
    firstNameKana: member.name.firstNameKana,
    lastNameAlpha: member.name.lastNameAlpha,
    firstNameAlpha: member.name.firstNameAlpha,
    nickname: member.name.nickname,
    email: member.email,
    status: computeMemberStatus(member),
    plan: member.plan,
    gender: member.gender,
    birthDate: member.birthDate,
    phone: member.phone,
    occupation: member.occupation,
    occupationNote: member.occupationNote,
    residence: member.residence,
    residenceOverseas: member.residenceOverseas,
    enrollmentDate: member.enrollmentDate,
    startDate: member.enrollmentPeriod.startDate,
    graduateDate: member.enrollmentPeriod.graduateDate,
    initialClass: member.classLevel.initial,
    currentClass: member.classLevel.current,
    nativecamp: member.nativecamp,
    dailyTargetMinutes: member.dailyTargetMinutes,
    travelCountry: member.travelPlan?.country,
    travelCity: member.travelPlan?.city,
    travelDate: member.travelPlan?.travelDate,
    travelReason: member.travelPlan?.reason,
    travelNote: member.travelPlan?.note,
    englishScores: member.englishScores,
    coachLearningGoal: member.coachLearningGoal,
    note: member.note,
    consultantStaffId: member.consultantStaffId,
    csStaffId: member.csStaffId,
    orientStaffId: member.orientStaffId,
  };
}
