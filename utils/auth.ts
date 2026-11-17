import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { credentialStamp } from "@/utils/password";
import {
  verifyUserSessionToken,
  userSessionMaxAge,
} from "@/utils/session-token";

const SESSION_COOKIE = "user_session";

export async function getUserSession() {
  const cookieStore = await cookies();
  const session = await verifyUserSessionToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!session) return null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  try {
    const database = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile, error } = await database
      .from("user_profiles")
      .select(
        "id, username, employee_id, display_name, company_tag, area, image_url, is_active, password_text",
      )
      .eq("id", session.id)
      .maybeSingle();
    if (
      error ||
      !profile ||
      profile.is_active !== true ||
      credentialStamp(session.id, String(profile.password_text || "")) !==
        session.credential_stamp
    )
      return null;
    const adminIdentifiers = new Set(["FMBD03", "ADMIN", "ADMIN_NIWAT"]);
    const isAdmin = [
      profile.username,
      profile.employee_id,
      profile.company_tag,
    ].some((value) =>
      adminIdentifiers.has(
        String(value || "")
          .trim()
          .toUpperCase(),
      ),
    );
    if (session.role === "admin" && !isAdmin) return null;
    let role: "admin" | "staff" | "koe" = isAdmin ? "admin" : "staff";
    if (!isAdmin) {
      const { data: koeAccount, error: koeError } = await database
        .from("koe_accounts")
        .select("user_id")
        .eq("user_id", session.id)
        .eq("is_active", true)
        .maybeSingle();
      if (koeError && koeError.code !== "42P01" && koeError.code !== "PGRST205")
        return null;
      const companyTag = String(profile.company_tag || "")
        .trim()
        .toUpperCase();
      role =
        koeAccount ||
        (koeError && session.role === "koe") ||
        ["KOE", "KEY_ACCOUNT_OPERATION_EXECUTIVE"].includes(companyTag)
          ? "koe"
          : "staff";
    }
    return {
      ...session,
      role,
      username: profile.username || "",
      display_name: profile.display_name || "",
      company_tag: profile.company_tag || "",
      area: profile.area || "",
      image_url: profile.image_url || "",
    };
  } catch {
    return null;
  }
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
