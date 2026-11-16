"use server";

import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/utils/auth";

function client() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("ไม่พบ SUPABASE_SERVICE_ROLE_KEY");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getKoeAccessAction() {
  try {
    await requireAdminSession();
    const database = client();
    const [profiles, accounts, assignments] = await Promise.all([
      database
        .from("user_profiles")
        .select("id, username, employee_id, display_name, area")
        .eq("is_active", true)
        .order("display_name"),
      database.from("koe_accounts").select("user_id, is_active"),
      database.from("koe_areas").select("koe_user_id, area"),
    ]);
    if (profiles.error) throw profiles.error;
    if (accounts.error) throw accounts.error;
    if (assignments.error) throw assignments.error;
    return {
      success: true as const,
      profiles: profiles.data || [],
      accounts: accounts.data || [],
      assignments: assignments.data || [],
    };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "โหลดสิทธิ์ KOE ไม่สำเร็จ",
    };
  }
}

export async function saveKoeAccessAction(userId: number, areas: string[]) {
  try {
    await requireAdminSession();
    if (!Number.isInteger(userId) || userId <= 0 || !Array.isArray(areas))
      throw new Error("ข้อมูลผู้ใช้ไม่ถูกต้อง");
    const selected = Array.from(
      new Set(areas.map((area) => String(area).trim()).filter(Boolean)),
    );
    const database = client();
    if (selected.length) {
      const { data, error } = await database
        .from("user_profiles")
        .select("area")
        .eq("is_active", true)
        .in("area", selected);
      if (error) throw error;
      const knownAreas = new Set(
        (data || []).map((item) => String(item.area || "").trim()),
      );
      if (selected.some((area) => !knownAreas.has(area)))
        throw new Error("ไม่พบ Area ที่เลือกในข้อมูลพนักงาน");
    }
    const { error } = await database.rpc("set_koe_access", {
      p_user_id: userId,
      p_areas: selected,
    });
    if (error) throw error;
    return { success: true as const };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "บันทึกสิทธิ์ KOE ไม่สำเร็จ",
    };
  }
}
