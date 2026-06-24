import { Brand } from './brand';
import { DomainError } from './domain-error';

// ───────────────────────── Email ─────────────────────────
/** メールアドレス。比較・保持ともに小文字化する。 */
export type Email = Brand<string, 'Email'>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function createEmail(raw: string): Email {
  const value = (raw ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(value)) {
    throw new DomainError(`メールアドレスの形式が不正です: ${raw}`);
  }
  return value as Email;
}

// ───────────────────────── DateOnly ─────────────────────────
/** 日付（YYYY-MM-DD）。文字列の辞書順がそのまま日付順になる。 */
export type DateOnly = Brand<string, 'DateOnly'>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function createDateOnly(raw: string): DateOnly {
  const value = (raw ?? '').trim();
  if (!DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new DomainError(`日付の形式が不正です (YYYY-MM-DD): ${raw}`);
  }
  return value as DateOnly;
}

export function todayDateOnly(now: Date = new Date()): DateOnly {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}` as DateOnly;
}

/** a <= b か */
export function dateLte(a: DateOnly, b: DateOnly): boolean {
  return a <= b;
}

/** 未来日か（today より後か） */
export function isFuture(date: DateOnly, today: DateOnly = todayDateOnly()): boolean {
  return date > today;
}

/** 開始日に月数を加算し1日戻した終了日（例: 4/1 + 2ヶ月 → 5/31） */
export function addMonthsMinusOneDay(start: DateOnly, months: number): DateOnly {
  const [y, m, d] = start.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  base.setMonth(base.getMonth() + months);
  base.setDate(base.getDate() - 1);
  return todayDateOnly(base);
}

// ───────────────────────── CefrLevel ─────────────────────────
/** CEFRレベル（順序付き）。 */
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export function createCefrLevel(raw: string): CefrLevel {
  if (!(CEFR_LEVELS as readonly string[]).includes(raw)) {
    throw new DomainError(`CEFRレベルが不正です: ${raw}`);
  }
  return raw as CefrLevel;
}

/** a と b の大小（A1 < … < C2）。負: a<b / 0: a==b / 正: a>b */
export function compareCefr(a: CefrLevel, b: CefrLevel): number {
  return CEFR_LEVELS.indexOf(a) - CEFR_LEVELS.indexOf(b);
}
