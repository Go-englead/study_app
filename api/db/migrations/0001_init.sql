-- gen_random_uuid() 用（PG13+ はコアにあるが安全策）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────────────────── マスタ系（被参照） ─────────────────────────

-- 教材マスタ
CREATE TABLE IF NOT EXISTS textbooks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  textbook_code text NOT NULL UNIQUE,          -- 業務コード（例 'T01'）
  name          text NOT NULL,
  category      text NOT NULL,
  unit          text NOT NULL,
  color         text NOT NULL,
  color_name    text,
  icon_url      text,
  manual_url    text,
  note          text
);

-- スタッフ
CREATE TABLE IF NOT EXISTS staff (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_code    text NOT NULL UNIQUE,           -- 社員ID（例 'MW001'）
  name          text NOT NULL,
  role          text NOT NULL CHECK (role IN ('Coach', 'Teacher', 'Consultant', 'CS')),
  icon_url      text,
  meet_url      text,
  group_content text
);

-- 会員（集約ルート）。フォームの「1. 基本情報」に対応。
-- 受講情報・連絡先・在住渡航・英語スコア等はセクション単位でサテライト分割（下記、全て PK=member_id・1:1）。
CREATE TABLE IF NOT EXISTS members (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code             text NOT NULL UNIQUE,  -- 会員番号（例 '10001'。フォーム入力）
  last_name_kanji         text NOT NULL,
  first_name_kanji        text NOT NULL,
  last_name_kana          text NOT NULL,
  first_name_kana         text NOT NULL,
  last_name_alpha         text NOT NULL,
  first_name_alpha        text NOT NULL,
  nickname                text,
  gender                  text,
  birth_date              text,
  occupation              text,
  occupation_note         text,
  -- コーチング予約リマインダーの抑制対象。FK は循環参照になるため貼らず uuid のみ保持（アプリで整合）
  dismissed_coaching_reminder_id uuid
);

-- 2. 連絡先
CREATE TABLE IF NOT EXISTS member_contacts (
  member_id  uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  email      text NOT NULL,         -- 連絡先メール（登録時は login_id と同値）
  phone      text
);

-- 3. 受講情報
CREATE TABLE IF NOT EXISTS member_enrollments (
  member_id               uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  plan                    text NOT NULL,
  manual_status_override  text CHECK (manual_status_override IN
                            ('入学手続き中','受講中','休会中','卒業','継続中','再入学手続き中','途中退会')),
  enrollment_date         text,
  start_date              text,
  graduate_date           text,
  initial_class           text NOT NULL,
  current_class           text NOT NULL,
  nativecamp              text NOT NULL CHECK (nativecamp IN ('導入済み','未導入','未選択')),
  daily_target_minutes    integer NOT NULL
);

-- 4. 担当者（会員⨯スタッフのジャンクション・役割ごと1行・複合PK・サロゲートなし）
-- 「その他」選択時はそもそも行を作らない（NULL行も作らない）。
CREATE TABLE IF NOT EXISTS member_staff_assignments (
  member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('Consultant','CS','Orient')),
  staff_id   uuid NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  PRIMARY KEY (member_id, role)
);

-- 5. 在住・渡航情報
CREATE TABLE IF NOT EXISTS member_residence_travels (
  member_id           uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  residence           text,
  residence_overseas  text,
  travel_country      text,
  travel_city         text,
  travel_date         text,
  travel_reason       text,
  travel_note         text
);

-- 6. 直近の英語スコア（列分割。jsonb/カンマ区切りにしない）
CREATE TABLE IF NOT EXISTS member_english_scores (
  member_id      uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  toeic_lr       integer,
  toeic_sw       integer,
  toefl          integer,
  ielts          text,
  eiken          text,
  english_other  text
);

-- 7. コーチ入力
CREATE TABLE IF NOT EXISTS member_coach_inputs (
  member_id            uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  coach_learning_goal  text,
  note                 text
);

-- ───────────────────────── 認証情報（本体から分離・1:1。PK=FK でサロゲートなし） ─────────────────────────

