import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { adminBearer } from '../helpers/auth';

const apiUrl = inject('apiUrl');
const { db, pool } = createDatabase(inject('databaseUrl'));

let auth: string;
let consultantId: string;
let coachId: string;
let textbookId: string;

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
  const [c] = await db
    .insert(schema.staff)
    .values({ staffCode: 'MW005', name: 'コンサルA', role: 'Consultant' })
    .returning({ id: schema.staff.id });
  consultantId = c.id;
  const [co] = await db
    .insert(schema.staff)
    .values({ staffCode: 'MW001', name: '見本コーチ', role: 'Coach' })
    .returning({ id: schema.staff.id });
  coachId = co.id;
  const [tb] = await db
    .insert(schema.textbooks)
    .values({ textbookCode: 'T01', name: '英文法', category: '文法', unit: 'ユニット', color: '#fff' })
    .returning({ id: schema.textbooks.id });
  textbookId = tb.id;
});

/**
 * Drizzle で「会員に紐づく全テーブル」へデータを入れた会員を1人作る。
 * サテライト・認証・担当に加え、従属エンティティ（教材割当・学習記録・コーチング・PROGOS・継続プラン）も入れる。
 */
async function seedMemberWithRelations(): Promise<string> {
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
  });
  // 1:1 サテライト
  await db.insert(schema.memberContacts).values({ memberId: id, email: 'del_10001@example.jp' });
  await db.insert(schema.memberEnrollments).values({
    memberId: id,
    plan: '6ヶ月プラン',
    initialClass: 'Beginner',
    currentClass: 'Beginner',
    nativecamp: '未選択',
    dailyTargetMinutes: 60,
  });
  await db.insert(schema.memberResidenceTravels).values({ memberId: id, residence: '日本' });
  await db.insert(schema.memberEnglishScores).values({ memberId: id, toeicLr: 600 });
  await db.insert(schema.memberCoachInputs).values({ memberId: id, note: 'メモ' });
  await db
    .insert(schema.memberCredentials)
    .values({ memberId: id, loginId: 'del_10001@example.jp', passwordHash: 'x' });
  // 担当者
  await db
    .insert(schema.memberStaffAssignments)
    .values({ memberId: id, role: 'Consultant', staffId: consultantId });
  // 従属エンティティ
  await db
    .insert(schema.textbookAssignments)
    .values({ memberId: id, textbookId, dailyGoalMinutes: 30 });
  await db
    .insert(schema.learningLogs)
    .values({ memberId: id, textbookId, studiedOn: '2026-06-01', durationMinutes: 30 });
  await db.insert(schema.coachingRecords).values({
    memberId: id,
    type: '通常コーチング',
    heldOn: '2026-06-01',
    coachName: '見本コーチ',
    coachingNumber: 2,
  });
  await db.insert(schema.progosScores).values({
    memberId: id,
    examDate: '2026-06-01',
    overall: 'B1',
    rangeLevel: 'B1',
    accuracy: 'B1',
    fluency: 'B1',
    interaction: 'B1',
    coherence: 'B1',
    phonology: 'B1',
  });
  await db.insert(schema.continuationPlans).values({
    memberId: id,
    planType: '継続',
    months: 3,
    startDate: '2026-06-01',
    endDate: '2026-09-01',
  });
  return id;
}

function del(id: string) {
  return fetch(`${apiUrl}/v1/admin/members/${id}`, {
    method: 'DELETE',
    headers: { Authorization: auth },
  });
}

const countWhere = async (table: any, col: any, id: string): Promise<number> =>
  (await db.select().from(table).where(eq(col, id))).length;

describe('DELETE /v1/admin/members/:memberId', () => {
  it('削除すると 204 を返し、members から消える', async () => {
    const id = await seedMemberWithRelations();
    const res = await del(id);
    expect(res.status).toBe(204);

    expect(await countWhere(schema.members, schema.members.id, id)).toBe(0);
  });

  it('1:1 サテライト（連絡先・受講・在住渡航・英語・コーチ入力・認証）が全て消える', async () => {
    const id = await seedMemberWithRelations();
    await del(id);

    expect(await countWhere(schema.memberContacts, schema.memberContacts.memberId, id)).toBe(0);
    expect(await countWhere(schema.memberEnrollments, schema.memberEnrollments.memberId, id)).toBe(0);
    expect(
      await countWhere(schema.memberResidenceTravels, schema.memberResidenceTravels.memberId, id),
    ).toBe(0);
    expect(await countWhere(schema.memberEnglishScores, schema.memberEnglishScores.memberId, id)).toBe(0);
    expect(await countWhere(schema.memberCoachInputs, schema.memberCoachInputs.memberId, id)).toBe(0);
    expect(await countWhere(schema.memberCredentials, schema.memberCredentials.memberId, id)).toBe(0);
  });

  it('担当ジャンクション・従属エンティティ（教材割当/学習記録/コーチング/PROGOS/継続プラン）も全て消える', async () => {
    const id = await seedMemberWithRelations();
    await del(id);

    expect(
      await countWhere(schema.memberStaffAssignments, schema.memberStaffAssignments.memberId, id),
    ).toBe(0);
    expect(await countWhere(schema.textbookAssignments, schema.textbookAssignments.memberId, id)).toBe(0);
    expect(await countWhere(schema.learningLogs, schema.learningLogs.memberId, id)).toBe(0);
    expect(await countWhere(schema.coachingRecords, schema.coachingRecords.memberId, id)).toBe(0);
    expect(await countWhere(schema.progosScores, schema.progosScores.memberId, id)).toBe(0);
    expect(await countWhere(schema.continuationPlans, schema.continuationPlans.memberId, id)).toBe(0);
  });

  it('削除した会員は GET で 404 になる', async () => {
    const id = await seedMemberWithRelations();
    await del(id);

    const res = await fetch(`${apiUrl}/v1/admin/members/${id}`, {
      headers: { Authorization: auth },
    });
    expect(res.status).toBe(404);
  });

  it('参照したスタッフ・教材マスタは削除されない（会員だけ消える）', async () => {
    const id = await seedMemberWithRelations();
    await del(id);

    expect((await db.select().from(schema.staff).where(eq(schema.staff.id, consultantId))).length).toBe(1);
    expect((await db.select().from(schema.textbooks).where(eq(schema.textbooks.id, textbookId))).length).toBe(1);
  });

  it('存在しない会員の削除でも 204（冪等）', async () => {
    const res = await del('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(204);
  });

  it('Authorization なしで 401', async () => {
    const id = await seedMemberWithRelations();
    const res = await fetch(`${apiUrl}/v1/admin/members/${id}`, { method: 'DELETE' });
    expect(res.status).toBe(401);
  });
});
