import { Hono } from 'hono';
import type { components } from '../generated/openapi';
import { StaffLoginUseCase } from '../usecase/auth/StaffLoginUseCase';
import { AuthError } from '../domain/shared/auth-error';

type AuthUser = components['schemas']['AuthUser'];

/**
 * 認証 Controller（未認証で叩ける）。
 * ログイン失敗（資格情報不正）は 401 を返す（セッション切れ 401 と同じコードだが、
 * クライアントはログイン要求のレスポンスとして個別に扱う＝リダイレクトしない）。
 */
export function registerAuthRoutes(app: Hono<any>, login: StaffLoginUseCase): void {
  // POST /v1/auth/login（会員・職員共通の入口。現状は職員のみ実装）
  app.post('/login', async (c) => {
    const body = (await c.req.json()) as { email?: string; password?: string };
    try {
      const result = await login.login(body.email ?? '', body.password ?? '');
      const user: AuthUser = {
        id: result.staff.id,
        email: result.staff.email,
        name: result.staff.name,
        role: result.staff.role,
      };
      return c.json({ token: result.token, user });
    } catch (e) {
      if (e instanceof AuthError) {
        return c.json({ message: e.message }, 401);
      }
      throw e;
    }
  });
}