-- 会員のログイン情報（ログインID＝メール・パスワード）
CREATE TABLE IF NOT EXISTS member_credentials (
  member_id               uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  login_id                text NOT NULL UNIQUE,  -- ログインID（メール）
  password_hash           text,                  -- 別途発行。平文禁止（未発行は NULL）
  require_password_change boolean
);

-- スタッフのログイン情報
CREATE TABLE IF NOT EXISTS staff_credentials (
  staff_id      uuid PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
  login_id      text NOT NULL UNIQUE,
  password_hash text
);

-- ───────────────────────── 会員に従属するエンティティ/ジャンクション ─────────────────────────

-- 教材割り当て（ジャンクション・複合主キー：サロゲートidなし）
CREATE TABLE IF NOT EXISTS textbook_assignments (
  member_id          uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  textbook_id        uuid NOT NULL REFERENCES textbooks(id) ON DELETE RESTRICT,
  daily_goal_minutes integer,
  note               text NOT NULL DEFAULT '',
  status             text NOT NULL DEFAULT '継続' CHECK (status IN ('継続','卒業')),
  PRIMARY KEY (member_id, textbook_id)
);

-- 学習記録（イベント）
CREATE TABLE IF NOT EXISTS learning_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  textbook_id      uuid NOT NULL REFERENCES textbooks(id) ON DELETE RESTRICT,
  studied_on       text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes >= 1),
  comment          text NOT NULL DEFAULT ''
);

-- コーチング記録
CREATE TABLE IF NOT EXISTS coaching_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('教材選定','オリエンテーション','初回コーチング','通常コーチング')),
  held_on         text NOT NULL,
  coach_name      text NOT NULL,
  shared_note     text,
  monthly_review  text,
  coach_advice    text,
  other_notes     text,
  coaching_number integer CHECK (coaching_number IS NULL OR coaching_number >= 2),
  -- 通常コーチング以外（教材選定/オリエン/初回）は会員1件のみ
  CONSTRAINT uq_coaching_number UNIQUE (member_id, coaching_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coaching_once
  ON coaching_records (member_id, type)
  WHERE type <> '通常コーチング';

-- コーチングのテスト記録（ジャンクション・複合主キー）
CREATE TABLE IF NOT EXISTS coaching_record_textbook_tests (
  coaching_record_id uuid NOT NULL REFERENCES coaching_records(id) ON DELETE CASCADE,
  textbook_id        uuid NOT NULL REFERENCES textbooks(id) ON DELETE RESTRICT,
  test_status        text NOT NULL DEFAULT '未選択' CHECK (test_status IN ('実施済み','未実施','未選択')),
  test_range         text,
  format             text,
  score              text,
  note               text,
  next_status        text NOT NULL DEFAULT '未選択' CHECK (next_status IN ('卒業','継続','未選択')),
  PRIMARY KEY (coaching_record_id, textbook_id)
);

-- PROGOS スコア
CREATE TABLE IF NOT EXISTS progos_scores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  exam_date   text NOT NULL,
  overall     text NOT NULL CHECK (overall     IN ('A1','A2','B1','B2','C1','C2')),
  range_level text NOT NULL CHECK (range_level IN ('A1','A2','B1','B2','C1','C2')),
  accuracy    text NOT NULL CHECK (accuracy    IN ('A1','A2','B1','B2','C1','C2')),
  fluency     text NOT NULL CHECK (fluency     IN ('A1','A2','B1','B2','C1','C2')),
  interaction text NOT NULL CHECK (interaction IN ('A1','A2','B1','B2','C1','C2')),
  coherence   text NOT NULL CHECK (coherence   IN ('A1','A2','B1','B2','C1','C2')),
  phonology   text NOT NULL CHECK (phonology   IN ('A1','A2','B1','B2','C1','C2')),
  comment     text
);

-- 継続プラン
CREATE TABLE IF NOT EXISTS continuation_plans (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_type  text NOT NULL,
  months     integer NOT NULL CHECK (months BETWEEN 1 AND 6),
  start_date text NOT NULL,
  end_date   text NOT NULL,
  note       text
);
