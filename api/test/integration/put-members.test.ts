import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { seedAndLogin } from '../helpers/auth';

const apiUrl = inject('apiUrl');
// テストデータ作成・検証は Drizzle 経由（生SQLを書かない）
const { db, pool } = createDatabase(inject('databaseUrl'));

let auth: string;
let consultantId: string;
let consultantId2: string;
let csId: string;
let coachId: string;

beforeAll(async () => {
  auth = await seedAndLogin(inject('databaseUrl'), apiUrl);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // members を消すと配下サテライト・担当・認証は CASCADE で消える。staff も入れ直す。
  await db.delete(schema.members);
  await db.delete(schema.staff);
  const seedStaff = async (code: string, name: string, role: string) => {
    const [s] = await db
      .insert(schema.staff)
      .values({ staffCode: code, name, role })
      .returning({ id: schema.staff.id });
    return s.id;
  };
  consultantId = await seedStaff('MW005', 'コンサルA', 'Consultant');
  consultantId2 = await seedStaff('MW006', 'コンサルB', 'Consultant');
  csId = await seedStaff('MW010', 'CS担当A', 'CS');
  coachId = await seedStaff('MW001', '見本コーチ', 'Coach');
});

/**
 * Drizzle で「編集対象の会員」を1人分（全サテライト＋担当＋認証）作る。
 * 返り値は採番した会員 UUID。overrides で初期値を差し替えられる。
 */
async function seedMember(overrides: Record<string, any> = {}): Promise<string> {
  const id = randomUUID();
  const d = {
    code: '10001',
    lastNameKanji: '見本',
    firstNameKanji: '一郎',
    lastNameKana: 'ミホン',
    firstNameKana: 'イチロウ',
    lastNameAlpha: 'Mihon',
    firstNameAlpha: 'Ichiro',
    nickname: 'いっちゃん',
    gender: '男性',
    birthDate: '1990-01-01',
    occupation: '会社員',
    occupationNote: '',
    email: 'seed_10001@example.jp',
    phone: '090-0000-0000',
    plan: '6ヶ月プラン',
    initialClass: 'Beginner',
    currentClass: 'Beginner',
    nativecamp: '未選択',
    dailyTargetMinutes: 60,
    residence: '日本',
    travelCountry: 'カナダ',
    toeicLr: 600,
    ielts: '5.0',
    coachLearningGoal: '初期目標',
    note: '初期メモ',
    ...overrides,
  };

  await db.insert(schema.members).values({
    id,
    memberCode: d.code,
    lastNameKanji: d.lastNameKanji,
    firstNameKanji: d.firstNameKanji,
    lastNameKana: d.lastNameKana,
    firstNameKana: d.firstNameKana,
    lastNameAlpha: d.lastNameAlpha,
    firstNameAlpha: d.firstNameAlpha,
    nickname: d.nickname,
    gender: d.gender,
    birthDate: d.birthDate,
    occupation: d.occupation,
    occupationNote: d.occupationNote,
  });
  await db.insert(schema.memberContacts).values({ memberId: id, email: d.email, phone: d.phone });
  await db.insert(schema.memberEnrollments).values({
    memberId: id,
    plan: d.plan,
    initialClass: d.initialClass,
    currentClass: d.currentClass,
    nativecamp: d.nativecamp,
    dailyTargetMinutes: d.dailyTargetMinutes,
  });
  await db.insert(schema.memberResidenceTravels).values({
    memberId: id,
    residence: d.residence,
    travelCountry: d.travelCountry,
  });
  await db
    .insert(schema.memberEnglishScores)
    .values({ memberId: id, toeicLr: d.toeicLr, ielts: d.ielts });
  await db
    .insert(schema.memberCoachInputs)
    .values({ memberId: id, coachLearningGoal: d.coachLearningGoal, note: d.note });
  await db.insert(schema.memberCredentials).values({
    memberId: id,
    loginId: d.email,
    passwordHash: 'seedpass',
    requirePasswordChange: false,
  });
  await db
    .insert(schema.memberStaffAssignments)
    .values({ memberId: id, role: 'Consultant', staffId: consultantId });
  return id;
}

