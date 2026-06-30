/**
 * 公称型（branded type）を作るためのヘルパー。
 * 例: `type MemberId = Brand<string, 'MemberId'>`
 * これにより、生の string をそのまま MemberId として渡せなくなる
 * （必ずスマートコンストラクタを通す）。
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };
