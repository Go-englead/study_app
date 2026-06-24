import { Hono } from 'hono';
import { createDatabase } from './db/client';
import { MemberRepositoryImpl } from './gateway/MemberRepositoryImpl';
import { MemberUseCase } from './usecase/member/MemberUseCase';
import { registerMemberRoutes } from './controller/MemberController';
import { registerMeRoutes } from './controller/MeController';
import { memberAuth, adminAuth, MemberAuthVariables, AdminAuthVariables } from './middleware/auth';
import { DomainError } from './domain/shared/domain-error';

/** DomainError → 400、その他 → 500 のエラーハンドラを登録する。 */
function applyErrorHandler(target: Hono<any>): void {
  target.onError((err, c) => {
    if (err instanceof DomainError) {
      return c.json({ message: err.message }, 400);
    }
    console.error(err);
    return c.json({ message: 'Internal Server Error' }, 500);
  });
}

/**
 * Hono アプリを生成する。
 * 認証はミドルウェア層に閉じ込め、JWT から memberId / staffId を抽出して Controller へ渡す。
 *   - /me/*   … 会員自身（memberAuth → memberId）
 *   - /members … 職員用（adminAuth → staffId）
 */
export function createApp(databaseUrl: string) {
  const { db, pool } = createDatabase(databaseUrl);

  const memberRepository = new MemberRepositoryImpl(db);
  const memberUseCase = new MemberUseCase(memberRepository);

  const app = new Hono();

  // ── 会員が叩くAPI（/v1/member/*）──
  const member = new Hono<{ Variables: MemberAuthVariables }>();
  member.use('*', memberAuth);
  registerMeRoutes(member, memberUseCase);
  applyErrorHandler(member);
  app.route('/v1/member', member);

  // ── 職員が叩くAPI（/v1/admin/*）──
  const admin = new Hono<{ Variables: AdminAuthVariables }>();
  admin.use('*', adminAuth);
  registerMemberRoutes(admin, memberUseCase);
  applyErrorHandler(admin);
  app.route('/v1/admin', admin);

  applyErrorHandler(app);

  return { app, close: () => pool.end() };
}
