import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  primaryKey,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';

// ───────────────────────── マスタ系 ─────────────────────────

export const textbooks = pgTable('textbooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  textbookCode: text('textbook_code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  unit: text('unit').notNull(),
  color: text('color').notNull(),
  colorName: text('color_name'),
  iconUrl: text('icon_url'),
  manualUrl: text('manual_url'),
  note: text('note'),
});

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    staffCode: text('staff_code').notNull().unique(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    iconUrl: text('icon_url'),
    meetUrl: text('meet_url'),
    groupContent: text('group_content'),
  },
  (t) => [check('staff_role_check', sql`${t.role} IN ('Coach','Teacher','Consultant','CS')`)],
);

// 集約ルート（1. 基本情報）。受講情報・連絡先などはセクション単位でサテライト分割（下記、全て PK=member_id・1:1）。
export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberCode: text('member_code').notNull().unique(),
  lastNameKanji: text('last_name_kanji').notNull(),
  firstNameKanji: text('first_name_kanji').notNull(),
  lastNameKana: text('last_name_kana').notNull(),
  firstNameKana: text('first_name_kana').notNull(),
  lastNameAlpha: text('last_name_alpha').notNull(),
  firstNameAlpha: text('first_name_alpha').notNull(),
  nickname: text('nickname'),
  gender: text('gender'),
  birthDate: text('birth_date'),
  occupation: text('occupation'),
  occupationNote: text('occupation_note'),
  dismissedCoachingReminderId: uuid('dismissed_coaching_reminder_id'),
});

// 2. 連絡先
export const memberContacts = pgTable('member_contacts', {
  memberId: uuid('member_id')
    .primaryKey()
    .references(() => members.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  phone: text('phone'),
});

// 3. 受講情報
export const memberEnrollments = pgTable(
  'member_enrollments',
  {
    memberId: uuid('member_id')
      .primaryKey()
      .references(() => members.id, { onDelete: 'cascade' }),
    plan: text('plan').notNull(),
    manualStatusOverride: text('manual_status_override'),
    enrollmentDate: text('enrollment_date'),
    startDate: text('start_date'),
    graduateDate: text('graduate_date'),
    initialClass: text('initial_class').notNull(),
    currentClass: text('current_class').notNull(),
    nativecamp: text('nativecamp').notNull(),
    dailyTargetMinutes: integer('daily_target_minutes').notNull(),
  },
  (t) => [
    check('member_enrollments_nativecamp_check', sql`${t.nativecamp} IN ('導入済み','未導入','未選択')`),
    check(
      'member_enrollments_manual_status_check',
      sql`${t.manualStatusOverride} IS NULL OR ${t.manualStatusOverride} IN ('入学手続き中','受講中','休会中','卒業','継続中','再入学手続き中','途中退会')`,
    ),
  ],
);

// 4. 担当者（会員⨯スタッフのジャンクション。役割ごと1行・複合PK・サロゲートなし）
// 「その他」選択時はそもそも行を作らない（NULL行も作らない）。
export const memberStaffAssignments = pgTable(
  'member_staff_assignments',
  {
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ columns: [t.memberId, t.role] }),
    check('member_assignment_role_check', sql`${t.role} IN ('Consultant','CS','Orient')`),
  ],
);

// 5. 在住・渡航情報
export const memberResidenceTravels = pgTable('member_residence_travels', {
  memberId: uuid('member_id')
    .primaryKey()
    .references(() => members.id, { onDelete: 'cascade' }),
  residence: text('residence'),
  residenceOverseas: text('residence_overseas'),
  travelCountry: text('travel_country'),
  travelCity: text('travel_city'),
  travelDate: text('travel_date'),
  travelReason: text('travel_reason'),
  travelNote: text('travel_note'),
});

// 6. 直近の英語スコア
export const memberEnglishScores = pgTable('member_english_scores', {
  memberId: uuid('member_id')
    .primaryKey()
    .references(() => members.id, { onDelete: 'cascade' }),
  toeicLr: integer('toeic_lr'),
  toeicSw: integer('toeic_sw'),
  toefl: integer('toefl'),
  ielts: text('ielts'),
  eiken: text('eiken'),
  englishOther: text('english_other'),
});

// 7. コーチ入力
export const memberCoachInputs = pgTable('member_coach_inputs', {
  memberId: uuid('member_id')
    .primaryKey()
    .references(() => members.id, { onDelete: 'cascade' }),
  coachLearningGoal: text('coach_learning_goal'),
  note: text('note'),
});

// ───────────────────────── 認証情報（本体から分離・1:1） ─────────────────────────

export const memberCredentials = pgTable('member_credentials', {
  memberId: uuid('member_id')
    .primaryKey()
    .references(() => members.id, { onDelete: 'cascade' }),
  loginId: text('login_id').notNull().unique(),
  passwordHash: text('password_hash'),
  requirePasswordChange: boolean('require_password_change'),
});

export const staffCredentials = pgTable('staff_credentials', {
  staffId: uuid('staff_id')
    .primaryKey()
    .references(() => staff.id, { onDelete: 'cascade' }),
  loginId: text('login_id').notNull().unique(),
  passwordHash: text('password_hash'),
});

// ───────────────────────── 会員従属テーブル ─────────────────────────

