import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { adminBearer } from '../helpers/auth';

const apiUrl = inject('apiUrl');
const { db, pool } = createDatabase(inject('databaseUrl'));

let auth: string;
let coachId: string;
let coachId2: string;
let tbA: string;
let tbB: string;

beforeAll(async () => {
  auth = await adminBearer('MW001');
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await db.delete(schema.members);
  await db.delete(schema.staff);
  await db.delete(schema.textbooks);
  const [c1] = await db
    .insert(schema.staff)
    .values({ staffCode: 'MW001', name: 'コーチ甲', role: 'Coach' })
    .returning({ id: schema.staff.id });
  coachId = c1.id;
  const [c2] = await db
    .insert(schema.staff)
    .values({ staffCode: 'MW002', name: 'コーチ乙', role: 'Coach' })
    .returning({ id: schema.staff.id });
  coachId2 = c2.id;
  const [t1] = await db
    .insert(schema.textbooks)
    .values({ textbookCode: 'T01', name: '文法A', category: '文法', unit: 'u', color: '#fff' })
    .returning({ id: schema.textbooks.id });
  tbA = t1.id;
  const [t2] = await db
    .insert(schema.textbooks)
    .values({ textbookCode: 'T02', name: '単語B', category: '語彙', unit: 'u', color: '#fff' })
    .returning({ id: schema.textbooks.id });
  tbB = t2.id;
});

/** 一覧検索で必要な全 1:1 サテライト＋任意の担当/教材を持つ会員を作る。 */
async function seed(o: {
  code: string;
  lastNameKanji?: string;
  firstNameKanji?: string;
  nickname?: string;
  occupation?: string | null;
  residence?: string | null;
  startDate?: string | null;
  travelCountry?: string | null;
  travelReason?: string | null;
  travelDate?: string | null;
  orientStaffId?: string;
  textbookIds?: string[];
}): Promise<string> {
  const id = randomUUID();
  const email = `m_${o.code}@example.jp`;
  await db.insert(schema.members).values({
    id,
    memberCode: o.code,
    lastNameKanji: o.lastNameKanji ?? '山田',
    firstNameKanji: o.firstNameKanji ?? '太郎',
    lastNameKana: 'ヤマダ',
    firstNameKana: 'タロウ',
    lastNameAlpha: 'Yamada',
    firstNameAlpha: 'Taro',
    nickname: o.nickname ?? null,
    occupation: o.occupation ?? null,
  });
  await db.insert(schema.memberContacts).values({ memberId: id, email });
  await db.insert(schema.memberEnrollments).values({
    memberId: id,
    plan: '6ヶ月プラン',
    initialClass: 'Beginner',
    currentClass: 'Beginner',
    nativecamp: '未選択',
    dailyTargetMinutes: 60,
    startDate: o.startDate ?? null,
  });
  await db.insert(schema.memberResidenceTravels).values({
    memberId: id,
    residence: o.residence ?? null,
    travelCountry: o.travelCountry ?? null,
    travelReason: o.travelReason ?? null,
    travelDate: o.travelDate ?? null,
  });
  await db.insert(schema.memberEnglishScores).values({ memberId: id });
  await db.insert(schema.memberCoachInputs).values({ memberId: id });
  await db.insert(schema.memberCredentials).values({ memberId: id, loginId: email });
  if (o.orientStaffId) {
    await db
      .insert(schema.memberStaffAssignments)
      .values({ memberId: id, role: 'Orient', staffId: o.orientStaffId });
  }
  for (const tid of o.textbookIds ?? []) {
    await db.insert(schema.textbookAssignments).values({ memberId: id, textbookId: tid });
  }
  return id;
}

async function get(query = ''): Promise<{ status: number; members: any[] }> {
  const res = await fetch(`${apiUrl}/v1/admin/members${query}`, {
    headers: { Authorization: auth },
  });
  const body = res.status === 200 ? await res.json() : { members: [] };
  return { status: res.status, members: body.members };
}

const codes = (members: any[]) => members.map((m) => m.code).sort();

