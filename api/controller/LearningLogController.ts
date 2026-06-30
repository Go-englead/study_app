import { Hono } from 'hono';
import type { components } from '../generated/openapi';
import { LearningLogUseCase, LearningLogWriteInput } from '../usecase/learning-log/LearningLogUseCase';
import { LearningLogDto } from '../usecase/learning-log/LearningLogDto';

type LearningLogResponse = components['schemas']['LearningLog'];
type LearningLogInputBody = components['schemas']['LearningLogInput'];

function toResponse(dto: LearningLogDto): LearningLogResponse {
  return {
    id: dto.id,
    memberId: dto.memberId,
    textbookId: dto.textbookId,
    date: dto.date,
    durationMinutes: dto.durationMinutes,
    comment: dto.comment,
  };
}

/** 学習記録（会員カルテ）の Controller（職員用）。 */
export function registerLearningLogRoutes(app: Hono<any>, usecase: LearningLogUseCase): void {
  // GET /members/{memberId}/learning-logs
  app.get('/members/:memberId/learning-logs', async (c) => {
    const dtos = await usecase.listByMember(c.req.param('memberId'));
    return c.json(dtos.map(toResponse));
  });

  // POST /members/{memberId}/learning-logs
  app.post('/members/:memberId/learning-logs', async (c) => {
    const body = (await c.req.json()) as LearningLogInputBody;
    const dto = await usecase.add(c.req.param('memberId'), body as unknown as LearningLogWriteInput);
    return c.json(toResponse(dto), 201);
  });

  // DELETE /members/{memberId}/learning-logs/{logId}
  app.delete('/members/:memberId/learning-logs/:logId', async (c) => {
    await usecase.delete(c.req.param('logId'));
    return c.body(null, 204);
  });
}
