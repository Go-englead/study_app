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
const uniq = () => randomUUID().slice(0, 8);

function createStaff(over: Record<string, unknown> = {}) {
  const id = uniq();
  return fetch(`${apiUrl}/v1/admin/staff`, {
    method: 'POST',
    headers: h(),
    body: JSON.stringify({
      staffCode: `S_${id}`,
      name: 'テスト職員',
      role: 'Coach',
      email: `staff_${id}@example.jp`,
      password: 'staffpass1',
      ...over,
    }),
  });
}
const login = (email: string, password: string) =>
  fetch(`${apiUrl}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

describe('GET /v1/admin/staff - 一覧', () => {
  it('ブートストラップ職員(S001)を含む一覧を返す', async () => {
    const res = await fetch(`${apiUrl}/v1/admin/staff`, { headers: h() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.staff)).toBe(true);
    expect(body.staff.some((s: { staffCode: string }) => s.staffCode === 'S001')).toBe(true);
  });
});

describe('GET /v1/admin/staff?keyword= - 検索', () => {
  it('氏名・社員ID・メールの部分一致で絞り込める', async () => {
    const mark = `SRCH${uniq()}`;
    const name = `検索対象${mark}`;
    const email = `srch_${mark.toLowerCase()}@example.jp`;
    const code = `S_${mark}`;
    expect((await createStaff({ name, email, staffCode: code })).status).toBe(201);

    const search = async (kw: string) => {
      const res = await fetch(`${apiUrl}/v1/admin/staff?keyword=${encodeURIComponent(kw)}`, { headers: h() });
      expect(res.status).toBe(200);
      return (await res.json()).staff as { staffCode: string; name: string; email: string }[];
    };

    // 氏名で一致
    const byName = await search(`検索対象${mark}`);
    expect(byName.length).toBe(1);
    expect(byName[0].staffCode).toBe(code);
    // 社員IDで一致（大文字小文字問わず＝ILIKE）
    expect((await search(mark.toLowerCase())).some((s) => s.staffCode === code)).toBe(true);
    // メールで一致
    expect((await search(`srch_${mark.toLowerCase()}`)).some((s) => s.email === email)).toBe(true);
    // 該当なしは空
    expect((await search(`notexist_${uniq()}`)).length).toBe(0);
    // keyword 未指定は全件（S001 を含む）
    const all = (await (await fetch(`${apiUrl}/v1/admin/staff`, { headers: h() })).json()).staff;
    expect(all.some((s: { staffCode: string }) => s.staffCode === 'S001')).toBe(true);
  });
});

describe('POST /v1/admin/staff - 登録', () => {
  it('登録すると201・その資格情報でログインできる', async () => {
    const email = `coach_${uniq()}@example.jp`;
    const res = await createStaff({ email, password: 'newcoach1', role: 'Coach' });
    expect(res.status).toBe(201);
    expect((await login(email, 'newcoach1')).status).toBe(200);
  });

  it('社員ID重複は400', async () => {
    const code = `S_DUP_${uniq()}`;
    expect((await createStaff({ staffCode: code, email: `a_${uniq()}@example.jp` })).status).toBe(201);
    expect((await createStaff({ staffCode: code, email: `b_${uniq()}@example.jp` })).status).toBe(400);
  });
});

describe('ロール権限（ログイン可否）', () => {
  it('Consultant は管理画面にログインできない（403）', async () => {
    const email = `cons_${uniq()}@example.jp`;
    await createStaff({ email, role: 'Consultant', password: 'conspass1' });
    expect((await login(email, 'conspass1')).status).toBe(403);
  });

  it('運営(Staff) は管理画面にログインできない（403）', async () => {
    const email = `ope_${uniq()}@example.jp`;
    await createStaff({ email, role: 'Staff', password: 'opepass11' });
    expect((await login(email, 'opepass11')).status).toBe(403);
  });

  it('Teacher は管理画面にログインできる（200）', async () => {
    const email = `teacher_${uniq()}@example.jp`;
    await createStaff({ email, role: 'Teacher', password: 'teachpas1' });
    expect((await login(email, 'teachpas1')).status).toBe(200);
  });

  it('Teacher は PROGOS を登録できない（403・コーチのみ）', async () => {
    const email = `teacher2_${uniq()}@example.jp`;
    await createStaff({ email, role: 'Teacher', password: 'teachpas2' });
    const token = (await (await login(email, 'teachpas2')).json()).token as string;
    // 操作職員を Coach として確定できない＝会員参照前に 403
    const res = await fetch(`${apiUrl}/v1/admin/members/00000000-0000-0000-0000-000000000000/progos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        examDate: '2026-06-01',
        overall: 'B1',
        skills: { range: 'B1', accuracy: 'B1', fluency: 'B1', interaction: 'B1', coherence: 'B1', phonology: 'B1' },
      }),
    });
    expect(res.status).toBe(403);
  });
});

describe('PUT /v1/admin/staff/{id} - 更新', () => {
  it('氏名・役割を更新でき詳細に反映される', async () => {
    const created = await (await createStaff()).json();
    const res = await fetch(`${apiUrl}/v1/admin/staff/${created.id}`, {
      method: 'PUT',
      headers: h(),
      body: JSON.stringify({ name: '更新後の名前', role: 'Teacher' }),
    });
    expect(res.status).toBe(200);
    const detail = await (await fetch(`${apiUrl}/v1/admin/staff/${created.id}`, { headers: h() })).json();
    expect(detail.name).toBe('更新後の名前');
    expect(detail.role).toBe('Teacher');
  });

  it('メール重複は400', async () => {
    const a = await (await createStaff()).json();
    const bEmail = `b_${uniq()}@example.jp`;
    const b = await (await createStaff({ email: bEmail })).json();
    const res = await fetch(`${apiUrl}/v1/admin/staff/${b.id}`, {
      method: 'PUT',
      headers: h(),
      body: JSON.stringify({ email: a.email }),
    });
    expect(res.status).toBe(400);
  });

  it('パスワードを指定すると変更され、新パスワードでログインできる', async () => {
    const email = `pw_${uniq()}@example.jp`;
    const created = await (await createStaff({ email, password: 'oldpass12' })).json();
    const res = await fetch(`${apiUrl}/v1/admin/staff/${created.id}`, {
      method: 'PUT',
      headers: h(),
      body: JSON.stringify({ password: 'newpass99' }),
    });
    expect(res.status).toBe(200);
    expect((await login(email, 'oldpass12')).status).toBe(401);
    expect((await login(email, 'newpass99')).status).toBe(200);
  });
});

describe('DELETE /v1/admin/staff/{id} - 削除', () => {
  it('削除すると詳細が404になる', async () => {
    const created = await (await createStaff()).json();
    expect((await fetch(`${apiUrl}/v1/admin/staff/${created.id}`, { method: 'DELETE', headers: h() })).status).toBe(204);
    expect((await fetch(`${apiUrl}/v1/admin/staff/${created.id}`, { headers: h() })).status).toBe(404);
  });
});

describe('認証', () => {
  it('JWTなしの一覧は401', async () => {
    expect((await fetch(`${apiUrl}/v1/admin/staff`)).status).toBe(401);
  });
});
