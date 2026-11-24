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
        "id, username, employee_id, display_name, company_tag, area, email, phone, employment_type, image_url, is_active",
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

export async function getManagedUserStoreGroupsAction() {
  try {
    await requireAdminSession();
    const { data, error } = await database()
      .from("pg_stores")
      .select("area, account, company_tag")
      .eq("is_active", true)
      .order("area")
      .limit(5000);
    if (error) throw error;
    const groups = new Map<
      string,
      { area: string; account: string; companyTag: string }
    >();
    for (const row of data || []) {
      const area = String(row.area || "").trim();
      const account = String(row.account || "").trim();
      const companyTag = String(row.company_tag || "").trim();
      if (!area) continue;
      groups.set(`${area}\u0000${account}\u0000${companyTag}`, {
        area,
        account,
        companyTag,
      });
    }
    return {
      success: true as const,
      groups: Array.from(groups.values()).sort((left, right) =>
        `${left.area} ${left.account}`.localeCompare(
          `${right.area} ${right.account}`,
          "th",
        ),
      ),
    };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "โหลดกลุ่มร้านค้าไม่สำเร็จ",
    };
  }
}

export async function createManagedUserAction(input: {
  username: string;
  employeeId: string;
  name: string;
  companyTag: string;
  area: string;
  kpiRegion: "BKK" | "UPC";
  email: string;
  phone: string;
  employmentType: string;
  password: string;
  avatarBase64?: string;
}) {
  try {
    await requireAdminSession();
    requirePasswordMigrationReady();
    const username = String(input.username || "").trim();
    const name = String(input.name || "").trim();
    const companyTag = String(input.companyTag || "").trim();
    const password = String(input.password || "").trim();
    const kpiRegion = input.kpiRegion;
    if (kpiRegion !== "BKK" && kpiRegion !== "UPC")
      throw new Error("กรุณาเลือกเรท KPI เป็น BKK หรือ UPC");
    if (
      !username ||
      !name ||
      !companyTag ||
      password.length < 8 ||
      password.length > 128
    )
      throw new Error("กรุณากรอกผู้ใช้ ชื่อ กลุ่ม และรหัสผ่าน 8–128 ตัวอักษร");
    const supabase = database();
    const avatar = String(input.avatarBase64 || "");
    let imageUrl: string | null = null;
    let uploadedPath: string | null = null;
    if (avatar) {
      const match = avatar.match(
        /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/,
      );
      if (!match) throw new Error("รูปโปรไฟล์ต้องเป็น JPEG, PNG หรือ WebP");
      const extension = match[1] === "jpeg" ? "jpg" : match[1];
      const imageBuffer = Buffer.from(match[2], "base64");
      if (!imageBuffer.length || imageBuffer.length > 3 * 1024 * 1024)
        throw new Error("รูปโปรไฟล์ต้องมีขนาดไม่เกิน 3 MB");
      uploadedPath = `profiles/${username.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("pg-attendance-photos")
        .upload(uploadedPath, imageBuffer, {
          contentType: `image/${match[1]}`,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      imageUrl = supabase.storage
        .from("pg-attendance-photos")
        .getPublicUrl(uploadedPath).data.publicUrl;
    }

    const { error } = await supabase.from("user_profiles").insert({
      username,
      employee_id: String(input.employeeId || "").trim() || null,
      display_name: name,
      company_tag: companyTag,
      area: String(input.area || "").trim(),
      kpi_region: kpiRegion,
      email: String(input.email || "").trim(),
      phone: String(input.phone || "").trim(),
      employment_type: String(input.employmentType || "").trim(),
      image_url: imageUrl,
      password_text: await hashPassword(password),
      is_active: true,
    });
    if (error) {
      if (uploadedPath)
        await supabase.storage
          .from("pg-attendance-photos")
          .remove([uploadedPath]);
      throw error;
    }
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
