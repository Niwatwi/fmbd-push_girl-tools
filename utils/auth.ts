import { cookies } from "next/headers";
import {
  verifyUserSessionToken,
  userSessionMaxAge,
} from "@/utils/session-token";

const SESSION_COOKIE = "user_session";

export async function getUserSession() {
  const cookieStore = await cookies();
  return verifyUserSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireAdminSession() {
  const session = await getUserSession();
  if (session?.role !== "admin") {
    throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ");
  }
  return session;
}

export async function requireUserOrAdminSession(userId: number) {
  const session = await getUserSession();
  if (!session || (session.role !== "admin" && session.id !== userId)) {
    throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุญาต");
  }
  return session;
}

export const userSessionCookie = SESSION_COOKIE;
export { userSessionMaxAge };
