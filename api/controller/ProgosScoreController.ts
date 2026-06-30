import { Hono } from 'hono';
import type { components } from '../generated/openapi';
import { ProgosScoreUseCase, ProgosScoreWriteInput } from '../usecase/progos-score/ProgosScoreUseCase';
import { ProgosScoreDto } from '../usecase/progos-score/ProgosScoreDto';

type ProgosScoreResponse = components['schemas']['ProgosScore'];
type ProgosScoreInputBody = components['schemas']['ProgosScoreInput'];

function toResponse(dto: ProgosScoreDto): ProgosScoreResponse {
  return {
    id: dto.id,
    memberId: dto.memberId,
    examDate: dto.examDate,
    overall: dto.overall as ProgosScoreResponse['overall'],
    skills: dto.skills as ProgosScoreResponse['skills'],
    comment: dto.comment,
  };
}

/** PROGOSスコア（会員カルテ）の Controller（職員用）。 */
export function registerProgosScoreRoutes(app: Hono<any>, usecase: ProgosScoreUseCase): void {
  // GET /members/{memberId}/progos
  app.get('/members/:memberId/progos', async (c) => {
    const dtos = await usecase.listByMember(c.req.param('memberId'));
    return c.json(dtos.map(toResponse));
  });

  // POST /members/{memberId}/progos（権限判定は usecase→domain。controllerは操作職員IDを渡すだけ）
  app.post('/members/:memberId/progos', async (c) => {
    const body = (await c.req.json()) as ProgosScoreInputBody;
    const staffId = c.get('staffId') as string;
    const dto = await usecase.add(c.req.param('memberId'), body as unknown as ProgosScoreWriteInput, staffId);
    return c.json(toResponse(dto), 201);
  });
}
