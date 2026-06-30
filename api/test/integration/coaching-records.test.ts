import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { seedAndLogin } from '../helpers/auth';

const apiUrl = inject('apiUrl');
const { db, pool } = createDatabase(inject('databaseUrl'));

let auth: string;
let memberId: string;
let t1: string; // 教材T01
let t2: string; // 教材T02

beforeAll(async () => {
  auth = await seedAndLogin(inject('databaseUrl'), apiUrl);
});
afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await db.delete(schema.coachingRecords); // CTI 子は CASCADE
  await db.delete(schema.textbookAssignments);
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

  const [r1] = await db
    .insert(schema.textbooks)
    .values({ textbookCode: 'T01', name: 'キクタン', category: '単語/フレーズ', unit: 'Day', color: '#2E86C1' })
    .returning({ id: schema.textbooks.id });
  t1 = r1.id;
  const [r2] = await db
    .insert(schema.textbooks)
    .values({ textbookCode: 'T02', name: '文法書', category: '文法', unit: 'Lesson', color: '#1F618D' })
    .returning({ id: schema.textbooks.id });
  t2 = r2.id;
});

const headers = () => ({ 'Content-Type': 'application/json', Authorization: auth });
const listUrl = () => `${apiUrl}/v1/admin/members/${memberId}/coaching-records`;
const recUrl = (id: string) => `${apiUrl}/v1/admin/coaching-records/${id}`;

function create(body: unknown, mid = memberId) {
  return fetch(`${apiUrl}/v1/admin/members/${mid}/coaching-records`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
}

// よく使う部品
const SELECTION = (date = '2026-06-01') => ({
  type: '教材選定',
  date,
  coachName: '見本コーチ',
  sharedNote: '初月の進め方',
  selectedTextbooks: [{ textbookId: t1, dailyGoalMinutes: 30, note: 'Day1〜10' }],
});
const ORIENT = (date = '2026-06-02') => ({
  type: 'オリエンテーション',
  date,
  coachName: '見本コーチ',
  monthlyReview: '初回面談',
});

describe('POST 教材選定 → 割り当て生成', () => {
  it('教材選定を作成すると 201・CTIに保存され・textbook_assignments が生成される', async () => {
    const res = await create(SELECTION());
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.type).toBe('教材選定');
    expect(json.id).toBeTruthy();

    // 親
    const parent = await pool.query('SELECT * FROM coaching_records WHERE member_id=$1', [memberId]);
    expect(parent.rows).toHaveLength(1);
    expect(parent.rows[0].type).toBe('教材選定');
    // 子（共有事項＋明細）
    const sel = await pool.query('SELECT * FROM cr_textbook_selections WHERE coaching_record_id=$1', [json.id]);
    expect(sel.rows[0].shared_note).toBe('初月の進め方');
    const items = await pool.query('SELECT * FROM cr_selection_items WHERE coaching_record_id=$1', [json.id]);
    expect(items.rows).toHaveLength(1);
    expect(items.rows[0].daily_goal_minutes).toBe(30);
    // 割り当てが生成されている（toAdd）
    const asg = await pool.query('SELECT * FROM textbook_assignments WHERE member_id=$1 AND textbook_id=$2', [memberId, t1]);
    expect(asg.rows).toHaveLength(1);
    expect(asg.rows[0].daily_goal_minutes).toBe(30);
    expect(asg.rows[0].graduated_on).toBeNull();
  });

  it('教材選定は1会員1回まで（重複は 400）', async () => {
    expect((await create(SELECTION())).status).toBe(201);
    const res = await create({ ...SELECTION('2026-06-05'), selectedTextbooks: [{ textbookId: t2 }] });
    expect(res.status).toBe(400);
  });

  it('存在しない教材を選定すると 400（保存されない）', async () => {
    const res = await create({
      ...SELECTION(),
      selectedTextbooks: [{ textbookId: '00000000-0000-0000-0000-000000000000' }],
    });
    expect(res.status).toBe(400);
    const parent = await pool.query('SELECT * FROM coaching_records WHERE member_id=$1', [memberId]);
    expect(parent.rows).toHaveLength(0);
  });
});

