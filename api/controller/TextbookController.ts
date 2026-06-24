import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import type { components } from '../generated/openapi';
import { TextbookUseCase } from '../usecase/textbook/TextbookUseCase';
import { TextbookDto } from '../usecase/textbook/TextbookDto';
import { CreateTextbookInput, UpdateTextbookInput } from '../domain/textbook/textbook';

// OpenAPI から自動生成した型
type TextbookResponse = components['schemas']['Textbook'];
type TextbookInputBody = components['schemas']['TextbookInput'];

// ───────── リクエスト → ドメイン入力 ─────────
function toCreateInput(b: TextbookInputBody): CreateTextbookInput {
  return {
    id: randomUUID(), // UUID はアプリ側で採番
    code: b.textbookCode ?? '', // 教材コード（業務キー）
    name: b.name ?? '',
    category: b.category ?? '',
    unit: b.unit ?? '',
    color: b.color,
    iconUrl: b.iconUrl,
    manualUrl: b.manualUrl,
    note: b.note,
  };
}

function toUpdateInput(b: TextbookInputBody): UpdateTextbookInput {
  return {
    name: b.name,
    category: b.category,
    unit: b.unit,
    color: b.color,
    iconUrl: b.iconUrl,
    manualUrl: b.manualUrl,
    note: b.note,
  };
}

// ───────── DTO → Response 変換 ─────────
function toTextbookResponse(dto: TextbookDto): TextbookResponse {
  return {
    id: dto.id,
    textbookCode: dto.textbookCode,
    name: dto.name,
    category: dto.category,
    unit: dto.unit as TextbookResponse['unit'],
    color: dto.color,
    iconUrl: dto.iconUrl,
    manualUrl: dto.manualUrl,
    note: dto.note,
  };
}

/**
 * Textbook（教材マスタ）の Controller。OpenAPI のパスに合わせてルーティングし、
 * UseCase を呼んで DTO を取得 → 生成 Response 型へ変換して返す。
 */
export function registerTextbookRoutes(app: Hono<any>, usecase: TextbookUseCase): void {
  // GET /textbooks（一覧）
  app.get('/textbooks', async (c) => {
    const dtos = await usecase.list();
    const body: { textbooks: TextbookResponse[] } = {
      textbooks: dtos.map(toTextbookResponse),
    };
    return c.json(body);
  });

  // GET /textbooks/{textbookId}（詳細）
  app.get('/textbooks/:textbookId', async (c) => {
    const dto = await usecase.get(c.req.param('textbookId'));
    if (!dto) return c.json({ message: '教材が見つかりません' }, 404);
    return c.json(toTextbookResponse(dto));
  });

  // POST /textbooks（登録）
  app.post('/textbooks', async (c) => {
    const body = (await c.req.json()) as TextbookInputBody;
    const dto = await usecase.register(toCreateInput(body)); // createTextbook が検証（DomainError → onError）
    return c.json(toTextbookResponse(dto), 201);
  });

  // PUT /textbooks/{textbookId}（編集）
  app.put('/textbooks/:textbookId', async (c) => {
    const body = (await c.req.json()) as TextbookInputBody;
    const dto = await usecase.update(c.req.param('textbookId'), toUpdateInput(body));
    if (!dto) return c.json({ message: '教材が見つかりません' }, 404);
    return c.json(toTextbookResponse(dto));
  });

  // DELETE /textbooks/{textbookId}（削除）
  app.delete('/textbooks/:textbookId', async (c) => {
    await usecase.remove(c.req.param('textbookId'));
    return c.body(null, 204);
  });
}
