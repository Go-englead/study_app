import { Hono } from 'hono';
import { MemberUseCase } from '../usecase/member/MemberUseCase';
import { MemberAuthVariables } from '../middleware/auth';

/**
 * 会員自身（/me/*）の Controller。
 * memberAuth が JWT から積んだ memberId を c.get('memberId') で受け取り、
 * 認証主体に紐づくデータのみを返す（他会員のIDは受け取らない）。
 */
export function registerMeRoutes(
  app: Hono<{ Variables: MemberAuthVariables }>,
  usecase: MemberUseCase,
): void {
  // GET /v1/member/me … 自分の会員情報
  app.get('/me', async (c) => {
    const memberId = c.get('memberId');
    const dto = await usecase.get(memberId);
    if (!dto) return c.json({ message: '会員が見つかりません' }, 404);
    return c.json(dto);
  });
}
