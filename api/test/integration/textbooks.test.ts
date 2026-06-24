import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../../db/client';
import * as schema from '../../db/schema';
import { adminBearer } from '../helpers/auth';

const apiUrl = inject('apiUrl');
const { db, pool } = createDatabase(inject('databaseUrl'));

const ADMIN = '/v1/admin';
let auth: string;

beforeAll(async () => {
  auth = await adminBearer('MW001');
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // members を消すと教材を参照する従属行（割当/学習記録/コーチングテスト）が CASCADE で消え、
  // その後 textbooks（RESTRICT被参照）を安全に削除できる。
  await db.delete(schema.members);
  await db.delete(schema.textbooks);
});

// 既存クライアントのフォームに準拠した入力。id(UUID) は送らず textbookCode(業務コード) を送る。
const sampleInput = {
  textbookCode: 'T99',
  name: 'テスト教材',
  category: '単語/フレーズ',
  unit: 'Day',
  color: '#2E86C1',
  iconUrl: 'https://example.jp/icon.png',
  manualUrl: 'https://example.jp/manual',
  note: 'メモ',
};

function send(path: string, body: unknown, method = 'POST') {
  return fetch(`${apiUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', Authorization: auth },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function get(path: string) {
  return fetch(`${apiUrl}${path}`, { headers: { Authorization: auth } });
}

/** 教材を Drizzle で投入して UUID を返す */
async function seedTextbook(overrides: Partial<schema.NewTextbookRow> = {}): Promise<string> {
  const id = randomUUID();
  await db.insert(schema.textbooks).values({
    id,
    textbookCode: 'T01',
    name: 'キクタン',
    category: '単語/フレーズ',
    unit: 'Day',
    color: '#2E86C1',
    ...overrides,
  });
  return id;
}

describe('認証', () => {
  it('JWTなしで教材APIを叩くと401', async () => {
    const res = await fetch(`${apiUrl}${ADMIN}/textbooks`);
    expect(res.status).toBe(401);
  });
});

describe('GET /v1/admin/textbooks（一覧）', () => {
  it('登録済みの教材一覧を返す（{ textbooks: [...] }）', async () => {
    await seedTextbook({ textbookCode: 'T01', name: 'キクタン' });
    await seedTextbook({ textbookCode: 'T02', name: '起きてから寝るまで' });

    const res = await get(`${ADMIN}/textbooks`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.textbooks).toHaveLength(2);
    const codes = body.textbooks.map((t: { textbookCode: string }) => t.textbookCode).sort();
    expect(codes).toEqual(['T01', 'T02']);
  });
});

describe('GET /v1/admin/textbooks/:textbookId（詳細）', () => {
  it('UUID で1件取得できる', async () => {
    const id = await seedTextbook({ textbookCode: 'T05', name: '文法書', unit: 'Lesson' });

    const res = await get(`${ADMIN}/textbooks/${id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(id);
    expect(body.textbookCode).toBe('T05');
    expect(body.name).toBe('文法書');
    expect(body.unit).toBe('Lesson');
  });

  it('存在しない教材は404', async () => {
    const res = await get(`${ADMIN}/textbooks/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });
});

describe('POST /v1/admin/textbooks（登録）', () => {
  it('登録すると UUID id が採番され、201＋DB保存される', async () => {
    const res = await send(`${ADMIN}/textbooks`, sampleInput);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/i); // UUID
    expect(body.textbookCode).toBe('T99');
    expect(body.name).toBe('テスト教材');
    expect(body.unit).toBe('Day');

    const { rows } = await pool.query('SELECT * FROM textbooks WHERE textbook_code = $1', ['T99']);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(body.id);
    expect(rows[0].name).toBe('テスト教材');
    expect(rows[0].color).toBe('#2E86C1');
    expect(rows[0].note).toBe('メモ');
  });

  it('教材名が無いと400（DomainError）になり保存されない', async () => {
    const { name, ...rest } = sampleInput;
    const res = await send(`${ADMIN}/textbooks`, rest);
    expect(res.status).toBe(400);

    const { rows } = await pool.query('SELECT * FROM textbooks WHERE textbook_code = $1', ['T99']);
    expect(rows).toHaveLength(0);
  });

  it('不正な単位だと400になる', async () => {
    const res = await send(`${ADMIN}/textbooks`, { ...sampleInput, unit: 'Week' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /v1/admin/textbooks/:textbookId（編集）', () => {
  it('教材名・カテゴリ・単位を変更するとDBが更新される', async () => {
    const id = await seedTextbook({ textbookCode: 'T10', name: '旧名', unit: 'Day' });

    const res = await send(
      `${ADMIN}/textbooks/${id}`,
      { textbookCode: 'T10', name: '新名', category: '文法', unit: 'Chapter' },
      'PUT',
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('新名');
    expect(body.unit).toBe('Chapter');

    const row = await db.query.textbooks.findFirst({ where: eq(schema.textbooks.id, id) });
    expect(row?.name).toBe('新名');
    expect(row?.category).toBe('文法');
    expect(row?.unit).toBe('Chapter');
  });

  it('存在しない教材の編集は404', async () => {
    const res = await send(
      `${ADMIN}/textbooks/00000000-0000-0000-0000-000000000000`,
      { textbookCode: 'T10', name: 'x', category: 'y', unit: 'Day' },
      'PUT',
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /v1/admin/textbooks/:textbookId（削除）', () => {
  it('削除すると204を返し、DBから消える', async () => {
    const id = await seedTextbook({ textbookCode: 'T20' });

    const res = await send(`${ADMIN}/textbooks/${id}`, undefined, 'DELETE');
    expect(res.status).toBe(204);

    const { rows } = await pool.query('SELECT * FROM textbooks WHERE id = $1', [id]);
    expect(rows).toHaveLength(0);

    const getRes = await get(`${ADMIN}/textbooks/${id}`);
    expect(getRes.status).toBe(404);
  });
});
