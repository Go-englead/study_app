import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { adminBearer } from '../helpers/auth';

const apiUrl = inject('apiUrl');
const { db, pool } = createDatabase(inject('databaseUrl'));

let auth: string;
let consultantId: string;
let csId: string;
let coachId: string;

beforeAll(async () => {
  auth = await adminBearer('MW001');
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
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
  csId = await seedStaff('MW010', 'CS担当A', 'CS');
  coachId = await seedStaff('MW001', '見本コーチ', 'Coach');
});

/** 全セクション埋まった会員を Drizzle で作る。返り値は会員 UUID。 */
async function seedFullMember(): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.members).values({
    id,
    memberCode: '10001',
    lastNameKanji: '見本',
    firstNameKanji: '一郎',
    lastNameKana: 'ミホン',
    firstNameKana: 'イチロウ',
    lastNameAlpha: 'Mihon',
    firstNameAlpha: 'Ichiro',
    nickname: 'いっちゃん',
    gender: '男性',
    birthDate: '1990-05-05',
    occupation: '会社員',
    occupationNote: '備考',
  });
  await db
    .insert(schema.memberContacts)
    .values({ memberId: id, email: 'detail_10001@example.jp', phone: '090-1234-5678' });
  await db.insert(schema.memberEnrollments).values({
    memberId: id,
    plan: '給付金6ヶ月プラン',
    enrollmentDate: '2026-01-05',
    startDate: '2026-01-10',
    graduateDate: '2026-07-10',
    initialClass: 'Beginner',
    currentClass: 'Lower-Intermediate',
    nativecamp: '導入済み',
    dailyTargetMinutes: 90,
  });
  await db.insert(schema.memberResidenceTravels).values({
    memberId: id,
    residence: '日本',
    travelCountry: 'カナダ',
    travelCity: 'トロント',
    travelDate: '2030-04-01',
    travelReason: '語学学校',
    travelNote: '渡航メモ',
  });
  await db
    .insert(schema.memberEnglishScores)
    .values({ memberId: id, toeicLr: 700, ielts: '6.0', eiken: '2級' });
  await db
    .insert(schema.memberCoachInputs)
    .values({ memberId: id, coachLearningGoal: '目標', note: 'コーチメモ' });
  await db
    .insert(schema.memberCredentials)
    .values({ memberId: id, loginId: 'detail_10001@example.jp', passwordHash: 'x' });
  // 担当者：consultant / cs / orient
  await db.insert(schema.memberStaffAssignments).values([
    { memberId: id, role: 'Consultant', staffId: consultantId },
    { memberId: id, role: 'CS', staffId: csId },
    { memberId: id, role: 'Orient', staffId: coachId },
  ]);
  return id;
}

