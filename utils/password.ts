import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const prefix = "scrypt$v1$";

export function credentialStamp(userId: number, stored: string): string {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("APP_SESSION_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret)
    .update(`${userId}:${stored}`)
    .digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${prefix}${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (!stored.startsWith(prefix)) {
    const supplied = Buffer.from(password);
    const expected = Buffer.from(stored.trim());
    return {
      valid:
        supplied.length === expected.length &&
        timingSafeEqual(supplied, expected),
      needsUpgrade: true,
    };
  }
  const parts = stored.split("$");
  if (
    parts.length !== 4 ||
    !/^[a-f0-9]{32}$/.test(parts[2]) ||
    !/^[a-f0-9]{128}$/.test(parts[3])
  ) {
    return { valid: false, needsUpgrade: false };
  }
  const expected = Buffer.from(parts[3], "hex");
  const actual = (await scrypt(password, parts[2], expected.length)) as Buffer;
  return { valid: timingSafeEqual(actual, expected), needsUpgrade: false };
}
