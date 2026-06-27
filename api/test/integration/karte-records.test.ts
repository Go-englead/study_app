import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { adminBearer } from '../helpers/auth';

const apiUrl = inject('apiUrl');
const { db, pool } = createDatabase(inject('databaseUrl'));

let auth: string;
let memberId: string;
let t1: string;

beforeAll(async () => {
  auth = await adminBearer('MW001');
});
afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await db.delete(schema.learningLogs);
  await db.delete(schema.progosScores);
  await db.delete(schema.members);
  await db.delete(schema.textbooks);

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

  const [r1] = await db
    .insert(schema.textbooks)
    .values({ textbookCode: 'T01', name: 'キクタン', category: '単語/フレーズ', unit: 'Day', color: '#2E86C1' })
    .returning({ id: schema.textbooks.id });
  t1 = r1.id;
});

const headers = () => ({ 'Content-Type': 'application/json', Authorization: auth });

// ───────────────────── 学習記録 ─────────────────────
describe('学習記録 /learning-logs', () => {
  const url = () => `${apiUrl}/v1/admin/members/${memberId}/learning-logs`;
  const add = (body: unknown) => fetch(url(), { method: 'POST', headers: headers(), body: JSON.stringify(body) });

  it('追加すると 201・DBに保存される', async () => {
    const res = await add({ textbookId: t1, date: '2026-06-01', durationMinutes: 45, comment: '集中できた' });
    expect(res.status).toBe(201);
    const { rows } = await pool.query('SELECT * FROM learning_logs WHERE member_id=$1', [memberId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].duration_minutes).toBe(45);
    expect(rows[0].studied_on).toBe('2026-06-01');
  });

  it('未来日は 400（保存されない）', async () => {
    const res = await add({ textbookId: t1, date: '2099-01-01', durationMinutes: 30 });
    expect(res.status).toBe(400);
    const { rows } = await pool.query('SELECT * FROM learning_logs WHERE member_id=$1', [memberId]);
    expect(rows).toHaveLength(0);
  });

  it('存在しない教材は 400', async () => {
    const res = await add({ textbookId: '00000000-0000-0000-0000-000000000000', date: '2026-06-01', durationMinutes: 30 });
    expect(res.status).toBe(400);
  });

  it('一覧取得で追加済みが返る', async () => {
    await add({ textbookId: t1, date: '2026-06-01', durationMinutes: 30 });
    await add({ textbookId: t1, date: '2026-06-02', durationMinutes: 60 });
    const res = await fetch(url(), { headers: headers() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('削除すると 204・DBから消える', async () => {
    const created = await (await add({ textbookId: t1, date: '2026-06-01', durationMinutes: 30 })).json();
    const res = await fetch(`${url()}/${created.id}`, { method: 'DELETE', headers: headers() });
    expect(res.status).toBe(204);
    const { rows } = await pool.query('SELECT * FROM learning_logs WHERE id=$1', [created.id]);
    expect(rows).toHaveLength(0);
  });

  it('JWTなしは 401', async () => {
    expect((await fetch(url())).status).toBe(401);
  });
});

// ───────────────────── PROGOS ─────────────────────
describe('PROGOS /progos', () => {
  const url = () => `${apiUrl}/v1/admin/members/${memberId}/progos`;
  const SKILLS = { range: 'B1', accuracy: 'A2', fluency: 'B1', interaction: 'B2', coherence: 'B1', phonology: 'A2' };
  const add = (body: unknown) => fetch(url(), { method: 'POST', headers: headers(), body: JSON.stringify(body) });

  it('登録すると 201・各CEFR技能がDBに保存される', async () => {
    const res = await add({ examDate: '2026-06-01', overall: 'B1', skills: SKILLS, comment: '初回受験' });
    expect(res.status).toBe(201);
    const { rows } = await pool.query('SELECT * FROM progos_scores WHERE member_id=$1', [memberId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].overall).toBe('B1');
    expect(rows[0].range_level).toBe('B1');
    expect(rows[0].interaction).toBe('B2');
  });

  it('不正なCEFR値は 400', async () => {
    const res = await add({ examDate: '2026-06-01', overall: 'Z9', skills: SKILLS });
    expect(res.status).toBe(400);
  });

  it('一覧取得で受験日降順に返る', async () => {
    await add({ examDate: '2026-04-01', overall: 'A2', skills: SKILLS });
    await add({ examDate: '2026-06-01', overall: 'B1', skills: SKILLS });
    const res = await fetch(url(), { headers: headers() });
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].examDate).toBe('2026-06-01'); // 降順
    expect(body[0].skills.interaction).toBe('B2');
  });

  it('JWTなしは 401', async () => {
    expect((await fetch(url())).status).toBe(401);
  });
});
