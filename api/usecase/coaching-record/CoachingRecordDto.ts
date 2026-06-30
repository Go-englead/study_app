/** コーチング記録の表示用DTO（種別により使われるフィールドが異なる）。 */
export interface SelectedTextbookDto {
  textbookId: string;
  dailyGoalMinutes: number | null;
  note: string;
}

export interface TextbookTestDto {
  textbookId: string;
  testStatus: string;
  range: string;
  format: string;
  score: string;
  note: string;
  nextStatus: string;
}

export interface CoachingRecordDto {
  id: string;
  memberId: string;
  type: string;
  date: string;
  coachName: string;
  // 教材選定
  selectedTextbooks?: SelectedTextbookDto[];
  sharedNote?: string;
  // 初回・通常
  coachingNumber?: number;
  textbookTests?: TextbookTestDto[];
  // 自由記述（オリエン・初回・通常・その他）
  monthlyReview?: string;
  coachAdvice?: string;
  otherNotes?: string;
}
