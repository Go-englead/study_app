import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../../db/client';
import { seedAndLogin } from '../helpers/auth';

const apiUrl = inject('apiUrl');
const { pool } = createDatabase(inject('databaseUrl'));

let auth: string;
beforeAll(async () => {
  auth = await seedAndLogin(inject('databaseUrl'), apiUrl);
});
afterAll(async () => {
  await pool.end();
});

const h = () => ({ 'Content-Type': 'application/json', Authorization: auth });

/** サーバーの「本日」(DateOnly.today)と同じ TZ で offset 日付を作る。 */
function ymd(offsetDays: number): string {
  const x = new Date();
  x.setDate(x.getDate() + offsetDays);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

async function createMember(over: Record<string, unknown> = {}): Promise<{ id: string; status: string }> {
  const code = randomUUID().slice(0, 8);
  const res = await fetch(`${apiUrl}/v1/admin/members`, {
    method: 'POST',
    headers: h(),
    body: JSON.stringify({
      code,
      lastNameKanji: 'ステ',
      firstNameKanji: 'タス',
      email: `st_${code}@example.jp`,
      plan: '6ヶ月プラン',
      initialClass: 'Beginner',
      currentClass: 'Beginner',
      nativecamp: '未選択',
      dailyTargetMinutes: 60,
      ...over,
    }),
  });
  expect(res.status).toBe(201);
  const body = await res.json();
  return { id: body.id, status: body.status };
}

const getStatus = async (id: string): Promise<string> =>
  (await (await fetch(`${apiUrl}/v1/admin/members/${id}`, { headers: h() })).json()).status;

describe('会員ステータスは日付から自動算出される', () => {
  it('受講開始日が未来 → 入学手続き中', async () => {
    const m = await createMember({ startDate: ymd(7) });
    expect(m.status).toBe('入学手続き中');
  });

  it('受講開始日が未設定 → 入学手続き中', async () => {
    const m = await createMember({});
    expect(m.status).toBe('入学手続き中');
  });

  it('卒業予定日「当日」は受講中（today ≤ 卒業予定日）', async () => {
    const m = await createMember({ startDate: ymd(-30), graduateDate: ymd(0) });
    expect(m.status).toBe('受講中');
  });

  it('卒業予定日が未来なら受講中', async () => {
    const m = await createMember({ startDate: ymd(-30), graduateDate: ymd(30) });
    expect(m.status).toBe('受講中');
  });

  it('卒業予定日を過ぎたら卒業（卒業予定日 < today）', async () => {
    const m = await createMember({ startDate: ymd(-60), graduateDate: ymd(-1) });
    expect(m.status).toBe('卒業');
  });
});

describe('途中退会（唯一の手動ステータス）', () => {
  it('withdraw で途中退会・取り消しで日付からの算出に戻る', async () => {
    // 日付的には受講中の会員
    const m = await createMember({ startDate: ymd(-30), graduateDate: ymd(30) });
    expect(m.status).toBe('受講中');

    // 途中退会にする
    const w = await fetch(`${apiUrl}/v1/admin/members/${m.id}/withdraw`, { method: 'POST', headers: h() });
    expect(w.status).toBe(200);
    expect((await w.json()).status).toBe('途中退会');
    expect(await getStatus(m.id)).toBe('途中退会');

    // 取り消し → 受講中に戻る
    const r = await fetch(`${apiUrl}/v1/admin/members/${m.id}/withdraw`, { method: 'DELETE', headers: h() });
    expect(r.status).toBe(200);
    expect((await r.json()).status).toBe('受講中');
    expect(await getStatus(m.id)).toBe('受講中');
  });

  it('存在しない会員の withdraw は404', async () => {
    const res = await fetch(`${apiUrl}/v1/admin/members/${randomUUID()}/withdraw`, { method: 'POST', headers: h() });
    expect(res.status).toBe(404);
  });
});

const addPlan = (id: string, body: Record<string, unknown>) =>
  fetch(`${apiUrl}/v1/admin/members/${id}/continuation-plans`, { method: 'POST', headers: h(), body: JSON.stringify(body) });

describe('継続プラン（会員サテライト）とステータス連動', () => {
  it('開始日が未来の継続プラン → 再入学手続き中', async () => {
    const m = await createMember({ startDate: ymd(-60), graduateDate: ymd(-1) }); // 日付的には卒業
    expect(m.status).toBe('卒業');
    const res = await addPlan(m.id, { planType: 'タビプラプラン', months: 3, startDate: ymd(10) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.continuationPlans.length).toBe(1);
    // 終了日＝開始日＋3ヶ月−1日（自動算出）
    expect(body.continuationPlans[0].endDate).toBeDefined();
    expect(body.status).toBe('再入学手続き中');
    expect(await getStatus(m.id)).toBe('再入学手続き中');
  });

  it('開始済みで期間中の継続プラン → 継続中', async () => {
    const m = await createMember({ startDate: ymd(-60), graduateDate: ymd(-1) });
    const res = await addPlan(m.id, { planType: '英語講座プラン', months: 6, startDate: ymd(-1) });
    expect((await res.json()).status).toBe('継続中');
  });

  it('applyGraduateDate=true で卒業予定日が終了日に更新される', async () => {
    const m = await createMember({ startDate: ymd(-60), graduateDate: ymd(-1) });
    const res = await addPlan(m.id, { planType: 'タビプラプラン', months: 1, startDate: ymd(-1), applyGraduateDate: true });
    const body = await res.json();
    expect(body.graduateDate).toBe(body.continuationPlans[0].endDate);
  });

  it('不正なプラン種別は400', async () => {
    const m = await createMember({});
    const res = await addPlan(m.id, { planType: '存在しないプラン', months: 3, startDate: ymd(1) });
    expect(res.status).toBe(400);
  });

  it('継続プランを編集・削除できる', async () => {
    const m = await createMember({ startDate: ymd(-60), graduateDate: ymd(-1) });
    const planId = (await (await addPlan(m.id, { planType: 'タビプラプラン', months: 3, startDate: ymd(5) })).json())
      .continuationPlans[0].id;

    // 編集（種別変更）
    const upd = await fetch(`${apiUrl}/v1/admin/members/${m.id}/continuation-plans/${planId}`, {
      method: 'PUT',
      headers: h(),
      body: JSON.stringify({ planType: '英語コーチングプラン', months: 2, startDate: ymd(5) }),
    });
    expect(upd.status).toBe(200);
    expect((await upd.json()).continuationPlans[0].planType).toBe('英語コーチングプラン');

    // 削除 → 履歴空・ステータスは日付ベース（卒業）へ戻る
    const del = await fetch(`${apiUrl}/v1/admin/members/${m.id}/continuation-plans/${planId}`, { method: 'DELETE', headers: h() });
    expect(del.status).toBe(200);
    const body = await del.json();
    expect(body.continuationPlans.length).toBe(0);
    expect(body.status).toBe('卒業');
  });
});
