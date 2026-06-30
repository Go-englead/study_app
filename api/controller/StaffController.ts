import { Hono } from 'hono';
import type { components } from '../generated/openapi';
import { RegisterStaffUseCase, RegisterStaffInput } from '../usecase/staff/RegisterStaffUseCase';
import { StaffUseCase, UpdateStaffWriteInput, StaffSummaryDto } from '../usecase/staff/StaffUseCase';

type StaffRegisterInputBody = components['schemas']['StaffRegisterInput'];
type StaffUpdateInputBody = components['schemas']['StaffUpdateInput'];
type StaffSummary = components['schemas']['StaffSummary'];

function toResponse(dto: StaffSummaryDto): StaffSummary {
  return { id: dto.id, staffCode: dto.staffCode, name: dto.name, role: dto.role, email: dto.email };
}

/** スタッフ Controller（職員用・admin保護）。権限ルールは usecase→domain。 */
export function registerStaffRoutes(
  app: Hono<any>,
  register: RegisterStaffUseCase,
  staff: StaffUseCase,
): void {
  // GET /v1/admin/staff（一覧／検索 ?keyword=）
  app.get('/staff', async (c) => {
    const list = await staff.list(c.req.query('keyword'));
    return c.json({ staff: list.map(toResponse) });
  });

  // POST /v1/admin/staff（登録）
  app.post('/staff', async (c) => {
    const body = (await c.req.json()) as StaffRegisterInputBody;
    const dto = await register.register(body as unknown as RegisterStaffInput);
    return c.json(toResponse(dto), 201);
  });

  // GET /v1/admin/staff/{staffId}（詳細）
  app.get('/staff/:staffId', async (c) => {
    const dto = await staff.get(c.req.param('staffId'));
    if (!dto) return c.json({ message: 'スタッフが見つかりません' }, 404);
    return c.json(toResponse(dto));
  });

  // PUT /v1/admin/staff/{staffId}（更新）
  app.put('/staff/:staffId', async (c) => {
    const body = (await c.req.json()) as StaffUpdateInputBody;
    const dto = await staff.update(c.req.param('staffId'), body as unknown as UpdateStaffWriteInput);
    return c.json(toResponse(dto));
  });

  // DELETE /v1/admin/staff/{staffId}（削除）
  app.delete('/staff/:staffId', async (c) => {
    await staff.delete(c.req.param('staffId'));
    return c.body(null, 204);
  });
}
