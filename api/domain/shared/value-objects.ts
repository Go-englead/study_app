import { DomainError } from './domain-error';

// ───────────────────────── Email ─────────────────────────
/** メールアドレス。比較・保持ともに小文字化する。 */
export class Email {
  private static readonly RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  private constructor(readonly value: string) {}
  static create(raw: string): Email {
    const value = (raw ?? '').trim().toLowerCase();
    if (!Email.RE.test(value)) {
      throw new DomainError(`メールアドレスの形式が不正です: ${raw}`);
    }
    return new Email(value);
  }
}

// ───────────────────────── DateOnly ─────────────────────────
/** 日付（YYYY-MM-DD）。文字列の辞書順がそのまま日付順になる。 */
export class DateOnly {
  private static readonly RE = /^\d{4}-\d{2}-\d{2}$/;
  private constructor(readonly value: string) {}

  static create(raw: string): DateOnly {
    const value = (raw ?? '').trim();
    if (!DateOnly.RE.test(value) || Number.isNaN(Date.parse(value))) {
      throw new DomainError(`日付の形式が不正です (YYYY-MM-DD): ${raw}`);
    }
    return new DateOnly(value);
  }

  static today(now: Date = new Date()): DateOnly {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return new DateOnly(`${y}-${m}-${d}`);
  }

  /** this <= other か。 */
  lte(other: DateOnly): boolean {
    return this.value <= other.value;
  }

  /** this < other か。 */
  lt(other: DateOnly): boolean {
    return this.value < other.value;
  }

  /** 未来日か（today より後か）。 */
  isFuture(today: DateOnly = DateOnly.today()): boolean {
    return this.value > today.value;
  }

  /** 開始日に月数を加算し1日戻した終了日（例: 4/1 + 2ヶ月 → 5/31）。 */
  addMonthsMinusOneDay(months: number): DateOnly {
    const [y, m, d] = this.value.split('-').map(Number);
    const base = new Date(y, m - 1, d);
    base.setMonth(base.getMonth() + months);
    base.setDate(base.getDate() - 1);
    return DateOnly.today(base);
  }
}

// ───────────────────────── CefrLevel ─────────────────────────
export type CefrLevelName = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** CEFRレベル（順序付き）。 */
export class CefrLevel {
  static readonly LEVELS: readonly CefrLevelName[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  private constructor(readonly value: CefrLevelName) {}

  static create(raw: string): CefrLevel {
    if (!(CefrLevel.LEVELS as readonly string[]).includes(raw)) {
      throw new DomainError(`CEFRレベルが不正です: ${raw}`);
    }
    return new CefrLevel(raw as CefrLevelName);
  }

  /** this と other の大小（A1 < … < C2）。負: this<other / 0: == / 正: this>other */
  compareTo(other: CefrLevel): number {
    return CefrLevel.LEVELS.indexOf(this.value) - CefrLevel.LEVELS.indexOf(other.value);
  }
}
