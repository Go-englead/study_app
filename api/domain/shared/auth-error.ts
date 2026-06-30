/** 認証失敗（資格情報不正・トークン不正など）。controller で 401 に対応付ける。 */
export class AuthError extends Error {
  constructor(message = '認証に失敗しました') {
    super(message);
    this.name = 'AuthError';
  }
}