// 今日基準の相対日付（テストも実行時の今日を使う）
function isoPlusMonths(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

// ─────────────────────── 全件 ───────────────────────

describe('GET /v1/admin/members - 全件', () => {
  it('条件なしで全会員を返す', async () => {
    await seed({ code: '10001' });
    await seed({ code: '10002' });
    const { status, members } = await get();
    expect(status).toBe(200);
    expect(codes(members)).toEqual(['10001', '10002']);
  });

  it('一覧の行に表示項目とダミーの達成率・最終ログインが含まれる', async () => {
    await seed({ code: '10001', lastNameKanji: '見本', firstNameKanji: '一郎', nickname: 'いっちゃん' });
    const { members } = await get();
    const m = members[0];
    expect(m.code).toBe('10001');
    expect(m.name).toBe('見本 一郎');
    expect(m.nickname).toBe('いっちゃん');
    expect(m.status).toBeTruthy();
    expect(m.plan).toBe('6ヶ月プラン');
    expect(m.currentClass).toBe('Beginner');
    // ダミー値
    expect(m.achievementRate).toBe(65);
    expect(m.lastLoginAt).toBe('2026-06-01T09:00:00.000Z');
  });
});

// ─────────────────────── キーワード ───────────────────────

describe('GET /v1/admin/members - キーワード', () => {
  it('氏名で部分一致検索できる（keywordType=name）', async () => {
    await seed({ code: '10001', lastNameKanji: '田中' });
    await seed({ code: '10002', lastNameKanji: '佐藤' });
    const { members } = await get('?keyword=田中&keywordType=name');
    expect(codes(members)).toEqual(['10001']);
  });

  it('ニックネームでも一致する', async () => {
    await seed({ code: '10001', nickname: 'たろちゃん' });
    await seed({ code: '10002', nickname: 'はなちゃん' });
    const { members } = await get('?keyword=たろ&keywordType=name');
    expect(codes(members)).toEqual(['10001']);
  });

  it('会員番号で検索できる（keywordType=code）', async () => {
    await seed({ code: '10001' });
    await seed({ code: '20002' });
    const { members } = await get('?keyword=2000&keywordType=code');
    expect(codes(members)).toEqual(['20002']);
  });
});

// ─────────────────────── 各種フィルタ ───────────────────────

describe('GET /v1/admin/members - フィルタ', () => {
  it('職業で絞り込める', async () => {
    await seed({ code: '10001', occupation: '会社員' });
    await seed({ code: '10002', occupation: '公務員' });
    const { members } = await get('?occupation=会社員');
    expect(codes(members)).toEqual(['10001']);
  });

  it('職業=未設定（__unset__）で職業なしの会員を絞り込める', async () => {
    await seed({ code: '10001', occupation: '会社員' });
    await seed({ code: '10002', occupation: null });
    const { members } = await get('?occupation=__unset__');
    expect(codes(members)).toEqual(['10002']);
  });

  it('在住国で絞り込める', async () => {
    await seed({ code: '10001', residence: '日本' });
    await seed({ code: '10002', residence: '海外' });
    const { members } = await get('?residence=海外');
    expect(codes(members)).toEqual(['10002']);
  });

  it('受講開始月で絞り込める', async () => {
    await seed({ code: '10001', startDate: '2026-04-15' });
    await seed({ code: '10002', startDate: '2026-03-01' });
    const { members } = await get('?startMonth=2026-04');
    expect(codes(members)).toEqual(['10001']);
  });

  it('渡航先（国）で絞り込める', async () => {
    await seed({ code: '10001', travelCountry: 'カナダ' });
    await seed({ code: '10002', travelCountry: 'イギリス' });
    const { members } = await get('?travelCountry=イギリス');
    expect(codes(members)).toEqual(['10002']);
  });

  it('渡航理由で絞り込める', async () => {
    await seed({ code: '10001', travelReason: '語学学校' });
    await seed({ code: '10002', travelReason: '海外就職' });
    const { members } = await get('?travelReason=語学学校');
    expect(codes(members)).toEqual(['10001']);
  });

  it('渡航時期=3ヶ月以内（within3m）で絞り込める', async () => {
    await seed({ code: '10001', travelDate: isoPlusMonths(1) }); // 3ヶ月以内
    await seed({ code: '10002', travelDate: isoPlusMonths(18) }); // 1年以上先
    await seed({ code: '10003', travelDate: null });
    const { members } = await get('?travelDate=within3m');
    expect(codes(members)).toEqual(['10001']);
  });

  it('渡航時期=未設定（__unset__）で渡航時期なしを絞り込める', async () => {
    await seed({ code: '10001', travelDate: isoPlusMonths(1) });
    await seed({ code: '10002', travelDate: null });
    const { members } = await get('?travelDate=__unset__');
    expect(codes(members)).toEqual(['10002']);
  });

  it('オリエン担当で絞り込める', async () => {
    await seed({ code: '10001', orientStaffId: coachId });
    await seed({ code: '10002', orientStaffId: coachId2 });
    const { members } = await get(`?orientStaffId=${coachId}`);
    expect(codes(members)).toEqual(['10001']);
  });

  it('使用教材は OR（いずれか使用）で絞り込める', async () => {
    await seed({ code: '10001', textbookIds: [tbA] });
    await seed({ code: '10002', textbookIds: [tbB] });
    await seed({ code: '10003', textbookIds: [] });
    const { members } = await get(`?textbookId=${tbA}&textbookId=${tbB}`);
    expect(codes(members)).toEqual(['10001', '10002']);
  });

  it('複数条件は AND で結合される', async () => {
    await seed({ code: '10001', occupation: '会社員', residence: '日本' });
    await seed({ code: '10002', occupation: '会社員', residence: '海外' });
    const { members } = await get('?occupation=会社員&residence=日本');
    expect(codes(members)).toEqual(['10001']);
  });
});

// ─────────────────────── 認証 ───────────────────────

describe('GET /v1/admin/members - 認証', () => {
  it('Authorization なしで 401', async () => {
    const res = await fetch(`${apiUrl}/v1/admin/members`);
    expect(res.status).toBe(401);
  });
});
