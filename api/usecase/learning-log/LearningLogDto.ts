/** 学習記録の表示用DTO（openapi LearningLog に対応）。 */
export interface LearningLogDto {
  id: string;
  memberId: string;
  textbookId: string;
  date: string;
  durationMinutes: number;
  comment: string;
}
