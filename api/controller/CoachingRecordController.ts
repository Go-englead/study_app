import { Hono } from 'hono';
import type { components } from '../generated/openapi';
import { CoachingRecordUseCase, CoachingRecordWriteInput } from '../usecase/coaching-record/CoachingRecordUseCase';
import { CoachingRecordDto } from '../usecase/coaching-record/CoachingRecordDto';

type CoachingRecordResponse = components['schemas']['CoachingRecord'];
type CoachingRecordInputBody = components['schemas']['CoachingRecordInput'];

function toResponse(dto: CoachingRecordDto): CoachingRecordResponse {
  return {
    id: dto.id,
    memberId: dto.memberId,
    type: dto.type as CoachingRecordResponse['type'],
    date: dto.date,
    coachName: dto.coachName,
    selectedTextbooks: dto.selectedTextbooks,
    sharedNote: dto.sharedNote,
    coachingNumber: dto.coachingNumber,
    textbookTests: dto.textbookTests as CoachingRecordResponse['textbookTests'],
    monthlyReview: dto.monthlyReview,
    coachAdvice: dto.coachAdvice,
    otherNotes: dto.otherNotes,
  };
}

/**
 * コーチング記録（会員カルテ）の Controller。
 * 一覧/作成は会員配下のネストパス、詳細/更新/削除は coaching-records 直下にルーティング。
 */
export function registerCoachingRecordRoutes(app: Hono<any>, usecase: CoachingRecordUseCase): void {
  // GET /members/{memberId}/coaching-records
  app.get('/members/:memberId/coaching-records', async (c) => {
    const dtos = await usecase.listByMember(c.req.param('memberId'));
    const body: { coachingRecords: CoachingRecordResponse[] } = {
      coachingRecords: dtos.map(toResponse),
    };
    return c.json(body);
  });

  // POST /members/{memberId}/coaching-records
  app.post('/members/:memberId/coaching-records', async (c) => {
    const body = (await c.req.json()) as CoachingRecordInputBody;
    const dto = await usecase.create(c.req.param('memberId'), body as unknown as CoachingRecordWriteInput);
    return c.json(toResponse(dto), 201);
  });

  // GET /coaching-records/{coachingRecordId}
  app.get('/coaching-records/:coachingRecordId', async (c) => {
    const dto = await usecase.getById(c.req.param('coachingRecordId'));
    if (!dto) return c.json({ message: 'コーチング記録が見つかりません' }, 404);
    return c.json(toResponse(dto));
  });

  // PUT /coaching-records/{coachingRecordId}
  app.put('/coaching-records/:coachingRecordId', async (c) => {
    const body = (await c.req.json()) as CoachingRecordInputBody;
    const dto = await usecase.update(c.req.param('coachingRecordId'), body as unknown as CoachingRecordWriteInput);
    return c.json(toResponse(dto));
  });

  // DELETE /coaching-records/{coachingRecordId}
  app.delete('/coaching-records/:coachingRecordId', async (c) => {
    await usecase.delete(c.req.param('coachingRecordId'));
    return c.body(null, 204);
  });
}
