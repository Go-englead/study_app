import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { Pool } from 'pg';
import { seedAndLogin } from '../helpers/auth';

const apiUrl = inject('apiUrl');
const db = new Pool({ connectionString: inject('databaseUrl') });

let auth: string;
// FK 用に毎テスト用意する担当スタッフの UUID
let consultantId: string;
let csId: string;
let coachId: string;

beforeAll(async () => {
  auth = await seedAndLogin(inject('databaseUrl'), apiUrl);
});

afterAll(async () => {
  await db.end();
});

beforeEach(async () => {
  // members を消すと配下サテライト・担当ジャンクションは CASCADE で消える。
  // その後 staff を消して担当用スタッフを入れ直し、FK 用の UUID を確定する。
  await db.query('TRUNCATE members RESTART IDENTITY CASCADE');
  await db.query('TRUNCATE staff RESTART IDENTITY CASCADE');
  const c = await db.query(
    'INSERT INTO staff (staff_code, name, role) VALUES ($1,$2,$3) RETURNING id',
    ['MW005', 'コンサルA', 'Consultant'],
  );
  consultantId = c.rows[0].id;
  const cs = await db.query(
    'INSERT INTO staff (staff_code, name, role) VALUES ($1,$2,$3) RETURNING id',
    ['MW010', 'CS担当A', 'CS'],
  );
  csId = cs.rows[0].id;
  const coach = await db.query(
    'INSERT INTO staff (staff_code, name, role) VALUES ($1,$2,$3) RETURNING id',
    ['MW001', '見本コーチ', 'Coach'],
  );
  coachId = coach.rows[0].id;
});

/**
 * 会員登録フォーム（admin.html の新規会員モーダル）で登録ボタンを押下したときに
 * 送られてくる想定の値。7セクション全項目を網羅する。
 * - 担当者（consultant/cs）と オリエン担当 は staff の UUID を送る（「OTHER」も可）
 * - 仮パスワードはサーバー生成のため送らない
 */
function fullForm(overrides: Record<string, unknown> = {}) {
  return {
    // 1. 基本情報
    code: '99990',
    lastNameKanji: '見本',
    firstNameKanji: '太郎',
    lastNameKana: 'ミホン',
    firstNameKana: 'タロウ',
    lastNameAlpha: 'Mihon',
    firstNameAlpha: 'Taro',
    nickname: 'たろちゃん',
    gender: '男性',
    birthDate: '1995-04-01',
    occupation: '会社員',
    occupationNote: 'その他の補足',
    // 2. 連絡先
    email: 'taro@example.jp',
    phone: '090-1234-5678',
    // 3. 受講情報
    plan: '6ヶ月プラン',
    status: '入学手続き中',
    enrollmentDate: '2026-06-01',
    orientStaffId: coachId,
    startDate: '2030-07-01',
    graduateDate: '2030-12-31',
    initialClass: 'Beginner',
    currentClass: 'Lower-Intermediate',
    nativecamp: '導入済み',
    dailyTargetMinutes: 90,
    // 4. 担当者（staff UUID）
    consultantStaffId: consultantId,
    csStaffId: csId,
    // 5. 在住・渡航情報
    residence: '日本',
    residenceOverseas: '',
    travelCountry: 'オーストラリア',
    travelCity: 'シドニー',
    travelDate: '2030-09-01',
    travelReason: '語学学校',
    travelNote: '秋ごろ予定',
    // 6. 直近の英語スコア
    scoreToeicLR: 650,
    scoreToeicSW: 260,
    scoreToefl: 80,
    scoreIelts: '5.5',
    scoreEiken: '2級',
    scoreOther: 'GTEC 800',
    // 7. コーチ入力
    coachLearningGoal: 'IELTS6.5取得',
    note: '特記事項なし',
    ...overrides,
  };
}

