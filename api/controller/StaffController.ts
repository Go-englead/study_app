import { Hono } from 'hono';
import type { components } from '../generated/openapi';
import { RegisterStaffUseCase, RegisterStaffInput } from '../usecase/staff/RegisterStaffUseCase';

type StaffRegisterInputBody = components['schemas']['StaffRegisterInput'];
type StaffSummary = components['schemas']['StaffSummary'];

/** スタッフ Controller（職員用・admin保護）。 */
export function registerStaffRoutes(app: Hono<any>, register: RegisterStaffUseCase): void {
  // POST /v1/admin/staff（既存職員が新しい職員を登録）
  app.post('/staff', async (c) => {
    const body = (await c.req.json()) as StaffRegisterInputBody;
    const dto = await register.register(body as unknown as RegisterStaffInput);
    const res: StaffSummary = {
      id: dto.id,
      staffCode: dto.staffCode,
      name: dto.name,
      role: dto.role,
      email: dto.email,
    };
    return c.json(res, 201);
  });
}
