/** PROGOSスコアの表示用DTO（openapi ProgosScore に対応）。 */
export interface ProgosScoreDto {
  id: string;
  memberId: string;
  examDate: string;
  overall: string;
  skills: {
    range: string;
    accuracy: string;
    fluency: string;
    interaction: string;
    coherence: string;
    phonology: string;
  };
  comment?: string;
}
