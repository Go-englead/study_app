/** 会員に割り当てられた教材（表示用・TextbookAssignment＋Textbook マスタをマージ）。 */
export interface AssignedTextbookDto {
  textbookId: string;
  textbookCode: string;
  name: string;
  category: string;
  unit: string;
  color: string;
  dailyGoalMinutes: number | null;
  note: string;
}
