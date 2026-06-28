import { sign } from 'hono/jwt';
import { jwtSecret, TOKEN_TTL_SECONDS } from '../../config/secrets';

/** 職員アクセストークン（JWT/HS256）を発行する。claim は adminId（＝staffId）。 */
export async function issueStaffToken(staffId: string, now: number = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + TOKEN_TTL_SECONDS;
  return sign({ adminId: staffId, exp }, jwtSecret(), 'HS256');
}