function post(body: unknown) {
  return fetch(`${apiUrl}/v1/admin/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(body),
  });
}

/** 登録して UUID を返す（レスポンス本体も返す） */
async function register(overrides: Record<string, unknown> = {}) {
  const res = await post(fullForm(overrides));
  expect(res.status).toBe(201);
  const body = await res.json();
  return body as Record<string, any>;
}

// ─────────────────────────── レスポンス ───────────────────────────

describe('POST /v1/admin/members - レスポンス', () => {
  it('201 で UUID の id・会員番号・表示名を返す', async () => {
    const body = await register();
    expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(body.code).toBe('99990');
    expect(body.name).toBe('見本 太郎');
  });

  it('サーバー生成された仮パスワードを返す（コーチが会員へ伝える用）', async () => {
    const body = await register();
    expect(typeof body.tempPassword).toBe('string');
    expect(body.tempPassword.length).toBeGreaterThanOrEqual(8);
  });
});

// ─────────────────────── 1. 基本情報 → members ───────────────────────

describe('POST /v1/admin/members - members（基本情報）', () => {
  it('氏名・ニックネーム・性別・生年月日・職業が保存される', async () => {
    const { id } = await register();
    const { rows } = await db.query('SELECT * FROM members WHERE id = $1', [id]);
    expect(rows).toHaveLength(1);
    const m = rows[0];
    expect(m.member_code).toBe('99990');
    expect(m.last_name_kanji).toBe('見本');
    expect(m.first_name_kanji).toBe('太郎');
    expect(m.last_name_kana).toBe('ミホン');
    expect(m.first_name_kana).toBe('タロウ');
    expect(m.last_name_alpha).toBe('Mihon');
    expect(m.first_name_alpha).toBe('Taro');
    expect(m.nickname).toBe('たろちゃん');
    expect(m.gender).toBe('男性');
    expect(m.birth_date).toBe('1995-04-01');
    expect(m.occupation).toBe('会社員');
    expect(m.occupation_note).toBe('その他の補足');
  });

  it('基本情報テーブルには連絡先・受講情報の列は存在しない（分割済み）', async () => {
    const { id } = await register();
    const { rows } = await db.query('SELECT * FROM members WHERE id = $1', [id]);
    expect(rows[0]).not.toHaveProperty('email');
    expect(rows[0]).not.toHaveProperty('phone');
    expect(rows[0]).not.toHaveProperty('plan');
  });
});

// ─────────────────────── 2. 連絡先 → member_contacts ───────────────────────

describe('POST /v1/admin/members - member_contacts（連絡先）', () => {
  it('email・phone が保存される', async () => {
    const { id } = await register();
    const { rows } = await db.query('SELECT * FROM member_contacts WHERE member_id = $1', [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('taro@example.jp');
    expect(rows[0].phone).toBe('090-1234-5678');
  });
});

// ─────────────────────── 3. 受講情報 → member_enrollments ───────────────────────

describe('POST /v1/admin/members - member_enrollments（受講情報）', () => {
  it('プラン・クラス・NC・目標時間・各日付が保存される', async () => {
    const { id } = await register();
    const { rows } = await db.query('SELECT * FROM member_enrollments WHERE member_id = $1', [id]);
    expect(rows).toHaveLength(1);
    const e = rows[0];
    expect(e.plan).toBe('6ヶ月プラン');
    expect(e.initial_class).toBe('Beginner');
    expect(e.current_class).toBe('Lower-Intermediate');
    expect(e.nativecamp).toBe('導入済み');
    expect(e.daily_target_minutes).toBe(90);
    expect(e.enrollment_date).toBe('2026-06-01');
    expect(e.start_date).toBe('2030-07-01');
    expect(e.graduate_date).toBe('2030-12-31');
  });

  it('status が「途中退会」以外のときは manual_status_override は NULL（ステータスは計算値）', async () => {
    const { id } = await register({ status: '受講中' });
    const { rows } = await db.query(
      'SELECT manual_status_override FROM member_enrollments WHERE member_id = $1',
      [id],
    );
    expect(rows[0].manual_status_override).toBeNull();
  });

  it('登録時はステータスを手動設定できない（途中退会も含め manual_status_override は NULL）', async () => {
    // ステータスは日付から自動算出。途中退会は専用エンドポイント（POST .../withdraw）でのみ設定する。
    const { id } = await register({ status: '途中退会' });
    const { rows } = await db.query(
      'SELECT manual_status_override FROM member_enrollments WHERE member_id = $1',
      [id],
    );
    expect(rows[0].manual_status_override).toBeNull();
  });
});

// ─────────────────────── 4. 担当者 → member_staff_assignments（ジャンクション） ───────────────────────

describe('POST /v1/admin/members - member_staff_assignments（担当者）', () => {
  it('consultant / cs / orient の3行が staff の UUID で作られる', async () => {
    const { id } = await register();
    const { rows } = await db.query(
      'SELECT role, staff_id FROM member_staff_assignments WHERE member_id = $1 ORDER BY role',
      [id],
    );
    const byRole = Object.fromEntries(rows.map((r) => [r.role, r.staff_id]));
    expect(byRole['Consultant']).toBe(consultantId);
    expect(byRole['CS']).toBe(csId);
    expect(byRole['Orient']).toBe(coachId);
    expect(rows).toHaveLength(3);
  });

  it('担当が「OTHER」のときはその役割の行を作らない（NULL行も作らない）', async () => {
    const { id } = await register({ consultantStaffId: 'OTHER' });
    const { rows } = await db.query(
      'SELECT role FROM member_staff_assignments WHERE member_id = $1 ORDER BY role',
      [id],
    );
    const roles = rows.map((r) => r.role);
    expect(roles).not.toContain('Consultant'); // OTHER は行なし
    expect(roles).toContain('CS');
    expect(roles).toContain('Orient');
  });

  it('オリエン担当が未指定のときは Orient 行を作らない（任意項目）', async () => {
    const { id } = await register({ orientStaffId: undefined });
    const { rows } = await db.query(
      'SELECT role FROM member_staff_assignments WHERE member_id = $1',
      [id],
    );
    expect(rows.map((r) => r.role)).not.toContain('Orient');
  });
});

// ─────────────────── 5. 在住・渡航 → member_residence_travels ───────────────────

describe('POST /v1/admin/members - member_residence_travels（在住・渡航）', () => {
  it('在住国・渡航先・渡航時期などが保存される', async () => {
    const { id } = await register();
    const { rows } = await db.query(
      'SELECT * FROM member_residence_travels WHERE member_id = $1',
      [id],
    );
    expect(rows).toHaveLength(1);
    const t = rows[0];
    expect(t.residence).toBe('日本');
    expect(t.travel_country).toBe('オーストラリア');
    expect(t.travel_city).toBe('シドニー');
    expect(t.travel_date).toBe('2030-09-01');
    expect(t.travel_reason).toBe('語学学校');
    expect(t.travel_note).toBe('秋ごろ予定');
  });
});

// ─────────────────── 6. 英語スコア → member_english_scores ───────────────────

describe('POST /v1/admin/members - member_english_scores（英語スコア）', () => {
  it('入力した各検定スコアが列に保存される', async () => {
    const { id } = await register();
    const { rows } = await db.query(
      'SELECT * FROM member_english_scores WHERE member_id = $1',
      [id],
    );
    expect(rows).toHaveLength(1);
    const s = rows[0];
    expect(s.toeic_lr).toBe(650);
    expect(s.toeic_sw).toBe(260);
    expect(s.toefl).toBe(80);
    expect(s.ielts).toBe('5.5');
    expect(s.eiken).toBe('2級');
    expect(s.english_other).toBe('GTEC 800');
  });
});

// ─────────────────── 7. コーチ入力 → member_coach_inputs ───────────────────

describe('POST /v1/admin/members - member_coach_inputs（コーチ入力）', () => {
  it('学習目標・備考が保存される', async () => {
    const { id } = await register();
    const { rows } = await db.query('SELECT * FROM member_coach_inputs WHERE member_id = $1', [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].coach_learning_goal).toBe('IELTS6.5取得');
    expect(rows[0].note).toBe('特記事項なし');
  });
});

// ─────────────────── 認証情報 → member_credentials ───────────────────

describe('POST /v1/admin/members - member_credentials（認証）', () => {
  it('login_id に email、password_hash にサーバー生成の仮PW、要変更フラグ true が保存される', async () => {
    const { id } = await register();
    const { rows } = await db.query('SELECT * FROM member_credentials WHERE member_id = $1', [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].login_id).toBe('taro@example.jp');
    expect(rows[0].password_hash).not.toBeNull(); // サーバーで生成して保存
    expect(rows[0].require_password_change).toBe(true);
  });
});

// ─────────────────────────── バリデーション ───────────────────────────

describe('POST /v1/admin/members - バリデーション', () => {
  it('姓（漢字）欠落で 400、どのテーブルにも保存されない', async () => {
    const { lastNameKanji, ...body } = fullForm();
    const res = await post(body);
    expect(res.status).toBe(400);

    const { rows } = await db.query('SELECT id FROM members WHERE member_code = $1', ['99990']);
    expect(rows).toHaveLength(0);
  });

  it('不正なプランで 400 になる', async () => {
    const res = await post(fullForm({ plan: '存在しないプラン' }));
    expect(res.status).toBe(400);
  });

  it('登録に失敗したらサテライト・担当行も一切残らない（トランザクション）', async () => {
    const { firstNameKanji, ...body } = fullForm();
    const res = await post(body);
    expect(res.status).toBe(400);

    const contacts = await db.query('SELECT * FROM member_contacts WHERE email = $1', [
      'taro@example.jp',
    ]);
    expect(contacts.rows).toHaveLength(0);
    const assigns = await db.query(
      'SELECT * FROM member_staff_assignments WHERE staff_id = $1',
      [consultantId],
    );
    expect(assigns.rows).toHaveLength(0);
  });
});

// ─────────────────────────── 認証ガード ───────────────────────────

describe('POST /v1/admin/members - 認証', () => {
  it('Authorization なしで 401', async () => {
    const res = await fetch(`${apiUrl}/v1/admin/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullForm()),
    });
    expect(res.status).toBe(401);
  });
});
