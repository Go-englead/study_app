import { hash as argonHash, verify as argonVerify, Algorithm } from '@node-rs/argon2';
import { PasswordHasher } from '../domain/shared/password-hasher';

/**
 * PasswordHasher の Argon2id 実装（gateway層）。
 * パラメータは OWASP 推奨ベースライン（memory=19MiB, iterations=2, parallelism=1）。
 * 生成されるハッシュは PHC 形式で、アルゴリズム・パラメータ・ソルトを内包する。
 */
const OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(rawPassword: string): Promise<string> {
    return argonHash(rawPassword, OPTIONS);
  }

  async verify(hash: string, rawPassword: string): Promise<boolean> {
    try {
      return await argonVerify(hash, rawPassword);
    } catch {
      // ハッシュ形式不正など。照合失敗として扱う。
      return false;
    }
  }
}
