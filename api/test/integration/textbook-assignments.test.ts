import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { createDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { adminBearer } from '../helpers/auth';

const apiUrl = inject('apiUrl');
const { db, pool } = createDatabase(inject('databaseUrl'));

let auth: string;
let memberId: string;
let textbookId: string;
let textbookId2: string;

beforeAll(async () => {
  auth = await adminBearer('MW001');
});
afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await db.delete(schema.members);
  await db.delete(schema.textbooks);

  // findById は全サテライトを innerJoin するため、会員はサテライト込みで投入する
  memberId = randomUUID();
  await db.insert(schema.members).values({
    id: memberId,
    memberCode: '10001',
    lastNameKanji: '見本',
    firstNameKanji: '一郎',
    lastNameKana: 'ミホン',
    firstNameKana: 'イチロウ',
    lastNameAlpha: 'Mihon',
    firstNameAlpha: 'Ichiro',
  });
  await db.insert(schema.memberContacts).values({ memberId, email: 'a10001@example.jp' });
  await db.insert(schema.memberEnrollments).values({
    memberId,
    plan: '6ヶ月プラン',
    initialClass: 'Beginner',
    currentClass: 'Beginner',
    nativecamp: '未選択',
    dailyTargetMinutes: 60,
  });
  await db.insert(schema.memberResidenceTravels).values({ memberId });
  await db.insert(schema.memberEnglishScores).values({ memberId });
  await db.insert(schema.memberCoachInputs).values({ memberId });
  await db.insert(schema.memberCredentials).values({ memberId, loginId: 'a10001@example.jp' });

  const [t1] = await db
    .insert(schema.textbooks)
    .values({ textbookCode: 'T01', name: 'キクタン', category: '単語/フレーズ', unit: 'Day', color: '#2E86C1' })
    .returning({ id: schema.textbooks.id });
  textbookId = t1.id;
  const [t2] = await db
    .insert(schema.textbooks)
    .values({ textbookCode: 'T02', name: '文法書', category: '文法', unit: 'Lesson', color: '#1F618D' })
    .returning({ id: schema.textbooks.id });
  textbookId2 = t2.id;
});

const base = () => `${apiUrl}/v1/admin/members/${memberId}/textbook-assignments`;
// auth は beforeAll で代入されるため、呼び出し時に参照する（モジュール読込時に固定しない）
const headers = () => ({ 'Content-Type': 'application/json', Authorization: auth });

function assign(body: unknown, mid = memberId) {
  return fetch(`${apiUrl}/v1/admin/members/${mid}/textbook-assignments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
}
function listAssignments() {
  return fetch(base(), { headers: headers() });
}

describe('POST /textbook-assignments - 割り当て', () => {
  it('会員に教材を割り当てると 201・DBに保存される', async () => {
    const res = await assign({ textbookId, dailyGoalMinutes: 30 });
    expect(res.status).toBe(201);

    const { rows } = await pool.query(
      'SELECT * FROM textbook_assignments WHERE member_id = $1 AND textbook_id = $2',
      [memberId, textbookId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].daily_goal_minutes).toBe(30);
  });

  it('存在しない会員IDに割り当てると 400（保存されない）', async () => {
    const res = await assign({ textbookId }, '00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(400);
  });

  it('存在しない教材IDを割り当てると 400（保存されない）', async () => {
    const res = await assign({ textbookId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(400);
    const { rows } = await pool.query('SELECT * FROM textbook_assignments WHERE member_id = $1', [memberId]);
    expect(rows).toHaveLength(0);
  });
});

describe('GET /textbook-assignments - 一覧（教材マスタ結合）', () => {
  it('割り当て教材を教材名・カテゴリ込みで返す', async () => {
    await assign({ textbookId, dailyGoalMinutes: 30 });
    await assign({ textbookId: textbookId2 });

    const res = await listAssignments();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assignments).toHaveLength(2);
    const t1 = body.assignments.find((a: any) => a.textbookId === textbookId);
    expect(t1.name).toBe('キクタン');
    expect(t1.category).toBe('単語/フレーズ');
    expect(t1.dailyGoalMinutes).toBe(30);
  });
});

describe('DELETE /textbook-assignments/:textbookId - 解除', () => {
  it('割り当てを解除すると 204・DBから消える', async () => {
    await assign({ textbookId });
    const res = await fetch(`${base()}/${textbookId}`, { method: 'DELETE', headers: headers() });
    expect(res.status).toBe(204);

    const { rows } = await pool.query(
      'SELECT * FROM textbook_assignments WHERE member_id = $1 AND textbook_id = $2',
      [memberId, textbookId],
    );
    expect(rows).toHaveLength(0);
  });
});

describe('認証', () => {
  it('JWTなしの割り当て一覧は 401', async () => {
    const res = await fetch(base());
    expect(res.status).toBe(401);
  });
});
