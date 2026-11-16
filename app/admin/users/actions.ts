"use server";

import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/utils/auth";
import { hashPassword } from "@/utils/password";

function database() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("ระบบยังไม่ได้ตั้งค่าฐานข้อมูลฝั่งเซิร์ฟเวอร์");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function requirePasswordMigrationReady() {
  if (process.env.PASSWORD_HASH_UPGRADE_ENABLED !== "true") {
    throw new Error(
      "ยังไม่เปิดสร้างหรือเปลี่ยนรหัสผ่าน กรุณาปรับระบบที่ใช้บัญชีร่วมให้รองรับรหัสผ่านแบบแฮชก่อน",
    );
  }
}

export async function listManagedUsersAction() {
  try {
    await requireAdminSession();
    const { data, error } = await database()
      .from("user_profiles")
      .select(
        "id, username, employee_id, display_name, company_tag, area, email, phone, employment_type, is_active",
      )
      .order("display_name");
    if (error) throw error;
    return { success: true as const, users: data || [] };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "โหลดรายชื่อผู้ใช้ไม่สำเร็จ",
    };
  }
}

export async function createManagedUserAction(input: {
  username: string;
  employeeId: string;
  name: string;
  companyTag: string;
  area: string;
  email: string;
  phone: string;
  employmentType: string;
  password: string;
}) {
  try {
    await requireAdminSession();
    requirePasswordMigrationReady();
    const username = String(input.username || "").trim();
    const name = String(input.name || "").trim();
    const companyTag = String(input.companyTag || "").trim();
    const password = String(input.password || "").trim();
    if (
      !username ||
      !name ||
      !companyTag ||
      password.length < 8 ||
      password.length > 128
    )
      throw new Error("กรุณากรอกผู้ใช้ ชื่อ กลุ่ม และรหัสผ่าน 8–128 ตัวอักษร");
    const { error } = await database()
      .from("user_profiles")
      .insert({
        username,
        employee_id: String(input.employeeId || "").trim() || null,
        display_name: name,
        company_tag: companyTag,
        area: String(input.area || "").trim(),
        email: String(input.email || "").trim(),
        phone: String(input.phone || "").trim(),
        employment_type: String(input.employmentType || "").trim(),
        password_text: await hashPassword(password),
        is_active: true,
      });
    if (error) throw error;
    return { success: true as const };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "สร้างบัญชีไม่สำเร็จ",
    };
  }
}

export async function resetManagedUserPasswordAction(
  userId: number,
  passwordInput: string,
) {
  try {
    await requireAdminSession();
    requirePasswordMigrationReady();
    const password = String(passwordInput || "").trim();
    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      password.length < 8 ||
      password.length > 128
    )
      throw new Error("รหัสผ่านต้องมี 8–128 ตัวอักษร");
    const { data, error } = await database()
      .from("user_profiles")
      .update({ password_text: await hashPassword(password) })
      .eq("id", userId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("ไม่พบผู้ใช้");
    return { success: true as const };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ",
    };
  }
}

export async function setManagedUserActiveAction(
  userId: number,
  active: boolean,
) {
  try {
    const session = await requireAdminSession();
    if (!Number.isInteger(userId) || userId <= 0 || typeof active !== "boolean")
      throw new Error("ข้อมูลผู้ใช้ไม่ถูกต้อง");
    if (session.id === userId && !active)
      throw new Error("ไม่สามารถระงับบัญชีของตนเองได้");
    const { data, error } = await database()
      .from("user_profiles")
      .update({ is_active: active })
      .eq("id", userId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("ไม่พบผู้ใช้");
    return { success: true as const };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "เปลี่ยนสถานะไม่สำเร็จ",
    };
  }
}
