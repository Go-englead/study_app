import { Textbook } from '../../domain/textbook/textbook';

/**
 * UseCase 専用 DTO（教材）。ドメインを平坦化し、Controller が OpenAPI Response 型へ変換する。
 */
export interface TextbookDto {
  id: string;
  /** 教材コード（業務キー） */
  textbookCode: string;
  name: string;
  category: string;
  unit: string;
  color: string;
  iconUrl?: string;
  manualUrl?: string;
  note?: string;
}

export function toTextbookDto(t: Textbook): TextbookDto {
  return {
    id: t.id.value,
    textbookCode: t.code,
    name: t.name,
    category: t.category,
    unit: t.unit.value,
    color: t.color,
    iconUrl: t.iconUrl,
    manualUrl: t.manualUrl,
    note: t.note,
  };
}
