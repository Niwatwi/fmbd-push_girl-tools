"use server";

import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/utils/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

type KpiSheetType = "SUPERVISOR" | "BKK" | "UPC";

function getKpiAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("ไม่พบ SUPABASE_SERVICE_ROLE_KEY สำหรับบันทึก KPI BA");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function validateMonth(month: string) {
  const [year, monthNumber] = String(month || "")
    .split("-")
    .map(Number);
  if (
    !/^\d{4}-\d{2}$/.test(String(month || "")) ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    !Number.isInteger(year)
  ) {
    throw new Error("กรุณาเลือกเดือนที่ต้องการ");
  }
  return `${month}-01`;
}

export async function getBaKpiEntriesAction(
  month: string,
  sheetType: KpiSheetType,
) {
  try {
    await requireAdminSession();
    const periodMonth = validateMonth(month);
    if (!["SUPERVISOR", "BKK", "UPC"].includes(sheetType)) {
      throw new Error("หมวด KPI ไม่ถูกต้อง");
    }
    const { data, error } = await getKpiAdminClient()
      .from("ba_kpi_entries")
      .select(
        "id, period_month, sheet_type, username, company_tag, employee_id, employee_name, store_names, store_name, amount, note",
      )
      .eq("period_month", periodMonth)
      .eq("sheet_type", sheetType)
      .order("employee_name", { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      message: error.message || "โหลดข้อมูล KPI BA ไม่สำเร็จ",
    };
  }
}

export async function getBaKpiCompanyTagsAction() {
  try {
    await requireAdminSession();
    const { data, error } = await getKpiAdminClient()
      .from("user_profiles")
      .select("company_tag")
      .eq("is_active", true)
      .not("company_tag", "is", null)
      .order("company_tag", { ascending: true });
    if (error) throw error;
    const companyTags = Array.from(
      new Set(
        (data || [])
          .map((profile) => String(profile.company_tag || "").trim())
          .filter(Boolean),
      ),
    );
    return { success: true, data: companyTags };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      message: error.message || "โหลดตัวกรองกลุ่มพนักงานไม่สำเร็จ",
    };
  }
}

export async function getBaKpiEmployeesAction(companyTag: string) {
  try {
    await requireAdminSession();
    const selectedCompanyTag = String(companyTag || "").trim();
    if (!selectedCompanyTag) return { success: true, data: [] };
    const { data, error } = await getKpiAdminClient()
      .from("user_profiles")
      .select("username, display_name, employee_id, company_tag")
      .eq("is_active", true)
      .eq("company_tag", selectedCompanyTag)
      .not("username", "is", null)
      .order("display_name", { ascending: true });
    if (error) throw error;
    return {
      success: true,
      data: (data || []).filter((profile) =>
        String(profile.username || "").trim(),
      ),
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      message: error.message || "โหลดรายชื่อ BA ไม่สำเร็จ",
    };
  }
}

export async function getBaKpiStoresAction(username: string) {
  try {
    await requireAdminSession();
    const selectedUsername = String(username || "").trim();
    if (!selectedUsername) return { success: true, data: [] };
    const { data, error } = await getKpiAdminClient()
      .from("pg_stores")
      .select("store_code, store_name, mer_code")
      .eq("is_active", true)
      .eq("mer_code", selectedUsername)
      .order("store_name", { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      message: error.message || "โหลดรายชื่อสาขาไม่สำเร็จ",
    };
  }
}

export async function saveBaKpiEntryAction(input: {
  month: string;
  sheetType: KpiSheetType;
  companyTag: string;
  username: string;
  storeCodes: string[];
  amount: number;
  note: string;
}) {
  try {
    const session = await requireAdminSession();
    const periodMonth = validateMonth(input.month);
    const sheetTypes = ["SUPERVISOR", "BKK", "UPC"];
    const companyTag = String(input.companyTag || "").trim();
    const username = String(input.username || "").trim();
    const storeCodes = Array.from(
      new Set(
        (input.storeCodes || [])
          .map((code) => String(code).trim())
          .filter(Boolean),
      ),
    );
    const amount = Number(input.amount);
    if (!sheetTypes.includes(input.sheetType)) {
      throw new Error("หมวด KPI ไม่ถูกต้อง");
    }
    if (!companyTag || !username) {
      throw new Error("กรุณาเลือกกลุ่มพนักงานและรหัส BA");
    }
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("จำนวน KPI ต้องเป็นตัวเลขตั้งแต่ 0 บาทขึ้นไป");
    }

    const supabase = getKpiAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("username, display_name, employee_id, company_tag")
      .eq("username", username)
      .eq("company_tag", companyTag)
      .eq("is_active", true)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new Error("ไม่พบ BA ที่เลือก หรือพนักงานถูกปิดใช้งาน");

    let selectedStores: { store_code: string; store_name: string }[] = [];
    if (storeCodes.length > 0) {
      const { data, error } = await supabase
        .from("pg_stores")
        .select("store_code, store_name")
        .eq("mer_code", username)
        .eq("is_active", true)
        .in("store_code", storeCodes);
      if (error) throw error;
      selectedStores = data || [];
      if (selectedStores.length !== storeCodes.length) {
        throw new Error("พบสาขาที่ไม่ได้ผูกกับ BA คนนี้ กรุณาเลือกสาขาใหม่");
      }
    }

    const { data, error } = await getKpiAdminClient()
      .from("ba_kpi_entries")
      .upsert(
        {
          period_month: periodMonth,
          sheet_type: input.sheetType,
          username,
          company_tag: companyTag,
          employee_id: String(profile.employee_id || username).trim(),
          employee_name: String(profile.display_name || username).trim(),
          store_names: storeCodes,
          store_name: selectedStores
            .map((store) => store.store_name)
            .join(" / "),
          amount,
          note: String(input.note || "").trim(),
          updated_by: session.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "period_month,username" },
      )
      .select("id")
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "บันทึก KPI BA ไม่สำเร็จ",
    };
  }
}

export async function deleteBaKpiEntryAction(id: number) {
  try {
    await requireAdminSession();
    const entryId = Number(id);
    if (!Number.isInteger(entryId) || entryId <= 0) {
      throw new Error("รายการ KPI ไม่ถูกต้อง");
    }
    const { error } = await getKpiAdminClient()
      .from("ba_kpi_entries")
      .delete()
      .eq("id", entryId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "ลบรายการ KPI ไม่สำเร็จ",
    };
  }
}