export const textbookAssignments = pgTable(
  'textbook_assignments',
  {
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    textbookId: uuid('textbook_id')
      .notNull()
      .references(() => textbooks.id, { onDelete: 'restrict' }),
    dailyGoalMinutes: integer('daily_goal_minutes'),
    note: text('note').notNull().default(''),
    status: text('status').notNull().default('継続'),
  },
  (t) => [
    primaryKey({ columns: [t.memberId, t.textbookId] }),
    check('assignment_status_check', sql`${t.status} IN ('継続','卒業')`),
  ],
);

export const learningLogs = pgTable(
  'learning_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    textbookId: uuid('textbook_id')
      .notNull()
      .references(() => textbooks.id, { onDelete: 'restrict' }),
    studiedOn: text('studied_on').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    comment: text('comment').notNull().default(''),
  },
  (t) => [check('learning_log_duration_check', sql`${t.durationMinutes} >= 1`)],
);

export const coachingRecords = pgTable(
  'coaching_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    heldOn: text('held_on').notNull(),
    coachName: text('coach_name').notNull(),
    sharedNote: text('shared_note'),
    monthlyReview: text('monthly_review'),
    coachAdvice: text('coach_advice'),
    otherNotes: text('other_notes'),
    coachingNumber: integer('coaching_number'),
  },
  (t) => [
    check(
      'coaching_type_check',
      sql`${t.type} IN ('教材選定','オリエンテーション','初回コーチング','通常コーチング')`,
    ),
    check(
      'coaching_number_check',
      sql`${t.coachingNumber} IS NULL OR ${t.coachingNumber} >= 2`,
    ),
    // 通常コーチング以外は会員1件のみ
    uniqueIndex('uq_coaching_once')
      .on(t.memberId, t.type)
      .where(sql`${t.type} <> '通常コーチング'`),
    // 通常コーチングの回数重複不可（他typeは coaching_number NULL）
    uniqueIndex('uq_coaching_number').on(t.memberId, t.coachingNumber),
  ],
);

export const coachingRecordTextbookTests = pgTable(
  'coaching_record_textbook_tests',
  {
    coachingRecordId: uuid('coaching_record_id')
      .notNull()
      .references(() => coachingRecords.id, { onDelete: 'cascade' }),
    textbookId: uuid('textbook_id')
      .notNull()
      .references(() => textbooks.id, { onDelete: 'restrict' }),
    testStatus: text('test_status').notNull().default('未選択'),
    testRange: text('test_range'),
    format: text('format'),
    score: text('score'),
    note: text('note'),
    nextStatus: text('next_status').notNull().default('未選択'),
  },
  (t) => [
    primaryKey({ columns: [t.coachingRecordId, t.textbookId] }),
    check('test_status_check', sql`${t.testStatus} IN ('実施済み','未実施','未選択')`),
    check('next_status_check', sql`${t.nextStatus} IN ('卒業','継続','未選択')`),
  ],
);

export const progosScores = pgTable(
  'progos_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    examDate: text('exam_date').notNull(),
    overall: text('overall').notNull(),
    rangeLevel: text('range_level').notNull(),
    accuracy: text('accuracy').notNull(),
    fluency: text('fluency').notNull(),
    interaction: text('interaction').notNull(),
    coherence: text('coherence').notNull(),
    phonology: text('phonology').notNull(),
    comment: text('comment'),
  },
  (t) => [
    check(
      'progos_cefr_check',
      sql`${t.overall} IN ('A1','A2','B1','B2','C1','C2')
        AND ${t.rangeLevel} IN ('A1','A2','B1','B2','C1','C2')
        AND ${t.accuracy} IN ('A1','A2','B1','B2','C1','C2')
        AND ${t.fluency} IN ('A1','A2','B1','B2','C1','C2')
        AND ${t.interaction} IN ('A1','A2','B1','B2','C1','C2')
        AND ${t.coherence} IN ('A1','A2','B1','B2','C1','C2')
        AND ${t.phonology} IN ('A1','A2','B1','B2','C1','C2')`,
    ),
  ],
);

export const continuationPlans = pgTable(
  'continuation_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    planType: text('plan_type').notNull(),
    months: integer('months').notNull(),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    note: text('note'),
  },
  (t) => [check('continuation_months_check', sql`${t.months} BETWEEN 1 AND 6`)],
);

// ───────────────────────── Row 型 ─────────────────────────
export type TextbookRow = typeof textbooks.$inferSelect;
export type NewTextbookRow = typeof textbooks.$inferInsert;
export type MemberRow = typeof members.$inferSelect;
export type NewMemberRow = typeof members.$inferInsert;
export type NewMemberContactRow = typeof memberContacts.$inferInsert;
export type NewMemberEnrollmentRow = typeof memberEnrollments.$inferInsert;
export type NewMemberStaffAssignmentRow = typeof memberStaffAssignments.$inferInsert;
export type NewMemberResidenceTravelRow = typeof memberResidenceTravels.$inferInsert;
export type NewMemberEnglishScoreRow = typeof memberEnglishScores.$inferInsert;
export type NewMemberCoachInputRow = typeof memberCoachInputs.$inferInsert;
export type MemberCredentialRow = typeof memberCredentials.$inferSelect;
export type NewMemberCredentialRow = typeof memberCredentials.$inferInsert;
