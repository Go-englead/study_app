import { z } from 'zod'
import type { MemberInput } from './types'

// 画面の選択肢（admin.html のフォームに準拠）
export const PLANS = ['6ヶ月プラン', '給付金6ヶ月プラン', '給付金9ヶ月プラン', '給付金12ヶ月プラン'] as const
export const STATUSES = ['入学手続き中', '再入学手続き中', '受講中', '継続中', '休会中', '卒業', '途中退会'] as const
export const CLASSES = ['Beginner', 'Lower-Intermediate', 'Intermediate & Above', 'Higher Education Prep'] as const
export const NATIVECAMPS = ['未選択', '未導入', '導入済み'] as const
export const GENDERS = ['男性', '女性', 'その他'] as const
export const OCCUPATIONS = [
  '会社員', '経営者・役員', '自営業・フリーランス', '公務員', '大学・大学院生',
  '中学・高校生', 'パート・アルバイト', '無職', 'その他',
] as const
export const RESIDENCES = ['日本', '海外'] as const
export const TRAVEL_COUNTRIES = ['オーストラリア', 'カナダ', 'イギリス', 'ニュージーランド', 'フィリピン', 'その他', '未決定'] as const
export const TRAVEL_REASONS = ['語学学校', 'ワーキングホリデー', '進学（大学・大学院）', '高校留学', '海外就職', 'その他'] as const

const optStr = z.string().trim().optional()
const optNum = z
  .union([z.coerce.number(), z.literal('')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))

export const memberFormSchema = z.object({
  // 1. 基本情報
  code: z.string().trim().min(1, '会員IDは必須です'),
  lastNameKanji: z.string().trim().min(1, '姓（漢字）は必須です'),
  firstNameKanji: z.string().trim().min(1, '名（漢字）は必須です'),
  lastNameKana: optStr,
  firstNameKana: optStr,
  lastNameAlpha: optStr,
  firstNameAlpha: optStr,
  nickname: optStr,
  gender: optStr,
  birthDate: optStr,
  occupation: optStr,
  occupationNote: optStr,
  // 2. 連絡先
  email: z.string().trim().email('メールアドレスの形式が不正です'),
  phone: optStr,
  // 3. 受講情報
  plan: z.enum(PLANS, { message: '入会プランを選択してください' }),
  enrollmentDate: optStr,
  orientStaffId: optStr,
  startDate: optStr,
  graduateDate: optStr,
  initialClass: z.enum(CLASSES, { message: '入学時クラスを選択してください' }),
  currentClass: z.enum(CLASSES, { message: '現在のクラスを選択してください' }),
  nativecamp: z.enum(NATIVECAMPS, { message: 'ネイティブキャンプを選択してください' }),
  dailyTargetMinutes: z.coerce.number().min(1, '1以上').max(1440, '1440以下'),
  // 4. 担当者（staffId or 'OTHER'）
  consultantStaffId: optStr,
  csStaffId: optStr,
  // 5. 在住・渡航
  residence: optStr,
  residenceOverseas: optStr,
  travelCountry: optStr,
  travelCity: optStr,
  travelDate: optStr,
  travelReason: optStr,
  travelNote: optStr,
  // 6. 英語スコア
  scoreToeicLR: optNum,
  scoreToeicSW: optNum,
  scoreToefl: optNum,
  scoreIelts: optStr,
  scoreEiken: optStr,
  scoreOther: optStr,
  // 7. コーチ入力
  coachLearningGoal: optStr,
  note: optStr,
})

export type MemberFormValues = z.input<typeof memberFormSchema>

