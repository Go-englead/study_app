import { sign } from 'hono/jwt';

/**
 * テスト用 JWT 発行ヘルパー。
 * secret はミドルウェアと同じ（既定 'test-key'）。期限はほぼ永遠（2100年）。
 */
const SECRET = process.env.JWT_SECRET ?? 'test-key';
const FAR_FUTURE = 4102444800; // 2100-01-01T00:00:00Z（exp）

/** 会員用トークン（claim: memberId） */
export function memberToken(memberId: string): Promise<string> {
  return sign({ memberId, exp: FAR_FUTURE }, SECRET);
}

/** 職員（管理）用トークン（claim: adminId） */
export function adminToken(adminId: string): Promise<string> {
  return sign({ adminId, exp: FAR_FUTURE }, SECRET);
}

/** Authorization ヘッダ値を組み立てる */
export async function memberBearer(memberId: string): Promise<string> {
  return `Bearer ${await memberToken(memberId)}`;
}
export async function adminBearer(adminId: string): Promise<string> {
  return `Bearer ${await adminToken(adminId)}`;
}