async function getDetail(id: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${apiUrl}/v1/admin/members/${id}`, {
    headers: { Authorization: auth },
  });
  const body = res.status === 200 ? await res.json() : await res.json().catch(() => ({}));
  return { status: res.status, body };
}

// ─────────────────── 1. 基本情報（氏名6分割を含む） ───────────────────

describe('GET /v1/admin/members/:id - 基本情報（編集プリセット）', () => {
  it('編集フォーム用に氏名6分割・ニックネーム・性別・生年月日・職業を返す', async () => {
    const id = await seedFullMember();
    const { status, body } = await getDetail(id);
    expect(status).toBe(200);
    expect(body.id).toBe(id);
    expect(body.code).toBe('10001');
    expect(body.name).toBe('見本 一郎');
    expect(body.lastNameKanji).toBe('見本');
    expect(body.firstNameKanji).toBe('一郎');
    expect(body.lastNameKana).toBe('ミホン');
    expect(body.firstNameKana).toBe('イチロウ');
    expect(body.lastNameAlpha).toBe('Mihon');
    expect(body.firstNameAlpha).toBe('Ichiro');
    expect(body.nickname).toBe('いっちゃん');
    expect(body.gender).toBe('男性');
    expect(body.birthDate).toBe('1990-05-05');
    expect(body.occupation).toBe('会社員');
    expect(body.occupationNote).toBe('備考');
  });
});

// ─────────────────── 2. 連絡先 ───────────────────

describe('GET /v1/admin/members/:id - 連絡先', () => {
  it('email・phone を返す', async () => {
    const id = await seedFullMember();
    const { body } = await getDetail(id);
    expect(body.email).toBe('detail_10001@example.jp');
    expect(body.phone).toBe('090-1234-5678');
  });
});

// ─────────────────── 3. 受講情報 ───────────────────

describe('GET /v1/admin/members/:id - 受講情報', () => {
  it('プラン・日付・クラス・NC・目標時間を返す', async () => {
    const id = await seedFullMember();
    const { body } = await getDetail(id);
    expect(body.plan).toBe('給付金6ヶ月プラン');
    expect(body.enrollmentDate).toBe('2026-01-05');
    expect(body.startDate).toBe('2026-01-10');
    expect(body.graduateDate).toBe('2026-07-10');
    expect(body.initialClass).toBe('Beginner');
    expect(body.currentClass).toBe('Lower-Intermediate');
    expect(body.nativecamp).toBe('導入済み');
    expect(body.dailyTargetMinutes).toBe(90);
  });
});

// ─────────────────── 4. 担当者（staffId） ───────────────────

describe('GET /v1/admin/members/:id - 担当者', () => {
  it('consultant/cs/orient の staffId を返す', async () => {
    const id = await seedFullMember();
    const { body } = await getDetail(id);
    expect(body.consultantStaffId).toBe(consultantId);
    expect(body.csStaffId).toBe(csId);
    expect(body.orientStaffId).toBe(coachId);
  });
});

// ─────────────────── 5. 在住・渡航 ───────────────────

describe('GET /v1/admin/members/:id - 在住・渡航', () => {
  it('在住国・渡航情報を返す', async () => {
    const id = await seedFullMember();
    const { body } = await getDetail(id);
    expect(body.residence).toBe('日本');
    expect(body.travelCountry).toBe('カナダ');
    expect(body.travelCity).toBe('トロント');
    expect(body.travelDate).toBe('2030-04-01');
    expect(body.travelReason).toBe('語学学校');
    expect(body.travelNote).toBe('渡航メモ');
  });
});

// ─────────────────── 6. 英語スコア ───────────────────

describe('GET /v1/admin/members/:id - 英語スコア', () => {
  it('englishScores を返す', async () => {
    const id = await seedFullMember();
    const { body } = await getDetail(id);
    expect(body.englishScores).toEqual({ toeicLR: 700, ielts: '6.0', eiken: '2級' });
  });
});

// ─────────────────── 7. コーチ入力 ───────────────────

describe('GET /v1/admin/members/:id - コーチ入力', () => {
  it('学習目標・備考を返す', async () => {
    const id = await seedFullMember();
    const { body } = await getDetail(id);
    expect(body.coachLearningGoal).toBe('目標');
    expect(body.note).toBe('コーチメモ');
  });
});

// ─────────── 4.継続プラン履歴 / 5.休会管理（ダミー） ───────────

describe('GET /v1/admin/members/:id - 継続プラン履歴・休会管理（ダミー）', () => {
  it('継続プラン履歴をダミーで返す', async () => {
    const id = await seedFullMember();
    const { body } = await getDetail(id);
    expect(Array.isArray(body.continuationPlans)).toBe(true);
    expect(body.continuationPlans.length).toBeGreaterThan(0);
    expect(body.continuationPlans[0]).toHaveProperty('planType');
    expect(body.continuationPlans[0]).toHaveProperty('months');
  });

  it('休会管理をダミーで返す', async () => {
    const id = await seedFullMember();
    const { body } = await getDetail(id);
    expect(body.suspension).toHaveProperty('suspendedFrom');
    expect(body.suspension).toHaveProperty('suspendedUntil');
  });
});

// ─────────────────── 異常系・認証 ───────────────────

describe('GET /v1/admin/members/:id - 異常系/認証', () => {
  it('存在しない会員は 404', async () => {
    const res = await fetch(`${apiUrl}/v1/admin/members/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: auth },
    });
    expect(res.status).toBe(404);
  });

  it('Authorization なしで 401', async () => {
    const id = await seedFullMember();
    const res = await fetch(`${apiUrl}/v1/admin/members/${id}`);
    expect(res.status).toBe(401);
  });
});
