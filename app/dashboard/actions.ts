"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 🛡️ ตัวสร้าง Client ปกติสำหรับกรณีฉุกเฉิน
const supabaseDefault = createClient(supabaseUrl, supabaseAnonKey);

// 🔑 ฟังก์ชันภายในช่วยสร้าง Admin Client อย่างปลอดภัยภายในขอบเขตฟังก์ชัน (ไม่แครชตอนโหลดไฟล์)
function getClientInstance() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn(
      "⚠️ [Warning] ไม่พบ SUPABASE_SERVICE_ROLE_KEY ในระบบ สลับไปใช้ Anon Key แทนชั่วคราว",
    );
    return supabaseDefault;
  }
  return createClient(supabaseUrl, serviceKey);
}

// 1. 📅 ดึงข้อมูล Time Attendance สำหรับส่งฝ่ายบัญชีทำค่าใช้จ่าย
export async function getAttendanceReportForAccounting() {
  const supabase = getClientInstance();
  try {
    const { data, error } = await supabase
      .from("pg_attendance_logs")
      .select(
        `
        id,
        user_id,
        store_code,
        store_name,
        check_in_at,
        check_out_at,
        check_in_lat,
        check_in_lon
      `,
      )
      .order("check_in_at", { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Accounting report error:", error);
    return { success: false, data: [], message: error.message };
  }
}

// 2. 📊 ดึงยอดขายสะสมเปรียบเทียบกับเป้าหมาย (Target) แยกตามสาขา
export async function getCustomerSalesVsTargetReport() {
  const supabase = getClientInstance();
  try {
    const { data: targets } = await supabase.from("store_targets").select("*");

    const { data: reports } = await supabase.from("pg_daily_activity_reports")
      .select(`
        store_code,
        sales_qty_green90,
        sales_qty_blue90,
        sales_qty_orange100
      `);

    const performanceSummary = (targets || []).map((target) => {
      const storeReports = (reports || []).filter(
        (r) => r.store_code === target.store_code,
      );

      const actualGreen = storeReports.reduce(
        (sum, r) => sum + Number(r.sales_qty_green90 || 0),
        0,
      );
      const actualBlue = storeReports.reduce(
        (sum, r) => sum + Number(r.sales_qty_blue90 || 0),
        0,
      );
      const actualOrange = storeReports.reduce(
        (sum, r) => sum + Number(r.sales_qty_orange100 || 0),
        0,
      );
      const totalActualPacks = actualGreen + actualBlue + actualOrange;

      return {
        storeCode: target.store_code,
        storeName: target.store_name,
        targetPacks: Number(target.target_packs),
        actualPacks: totalActualPacks,
        greenSales: actualGreen,
        blueSales: actualBlue,
        orangeSales: actualOrange,
        achievedPercent:
          Number(target.target_packs) > 0
            ? Math.round((totalActualPacks / Number(target.target_packs)) * 100)
            : 0,
      };
    });

    return { success: true, data: performanceSummary };
  } catch (error: any) {
    console.error("Sales vs Target report error:", error);
    return { success: false, data: [], message: error.message };
  }
}

// 3. ดึงรายชื่อสาขาและเป้าหมายทั้งหมดขึ้นมาแสดงในฟอร์มหลังบ้าน
export async function getStoreTargets() {
  const supabase = getClientInstance();
  try {
    const { data, error } = await supabase
      .from("store_targets")
      .select("*")
      .order("store_code", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Get store targets error:", error);
    return { success: false, data: [], message: error.message };
  }
}

// 4. บันทึกหรืออัปเดตข้อมูลเป้าหมายสาขา
export async function saveStoreTargetAction(payload: {
  store_code: string;
  store_name: string;
  target_packs: number;
  target_revenue: number;
}) {
  const supabase = getClientInstance();
  try {
    const { data, error } = await supabase
      .from("store_targets")
      .upsert(
        {
          store_code: payload.store_code.trim(),
          store_name: payload.store_name.trim(),
          target_packs: payload.target_packs,
          target_revenue: payload.target_revenue,
          target_month: new Date().toISOString().split("T")[0],
        },
        { onConflict: "store_code" },
      )
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Save store target error:", error);
    return {
      success: false,
      message: error.message || "ไม่สามารถบันทึกเป้าหมายได้",
    };
  }
}

// 5. ดึงรายชื่อร้านค้าเปิดใช้งานทั้งหมดจากตาราง pg_stores เพื่อนำไปทำ Dropdown ตัวเลือก
export async function getAvailableStores() {
  const supabase = getClientInstance();
  try {
    const { data, error } = await supabase
      .from("pg_stores")
      .select("id, store_code, store_name, area, company_tag")
      .eq("is_active", true)
      .order("store_name", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Fetch available stores error:", error);
    return { success: false, data: [], message: error.message };
  }
}
