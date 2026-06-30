import { DomainError } from '../shared/domain-error';

// ═══════════════════════ 値オブジェクト（生成・検証は create に閉じる） ═══════════════════════
export class TextbookId {
  private constructor(readonly value: string) {}
  static create(raw: string): TextbookId {
    const v = (raw ?? '').trim();
    if (!v) throw new DomainError('教材IDは必須です');
    return new TextbookId(v);
  }
}

export type TextbookUnitName = 'Day' | 'Chapter' | 'Lesson' | '回';

/** 進捗の単位。 */
export class TextbookUnit {
  private static readonly NAMES: readonly TextbookUnitName[] = ['Day', 'Chapter', 'Lesson', '回'];
  private constructor(readonly value: TextbookUnitName) {}
  static create(raw: string): TextbookUnit {
    if (!(TextbookUnit.NAMES as readonly string[]).includes(raw)) {
      throw new DomainError(`単位が不正です: ${raw}`);
    }
    return new TextbookUnit(raw as TextbookUnitName);
  }
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

export interface UpdateTextbookInput {
  name?: string;
  category?: string;
  unit?: string;
  color?: string;
  iconUrl?: string;
  manualUrl?: string;
  note?: string;
}

// ═══════════════════════ 集約ルート：Textbook ═══════════════════════
export class Textbook {
  constructor(
    /** システムID（UUID）。アプリ側で採番。 */
    readonly id: TextbookId,
    /** 教材コード（業務キー。例 'T01'）。id(UUID) とは別の自然キー。 */
    readonly code: string,
    readonly name: string,
    readonly category: string,
    readonly unit: TextbookUnit,
    readonly color: string,
    readonly iconUrl?: string,
    readonly manualUrl?: string,
    readonly note?: string,
  ) {}

  /** プロフィール更新（不変条件をカプセル化）。 */
  update(patch: UpdateTextbookInput): Textbook {
    if (patch.name !== undefined && !patch.name.trim()) throw new DomainError('教材名は必須です');
    if (patch.category !== undefined && !patch.category.trim()) throw new DomainError('カテゴリは必須です');
    return new Textbook(
      this.id,
      this.code,
      patch.name ?? this.name,
      patch.category ?? this.category,
      patch.unit !== undefined ? TextbookUnit.create(patch.unit) : this.unit,
      patch.color ?? this.color,
      patch.iconUrl ?? this.iconUrl,
      patch.manualUrl ?? this.manualUrl,
      patch.note ?? this.note,
    );
  }

  /** 新規作成（入力検証つき）。 */
  static create(input: CreateTextbookInput): Textbook {
    if (!input.code?.trim()) throw new DomainError('教材コードは必須です');
    if (!input.name?.trim()) throw new DomainError('教材名は必須です');
    if (!input.category?.trim()) throw new DomainError('カテゴリは必須です');
    return new Textbook(
      TextbookId.create(input.id),
      input.code,
      input.name,
      input.category,
      TextbookUnit.create(input.unit),
      input.color?.trim() || '#1A5276',
      input.iconUrl,
      input.manualUrl,
      input.note,
    );
  }

  /** 永続データから復元。 */
  static fromRecord(r: {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    color: string;
    iconUrl?: string;
    manualUrl?: string;
    note?: string;
  }): Textbook {
    return new Textbook(
      TextbookId.create(r.id),
      r.code,
      r.name,
      r.category,
      TextbookUnit.create(r.unit),
      r.color,
      r.iconUrl,
      r.manualUrl,
      r.note,
    );
  }
}
