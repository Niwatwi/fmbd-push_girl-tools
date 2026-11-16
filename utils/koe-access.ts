import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getUserSession } from "@/utils/auth";
export function getKoeServerDatabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("ระบบยังไม่ได้ตั้งค่าฐานข้อมูลฝั่งเซิร์ฟเวอร์");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireKoeAccess() {
  const session = await getUserSession();
  if (!session || session.role !== "koe")
    throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชี KOE");
  const database = getKoeServerDatabase();
  const [account, profile, assignments] = await Promise.all([
    database
      .from("koe_accounts")
      .select("user_id")
      .eq("user_id", session.id)
      .eq("is_active", true)
      .maybeSingle(),
    database
      .from("user_profiles")
      .select("id")
      .eq("id", session.id)
      .eq("is_active", true)
      .maybeSingle(),
    database.from("koe_areas").select("area").eq("koe_user_id", session.id),
  ]);
  if (account.error || profile.error || assignments.error)
    throw new Error("ตรวจสอบสิทธิ์ KOE ไม่สำเร็จ");
  if (!account.data || !profile.data)
    throw new Error("บัญชี KOE ถูกระงับหรือไม่มีสิทธิ์");
  const areas = (assignments.data || [])
    .map((assignment) => String(assignment.area).trim())
    .filter(Boolean);
  return { session, database, areas };
}
