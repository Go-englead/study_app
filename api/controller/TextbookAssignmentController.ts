import { Hono } from 'hono';
import type { components } from '../generated/openapi';
import { TextbookAssignmentUseCase } from '../usecase/textbook-assignment/TextbookAssignmentUseCase';
import { AssignedTextbookDto } from '../usecase/textbook-assignment/AssignedTextbookDto';

type AssignedTextbookResponse = components['schemas']['AssignedTextbook'];
type AssignTextbookInputBody = components['schemas']['AssignTextbookInput'];

function toResponse(dto: AssignedTextbookDto): AssignedTextbookResponse {
  return {
    textbookId: dto.textbookId,
    textbookCode: dto.textbookCode,
    name: dto.name,
    category: dto.category,
    unit: dto.unit,
    color: dto.color,
    dailyGoalMinutes: dto.dailyGoalMinutes,
    note: dto.note,
  };
}

/**
 * 教材割り当て（会員⨯教材）の Controller。会員配下のネストパスにルーティング。
 */
export function registerTextbookAssignmentRoutes(
  app: Hono<any>,
  usecase: TextbookAssignmentUseCase,
): void {
  // GET /members/{memberId}/textbook-assignments
  app.get('/members/:memberId/textbook-assignments', async (c) => {
    const dtos = await usecase.listByMember(c.req.param('memberId'));
    const body: { assignments: AssignedTextbookResponse[] } = {
      assignments: dtos.map(toResponse),
    };
    return c.json(body);
  });

  // POST /members/{memberId}/textbook-assignments
  app.post('/members/:memberId/textbook-assignments', async (c) => {
    const body = (await c.req.json()) as AssignTextbookInputBody;
    const dto = await usecase.assign(c.req.param('memberId'), {
      textbookId: body.textbookId,
      dailyGoalMinutes: body.dailyGoalMinutes,
      note: body.note,
    });
    return c.json(toResponse(dto), 201);
  });

  // DELETE /members/{memberId}/textbook-assignments/{textbookId}
  app.delete('/members/:memberId/textbook-assignments/:textbookId', async (c) => {
    await usecase.unassign(c.req.param('memberId'), c.req.param('textbookId'));
    return c.body(null, 204);
  });
}