/** バリデーション済みフォーム値 → API リクエスト（空文字は送らない） */
export function toMemberInput(v: z.output<typeof memberFormSchema>): MemberInput {
  const clean = (x: string | undefined) => (x === '' || x === undefined ? undefined : x)
  return {
    code: v.code,
    lastNameKanji: v.lastNameKanji,
    firstNameKanji: v.firstNameKanji,
    lastNameKana: clean(v.lastNameKana),
    firstNameKana: clean(v.firstNameKana),
    lastNameAlpha: clean(v.lastNameAlpha),
    firstNameAlpha: clean(v.firstNameAlpha),
    nickname: clean(v.nickname),
    gender: clean(v.gender),
    birthDate: clean(v.birthDate),
    occupation: clean(v.occupation),
    occupationNote: clean(v.occupationNote),
    email: v.email,
    phone: clean(v.phone),
    plan: v.plan,
    enrollmentDate: clean(v.enrollmentDate),
    orientStaffId: clean(v.orientStaffId),
    startDate: clean(v.startDate),
    graduateDate: clean(v.graduateDate),
    initialClass: v.initialClass,
    currentClass: v.currentClass,
    nativecamp: v.nativecamp,
    dailyTargetMinutes: v.dailyTargetMinutes,
    consultantStaffId: clean(v.consultantStaffId),
    csStaffId: clean(v.csStaffId),
    residence: clean(v.residence),
    residenceOverseas: clean(v.residenceOverseas),
    travelCountry: clean(v.travelCountry),
    travelCity: clean(v.travelCity),
    travelDate: clean(v.travelDate),
    travelReason: clean(v.travelReason),
    travelNote: clean(v.travelNote),
    scoreToeicLR: v.scoreToeicLR,
    scoreToeicSW: v.scoreToeicSW,
    scoreToefl: v.scoreToefl,
    scoreIelts: clean(v.scoreIelts),
    scoreEiken: clean(v.scoreEiken),
    scoreOther: clean(v.scoreOther),
    coachLearningGoal: clean(v.coachLearningGoal),
    note: clean(v.note),
  }
}

/** Member 詳細 → フォーム初期値（編集プリセット） */
export function memberToFormValues(m: {
  code?: string
  lastNameKanji?: string
  firstNameKanji?: string
  lastNameKana?: string
  firstNameKana?: string
  lastNameAlpha?: string
  firstNameAlpha?: string
  nickname?: string
  gender?: string
  birthDate?: string
  occupation?: string
  occupationNote?: string
  email?: string
  phone?: string
  plan?: string
  enrollmentDate?: string
  orientStaffId?: string
  startDate?: string
  graduateDate?: string
  initialClass?: string
  currentClass?: string
  nativecamp?: string
  dailyTargetMinutes?: number
  consultantStaffId?: string
  csStaffId?: string
  residence?: string
  residenceOverseas?: string
  travelCountry?: string
  travelCity?: string
  travelDate?: string
  travelReason?: string
  travelNote?: string
  englishScores?: { toeicLR?: number; toeicSW?: number; toefl?: number; ielts?: string; eiken?: string; other?: string }
  coachLearningGoal?: string
  note?: string
}): Partial<MemberFormValues> {
  return {
    code: m.code ?? '',
    lastNameKanji: m.lastNameKanji ?? '',
    firstNameKanji: m.firstNameKanji ?? '',
    lastNameKana: m.lastNameKana ?? '',
    firstNameKana: m.firstNameKana ?? '',
    lastNameAlpha: m.lastNameAlpha ?? '',
    firstNameAlpha: m.firstNameAlpha ?? '',
    nickname: m.nickname ?? '',
    gender: m.gender ?? '',
    birthDate: m.birthDate ?? '',
    occupation: m.occupation ?? '',
    occupationNote: m.occupationNote ?? '',
    email: m.email ?? '',
    phone: m.phone ?? '',
    plan: m.plan as MemberFormValues['plan'],
    enrollmentDate: m.enrollmentDate ?? '',
    orientStaffId: m.orientStaffId ?? '',
    startDate: m.startDate ?? '',
    graduateDate: m.graduateDate ?? '',
    initialClass: m.initialClass as MemberFormValues['initialClass'],
    currentClass: m.currentClass as MemberFormValues['currentClass'],
    nativecamp: m.nativecamp as MemberFormValues['nativecamp'],
    dailyTargetMinutes: m.dailyTargetMinutes ?? 60,
    consultantStaffId: m.consultantStaffId ?? '',
    csStaffId: m.csStaffId ?? '',
    residence: m.residence ?? '',
    residenceOverseas: m.residenceOverseas ?? '',
    travelCountry: m.travelCountry ?? '',
    travelCity: m.travelCity ?? '',
    travelDate: m.travelDate ?? '',
    travelReason: m.travelReason ?? '',
    travelNote: m.travelNote ?? '',
    scoreToeicLR: m.englishScores?.toeicLR ?? '',
    scoreToeicSW: m.englishScores?.toeicSW ?? '',
    scoreToefl: m.englishScores?.toefl ?? '',
    scoreIelts: m.englishScores?.ielts ?? '',
    scoreEiken: m.englishScores?.eiken ?? '',
    scoreOther: m.englishScores?.other ?? '',
    coachLearningGoal: m.coachLearningGoal ?? '',
    note: m.note ?? '',
  }
}
