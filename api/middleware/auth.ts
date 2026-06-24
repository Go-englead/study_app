import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import { MemberId } from '../domain/member/member';
import { StaffId } from '../domain/staff/staff';

/**
 * 認証ミドルウェア（シーム）。
 *
 * 将来構想：アカウント基盤で認証 → JWT が各エンドポイントに流れてくる →
 * JWT の claim から memberId / adminId を抽出して Context に積み、Controller は c.get() で受け取る。
 *
 * 現状は同一サービス内で HS256 検証する（secret は JWT_SECRET、既定 'test-key'）。
 * アカウント基盤ができたら verify を JWKS 等に差し替えるだけで、
 * 「抽出 → Context → Controller」の継ぎ目は不変。
 */

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-key';

export interface JwtClaims {
  /** 会員用エンドポイントの主体 */
  memberId?: string;
  /** 職員（管理）用エンドポイントの主体 */
  adminId?: string;
}

/** Context 変数（型付き）。ミドルウェアが set し、Controller が get する。 */
export interface MemberAuthVariables {
  memberId: MemberId;
}
export interface AdminAuthVariables {
  staffId: StaffId;
}

/** Authorization: Bearer <JWT> を HS256 検証し、claims を返す。失敗時は null。 */
export async function verifyJwt(authHeader?: string): Promise<JwtClaims | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  try {
    return (await verify(token, JWT_SECRET, 'HS256')) as JwtClaims;
  } catch {
    return null;
  }
}

/** 会員用：JWT(memberId) → Context.memberId */
export const memberAuth = createMiddleware<{ Variables: MemberAuthVariables }>(async (c, next) => {
  const claims = await verifyJwt(c.req.header('Authorization'));
  if (!claims?.memberId) {
    return c.json({ message: '認証が必要です（会員）' }, 401);
  }
  c.set('memberId', claims.memberId as MemberId);
  await next();
});

/** 職員用：JWT(adminId) → Context.staffId（adminId は職員=スタッフのID） */
export const adminAuth = createMiddleware<{ Variables: AdminAuthVariables }>(async (c, next) => {
  const claims = await verifyJwt(c.req.header('Authorization'));
  if (!claims?.adminId) {
    return c.json({ message: '認証が必要です（職員）' }, 401);
  }
  c.set('staffId', claims.adminId as StaffId);
  await next();
});
