"use server";

import { createClient } from "@/utils/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getClientInstance() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    console.warn(
      "⚠️ [Warning] ไม่พบ SUPABASE_SERVICE_ROLE_KEY ในระบบ สลับไปใช้ Anon Key แทนชั่วคราว",
    );
  }

  return await createClient();
}

// 🇹🇭 Helper Function: แปลง Timestamp เป็นเวลาไทย (Asia/Bangkok UTC+7)
export async function formatThaiDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch (e) {
    return dateStr;
  }
}

// 🇹🇭 Helper Function: แปลง timestamp เป็น YYYY-MM-DD โซนเวลาไทย (Asia/Bangkok)
function getIctDateStr(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const month = parts.find((p) => p.type === "month")?.value || "01";
    const day = parts.find((p) => p.type === "day")?.value || "01";
    const year = parts.find((p) => p.type === "year")?.value || "1970";
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

// 🔍 Helper เช็คว่าสาขาเป็น BigC หรือไม่ (ตัดช่องว่าง + ตัวพิมพ์เล็ก)
function checkIsBigC(code: string = "", name: string = "") {
  const cleanCode = (code || "").toLowerCase().replace(/\s+/g, "");
  const cleanName = (name || "").toLowerCase().replace(/\s+/g, "");
  return (
    cleanCode.includes("pgbc") ||
    cleanCode.includes("bigc") ||
    cleanName.includes("bigc")
  );
}

function getReportProductSalesBreakdown(report: any) {
  const directGreen = Number(report?.sales_qty_green90 ?? 0);
  const directBlue = Number(report?.sales_qty_blue90 ?? 0);
  const directOrange = Number(report?.sales_qty_orange100 ?? 0);

  const productRows = Array.isArray(report?.pg_daily_report_products)
    ? report.pg_daily_report_products
    : Array.isArray(report?.products)
      ? report.products
      : [];

  let nestedGreen = 0;
  let nestedBlue = 0;
  let nestedOrange = 0;

  for (const item of productRows) {
    const barcode = String(item?.barcode ?? "").trim();
    const qty = Number(item?.sales_qty ?? 0);
    if (!barcode || Number.isNaN(qty)) continue;

    if (barcode === "8858678423339") nestedGreen += qty;
    else if (barcode === "8858678423681") nestedBlue += qty;
    else if (barcode === "8858678422875") nestedOrange += qty;
  }

  const hasNestedData = productRows.some(
    (item: any) => Number(item?.sales_qty ?? 0) > 0,
  );

  return {
    greenSets: hasNestedData ? nestedGreen : directGreen,
    blueSets: hasNestedData ? nestedBlue : directBlue,
    orangeSets: hasNestedData ? nestedOrange : directOrange,
  };
}

function getReportTotalSalesQty(report: any): number {
  const productRows = Array.isArray(report?.pg_daily_report_products)
    ? report.pg_daily_report_products
    : Array.isArray(report?.products)
      ? report.products
      : [];

  if (Array.isArray(productRows) && productRows.length > 0) {
    const totalProductQty = productRows.reduce((sum: number, item: any) => {
      const qty = Number(item?.sales_qty ?? 0);
      return sum + (Number.isNaN(qty) ? 0 : qty);
    }, 0);

    if (totalProductQty > 0) return totalProductQty;
  }

  return (
    Number(report?.sales_qty_green90 ?? 0) +
    Number(report?.sales_qty_blue90 ?? 0) +
    Number(report?.sales_qty_orange100 ?? 0)
  );
}

// 🖼️ Helper Parse & Normalize รูปภาพจาก activity_photos
function parsePhotoArray(fieldData: any) {
  if (!fieldData) return [];
  let list: any[] = [];

  if (Array.isArray(fieldData)) {
    list = fieldData;
  } else if (typeof fieldData === "string") {
    try {
      const parsed = JSON.parse(fieldData);
      list = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      if (fieldData.startsWith("http") || fieldData.startsWith("/")) {
        list = [fieldData];
      }
    }
  } else if (typeof fieldData === "object" && fieldData !== null) {
    list = [fieldData];
  }

  return list
    .map((item) => {
      if (typeof item === "string") {
        return { url: item, type: "", label: "" };
      }
      if (typeof item === "object" && item !== null) {
        return {
          url:
            item.url ||
            item.src ||
            item.image ||
            item.image_url ||
            item.photo_url ||
            "",
          type: item.type || "",
          label: item.label || "",
        };
      }
      return { url: "", type: "", label: "" };
    })
    .filter(
      (item) =>
        item.url && typeof item.url === "string" && item.url.trim() !== "",
    );
}

// 1. 📅 ดึงข้อมูล Time Attendance สำหรับส่งฝ่ายบัญชีทำค่าใช้จ่าย
export async function getAttendanceReportForAccounting() {
  const supabase = await getClientInstance();
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
        check_in_latitude,
        check_in_longitude
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
  const supabase = await getClientInstance();
  try {
    const { data: targets = [] } = await supabase
      .from("store_targets")
      .select("*");

    const { data: reports = [] } = await supabase.from(
      "pg_daily_activity_reports",
    ).select(`
        store_code,
        sales_qty_green90,
        sales_qty_blue90,
        sales_qty_orange100
      `);

    const performanceSummary = (targets || []).map((target: any) => {
      const storeReports = (reports || []).filter(
        (r: any) => r.store_code === target.store_code,
      );

      const actualGreen = storeReports.reduce(
        (sum: number, r: any) => sum + Number(r.sales_qty_green90 || 0),
        0,
      );
      const actualBlue = storeReports.reduce(
        (sum: number, r: any) => sum + Number(r.sales_qty_blue90 || 0),
        0,
      );
      const actualOrange = storeReports.reduce(
        (sum: number, r: any) => sum + Number(r.sales_qty_orange100 || 0),
        0,
      );

      const isBigC = checkIsBigC(target.store_code, target.store_name);

      const totalActualPacks = isBigC
        ? (actualGreen + actualBlue) * 2
        : actualGreen + actualBlue + actualOrange * 2;

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

// 3. ดึงรายชื่อสาขาและเป้าหมายทั้งหมด
export async function getStoreTargets() {
  const supabase = await getClientInstance();
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

// 4. บันทึกหรืออัปเดตข้อมูลเป้าหมายสาขาแบบแยกราย SKU
export async function saveStoreTargetAction(payload: {
  store_code: string;
  store_name: string;
  target_green90?: number;
  target_blue90?: number;
  target_orange100?: number;
  price_green90?: number;
  price_blue90?: number;
  price_orange100?: number;
  promotion_id?: string | number | null;
  promotion_name?: string | null;
  promotion_title?: string | null;
  target_type?: string | null;
  target_value?: string | null;
  target_round?: string | null;
  product1_id?: string | number | null;
  product2_id?: string | number | null;
  product3_id?: string | number | null;
  target1?: number;
  target2?: number;
  target3?: number;
  price1?: number;
  price2?: number;
  price3?: number;
  products?: Array<{
    product_id: string | number | null;
    target: number;
    price: number;
  }>;
}) {
  const supabase = await getClientInstance();
  try {
    const productRows = (
      payload.products ?? [
        {
          product_id: payload.product1_id ?? null,
          target: payload.target1 ?? payload.target_green90 ?? 0,
          price: payload.price1 ?? payload.price_green90 ?? 150,
        },
        {
          product_id: payload.product2_id ?? null,
          target: payload.target2 ?? payload.target_blue90 ?? 0,
          price: payload.price2 ?? payload.price_blue90 ?? 142,
        },
        {
          product_id: payload.product3_id ?? null,
          target: payload.target3 ?? payload.target_orange100 ?? 0,
          price: payload.price3 ?? payload.price_orange100 ?? 100,
        },
      ]
    ).slice(0, 10);

    const green = Number(payload.target_green90 ?? productRows[0]?.target ?? 0);
    const blue = Number(payload.target_blue90 ?? productRows[1]?.target ?? 0);
    const orange = Number(
      payload.target_orange100 ?? productRows[2]?.target ?? 0,
    );

    const priceGreen = Number(
      payload.price_green90 ?? productRows[0]?.price ?? 150,
    );
    const priceBlue = Number(
      payload.price_blue90 ?? productRows[1]?.price ?? 142,
    );
    const priceOrange = Number(
      payload.price_orange100 ?? productRows[2]?.price ?? 100,
    );

    const isBigC = checkIsBigC(payload.store_code, payload.store_name);

    const targetSetsCounted = isBigC
      ? Number(productRows[0]?.target ?? green) +
        Number(productRows[1]?.target ?? blue)
      : productRows.reduce((sum, row) => sum + Number(row.target || 0), 0);
    const totalPacks = targetSetsCounted * 2;

    const totalRevenue = productRows.reduce(
      (sum, row) => sum + Number(row.target || 0) * Number(row.price || 0),
      0,
    );

    const upsertData: any = {
      store_code: payload.store_code.trim(),
      store_name: payload.store_name.trim(),
      target_green90: green,
      target_blue90: blue,
      target_orange100: orange,
      price_green90: priceGreen,
      price_blue90: priceBlue,
      price_orange100: priceOrange,
      target_packs: totalPacks,
      target_revenue: totalRevenue,
      target_month: new Date().toISOString().split("T")[0],
    };

    productRows.forEach((row, index) => {
      upsertData[`product${index + 1}_id`] =
        row.product_id == null ? null : String(row.product_id);
      upsertData[`target${index + 1}`] = Number(row.target || 0);
      upsertData[`price${index + 1}`] = Number(row.price || 0);
    });

    for (let index = productRows.length; index < 10; index += 1) {
      upsertData[`product${index + 1}_id`] = null;
      upsertData[`target${index + 1}`] = 0;
      upsertData[`price${index + 1}`] = 0;
    }

    const { data, error } = await supabase
      .from("store_targets")
      .upsert(upsertData, { onConflict: "store_code" })
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

// 5. ดึงรายชื่อร้านค้าทั้งหมด
export async function getAvailableStores() {
  const supabase = await getClientInstance();
  try {
    const { data, error } = await supabase
      .from("pg_stores")
      .select("id, store_code, store_name, area, company_tag, is_active")
      .order("store_name", { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Fetch available stores error:", error);
    return { success: false, data: [], message: error.message };
  }
}

// 6. 🏆 ดึงโปรไฟล์พนักงาน + สถานที่ Check-in + ยอดขายจริงวันนี้ + ยอดสะสมประจำเดือน
export async function getUserDashboardDataAction(userIdInput: number | string) {
  const supabase = await getClientInstance();
  const userId = Number(userIdInput);

  try {
    const now = new Date();
    const yearMonthDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const firstDayOfMonth = `${yearMonthDay.substring(0, 7)}-01`;

    let profile: any = null;
    const { data: p1 } = await supabase
      .from("user_profiles")
      .select("display_name, employee_id, area, company_tag")
      .eq("id", userId)
      .maybeSingle();
    profile = p1;

    if (!profile) {
      const { data: p2 } = await supabase
        .from("user_profiles")
        .select("display_name, employee_id, area, company_tag")
        .eq("user_id", userId)
        .maybeSingle();
      profile = p2;
    }

    if (!profile) {
      const { data: p3 } = await supabase
        .from("profiles")
        .select("display_name, employee_id, area, company_tag")
        .eq("id", userId)
        .maybeSingle();
      profile = p3;
    }

    const { data: attendance } = await supabase
      .from("pg_attendance_logs")
      .select("store_code, store_name")
      .eq("user_id", userId)
      .order("check_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const activeStoreCode = attendance?.store_code || profile?.area || "";

    let storeTarget = null;
    if (activeStoreCode) {
      const { data: targetData } = await supabase
        .from("store_targets")
        .select("*")
        .eq("store_code", activeStoreCode)
        .maybeSingle();
      storeTarget = targetData;
    }

    const { data: recentReports } = await supabase
      .from("pg_daily_activity_reports")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(5);

    let todayReport =
      (recentReports || []).find((r: any) => {
        const rDate = r.report_date ? r.report_date.split("T")[0] : "";
        return rDate === yearMonthDay;
      }) ||
      recentReports?.[0] ||
      null;

    const { data: monthlyReports } = await supabase
      .from("pg_daily_activity_reports")
      .select(
        "sales_qty_green90, sales_qty_blue90, sales_qty_orange100, store_code, store_name",
      )
      .eq("user_id", userId)
      .gte("report_date", firstDayOfMonth);

    let monthlyTotalPacks = 0;
    if (monthlyReports && monthlyReports.length > 0) {
      monthlyReports.forEach((r: any) => {
        const g = Number(r.sales_qty_green90 || 0);
        const b = Number(r.sales_qty_blue90 || 0);
        const o = Number(r.sales_qty_orange100 || 0);

        const isBigCStore = checkIsBigC(r.store_code, r.store_name);
        if (isBigCStore) {
          monthlyTotalPacks += (g + b) * 2;
        } else {
          monthlyTotalPacks += g + b + o * 2;
        }
      });
    }

    return {
      success: true,
      profile: profile || {
        display_name: `PG-${userId}`,
        employee_id: `PG-${userId}`,
        area: "",
        company_tag: "",
      },
      storeName: attendance?.store_name || "ยังไม่ได้บันทึก Check-in วันนี้",
      storeCode: activeStoreCode,
      storeTarget: storeTarget,
      todaySales: todayReport || null,
      monthlyProgress: {
        total_packs: monthlyTotalPacks,
      },
    };
  } catch (error: any) {
    console.error("GetUserDashboardDataAction Error:", error);
    return { success: false, message: error.message };
  }
}

// 7. ลบเป้าหมายสาขาออกจากระบบ
export async function deleteStoreTargetAction(storeCode: string) {
  const supabase = await getClientInstance();
  try {
    const { error } = await supabase
      .from("store_targets")
      .delete()
      .eq("store_code", storeCode);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Delete store target error:", error);
    return {
      success: false,
      message: error.message || "ไม่สามารถลบเป้าหมายได้",
    };
  }
}

// 8. คำนวณ Commission ประจำรอบตามจำนวนวันทำงานจริง
export interface CommissionResult {
  totalSetsSold: number;
  totalPacksSold: number;
  baseSalary: number;
  incentiveAmount: number;
  totalEarning: number;
  achievementPercent: number;
  tierStatus: string;
  nextTierDifference: number;
}

export async function calculateBigCCommission(
  greenSets: number = 0,
  blueSets: number = 0,
  orangeSets: number = 0,
  workingDays: number = 3,
  storeCodeOrName: string = "",
): Promise<CommissionResult> {
  const isBigC = checkIsBigC(storeCodeOrName, storeCodeOrName);

  const totalSetsSold = isBigC
    ? Number(greenSets) + Number(blueSets)
    : Number(greenSets) + Number(blueSets) + Number(orangeSets);

  const totalPacksSold = isBigC
    ? (Number(greenSets) + Number(blueSets)) * 2
    : Number(greenSets) + Number(blueSets) + Number(orangeSets) * 2;

  const wDays = workingDays > 0 ? workingDays : 1;
  const target80Sets = 45 * wDays;
  const target100Sets = 60 * wDays;

  const baseSalary = wDays * 700;
  let incentiveAmount = 0;
  let tierStatus = "";
  let nextTierDifference = 0;

  if (totalSetsSold < target80Sets) {
    incentiveAmount = 0;
    tierStatus = "ยังไม่ถึงเกณฑ์ 80%";
    nextTierDifference = target80Sets - totalSetsSold;
  } else if (totalSetsSold >= target80Sets && totalSetsSold < target100Sets) {
    incentiveAmount = 200;
    tierStatus = "ผ่านเกณฑ์ 80% (รับโบนัส 200฿)";
    nextTierDifference = target100Sets - totalSetsSold;
  } else {
    const baseIncentive = 500;
    const extraSets = totalSetsSold - target100Sets;
    const extraSteps = Math.floor(extraSets / 15);
    const extraIncentive = extraSteps * 100;

    incentiveAmount = baseIncentive + extraIncentive;

    if (extraSteps > 0) {
      tierStatus = `ทะลุเป้า 100% + Extra ${extraSteps} สเต็ป (รับโบนัส ${incentiveAmount}฿)`;
    } else {
      tierStatus = "บรรลุเป้าหมาย 100% (รับโบนัส 500฿)";
    }

    nextTierDifference = 15 - (extraSets % 15);
  }

  const achievementPercent = Math.round((totalSetsSold / target100Sets) * 100);

  return {
    totalSetsSold,
    totalPacksSold,
    baseSalary,
    incentiveAmount,
    totalEarning: baseSalary + incentiveAmount,
    achievementPercent,
    tierStatus,
    nextTierDifference,
  };
}

// Helper คำนวณค่าแรงจาก Log เข้า-ออกงาน
function getWageFromAttendanceLog(log: any): number {
  if (!log.check_in_at || !log.check_out_at) return 0;

  const checkIn = new Date(log.check_in_at).getTime();
  const checkOut = new Date(log.check_out_at).getTime();
  const workedHours = Number(
    ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(1),
  );

  if (workedHours > 0 && workedHours < 6) {
    return 350;
  } else if (workedHours >= 6) {
    return 700;
  }

  return 0;
}

// 🇹🇭 Helper Function: คำนวณค่าแรงรายวันตามจำนวนชั่วโมงทำงานจริง
function calculateDailyWage(hours: number, baseRate: number = 700): number {
  if (hours >= 9) {
    return baseRate;
  } else if (hours >= 1) {
    return baseRate / 2;
  } else {
    return 0;
  }
}

// 10. 📅 ดึงรายงาน Time Attendance & Expense
export async function getAdminAttendanceExpenseReportAction(params?: {
  startDate?: string;
  endDate?: string;
  storeCode?: string;
}) {
  const supabase = await getClientInstance();
  try {
    const { data: userProfiles, error: userError } = await supabase
      .from("user_profiles")
      .select(
        "id, display_name, employee_id, username, base_salary, company_tag",
      );

    if (userError) {
      console.error("Fetch user_profiles error:", userError);
    }

    let query = supabase
      .from("pg_attendance_logs")
      .select("*")
      .order("check_in_at", { ascending: false });

    if (params?.startDate) {
      query = query.gte("check_in_at", `${params.startDate}T00:00:00+07:00`);
    }
    if (params?.endDate) {
      query = query.lte("check_in_at", `${params.endDate}T23:59:59+07:00`);
    }
    if (params?.storeCode && params.storeCode !== "ALL") {
      query = query.eq("store_code", params.storeCode);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    const formattedLogs = (logs || []).map((log) => {
      const userObj = (userProfiles || []).find((p) => p.id === log.user_id);

      const empDisplayName =
        userObj?.display_name || userObj?.username || `PG-${log.user_id}`;
      const empCode =
        userObj?.employee_id || userObj?.username || `PG-${log.user_id}`;

      let workedHours = 0;
      if (log.check_in_at && log.check_out_at) {
        const checkIn = new Date(log.check_in_at).getTime();
        const checkOut = new Date(log.check_out_at).getTime();
        const diffMs = checkOut - checkIn;
        workedHours = Number((diffMs / (1000 * 60 * 60)).toFixed(1));
      }

      const baseSalaryRate = userObj?.base_salary
        ? Number(userObj.base_salary)
        : 700;

      const dayValue = workedHours >= 9 ? 1 : workedHours >= 1 ? 0.5 : 0;
      const dailyWage = calculateDailyWage(workedHours, baseSalaryRate);

      return {
        id: log.id,
        userId: log.user_id,
        employeeId: empCode,
        displayName: empDisplayName,
        storeCode: log.store_code,
        storeName: log.store_name,
        checkInAt: log.check_in_at,
        checkOutAt: log.check_out_at,
        workedHours,
        dayValue,
        baseSalaryRate,
        dailyWage,
        checkInPhoto: log.check_in_image_url || log.check_in_photo || "",
        checkOutPhoto: log.check_out_image_url || log.check_out_photo || "",
      };
    });

    return { success: true, data: formattedLogs };
  } catch (error: any) {
    console.error("Get admin attendance report error:", error);
    return { success: false, data: [], message: error.message };
  }
}

// 11. 💰 ดึงรายงานสรุปเงินเดือน (Admin Salary Summary Report)
export async function getAdminSalarySummaryReportAction(params?: {
  startDate?: string;
  endDate?: string;
}) {
  const supabase = await getClientInstance();
  try {
    const expenseRes = await getAdminAttendanceExpenseReportAction(params);
    if (!expenseRes.success) throw new Error(expenseRes.message);

    const attendanceLogs = expenseRes.data || [];

    // ดึงรายงานยอดขายประจำวันเพื่อนำมาคำนวณค่าคอมมิชชั่น
    let reportsQuery = supabase
      .from("pg_daily_activity_reports")
      .select("*, pg_daily_report_products (* )");

    if (params?.startDate) {
      reportsQuery = reportsQuery.gte("report_date", params.startDate);
    }
    if (params?.endDate) {
      reportsQuery = reportsQuery.lte("report_date", params.endDate);
    }

    const { data: dailyReports } = await reportsQuery;

    // สะสมข้อมูลแยกตาม User ID
    const userSummaryMap = new Map<number, any>();

    attendanceLogs.forEach((log: any) => {
      const uId = Number(log.userId);
      if (!userSummaryMap.has(uId)) {
        userSummaryMap.set(uId, {
          userId: uId,
          empId: log.employeeId,
          displayName: log.displayName,
          storeCode: log.storeCode,
          storeName: log.storeName,
          workDaysCount: 0,
          baseSalaryRate: log.baseSalaryRate,
          totalDailyWage: 0,
          allSkuSalesQty: 0,
          greenSets: 0,
          blueSets: 0,
          orangeSets: 0,
        });
      }

      const userGroup = userSummaryMap.get(uId)!;
      userGroup.workDaysCount += log.dayValue; // บวกสะสม 0.5 หรือ 1 วันตามชั่วโมงจริง
      userGroup.totalDailyWage += log.dailyWage;
    });

    // รวมยอดขายสินค้าแต่ละประเภทโดยรองรับทั้งคอลัมน์ legacy และรายการสินค้าแบบ nested
    (dailyReports || []).forEach((rep: any) => {
      const uId = Number(rep.user_id);
      if (!userSummaryMap.has(uId)) return;

      const saleBreakdown = getReportProductSalesBreakdown(rep);
      const totalSalesQty = getReportTotalSalesQty(rep);
      const userGroup = userSummaryMap.get(uId)!;

      userGroup.allSkuSalesQty += totalSalesQty;
      userGroup.greenSets += Number(
        rep.sales_qty_green90 !== undefined && rep.sales_qty_green90 !== null
          ? rep.sales_qty_green90
          : saleBreakdown.greenSets,
      );
      userGroup.blueSets += Number(
        rep.sales_qty_blue90 !== undefined && rep.sales_qty_blue90 !== null
          ? rep.sales_qty_blue90
          : saleBreakdown.blueSets,
      );
      userGroup.orangeSets += Number(
        rep.sales_qty_orange100 !== undefined &&
          rep.sales_qty_orange100 !== null
          ? rep.sales_qty_orange100
          : saleBreakdown.orangeSets,
      );
    });

    // คำนวณคอมมิชชั่นและรวมค่าแรงสุทธิ
    const summaryList = await Promise.all(
      Array.from(userSummaryMap.values()).map(async (item) => {
        const commRes = await calculateBigCCommission(
          item.greenSets,
          item.blueSets,
          item.orangeSets,
          item.workDaysCount,
          item.storeCode,
        );

        return {
          userId: item.userId,
          empId: item.empId,
          displayName: item.displayName,
          storeCode: item.storeCode,
          storeName: item.storeName,
          workDaysCount: item.workDaysCount,
          baseSalaryRate: item.baseSalaryRate,
          totalDailyWage: item.totalDailyWage,
          totalSets: item.allSkuSalesQty || commRes.totalSetsSold,
          totalPacks: commRes.totalPacksSold,
          totalCommission: commRes.incentiveAmount,
          tierStatus: commRes.tierStatus,
          totalNetSalary: item.totalDailyWage + commRes.incentiveAmount,
        };
      }),
    );

    return { success: true, data: summaryList };
  } catch (error: any) {
    console.error("Get admin salary summary report error:", error);
    return { success: false, data: [], message: error.message };
  }
}

// 12. 🛠️ ฟังก์ชันสำหรับ Admin แก้ไขเวลา Check-in / Check-out และสาขา
export async function updateAdminAttendanceLogAction(payload: {
  id: number;
  checkInAt?: string;
  checkOutAt?: string;
  storeCode?: string;
  storeName?: string;
}) {
  const supabase = await getClientInstance();
  try {
    const updateData: any = {};
    if (payload.checkInAt !== undefined)
      updateData.check_in_at = payload.checkInAt;
    if (payload.checkOutAt !== undefined)
      updateData.check_out_at = payload.checkOutAt;
    if (payload.storeCode !== undefined)
      updateData.store_code = payload.storeCode;
    if (payload.storeName !== undefined)
      updateData.store_name = payload.storeName;

    const { error } = await supabase
      .from("pg_attendance_logs")
      .update(updateData)
      .eq("id", payload.id);

    if (error) throw error;
    return { success: true, message: "อัปเดตข้อมูลเวลาทำงานเรียบร้อยแล้ว" };
  } catch (error: any) {
    console.error("Update attendance log error:", error);
    return {
      success: false,
      message: error.message || "ไม่สามารถแก้ไขข้อมูลได้",
    };
  }
}

// 13. 🛠️ ฟังก์ชันสำหรับ Admin บันทึกรายงานย้อนหลัง พร้อมระบบแปลง Base64 และอัปโหลดรูปภาพ
export async function adminSaveReportWithImagesAction(payload: any) {
  const supabase = await getClientInstance();
  try {
    const BUCKET_NAME = "pg-attendance-photos";

    const finalPhotos: any[] = [];

    for (const photo of payload.activityPhotos || []) {
      if (photo.url && photo.url.startsWith("data:image")) {
        try {
          const base64Data = photo.url.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const ext = photo.url.split(";")[0].split("/")[1] || "jpg";
          const fileName = `admin_${payload.storeCode}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const filePath = `reports/${fileName}`;

          const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, buffer, {
              contentType: `image/${ext}`,
              upsert: false,
            });

          if (error) {
            console.error("Storage upload error:", error);
            continue;
          }

          const { data: pubData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

          finalPhotos.push({
            url: pubData.publicUrl,
            type: photo.type,
            label: photo.label,
          });
        } catch (err) {
          console.error("Base64 process error:", err);
        }
      } else {
        finalPhotos.push(photo);
      }
    }

    const dbData = {
      report_date: payload.reportDateInput,
      user_id: payload.userId,
      store_code: payload.storeCode,
      traffic_count: payload.trafficCount,
      approach_count: payload.approachCount,
      closed_sales_count: payload.closedSalesCount,
      price_comp_cellox: payload.priceCompCellox,
      price_comp_kleenex: payload.priceCompKleenex,
      price_comp_paseo: payload.priceCompPaseo,
      feedback_store: payload.feedbackStore,
      competitor_promotion: payload.competitorPromotion,
      remark: payload.remark,
      activity_photos: finalPhotos,

      price_our_green90: payload.priceOurGreen90,
      stock_before_green90: payload.stockBeforeGreen90,
      sales_qty_green90: payload.salesQtyGreen90,
      stock_after_green90: payload.stockAfterGreen90,

      price_our_blue90: payload.priceOurBlue90,
      stock_before_blue90: payload.stockBeforeBlue90,
      sales_qty_blue90: payload.salesQtyBlue90,
      stock_after_blue90: payload.stockAfterBlue90,

      price_our_orange100: payload.priceOurOrange100,
      stock_before_orange100: payload.stockBeforeOrange100,
      sales_qty_orange100: payload.salesQtyOrange100,
      stock_after_orange100: payload.stockAfterOrange100,

      gift_orange_before: payload.giftOrangeBefore,
      gift_orange_given: payload.giftOrangeGiven,
      gift_orange_after: payload.giftOrangeBefore - payload.giftOrangeGiven,

      gift_nourish_before: payload.giftNourishBefore,
      gift_nourish_given: payload.giftNourishGiven,
      gift_nourish_after: payload.giftNourishBefore - payload.giftNourishGiven,
    };

    if (payload.reportId) {
      const { error } = await supabase
        .from("pg_daily_activity_reports")
        .update(dbData)
        .eq("id", payload.reportId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("pg_daily_activity_reports")
        .insert([dbData]);
      if (error) throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Admin save report error:", error);
    return { success: false, message: error.message };
  }
}

// 14. 📌 ดึงรายชื่อสาขาที่ User ได้รับมอบหมายตามรอบจัดเชียร์ขายใน pg_user_store_schedules
export async function getAssignedStoresByUserAction(userId: number) {
  const supabase = await getClientInstance();
  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. ค้นหารายชื่อ store_code ที่พนักงานได้รับมอบหมายตามรอบการเข้าเชียร์ขายในปัจจุบัน
    const { data: schedules } = await supabase
      .from("pg_user_store_schedules")
      .select("store_code, round_name")
      .eq("user_id", userId)
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today);

    let assignedCodes = schedules?.map((s) => s.store_code) || [];

    // 2. Query ดึงข้อมูลรายละเอียดสาขาจาก pg_stores
    let query = supabase
      .from("pg_stores")
      .select("id, store_code, store_name, area, company_tag, is_active")
      .eq("is_active", true);

    if (assignedCodes.length > 0) {
      query = query.in("store_code", assignedCodes);
    }

    const { data: stores, error } = await query.order("store_name", {
      ascending: true,
    });
    if (error) throw error;

    return { success: true, data: stores || [] };
  } catch (error: any) {
    console.error("getAssignedStoresByUserAction error:", error);
    return { success: false, data: [], message: error.message };
  }
}

// 15. 📦 ดึงรายการสินค้าทั้งหมดจากตาราง products (รองรับทั้งตาราง products และ pg_products)
export async function getProducts() {
  const supabase = await getClientInstance();
  try {
    let { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error || !data || data.length === 0) {
      // Fallback ไปตาราง pg_products หากตารางแรกไม่มีข้อมูล
      const res2 = await supabase
        .from("pg_products")
        .select("*")
        .order("id", { ascending: true });
      if (res2.error) throw res2.error;
      data = res2.data;
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Get products error:", error);
    return { success: false, data: [], message: error.message };
  }
}

// ดึงรายงานเต็มแบบ Customer Portal แบบปลอดภัย โดยรองรับตารางปัจจุบันและ legacy
export async function getCustomerFullActivityReport() {
  const supabase = await getClientInstance();

  try {
    const tableCandidates = ["pg_daily_activity_reports", "pg_daily_reports"];

    let rows: any[] = [];
    let lastError: any = null;

    for (const tableName of tableCandidates) {
      const { data, error } = await supabase
        .from(tableName)
        .select(
          `
          *,
          pg_daily_report_products (
            id,
            report_id,
            barcode,
            descriptions,
            price_our,
            stock_before,
            sales_qty,
            stock_after,
            img_product,
            img_shelf,
            img_stock_scanner,
            created_at
          )
        `,
        )
        .order("report_date", { ascending: false });

      if (!error) {
        rows = data || [];
        break;
      }

      lastError = error;
    }

    if (lastError && rows.length === 0) {
      console.error("Error fetching full customer activity report:", lastError);
      return { success: false, data: [] };
    }

    const userLookup = new Map<string, any>();
    const storeLookup = new Map<string, any>();

    const profileQueries = [
      supabase
        .from("user_profiles")
        .select("id, display_name, username, employee_id"),
      supabase
        .from("profiles")
        .select("id, display_name, username, employee_id"),
    ];

    const [userProfilesRes, profilesRes] = await Promise.all(profileQueries);
    const profileRows = [
      ...(userProfilesRes.data || []),
      ...(profilesRes.data || []),
    ];
    for (const profile of profileRows) {
      if (!profile) continue;
      userLookup.set(String(profile.id), profile);
      if (profile.username) userLookup.set(String(profile.username), profile);
    }

    const attendanceQuery = await supabase
      .from("pg_attendance_logs")
      .select("id, user_id, store_code, store_name, check_in_at")
      .order("check_in_at", { ascending: false });

    const attendanceRows = attendanceQuery.data || [];
    for (const log of attendanceRows) {
      const logAny = log as any;
      if (logAny?.user_id != null) {
        const key = String(logAny.user_id);
        if (!userLookup.has(key)) {
          userLookup.set(key, {
            id: logAny.user_id,
            display_name:
              logAny.user_name || logAny.display_name || `PG-${logAny.user_id}`,
            username: logAny.username || `PG-${logAny.user_id}`,
            employee_id: logAny.employee_id || `PG-${logAny.user_id}`,
          });
        }
      }
      if (logAny?.store_code) {
        storeLookup.set(String(logAny.store_code), {
          store_code: logAny.store_code,
          store_name: logAny.store_name,
        });
      }
    }

    const storeQueries = [
      supabase.from("stores").select("store_code, store_name"),
      supabase.from("store_targets").select("store_code, store_name"),
    ];

    const [storesRes, targetsRes] = await Promise.all(storeQueries);
    for (const item of [
      ...(storesRes.data || []),
      ...(targetsRes.data || []),
    ]) {
      if (!item?.store_code) continue;
      const key = String(item.store_code).trim();
      if (!storeLookup.has(key)) {
        storeLookup.set(key, {
          store_code: item.store_code,
          store_name: item.store_name || "",
        });
      }
    }

    const normalized = (rows || []).map((row: any) => {
      const userId = row.user_id ?? row.userId ?? row.userID ?? "";
      const storeCode = row.store_code ?? row.storeCode ?? "";
      const attendanceMatch =
        (row.attendance_log_id &&
          attendanceRows.find(
            (log: any) => String(log.id) === String(row.attendance_log_id),
          )) ||
        attendanceRows.find(
          (log: any) => String(log.user_id) === String(userId),
        ) ||
        null;

      const profileMatch =
        userLookup.get(String(userId)) ||
        userLookup.get(String(row.user_name ?? "")) ||
        null;

      const resolvedUserName =
        row.user_name ??
        row.userName ??
        profileMatch?.display_name ??
        profileMatch?.username ??
        attendanceMatch?.user_name ??
        attendanceMatch?.display_name ??
        (userId ? `PG-${userId}` : "");

      const resolvedStoreName =
        row.store_name ??
        row.storeName ??
        attendanceMatch?.store_name ??
        storeLookup.get(String(storeCode))?.store_name ??
        "";

      const resolvedStoreCode =
        row.store_code ?? row.storeCode ?? attendanceMatch?.store_code ?? "";

      const directPhotoEntries: any[] = [];
      const directPhotoFields = [
        ["photo_staff_holding", "staff_holding", "พนักงานถือสินค้า"],
        ["photo_cheer_sales", "cheer_sales", "รูปยืนเชียร์"],
        [
          "photo_customer_basket_1",
          "customer_basket_1",
          "ถ่ายคู่กับลูกค้า/ตะกร้า #1",
        ],
        [
          "photo_customer_basket_2",
          "customer_basket_2",
          "ถ่ายคู่กับลูกค้า/ตะกร้า #2",
        ],
        ["photo_atmosphere_1", "atmosphere_1", "บรรยากาศหน้าร้าน #1"],
        ["photo_atmosphere_2", "atmosphere_2", "บรรยากาศหน้าร้าน #2"],
      ];

      for (const [fieldName, typeName, label] of directPhotoFields) {
        const photoUrl = row[fieldName];
        if (photoUrl && typeof photoUrl === "string" && photoUrl.trim()) {
          directPhotoEntries.push({
            url: photoUrl,
            type: typeName,
            label,
          });
        }
      }

      const productPhotoEntries: any[] = [];
      const productRows = Array.isArray(row.pg_daily_report_products)
        ? row.pg_daily_report_products
        : Array.isArray(row.products)
          ? row.products
          : [];

      for (const product of productRows) {
        if (!product || typeof product !== "object") continue;

        const productLabel =
          product.descriptions || product.barcode || "สินค้า";
        const photoFieldMap = [
          [product.img_product, "img_product", `รูปสินค้า: ${productLabel}`],
          [product.img_shelf, "img_shelf", `รูปเชลฟ์ชั้นวาง: ${productLabel}`],
          [
            product.img_stock_scanner,
            "img_stock_scanner",
            `รูปสแกนสต๊อก: ${productLabel}`,
          ],
        ];

        for (const [photoUrl, typeName, label] of photoFieldMap) {
          if (photoUrl && typeof photoUrl === "string" && photoUrl.trim()) {
            productPhotoEntries.push({
              url: photoUrl,
              type: typeName,
              label,
            });
          }
        }
      }

      const parsedPhotos = Array.isArray(row.activity_photos)
        ? row.activity_photos
        : parsePhotoArray(row.activity_photos ?? row.activityPhotos ?? []);

      const mergedPhotos = [
        ...parsedPhotos,
        ...directPhotoEntries,
        ...productPhotoEntries,
      ].filter(
        (p, index, arr) =>
          p?.url && arr.findIndex((item) => item?.url === p.url) === index,
      );

      return {
        ...row,
        id: row.id,
        userId,
        userName: resolvedUserName,
        storeCode: resolvedStoreCode,
        storeName: resolvedStoreName,
        reportDate: row.report_date ?? row.reportDate ?? "",
        traffic: Number(row.traffic_count ?? row.traffic ?? 0),
        approach: Number(row.approach_count ?? row.approach ?? 0),
        closedSales: Number(row.closed_sales_count ?? row.closedSales ?? 0),
        targetPacks: Number(row.target_packs ?? row.target ?? 0),
        feedback: row.feedback_store ?? row.feedback ?? "",
        competitorPromo: row.competitor_promotion ?? row.competitorPromo ?? "",
        remark: row.remark ?? row.remark_store ?? row.remarkStore ?? "",
        activityPhotos: mergedPhotos,
        products:
          row.pg_daily_report_products ??
          row.products ??
          row.report_products ??
          row.items ??
          [],
        pg_daily_report_products:
          row.pg_daily_report_products ??
          row.products ??
          row.report_products ??
          row.items ??
          [],
      };
    });

    return { success: true, data: normalized };
  } catch (error: any) {
    console.error("Error fetching full customer activity report:", error);
    return {
      success: false,
      data: [],
      message: error.message || "Unknown error",
    };
  }
}