function put(id: string, body: unknown) {
  return fetch(`${apiUrl}/v1/admin/members/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(body),
  });
}

// ─── Drizzle ヘルパ（検証用に1件取得） ───
const one = async <T>(rows: Promise<T[]>): Promise<T> => (await rows)[0];

// ─────────────────────── 1. 基本情報 → members ───────────────────────

describe('PUT /v1/admin/members - members（基本情報）', () => {
  it('氏名・ニックネームを編集すると members が更新される', async () => {
    const id = await seedMember();
    const res = await put(id, {
      lastNameKanji: '改姓',
      firstNameKanji: '太郎',
      nickname: 'たろ',
    });
    expect(res.status).toBe(200);

    const m = await one(db.select().from(schema.members).where(eq(schema.members.id, id)));
    expect(m.lastNameKanji).toBe('改姓');
    expect(m.firstNameKanji).toBe('太郎');
    expect(m.nickname).toBe('たろ');
  });

  it('会員番号（code）は readonly。body に入れても member_code は変わらない', async () => {
    const id = await seedMember();
    await put(id, { code: '99999', plan: '給付金6ヶ月プラン' });

    const m = await one(db.select().from(schema.members).where(eq(schema.members.id, id)));
    expect(m.memberCode).toBe('10001'); // 変わらない
  });
});

// ─────────────────────── 2. 連絡先 → member_contacts ───────────────────────

describe('PUT /v1/admin/members - member_contacts（連絡先）', () => {
  it('メール・電話を編集すると member_contacts が更新される', async () => {
    const id = await seedMember();
    await put(id, { email: 'new_mail@example.jp', phone: '080-1111-2222' });

    const c = await one(
      db.select().from(schema.memberContacts).where(eq(schema.memberContacts.memberId, id)),
    );
    expect(c.email).toBe('new_mail@example.jp');
    expect(c.phone).toBe('080-1111-2222');
  });

  it('メール変更は認証の login_id にも反映される', async () => {
    const id = await seedMember();
    await put(id, { email: 'new_mail@example.jp' });

    const cred = await one(
      db.select().from(schema.memberCredentials).where(eq(schema.memberCredentials.memberId, id)),
    );
    expect(cred.loginId).toBe('new_mail@example.jp');
  });
});

// ─────────────────────── 3. 受講情報 → member_enrollments ───────────────────────

describe('PUT /v1/admin/members - member_enrollments（受講情報）', () => {
  it('プラン変更が反映される', async () => {
    const id = await seedMember();
    const res = await put(id, { plan: '給付金6ヶ月プラン' });
    expect(res.status).toBe(200);

    const e = await one(
      db.select().from(schema.memberEnrollments).where(eq(schema.memberEnrollments.memberId, id)),
    );
    expect(e.plan).toBe('給付金6ヶ月プラン');
  });

  it('1日の目標学習時間の変更が反映される', async () => {
    const id = await seedMember();
    await put(id, { dailyTargetMinutes: 120 });

    const e = await one(
      db.select().from(schema.memberEnrollments).where(eq(schema.memberEnrollments.memberId, id)),
    );
    expect(e.dailyTargetMinutes).toBe(120);
  });

  it('現在のクラス・NCの変更が反映される', async () => {
    const id = await seedMember();
    await put(id, { currentClass: 'Intermediate & Above', nativecamp: '導入済み' });

    const e = await one(
      db.select().from(schema.memberEnrollments).where(eq(schema.memberEnrollments.memberId, id)),
    );
    expect(e.currentClass).toBe('Intermediate & Above');
    expect(e.nativecamp).toBe('導入済み');
  });
});

// ─────────────────── 4. 担当者 → member_staff_assignments ───────────────────

describe('PUT /v1/admin/members - member_staff_assignments（担当者）', () => {
  it('担当コンサルを別スタッフに変更すると staff_id が差し替わる', async () => {
    const id = await seedMember();
    await put(id, { consultantStaffId: consultantId2 });

    const a = await one(
      db
        .select()
        .from(schema.memberStaffAssignments)
        .where(eq(schema.memberStaffAssignments.memberId, id)),
    );
    expect(a.role).toBe('Consultant');
    expect(a.staffId).toBe(consultantId2);
  });

  it('CS・オリエン担当を新たに割り当てると行が追加される', async () => {
    const id = await seedMember();
    await put(id, { csStaffId: csId, orientStaffId: coachId });

    const rows = await db
      .select()
      .from(schema.memberStaffAssignments)
      .where(eq(schema.memberStaffAssignments.memberId, id));
    const byRole = Object.fromEntries(rows.map((r) => [r.role, r.staffId]));
    expect(byRole['CS']).toBe(csId);
    expect(byRole['Orient']).toBe(coachId);
  });
});

// ─────────────────── 5. 在住・渡航 → member_residence_travels ───────────────────

describe('PUT /v1/admin/members - member_residence_travels（在住・渡航）', () => {
  it('渡航先の変更が反映される', async () => {
    const id = await seedMember();
    await put(id, { travelCountry: 'イギリス', travelCity: 'ロンドン' });

    const t = await one(
      db
        .select()
        .from(schema.memberResidenceTravels)
        .where(eq(schema.memberResidenceTravels.memberId, id)),
    );
    expect(t.travelCountry).toBe('イギリス');
    expect(t.travelCity).toBe('ロンドン');
  });
});

// ─────────────────── 6. 英語スコア → member_english_scores ───────────────────

describe('PUT /v1/admin/members - member_english_scores（英語スコア）', () => {
  it('TOEIC L&R・IELTS の更新が反映される', async () => {
    const id = await seedMember();
    await put(id, { scoreToeicLR: 800, scoreIelts: '6.5' });

    const s = await one(
      db.select().from(schema.memberEnglishScores).where(eq(schema.memberEnglishScores.memberId, id)),
    );
    expect(s.toeicLr).toBe(800);
    expect(s.ielts).toBe('6.5');
  });
});

// ─────────────────── 7. コーチ入力 → member_coach_inputs ───────────────────

describe('PUT /v1/admin/members - member_coach_inputs（コーチ入力）', () => {
  it('学習目標・備考の更新が反映される', async () => {
    const id = await seedMember();
    await put(id, { coachLearningGoal: '更新後の目標', note: '更新後メモ' });

    const ci = await one(
      db.select().from(schema.memberCoachInputs).where(eq(schema.memberCoachInputs.memberId, id)),
    );
    expect(ci.coachLearningGoal).toBe('更新後の目標');
    expect(ci.note).toBe('更新後メモ');
  });
});

// ─────────────────── レスポンス・異常系 ───────────────────

describe('PUT /v1/admin/members - レスポンス/異常系', () => {
  it('更新後の値を反映したレスポンスを返す', async () => {
    const id = await seedMember();
    const res = await put(id, { plan: '給付金9ヶ月プラン', dailyTargetMinutes: 100 });
    const body = await res.json();
    expect(body.id).toBe(id);
    expect(body.plan).toBe('給付金9ヶ月プラン');
    expect(body.dailyTargetMinutes).toBe(100);
  });

  it('存在しない会員は 404', async () => {
    const res = await put('00000000-0000-0000-0000-000000000000', { plan: '6ヶ月プラン' });
    expect(res.status).toBe(404);
  });

  it('不正なプランは 400、DB は更新されない', async () => {
    const id = await seedMember();
    const res = await put(id, { plan: '存在しないプラン' });
    expect(res.status).toBe(400);

    const e = await one(
      db.select().from(schema.memberEnrollments).where(eq(schema.memberEnrollments.memberId, id)),
    );
    expect(e.plan).toBe('6ヶ月プラン'); // 元のまま
  });

  it('Authorization なしで 401', async () => {
    const id = await seedMember();
    const res = await fetch(`${apiUrl}/v1/admin/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: '6ヶ月プラン' }),
    });
    expect(res.status).toBe(401);
  });
});
