import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sign } from 'hono/jwt';
import { createDatabase } from '../../db/client';
import { seedAndLogin, SEED_STAFF, ensureLoginStaff } from '../helpers/auth';

const apiUrl = inject('apiUrl');
const { pool } = createDatabase(inject('databaseUrl'));

let auth: string;

beforeAll(async () => {
  auth = await seedAndLogin(inject('databaseUrl'), apiUrl);
});
afterAll(async () => {
  await pool.end();
});

const login = (email: string, password: string) =>
  fetch(`${apiUrl}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

describe('POST /v1/auth/login - 職員ログイン', () => {
  it('正しい資格情報で 200・JWTを返す', async () => {
    const res = await login(SEED_STAFF.email, SEED_STAFF.password);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(20);
    expect(body.user.email).toBe(SEED_STAFF.email);
  });

  it('パスワードが違うと 401', async () => {
    const res = await login(SEED_STAFF.email, 'wrong-password');
    expect(res.status).toBe(401);
  });

  it('存在しないメールで 401', async () => {
    const res = await login('nobody@example.jp', 'whatever1');
    expect(res.status).toBe(401);
  });
});

describe('パスワード保存（ハッシュ化・別テーブル）', () => {
  it('staff_credentials に平文ではなく argon2id ハッシュで保存される', async () => {
    await ensureLoginStaff(inject('databaseUrl'));
    const { rows } = await pool.query(
      'SELECT password_hash FROM staff_credentials WHERE login_id = $1',
      [SEED_STAFF.email],
    );
    expect(rows).toHaveLength(1);
    const hash = rows[0].password_hash as string;
    expect(hash).not.toBe(SEED_STAFF.password); // 平文でない
    expect(hash.startsWith('$argon2id$')).toBe(true); // argon2id 形式
  });

  it('staff テーブルにはパスワード列が無い（資格情報は別テーブル）', async () => {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'staff'`,
    );
    const cols = rows.map((r: { column_name: string }) => r.column_name);
    expect(cols).not.toContain('password');
    expect(cols).not.toContain('password_hash');
  });
});

describe('POST /v1/admin/staff - 職員登録（要ログイン）', () => {
  it('登録するとハッシュ化保存され、その資格情報でログインできる', async () => {
    const email = `new_${randomUUID().slice(0, 8)}@example.jp`;
    const res = await fetch(`${apiUrl}/v1/admin/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({
        staffCode: `SX_${randomUUID().slice(0, 6)}`,
        name: '新人コーチ',
        role: 'Coach',
        email,
        password: 'newpass123',
      }),
    });
    expect(res.status).toBe(201);

    // 保存はハッシュ
    const { rows } = await pool.query('SELECT password_hash FROM staff_credentials WHERE login_id = $1', [email]);
    expect(rows[0].password_hash.startsWith('$argon2id$')).toBe(true);

    // 登録した資格情報でログインできる
    const loginRes = await login(email, 'newpass123');
    expect(loginRes.status).toBe(200);
  });

  it('短すぎるパスワードは 400', async () => {
    const res = await fetch(`${apiUrl}/v1/admin/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({
        staffCode: `SX_${randomUUID().slice(0, 6)}`,
        name: 'x',
        role: 'Coach',
        email: `short_${randomUUID().slice(0, 6)}@example.jp`,
        password: 'short',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('未ログイン（トークンなし）で登録は 401', async () => {
    const res = await fetch(`${apiUrl}/v1/admin/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffCode: 'SX_NG', name: 'x', role: 'Coach', email: 'ng@example.jp', password: 'newpass123' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('未認証アクセスは 401（複数エンドポイント）', () => {
  const dummyId = '00000000-0000-0000-0000-000000000000';
  const endpoints = [
    '/v1/admin/members',
    '/v1/admin/textbooks',
    `/v1/admin/members/${dummyId}/coaching-records`,
    `/v1/admin/members/${dummyId}/learning-logs`,
    `/v1/admin/members/${dummyId}/progos`,
  ];

  it('トークンなしは全て 401', async () => {
    for (const ep of endpoints) {
      const res = await fetch(`${apiUrl}${ep}`);
      expect(res.status, ep).toBe(401);
    }
  });

  it('不正なトークンは 401', async () => {
    const res = await fetch(`${apiUrl}/v1/admin/members`, {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    expect(res.status).toBe(401);
  });

  it('期限切れトークンは 401', async () => {
    const expired = await sign(
      { adminId: 'someone', exp: Math.floor(Date.now() / 1000) - 60 },
      'test-key',
      'HS256',
    );
    const res = await fetch(`${apiUrl}/v1/admin/members`, {
      headers: { Authorization: `Bearer ${expired}` },
    });
    expect(res.status).toBe(401);
  });
});