describe('順序・前提の不変条件', () => {
  it('オリエン未登録で初回コーチングは 400', async () => {
    const res = await create({
      type: '初回コーチング',
      date: '2026-06-03',
      coachName: '見本コーチ',
    });
    expect(res.status).toBe(400);
  });

  it('オリエン→初回の順で登録でき、cr_coaching_sessions.coaching_number=1', async () => {
    expect((await create(ORIENT())).status).toBe(201);
    const res = await create({
      type: '初回コーチング',
      date: '2026-06-03',
      coachName: '見本コーチ',
      monthlyReview: '順調',
    });
    expect(res.status).toBe(201);
    const id = (await res.json()).id;
    const ses = await pool.query('SELECT * FROM cr_coaching_sessions WHERE coaching_record_id=$1', [id]);
    expect(ses.rows[0].coaching_number).toBe(1);
  });

  it('初回の実施日がオリエンより前だと 400（日付順序）', async () => {
    await create(ORIENT('2026-06-10'));
    const res = await create({
      type: '初回コーチング',
      date: '2026-06-05',
      coachName: '見本コーチ',
    });
    expect(res.status).toBe(400);
  });

  it('通常コーチングはオリエン+初回が前提（未登録は 400）', async () => {
    await create(ORIENT());
    const res = await create({ type: '通常コーチング', date: '2026-06-04', coachName: '見本コーチ' });
    expect(res.status).toBe(400);
  });

  it('通常コーチングの回数は自動採番（初回=1の次は2）', async () => {
    await create(ORIENT());
    await create({ type: '初回コーチング', date: '2026-06-03', coachName: '見本コーチ' });
    const res = await create({ type: '通常コーチング', date: '2026-06-04', coachName: '見本コーチ' });
    expect(res.status).toBe(201);
    expect((await res.json()).coachingNumber).toBe(2);
  });
});

describe('テスト内容 → 教材の卒業', () => {
  it('初回コーチングで nextStatus=卒業 にすると割り当てに graduated_on が入る', async () => {
    await create(SELECTION()); // T01 を割り当て
    await create(ORIENT());
    const res = await create({
      type: '初回コーチング',
      date: '2026-06-03',
      coachName: '見本コーチ',
      monthlyReview: 'テスト実施',
      textbookTests: [
        { textbookId: t1, testStatus: '実施済み', score: '90', nextStatus: '卒業' },
      ],
    });
    expect(res.status).toBe(201);
    const id = (await res.json()).id;
    // テスト明細が保存（複合キー）
    const tests = await pool.query('SELECT * FROM cr_session_tests WHERE coaching_record_id=$1', [id]);
    expect(tests.rows).toHaveLength(1);
    expect(tests.rows[0].coaching_number).toBe(1);
    expect(tests.rows[0].next_status).toBe('卒業');
    // 割り当てが卒業（graduated_on がセット）
    const asg = await pool.query('SELECT graduated_on FROM textbook_assignments WHERE member_id=$1 AND textbook_id=$2', [memberId, t1]);
    expect(asg.rows[0].graduated_on).not.toBeNull();
  });
});

