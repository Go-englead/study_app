import { TextbookRepository } from '../../domain/textbook/textbook-repository';
import {
  Textbook,
  TextbookId,
  CreateTextbookInput,
  UpdateTextbookInput,
} from '../../domain/textbook/textbook';
import { TextbookDto, toTextbookDto } from './TextbookDto';

/**
 * Textbook（教材マスタ）ユースケース。
 * リポジトリからドメインを取得し、ドメイン操作（create/update）を行い、DTO で返す。
 */
export class TextbookUseCase {
  constructor(private readonly textbooks: TextbookRepository) {}

  /** 1件取得 */
  async get(id: string): Promise<TextbookDto | undefined> {
    const textbook = await this.textbooks.findById(TextbookId.create(id));
    return textbook ? toTextbookDto(textbook) : undefined;
  }

  /** 一覧取得／検索（教材名・カテゴリの部分一致。条件なし＝全件）。 */
  async list(query: { name?: string; category?: string } = {}): Promise<TextbookDto[]> {
    const textbooks = await this.textbooks.search({
      nameLike: query.name || undefined,
      categoryLike: query.category || undefined,
    });
    return textbooks.map(toTextbookDto);
  }

  /** 新規登録（ドメインのバリデーションは DomainError を throw） */
  async register(input: CreateTextbookInput): Promise<TextbookDto> {
    const textbook = Textbook.create(input);
    await this.textbooks.save(textbook);
    return toTextbookDto(textbook);
  }

  /** 更新（存在しなければ undefined） */
  async update(id: string, patch: UpdateTextbookInput): Promise<TextbookDto | undefined> {
    const existing = await this.textbooks.findById(TextbookId.create(id));
    if (!existing) return undefined;
    const updated = existing.update(patch);
    await this.textbooks.save(updated);
    return toTextbookDto(updated);
  }

  /** 削除 */
  async remove(id: string): Promise<void> {
    await this.textbooks.delete(TextbookId.create(id));
  }
}
