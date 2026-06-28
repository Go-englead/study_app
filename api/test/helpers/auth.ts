import { eq } from 'drizzle-orm';
import { createDatabase } from '../../db/client';
import { staff, staffCredentials } from '../../db/schema';
import { Argon2PasswordHasher } from '../../gateway/Argon2PasswordHasher';

/**
 * テスト用の認証ヘルパー。
 * 無敵JWT（期限ほぼ無限の手製トークン）は廃止し、実際のログインAPI経由で
 * Bearer トークンを取得する（＝テストも本番と同じ認証経路を通る）。
 */

export const SEED_STAFF = {
  staffCode: 'S001',
  name: 'コーチA',
  role: 'Coach',
  email: 'coach_001@example.jp',
  password: 'coach001',
} as const;

/**
 * ログイン用の職員を確実に用意する（冪等）。
 * 一部テスト（会員削除など）が staff を全削除するため、各ファイルの beforeAll で呼んで
 * ログインできる状態を保証する。
 */
export async function ensureLoginStaff(databaseUrl: string): Promise<void> {
  const { db, pool } = createDatabase(databaseUrl);
  try {
    await db.delete(staff).where(eq(staff.staffCode, SEED_STAFF.staffCode)); // 既存なら作り直す（credはCASCADE）
    const [s] = await db
      .insert(staff)
      .values({ staffCode: SEED_STAFF.staffCode, name: SEED_STAFF.name, role: SEED_STAFF.role })
      .returning({ id: staff.id });
    const passwordHash = await new Argon2PasswordHasher().hash(SEED_STAFF.password);
    await db.insert(staffCredentials).values({
      staffId: s.id,
      loginId: SEED_STAFF.email,
      passwordHash,
    });
  } finally {
    await pool.end();
  }
}

/** API 経由で職員ログインし、Authorization ヘッダ値（'Bearer ...'）を返す。 */
export async function loginAsStaff(
  apiUrl: string,
  email: string = SEED_STAFF.email,
  password: string = SEED_STAFF.password,
): Promise<string> {
  const res = await fetch(`${apiUrl}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) {
    throw new Error(`ログイン失敗: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { token: string };
  return `Bearer ${body.token}`;
}

/** 職員シードを保証してからログインし、Bearer を返す（各テストの beforeAll 用）。 */
export async function seedAndLogin(databaseUrl: string, apiUrl: string): Promise<string> {
  await ensureLoginStaff(databaseUrl);
  return loginAsStaff(apiUrl);
}
