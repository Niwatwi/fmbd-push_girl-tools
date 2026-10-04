export interface UserSession {
  id: number;
  display_name: string;
  company_tag: string;
  area: string;
  image_url: string;
  role: "admin" | "staff";
  expires_at: number;
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_SESSION_SECRET must contain at least 32 characters");
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getSigningKey(usages: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

export async function createUserSessionToken(
  session: Omit<UserSession, "expires_at">,
) {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        ...session,
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
      }),
    ),
  );
  const key = await getSigningKey(["sign"]);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyUserSessionToken(
  token: string | undefined,
): Promise<UserSession | null> {
  if (!token) return null;

  try {
    const [payload, encodedSignature, extra] = token.split(".");
    if (!payload || !encodedSignature || extra) return null;

    const key = await getSigningKey(["verify"]);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(encodedSignature),
      encoder.encode(payload),
    );
    if (!valid) return null;

    const session = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload)),
    ) as UserSession;
    if (
      !Number.isInteger(session.id) ||
      (session.role !== "admin" && session.role !== "staff") ||
      !Number.isInteger(session.expires_at) ||
      session.expires_at <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export const userSessionMaxAge = SESSION_MAX_AGE_SECONDS;
