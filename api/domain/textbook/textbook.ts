import { Brand } from '../shared/brand';
import { DomainError } from '../shared/domain-error';

// ═══════════════════════ 識別子 ═══════════════════════
export type TextbookId = Brand<string, 'TextbookId'>;

export function createTextbookId(raw: string): TextbookId {
  const value = (raw ?? '').trim();
  if (!value) throw new DomainError('教材IDは必須です');
  return value as TextbookId;
}

// ═══════════════════════ 値オブジェクト ═══════════════════════
/** 進捗の単位 */
export type TextbookUnit = 'Day' | 'Chapter' | 'Lesson' | '回';

const UNITS: readonly TextbookUnit[] = ['Day', 'Chapter', 'Lesson', '回'];

export function createTextbookUnit(raw: string): TextbookUnit {
  if (!(UNITS as readonly string[]).includes(raw)) {
    throw new DomainError(`単位が不正です: ${raw}`);
  }
  return raw as TextbookUnit;
}

// ═══════════════════════ 集約ルート：Textbook ═══════════════════════
export interface Textbook {
  /** システムID（UUID）。アプリ側で採番。 */
  readonly id: TextbookId;
  /** 教材コード（業務キー。例 'T01'）。id(UUID) とは別の自然キー。 */
  readonly code: string;
  readonly name: string;
  readonly category: string;
  readonly unit: TextbookUnit;
  readonly color: string;
  readonly iconUrl?: string;
  readonly manualUrl?: string;
  readonly note?: string;
}

export interface CreateTextbookInput {
  /** UUID（アプリ側で採番して渡す） */
  id: string;
  /** 教材コード（業務キー。ユーザー入力） */
  code: string;
  name: string;
  category: string;
  unit: string;
  color?: string;
  iconUrl?: string;
  manualUrl?: string;
  note?: string;
}

export function createTextbook(input: CreateTextbookInput): Textbook {
  if (!input.code?.trim()) throw new DomainError('教材コードは必須です');
  if (!input.name?.trim()) throw new DomainError('教材名は必須です');
  if (!input.category?.trim()) throw new DomainError('カテゴリは必須です');
  return {
    id: createTextbookId(input.id),
    code: input.code,
    name: input.name,
    category: input.category,
    unit: createTextbookUnit(input.unit),
    color: input.color?.trim() || '#1A5276',
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
    unit: patch.unit !== undefined ? createTextbookUnit(patch.unit) : current.unit,
    color: patch.color ?? current.color,
    iconUrl: patch.iconUrl ?? current.iconUrl,
    manualUrl: patch.manualUrl ?? current.manualUrl,
    note: patch.note ?? current.note,
  };
}
