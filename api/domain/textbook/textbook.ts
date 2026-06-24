import { Brand } from '../shared/brand';
import { DomainError } from '../shared/domain-error';

export type TextbookId = Brand<string, 'TextbookId'>;

export function createTextbookId(raw: string): TextbookId {
  const value = (raw ?? '').trim();
  if (!value) throw new DomainError('教材IDは必須です');
  return value as TextbookId;
}

/** 表示テーマ色 */
export interface ColorTheme {
  readonly color: string;
  readonly name?: string;
}

// ═══════════════════════ 集約ルート：Textbook ═══════════════════════
export interface Textbook {
  readonly id: TextbookId;
  readonly name: string;
  readonly category: string;
  readonly unit: string;
  readonly colorTheme: ColorTheme;
  readonly iconUrl?: string;
  readonly manualUrl?: string;
  readonly note?: string;
}

export interface CreateTextbookInput {
  id: string;
  name: string;
  category: string;
  unit?: string;
  color?: string;
  colorName?: string;
  iconUrl?: string;
  manualUrl?: string;
  note?: string;
}

/** カテゴリ→単位の推定（CSV未指定時のフォールバック） */
function inferUnit(category: string): string {
  const map: Record<string, string> = {
    '単語/フレーズ': '語',
    文法: 'ページ',
    読解: '章',
    リスニング: '分',
    スピーキング: '分',
    ライティング: 'ページ',
  };
  return map[category] ?? '回';
}

export function createTextbook(input: CreateTextbookInput): Textbook {
  if (!input.name?.trim()) throw new DomainError('教材名は必須です');
  if (!input.category?.trim()) throw new DomainError('カテゴリは必須です');
  return {
    id: createTextbookId(input.id),
    name: input.name,
    category: input.category,
    unit: input.unit?.trim() || inferUnit(input.category),
    colorTheme: { color: input.color || '#1A5276', name: input.colorName },
    iconUrl: input.iconUrl,
    manualUrl: input.manualUrl,
    note: input.note,
  };
}

export interface UpdateTextbookInput {
  name?: string;
  category?: string;
  unit?: string;
  color?: string;
  colorName?: string;
  iconUrl?: string;
  manualUrl?: string;
  note?: string;
}

export function updateTextbook(current: Textbook, patch: UpdateTextbookInput): Textbook {
  if (patch.name !== undefined && !patch.name.trim()) {
    throw new DomainError('教材名は必須です');
  }
  if (patch.category !== undefined && !patch.category.trim()) {
    throw new DomainError('カテゴリは必須です');
  }
  return {
    ...current,
    name: patch.name ?? current.name,
    category: patch.category ?? current.category,
    unit: patch.unit ?? current.unit,
    colorTheme: {
      color: patch.color ?? current.colorTheme.color,
      name: patch.colorName ?? current.colorTheme.name,
    },
    iconUrl: patch.iconUrl ?? current.iconUrl,
    manualUrl: patch.manualUrl ?? current.manualUrl,
    note: patch.note ?? current.note,
  };
}
