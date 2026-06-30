/** 認可エラー（認証済みだが権限不足）。controller/エラーハンドラで 403 に対応付ける。 */
export class ForbiddenError extends Error {
  constructor(message = 'この操作を行う権限がありません') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
