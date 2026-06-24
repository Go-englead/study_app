/**
 * ドメインの不変条件・ビジネスルール違反を表すエラー。
 * create / update 系の関数はバリデーション違反時に必ずこれを throw する。
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
    // ES5 ターゲットでも instanceof が効くように
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