describe('GET 一覧 / 詳細', () => {
  it('一覧は {coachingRecords:[...]} 形式で実施日順に返す', async () => {
    await create(SELECTION('2026-06-01'));
    await create(ORIENT('2026-06-02'));
    const res = await fetch(listUrl(), { headers: headers() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.coachingRecords)).toBe(true);
    expect(body.coachingRecords).toHaveLength(2);
    expect(body.coachingRecords[0].type).toBe('教材選定');
    expect(body.coachingRecords[1].type).toBe('オリエンテーション');
  });

  it('詳細取得で教材選定の中身が復元される', async () => {
    const id = (await (await create(SELECTION())).json()).id;
    const res = await fetch(recUrl(id), { headers: headers() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sharedNote).toBe('初月の進め方');
    expect(body.selectedTextbooks).toHaveLength(1);
    expect(body.selectedTextbooks[0].textbookId).toBe(t1);
  });

  it('存在しないIDの詳細は 404', async () => {
    const res = await fetch(recUrl('00000000-0000-0000-0000-000000000000'), { headers: headers() });
    expect(res.status).toBe(404);
  });
});

describe('PUT 更新（種別変更で旧子テーブルが置き換わる）', () => {
  it('オリエン→その他に種別変更すると cr_orientations が消え cr_others が入る', async () => {
    const id = (await (await create(ORIENT())).json()).id;
    const res = await fetch(recUrl(id), {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({
        type: 'その他',
        date: '2026-06-02',
        coachName: '見本コーチ',
        otherNotes: '雑談メモ',
      }),
    });
    expect(res.status).toBe(200);
    const orient = await pool.query('SELECT * FROM cr_orientations WHERE coaching_record_id=$1', [id]);
    expect(orient.rows).toHaveLength(0);
    const other = await pool.query('SELECT * FROM cr_others WHERE coaching_record_id=$1', [id]);
    expect(other.rows).toHaveLength(1);
    expect(other.rows[0].other_notes).toBe('雑談メモ');
  });
});

describe('DELETE', () => {
  it('削除すると 204・親と子が消える（CASCADE）', async () => {
    const id = (await (await create(SELECTION())).json()).id;
    const res = await fetch(recUrl(id), { method: 'DELETE', headers: headers() });
    expect(res.status).toBe(204);
    const parent = await pool.query('SELECT * FROM coaching_records WHERE id=$1', [id]);
    expect(parent.rows).toHaveLength(0);
    const items = await pool.query('SELECT * FROM cr_selection_items WHERE coaching_record_id=$1', [id]);
    expect(items.rows).toHaveLength(0);
  });
});

// 削除・編集の整合性（ドメインルールを壊す操作を拒否）
const put = (id: string, body: unknown) =>
  fetch(recUrl(id), { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
const del = (id: string) => fetch(recUrl(id), { method: 'DELETE', headers: headers() });
const FIRST = (date = '2026-06-03') => ({ type: '初回コーチング', date, coachName: '見本コーチ' });
const REGULAR = (date = '2026-06-04') => ({ type: '通常コーチング', date, coachName: '見本コーチ' });
const idOf = async (res: Response) => (await res.json()).id as string;

describe('削除の整合性', () => {
  it('通常コーチングがあると初回コーチングは削除できない（400・残る）', async () => {
    await create(ORIENT());
    const firstId = await idOf(await create(FIRST()));
    await create(REGULAR());
    const res = await del(firstId);
    expect(res.status).toBe(400);
    const { rows } = await pool.query('SELECT 1 FROM coaching_records WHERE id=$1', [firstId]);
    expect(rows).toHaveLength(1); // 残っている
  });

  it('初回/通常があるとオリエンは削除できない（400）', async () => {
    const orientId = await idOf(await create(ORIENT()));
    await create(FIRST());
    await create(REGULAR());
    expect((await del(orientId)).status).toBe(400);
  });

  it('通常コーチングは削除できる（204）', async () => {
    await create(ORIENT());
    await create(FIRST());
    const regId = await idOf(await create(REGULAR()));
    expect((await del(regId)).status).toBe(204);
  });

  it('教材選定・その他は削除できる（204）', async () => {
    const selId = await idOf(await create(SELECTION()));
    expect((await del(selId)).status).toBe(204);
    const otherId = await idOf(await create({ type: 'その他', date: '2026-06-05', coachName: '見本コーチ' }));
    expect((await del(otherId)).status).toBe(204);
  });
});

describe('編集の整合性', () => {
  it('初回コーチングを通常コーチングへ編集できない（400）', async () => {
    await create(ORIENT());
    const firstId = await idOf(await create(FIRST()));
    expect((await put(firstId, REGULAR())).status).toBe(400);
  });

  it('初回が無い状態で通常へ編集できない（400）', async () => {
    await create(ORIENT());
    const otherId = await idOf(await create({ type: 'その他', date: '2026-06-05', coachName: '見本コーチ' }));
    expect((await put(otherId, REGULAR())).status).toBe(400);
  });

  it('初回がある状態でオリエンを別種別へ編集すると孤児化するので拒否（400）', async () => {
    const orientId = await idOf(await create(ORIENT()));
    await create(FIRST());
    const res = await put(orientId, { type: 'その他', date: '2026-06-02', coachName: '見本コーチ' });
    expect(res.status).toBe(400);
  });

  it('依存が無ければオリエンを別種別へ編集できる（200）', async () => {
    const orientId = await idOf(await create(ORIENT()));
    const res = await put(orientId, { type: 'その他', date: '2026-06-02', coachName: '見本コーチ', otherNotes: 'メモ' });
    expect(res.status).toBe(200);
  });
});

describe('認証', () => {
  it('JWTなしの一覧取得は 401', async () => {
    const res = await fetch(listUrl());
    expect(res.status).toBe(401);
  });
});
