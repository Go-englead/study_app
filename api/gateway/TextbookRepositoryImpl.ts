import { Database } from '../db/client';
import { NewTextbookRow, TextbookRow } from '../db/schema';
import * as textbookDriver from '../driver/textbookDriver';
import { Textbook, TextbookId, TextbookUnit } from '../domain/textbook/textbook';
import {
  TextbookRepository,
  TextbookSearchCriteria,
} from '../domain/textbook/textbook-repository';

// ───────────────────── Row → ドメイン（保存済みデータは検証済みとして信頼） ─────────────────────
function toDomain(r: TextbookRow): Textbook {
  return {
    id: r.id as TextbookId,
    code: r.textbookCode,
    name: r.name,
    category: r.category,
    unit: r.unit as TextbookUnit,
    color: r.color,
    iconUrl: r.iconUrl ?? undefined,
    manualUrl: r.manualUrl ?? undefined,
    note: r.note ?? undefined,
  };
}

// ───────────────────── ドメイン → Row ─────────────────────
function toRow(t: Textbook): NewTextbookRow {
  return {
    id: t.id,
    textbookCode: t.code,
    name: t.name,
    category: t.category,
    unit: t.unit,
    color: t.color,
    colorName: null, // 派生値のため保持しない
    iconUrl: t.iconUrl ?? null,
    manualUrl: t.manualUrl ?? null,
    note: t.note ?? null,
  };
}

/** TextbookRepository の実装（gateway層）。 */
export class TextbookRepositoryImpl implements TextbookRepository {
  constructor(private readonly db: Database) {}

  async findById(id: TextbookId): Promise<Textbook | undefined> {
    const row = await textbookDriver.findById(this.db, id);
    return row ? toDomain(row) : undefined;
  }

  async findAll(): Promise<Textbook[]> {
    const rows = await textbookDriver.findAll(this.db);
    return rows.map(toDomain);
  }

  async search(criteria: TextbookSearchCriteria): Promise<Textbook[]> {
    const rows = await textbookDriver.search(this.db, criteria);
    return rows.map(toDomain);
  }

  async save(textbook: Textbook): Promise<void> {
    await textbookDriver.upsert(this.db, toRow(textbook));
  }

  async delete(id: TextbookId): Promise<void> {
    await textbookDriver.deleteById(this.db, id);
  }
}
