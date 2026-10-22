"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { normalizeCompetitorPrices } from "@/utils/competitor-prices";
import {
  getUserSession,
  requireAdminSession,
  requireUserOrAdminSession,
} from "@/utils/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getClientInstance() {
  return await createClient();
}

async function getAdminClientInstance() {
  await requireAdminSession();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceKey) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return await createClient();
}

async function getCustomerPortalClientInstance() {
  const session = await getUserSession();
  if (!session) throw new Error("กรุณาเข้าสู่ระบบก่อนดูรายงาน");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return await createClient();
}

export async function getCustomerPortalAdminAccess() {
  const session = await getUserSession();
  return session?.role === "admin";
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

function getStoreTargetPacks(target: any): number {
  const productTargets = Array.from(
    { length: 10 },
    (_, index) => target?.[`target${index + 1}`],
  );
  const hasProductTargets = productTargets.some(
    (value) => value !== null && value !== undefined && value !== "",
  );

  if (hasProductTargets) {
    return productTargets.reduce((sum, value) => sum + Number(value || 0), 0);
  }

  const legacyTargets = [
    target?.target_green90,
    target?.target_blue90,
    target?.target_orange100,
  ];
  const hasLegacyTargets = legacyTargets.some(
    (value) => value !== null && value !== undefined && value !== "",
  );

  if (hasLegacyTargets) {
    return legacyTargets.reduce((sum, value) => sum + Number(value || 0), 0);
  }

  return Number(target?.target_packs ?? target?.target ?? 0);
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
    if (String(item?.item_scope || "OUR").toUpperCase() === "COMPETITOR") {
      continue;
    }
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
    const ourProductRows = productRows.filter(
      (item: any) =>
        String(item?.item_scope || "OUR").toUpperCase() !== "COMPETITOR",
    );
    const totalProductQty = ourProductRows.reduce((sum: number, item: any) => {
      const qty = Number(item?.sales_qty ?? 0);
      return sum + (Number.isNaN(qty) ? 0 : qty);
    }, 0);

    if (ourProductRows.length > 0) return totalProductQty;
    if (productRows.some((item: any) => item?.item_scope === "COMPETITOR")) {
      return 0;
    }
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
  const supabase = await getAdminClientInstance();
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
  const supabase = await getAdminClientInstance();
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
        targetPacks: getStoreTargetPacks(target),
        actualPacks: totalActualPacks,
        greenSales: actualGreen,
        blueSales: actualBlue,
        orangeSales: actualOrange,
        achievedPercent:
          getStoreTargetPacks(target) > 0
            ? Math.round((totalActualPacks / getStoreTargetPacks(target)) * 100)
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
  const supabase = await getAdminClientInstance();
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
  calculation_period?: "DAILY" | "MONTHLY" | null;
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
  const supabase = await getAdminClientInstance();
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

    const totalPacks = productRows.reduce(
      (sum, row) => sum + Number(row.target || 0),
      0,
    );

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
      .upsert(
        {
          ...upsertData,
          promotion_id:
            payload.promotion_id == null ? null : String(payload.promotion_id),
          promotion_name: payload.promotion_name ?? null,
          calculation_period: payload.calculation_period ?? null,
        },
        { onConflict: "store_code" },
      )
      .select()
      .single();

    // ฝั่ง DB ที่ยังไม่มีคอลัมน์ promotion_* ให้บันทึกแบบเดิมได้
    if (error && /promotion_(id|name)/.test(error.message || "")) {
      const fallback = await supabase
        .from("store_targets")
        .upsert(upsertData, { onConflict: "store_code" })
        .select()
        .single();
      if (fallback.error) throw fallback.error;
      return { success: true, data: fallback.data };
    }

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
  const supabase = await getAdminClientInstance();
  try {
    const { data, error } = await supabase
      .from("pg_stores")
      .select(
        "id, store_code, store_name, area, company_tag, account, is_active",
      )
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
  await requireUserOrAdminSession(Number(userIdInput));
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
      .select("*, pg_daily_report_products (*)")
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

    let currentPromotion = null;
    if (todayReport?.promotion_id) {
      const { data: promotion } = await supabase
        .from("promotions")
        .select(
          "id, campaign_title, items:promotion_items(*, products(barcode, descriptions, sku_code))",
        )
        .eq("id", String(todayReport.promotion_id))
        .maybeSingle();
      currentPromotion = promotion;
    }

    const { data: monthlyReports } = await supabase
      .from("pg_daily_activity_reports")
      .select("*, pg_daily_report_products (*)")
      .eq("user_id", userId)
      .gte("report_date", firstDayOfMonth);

    let monthlyTotalPacks = 0;
    if (monthlyReports && monthlyReports.length > 0) {
      monthlyReports.forEach((r: any) => {
        monthlyTotalPacks += getReportTotalSalesQty(r);
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
      storeTarget: storeTarget
        ? { ...storeTarget, target_packs: getStoreTargetPacks(storeTarget) }
        : null,
      todaySales: todayReport || null,
      currentPromotion,
      todaySalesTotalPacks: getReportTotalSalesQty(todayReport),
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
  const supabase = await getAdminClientInstance();
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

function roundCommissionAmount(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 1000) / 1000;
}

function prorateCommissionRules(rules: any, dayShare: number) {
  if (!rules) return rules;
  const prorate = (value: unknown) =>
    value === null || value === undefined || value === ""
      ? value
      : Number(value) * dayShare;

  return {
    ...rules,
    tiers: Array.isArray(rules.tiers)
      ? rules.tiers.map((tier: any) => ({
          ...tier,
          min_credited_qty: prorate(tier.min_credited_qty),
          payout: prorate(tier.payout),
        }))
      : [],
    step: rules.step
      ? {
          ...rules.step,
          start_qty: prorate(rules.step.start_qty),
          step_qty: prorate(rules.step.step_qty),
          payout: prorate(rules.step.payout),
        }
      : rules.step,
  };
}

export async function calculateBigCCommission(
  totalPacksForDay: number = 0,
  _unusedBlueSets: number = 0,
  _unusedOrangeSets: number = 0,
  workingDays: number = 1,
  _storeCodeOrName: string = "",
): Promise<CommissionResult> {
  const totalPacksSold = Math.max(0, Number(totalPacksForDay) || 0);
  const wDays = workingDays > 0 ? workingDays : 1;
  const baseSalary = wDays * 700;
  let incentiveAmount = 0;
  let tierStatus = "";
  let nextTierDifference = 0;

  if (totalPacksSold < 30) {
    incentiveAmount = 0;
    tierStatus = "ยังไม่ถึงเกณฑ์ 80%";
    nextTierDifference = 30 - totalPacksSold;
  } else if (totalPacksSold < 40) {
    incentiveAmount = 100;
    tierStatus = "ผ่านเกณฑ์ 80% (รับคอมมิชชั่น 100฿)";
    nextTierDifference = 40 - totalPacksSold;
  } else {
    const extraSteps = Math.floor((totalPacksSold - 40) / 10);
    incentiveAmount = 200 + extraSteps * 100;

    if (extraSteps > 0) {
      tierStatus = `ถึงเป้า 100% + โบนัสเพิ่ม ${extraSteps} ขั้น (รับ ${incentiveAmount}฿)`;
    } else {
      tierStatus = "บรรลุเป้าหมาย 100% (รับคอมมิชชั่น 200฿)";
    }

    nextTierDifference = 10 - ((totalPacksSold - 40) % 10);
  }

  const achievementPercent =
    totalPacksSold >= 40
      ? Math.round((totalPacksSold / 40) * 100)
      : totalPacksSold >= 30
        ? 80
        : Math.round((totalPacksSold / 30) * 80);

  return {
    totalSetsSold: totalPacksSold,
    totalPacksSold,
    baseSalary,
    incentiveAmount,
    totalEarning: baseSalary + incentiveAmount,
    achievementPercent,
    tierStatus,
    nextTierDifference,
  };
}

function calculatePromotionCommission(
  creditedSales: number,
  targetQty: number,
  rules: any,
): CommissionResult {
  const achievementPercent =
    targetQty > 0 ? (creditedSales / targetQty) * 100 : 0;
  const tiers = Array.isArray(rules?.tiers) ? rules.tiers : [];
  const eligibleTiers = tiers
    .filter((tier: any) => {
      const hasQuantityThreshold =
        tier.min_credited_qty !== null &&
        tier.min_credited_qty !== undefined &&
        tier.min_credited_qty !== "";
      const achieved = hasQuantityThreshold
        ? creditedSales >= Number(tier.min_credited_qty)
        : Number(tier.achievement_percent) <= achievementPercent;
      return achieved && Number.isFinite(Number(tier.payout));
    })
    .sort(
      (a: any, b: any) =>
        Number(a.achievement_percent) - Number(b.achievement_percent),
    );
  const topTier = eligibleTiers[eligibleTiers.length - 1];
  const step = rules?.step || {};
  const hasQuantitySteps =
    step.start_qty !== null &&
    step.start_qty !== undefined &&
    step.step_qty !== null &&
    step.step_qty !== undefined;
  const stepStart = Number(
    hasQuantitySteps ? step.start_qty : step.start_percent || 0,
  );
  const stepSize = Number(
    hasQuantitySteps ? step.step_qty : step.step_percent || 0,
  );
  const stepPayout = Number(step.payout || 0);
  const extraSteps =
    stepSize > 0 &&
    (hasQuantitySteps ? creditedSales : achievementPercent) > stepStart
      ? Math.floor(
          ((hasQuantitySteps ? creditedSales : achievementPercent) -
            stepStart) /
            stepSize,
        )
      : 0;
  const incentiveAmount = roundCommissionAmount(
    Number(topTier?.payout || 0) + extraSteps * stepPayout,
  );
  const nextTierQuantities = tiers
    .map((tier: any) => {
      const hasQuantityThreshold =
        tier.min_credited_qty !== null &&
        tier.min_credited_qty !== undefined &&
        tier.min_credited_qty !== "";
      return hasQuantityThreshold
        ? Number(tier.min_credited_qty)
        : (targetQty * Number(tier.achievement_percent || 0)) / 100;
    })
    .filter((quantity: number) => quantity > creditedSales);
  if (stepSize > 0) {
    const nextBonusQuantity =
      (creditedSales < stepStart
        ? stepStart
        : stepStart + (extraSteps + 1) * stepSize) || 0;
    if (nextBonusQuantity > creditedSales) {
      nextTierQuantities.push(nextBonusQuantity);
    }
  }
  const tierStatus = topTier
    ? `${achievementPercent.toFixed(1)}% · ${incentiveAmount.toLocaleString()}฿`
    : `ยังไม่ถึงเกณฑ์ (${achievementPercent.toFixed(1)}%)`;

  return {
    totalSetsSold: creditedSales,
    totalPacksSold: creditedSales,
    baseSalary: 0,
    incentiveAmount,
    totalEarning: incentiveAmount,
    achievementPercent: Number(achievementPercent.toFixed(2)),
    tierStatus,
    nextTierDifference:
      nextTierQuantities.length > 0
        ? Math.max(0, Math.min(...nextTierQuantities) - creditedSales)
        : 0,
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
  try {
    const supabase = await getAdminClientInstance();
    const { data: userProfiles, error: userError } = await supabase
      .from("user_profiles")
      .select(
        "id, display_name, employee_id, username, base_salary, company_tag, employment_type",
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

    const mappedLogs = (logs || []).map((log) => {
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

      const configuredSalary = userObj?.base_salary
        ? Number(userObj.base_salary)
        : 700;
      // พนักงานรายเดือน: เฉลี่ยเป็นค่าแรงต่อวันด้วย 26 วัน
      const employmentType = String(userObj?.employment_type || "")
        .trim()
        .toLowerCase();
      const isMonthly =
        employmentType === "รายเดือน" || employmentType === "monthly";
      const baseSalaryRate = isMonthly
        ? Number((configuredSalary / 26).toFixed(2))
        : configuredSalary;

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
        checkInLat: log.check_in_latitude,
        checkInLon: log.check_in_longitude,
        workedHours,
        dayValue,
        baseSalaryRate,
        dailyWage,
        checkInPhoto: log.check_in_image_url || log.check_in_photo || "",
        checkOutPhoto: log.check_out_image_url || log.check_out_photo || "",
      };
    });

    // ค่าแรงคิดต่อคนต่อวัน: เข้าร้านแรก -> ออกร้านสุดท้าย (>=9 ชม. เต็มวัน, 1-8 ชม. ครึ่งวัน)
    const dayGroups = new Map<string, typeof mappedLogs>();
    for (const log of mappedLogs) {
      const key = `${log.userId}:${getIctDateStr(log.checkInAt)}`;
      const group = dayGroups.get(key);
      if (group) group.push(log);
      else dayGroups.set(key, [log]);
    }

    const wageByLogId = new Map<
      number,
      { dayWorkedHours: number; dayValue: number; dailyWage: number }
    >();
    for (const group of dayGroups.values()) {
      const sorted = [...group].sort(
        (a, b) =>
          new Date(a.checkInAt).getTime() - new Date(b.checkInAt).getTime(),
      );
      const firstIn = new Date(sorted[0].checkInAt).getTime();
      const lastOut = Math.max(
        0,
        ...sorted
          .filter((item) => item.checkOutAt)
          .map((item) => new Date(item.checkOutAt).getTime()),
      );
      const dayWorkedHours =
        lastOut > firstIn
          ? Number(((lastOut - firstIn) / (1000 * 60 * 60)).toFixed(1))
          : 0;
      const rate = sorted[0].baseSalaryRate;

      sorted.forEach((item, index) => {
        wageByLogId.set(item.id, {
          dayWorkedHours,
          dayValue:
            index === 0
              ? dayWorkedHours >= 9
                ? 1
                : dayWorkedHours >= 1
                  ? 0.5
                  : 0
              : 0,
          dailyWage: index === 0 ? calculateDailyWage(dayWorkedHours, rate) : 0,
        });
      });
    }

    const formattedLogs = mappedLogs.map((log) => ({
      ...log,
      ...wageByLogId.get(log.id),
    }));

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
  try {
    const supabase = await getAdminClientInstance();
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

    const { data: promotionRows } = await supabase
      .from("promotions")
      .select(
        "id, calculation_period, commission_rules, items:promotion_items(*, products(barcode))",
      );
    const promotionsById = new Map(
      (promotionRows || []).map((promotion: any) => [
        String(promotion.id),
        promotion,
      ]),
    );

    const { data: storeTargetRows } = await supabase
      .from("store_targets")
      .select("store_code, promotion_id, calculation_period, target_packs");
    const storeTargetsByPromotion = new Map<string, any>();
    for (const target of storeTargetRows || []) {
      if (target.promotion_id == null) continue;
      storeTargetsByPromotion.set(
        `${target.store_code}:${target.promotion_id}`,
        target,
      );
    }

    const { data: storeAccounts } = await supabase
      .from("pg_stores")
      .select("store_code, account");
    const storeAccountLookup = new Map<string, string>();
    for (const store of storeAccounts || []) {
      if (store.store_code == null) continue;
      storeAccountLookup.set(
        String(store.store_code).trim(),
        store.account || "",
      );
    }

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
          account:
            storeAccountLookup.get(String(log.storeCode || "").trim()) || "",
          workDaysCount: 0,
          baseSalaryRate: log.baseSalaryRate,
          totalDailyWage: 0,
          allSkuSalesQty: 0,
          workDaysByMonth: new Map<string, number>(),
          workDaysByStoreMonth: new Map<string, number>(),
          workDaysByAccountMonth: new Map<string, number>(),
          dailySalesByDate: new Map<string, number>(),
          promotionCommissionByDate: new Map<string, number>(),
          monthlyCampaignDates: new Set<string>(),
          monthlyPromotionPerformance: new Map<string, any>(),
        });
      }

      const userGroup = userSummaryMap.get(uId)!;
      userGroup.workDaysCount += log.dayValue; // บวกสะสม 0.5 หรือ 1 วันตามชั่วโมงจริง
      userGroup.totalDailyWage += log.dailyWage;

      if (log.checkInAt) {
        const monthKey = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Bangkok",
          year: "numeric",
          month: "2-digit",
        }).format(new Date(log.checkInAt));
        const storeCode = String(log.storeCode || "").trim();
        const accountKey = String(storeAccountLookup.get(storeCode) || "")
          .trim()
          .toLowerCase();
        const dayValue = Number(log.dayValue || 0);
        userGroup.workDaysByMonth.set(
          monthKey,
          (userGroup.workDaysByMonth.get(monthKey) || 0) + dayValue,
        );
        if (storeCode) {
          const storeMonthKey = `${storeCode}:${monthKey}`;
          userGroup.workDaysByStoreMonth.set(
            storeMonthKey,
            (userGroup.workDaysByStoreMonth.get(storeMonthKey) || 0) + dayValue,
          );
        }
        if (accountKey) {
          const accountMonthKey = `${accountKey}:${monthKey}`;
          userGroup.workDaysByAccountMonth.set(
            accountMonthKey,
            (userGroup.workDaysByAccountMonth.get(accountMonthKey) || 0) +
              dayValue,
          );
        }
      }
    });

    // รวมยอดขายสินค้าแต่ละประเภทโดยรองรับทั้งคอลัมน์ legacy และรายการสินค้าแบบ nested
    (dailyReports || []).forEach((rep: any) => {
      const uId = Number(rep.user_id);
      if (!userSummaryMap.has(uId)) return;

      const totalSalesQty = getReportTotalSalesQty(rep);
      const userGroup = userSummaryMap.get(uId)!;

      userGroup.allSkuSalesQty += totalSalesQty;
      const reportDate = String(rep.report_date || "").split("T")[0];
      const dateKey = reportDate || `report-${rep.id}`;
      const currentDailySales = userGroup.dailySalesByDate.get(dateKey) || 0;
      userGroup.dailySalesByDate.set(
        dateKey,
        currentDailySales + totalSalesQty,
      );

      const promotion = rep.promotion_id
        ? promotionsById.get(String(rep.promotion_id))
        : null;
      const storeTarget = rep.promotion_id
        ? storeTargetsByPromotion.get(`${rep.store_code}:${rep.promotion_id}`)
        : null;
      const rules =
        rep.promotion_commission_rules || promotion?.commission_rules;
      const promotionItems = Array.isArray(promotion?.items)
        ? promotion.items.filter(
            (item: any) =>
              String(item.item_scope || "OUR").toUpperCase() !== "COMPETITOR",
          )
        : [];
      const promotionTargetQty = promotionItems.reduce(
        (sum: number, item: any) => sum + Number(item.target_qty || 0),
        0,
      );
      const reportProducts = Array.isArray(rep.pg_daily_report_products)
        ? rep.pg_daily_report_products
        : [];
      const snapshotTargetQty = reportProducts.reduce(
        (sum: number, product: any) =>
          sum + Number(product.promotion_target_qty || 0),
        0,
      );
      const calculationPeriod =
        storeTarget?.calculation_period ||
        promotion?.calculation_period ||
        "DAILY";
      const monthlyTargetBaseQty =
        Number(storeTarget?.target_packs || 0) ||
        promotionTargetQty ||
        snapshotTargetQty;
      const targetQty =
        calculationPeriod === "MONTHLY"
          ? monthlyTargetBaseQty
          : snapshotTargetQty || promotionTargetQty;

      if (rules && targetQty > 0 && reportProducts.length > 0) {
        const targetByBarcode = new Map<string, number>();
        promotionItems.forEach((item: any) => {
          const barcode = String(
            item.products?.barcode || item.barcode || "",
          ).trim();
          if (barcode) {
            targetByBarcode.set(barcode, Number(item.credit_factor ?? 1));
          }
        });
        const creditedSales = reportProducts.reduce(
          (sum: number, product: any) => {
            if (
              String(product.item_scope || "OUR").toUpperCase() === "COMPETITOR"
            ) {
              return sum;
            }
            const barcode = String(product.barcode || "").trim();
            const factor = Number.isFinite(Number(product.credit_factor))
              ? Number(product.credit_factor)
              : targetByBarcode.get(barcode);
            return factor === undefined
              ? sum
              : sum + Number(product.sales_qty || 0) * factor;
          },
          0,
        );
        if (calculationPeriod === "MONTHLY" && promotion?.id) {
          const monthKey = dateKey.slice(0, 7);
          const targetScopeType =
            Number(storeTarget?.target_packs || 0) > 0
              ? "STORE"
              : promotion.target_type === "COMPANY_TAG"
                ? "ACCOUNT"
                : promotion.target_type === "STORE_CODE"
                  ? "STORE"
                  : "ALL";
          const targetScopeValue =
            targetScopeType === "STORE"
              ? String(
                  Number(storeTarget?.target_packs || 0) > 0
                    ? rep.store_code
                    : promotion.target_value,
                ).trim()
              : targetScopeType === "ACCOUNT"
                ? String(promotion.target_value || "")
                    .trim()
                    .toLowerCase()
                : "ALL";
          const workedDays =
            targetScopeType === "STORE"
              ? userGroup.workDaysByStoreMonth.get(
                  `${targetScopeValue}:${monthKey}`,
                ) || 0
              : targetScopeType === "ACCOUNT"
                ? userGroup.workDaysByAccountMonth.get(
                    `${targetScopeValue}:${monthKey}`,
                  ) || 0
                : userGroup.workDaysByMonth.get(monthKey) || 0;
          const dayShare = Math.min(workedDays / 30, 1);
          const proratedTargetQty = monthlyTargetBaseQty * dayShare;
          if (proratedTargetQty <= 0) return;
          userGroup.monthlyCampaignDates.add(dateKey);
          const proratedRules = prorateCommissionRules(rules, dayShare);
          const performanceKey = `${promotion.id}:${monthKey}:${targetScopeType}:${targetScopeValue}`;
          const currentPerformance = userGroup.monthlyPromotionPerformance.get(
            performanceKey,
          ) || {
            promotionId: String(promotion.id),
            monthKey,
            targetScopeType,
            targetScopeValue,
            creditedSales: 0,
            targetQty: proratedTargetQty,
            rules: proratedRules,
          };
          currentPerformance.creditedSales += creditedSales;
          userGroup.monthlyPromotionPerformance.set(
            performanceKey,
            currentPerformance,
          );
        } else {
          const commissionResult = calculatePromotionCommission(
            creditedSales,
            targetQty,
            rules,
          );
          const currentPromotionCommission =
            userGroup.promotionCommissionByDate.get(dateKey) || 0;
          userGroup.promotionCommissionByDate.set(
            dateKey,
            currentPromotionCommission + commissionResult.incentiveAmount,
          );
        }
      }
    });

    // คำนวณคอมมิชชั่นและรวมค่าแรงสุทธิ
    const summaryList = await Promise.all(
      Array.from(userSummaryMap.values()).map(async (item) => {
        const dailyCommissionResults = await Promise.all(
          (
            Array.from(item.dailySalesByDate.entries()) as [string, number][]
          ).map(async ([dateKey, dailyPacks]: [string, number]) => {
            const configuredPayout =
              item.promotionCommissionByDate.get(dateKey);
            const hasMonthlyCampaign = item.monthlyCampaignDates.has(dateKey);
            return configuredPayout !== undefined
              ? {
                  incentiveAmount: configuredPayout,
                  tierStatus: "คำนวณตามกติกาแคมเปญ",
                }
              : hasMonthlyCampaign
                ? { incentiveAmount: 0, tierStatus: "" }
                : calculateBigCCommission(dailyPacks);
          }),
        );
        const monthlyCommissionResults = Array.from(
          item.monthlyPromotionPerformance.values(),
        ).map((performance: any) =>
          calculatePromotionCommission(
            performance.creditedSales,
            performance.targetQty,
            performance.rules,
          ),
        );
        const totalCommission = [
          ...dailyCommissionResults,
          ...monthlyCommissionResults,
        ].reduce((sum, result) => sum + result.incentiveAmount, 0);

        return {
          userId: item.userId,
          empId: item.empId,
          displayName: item.displayName,
          storeCode: item.storeCode,
          storeName: item.storeName,
          account:
            item.account ||
            storeAccountLookup.get(String(item.storeCode || "").trim()) ||
            "",
          workDaysCount: item.workDaysCount,
          baseSalaryRate: item.baseSalaryRate,
          totalDailyWage: item.totalDailyWage,
          totalSets: item.allSkuSalesQty,
          totalPacks: item.allSkuSalesQty,
          totalCommission,
          tierStatus: [...dailyCommissionResults, ...monthlyCommissionResults]
            .filter((result) => result.tierStatus)
            .map((result) => result.tierStatus)
            .join(" / "),
          totalNetSalary: item.totalDailyWage + totalCommission,
        };
      }),
    );

    return { success: true, data: summaryList };
  } catch (error: any) {
    console.error("Get admin salary summary report error:", error);
    return { success: false, data: [], message: error.message };
  }
}

export async function getAdminUserSkuSalesReportAction(params?: {
  startDate?: string;
  endDate?: string;
}) {
  try {
    const supabase = await getAdminClientInstance();
    const reportTables = ["pg_daily_activity_reports", "pg_daily_reports"];
    let reports: any[] = [];
    let lastError: any = null;

    for (const tableName of reportTables) {
      let query = supabase
        .from(tableName)
        .select("*, pg_daily_report_products (*)");
      if (params?.startDate) query = query.gte("report_date", params.startDate);
      if (params?.endDate) query = query.lte("report_date", params.endDate);

      const result = await query;
      if (!result.error) {
        reports = result.data || [];
        lastError = null;
        break;
      }
      lastError = result.error;
    }

    if (lastError) throw lastError;

    const [userProfilesResult, profilesResult, storesResult, productsResult] =
      await Promise.all([
        supabase
          .from("user_profiles")
          .select("id, display_name, username, employee_id"),
        supabase
          .from("profiles")
          .select("id, display_name, username, employee_id"),
        supabase.from("pg_stores").select("store_code, store_name"),
        supabase.from("products").select("*").order("id", { ascending: true }),
      ]);

    const userLookup = new Map<string, any>();
    for (const profile of [
      ...(profilesResult.data || []),
      ...(userProfilesResult.data || []),
    ]) {
      if (profile?.id != null) userLookup.set(String(profile.id), profile);
    }

    const storeLookup = new Map<string, string>();
    for (const store of storesResult.data || []) {
      if (store?.store_code != null) {
        storeLookup.set(
          String(store.store_code).trim(),
          store.store_name || "",
        );
      }
    }

    let productCatalog = productsResult.data || [];
    if (productsResult.error || productCatalog.length === 0) {
      const fallbackProducts = await supabase
        .from("pg_products")
        .select("*")
        .order("id", { ascending: true });
      productCatalog = fallbackProducts.data || [];
    }

    const productLookup = new Map<
      string,
      { key: string; barcode: string; skuCode: string; name: string }
    >();
    for (const product of productCatalog) {
      const barcode = String(product?.barcode ?? "").trim();
      if (!barcode) continue;
      const skuCode = String(product.sku_code ?? "").trim();
      productLookup.set(barcode, {
        key: skuCode || barcode,
        barcode,
        skuCode,
        name:
          product.descriptions || product.short_name || product.name || barcode,
      });
    }

    const users = new Map<string, any>();
    const usedProductBarcodes = new Set<string>();
    const addSale = (
      user: any,
      barcodeValue: unknown,
      quantityValue: unknown,
      priceValue: unknown,
      productName?: string,
      skuCodeValue?: unknown,
    ) => {
      const barcode = String(barcodeValue ?? "").trim();
      const quantity = Number(quantityValue ?? 0);
      const price = Number(priceValue ?? 0);
      if (!barcode || !Number.isFinite(quantity)) return;

      if (!productLookup.has(barcode)) {
        productLookup.set(barcode, {
          key: String(skuCodeValue ?? "").trim() || barcode,
          barcode,
          skuCode: String(skuCodeValue ?? "").trim(),
          name: productName || barcode,
        });
      } else {
        const existing = productLookup.get(barcode)!;
        productLookup.set(barcode, {
          ...existing,
          skuCode: existing.skuCode || String(skuCodeValue ?? "").trim(),
          key: existing.skuCode || String(skuCodeValue ?? "").trim() || barcode,
          name:
            existing.name === barcode && productName
              ? productName
              : existing.name,
        });
      }

      usedProductBarcodes.add(barcode);
      const productKey = productLookup.get(barcode)!.key;
      const current = user.salesBySku[productKey] || {
        quantity: 0,
        amount: 0,
      };
      current.quantity += quantity;
      current.amount += Number.isFinite(price) ? quantity * price : 0;
      user.salesBySku[productKey] = current;
      user.totalSalesQty += quantity;
      user.totalSalesAmount += Number.isFinite(price) ? quantity * price : 0;
    };

    const legacySkuFields = [
      {
        barcode: "8858678423339",
        quantity: "sales_qty_green90",
        price: "price_our_green90",
        name: "มายด์ลักซูรี่ สีเขียว 90",
      },
      {
        barcode: "8858678423681",
        quantity: "sales_qty_blue90",
        price: "price_our_blue90",
        name: "มายด์ลักซูรี่ สีฟ้า 90",
      },
      {
        barcode: "8858678422875",
        quantity: "sales_qty_orange100",
        price: "price_our_orange100",
        name: "มายด์ลักซูรี่ สีส้ม 100",
      },
    ];

    for (const report of reports) {
      const userId = String(report.user_id ?? report.userId ?? "").trim();
      const key = userId || `unknown-${report.id}`;
      const profile = userLookup.get(userId);
      if (!users.has(key)) {
        users.set(key, {
          userId,
          empId: profile?.employee_id || profile?.username || userId,
          displayName:
            report.user_name ||
            profile?.display_name ||
            profile?.username ||
            (userId ? `PG-${userId}` : "ไม่ระบุพนักงาน"),
          stores: new Set<string>(),
          salesBySku: {},
          totalSalesQty: 0,
          totalSalesAmount: 0,
        });
      }

      const user = users.get(key)!;
      const storeCode = String(report.store_code ?? "").trim();
      const storeName =
        report.store_name || storeLookup.get(storeCode) || storeCode;
      if (storeName) user.stores.add(storeName);

      const productRows = Array.isArray(report.pg_daily_report_products)
        ? report.pg_daily_report_products
        : Array.isArray(report.products)
          ? report.products
          : [];

      if (productRows.length > 0) {
        for (const product of productRows) {
          if (
            String(product.item_scope || "OUR").toUpperCase() === "COMPETITOR"
          ) {
            continue;
          }
          addSale(
            user,
            product.barcode,
            product.sales_qty ?? product.salesQty,
            product.price_our ?? product.priceOur,
            product.descriptions || product.name,
            product.sku_code,
          );
        }
      } else {
        for (const product of legacySkuFields) {
          addSale(
            user,
            product.barcode,
            report[product.quantity],
            report[product.price],
            product.name,
          );
        }
      }
    }

    const products = Array.from(usedProductBarcodes)
      .map((barcode) => productLookup.get(barcode)!)
      .sort((a, b) => a.key.localeCompare(b.key, "th"));
    const data = Array.from(users.values())
      .map((user) => ({
        ...user,
        storeName: Array.from(user.stores).join(", "),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "th"));

    return { success: true, data, products };
  } catch (error: any) {
    console.error("Get admin user SKU sales report error:", error);
    return { success: false, data: [], products: [], message: error.message };
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
  const supabase = await getAdminClientInstance();
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
  try {
    const supabase = await getAdminClientInstance();
    const competitorPrices = normalizeCompetitorPrices(
      payload.competitorPrices,
    );
    const BUCKET_NAME = "pg-attendance-photos";

    const finalPhotos: any[] = [];
    const uploadProductImage = async (
      image: unknown,
      barcode: string,
      field: string,
    ) => {
      if (typeof image !== "string" || !image.startsWith("data:image/")) {
        return typeof image === "string" ? image : "";
      }

      const [metadata, encodedImage] = image.split(",", 2);
      const extension =
        metadata.match(/^data:image\/([a-zA-Z0-9.+-]+);base64$/)?.[1] || "jpeg";
      const buffer = Buffer.from(encodedImage || "", "base64");
      const safeBarcode = barcode.replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `admin_${payload.storeCode}_${safeBarcode}_${field}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = `reports/${fileName}`;
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: `image/${extension}`,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      return data.publicUrl;
    };

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
      competitor_prices: competitorPrices,
      ...competitorPrices,
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

    let reportId = payload.reportId ? Number(payload.reportId) : null;
    if (payload.reportId) {
      const { data, error } = await supabase
        .from("pg_daily_activity_reports")
        .update(dbData)
        .eq("id", reportId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("ไม่พบรายงาน หรือไม่มีสิทธิ์แก้ไขข้อมูลนี้");
    } else {
      const { data, error } = await supabase
        .from("pg_daily_activity_reports")
        .insert([dbData])
        .select("id")
        .single();
      if (error) throw error;
      reportId = data.id;
    }

    if (reportId && Array.isArray(payload.products)) {
      const productRows = await Promise.all(
        payload.products
          .filter((product: any) => product?.barcode)
          .map(async (product: any) => {
            const barcode = String(product.barcode);
            const [imgProduct, imgShelf, imgStockScanner] = await Promise.all([
              uploadProductImage(
                product.imgProduct ??
                  product.img_product ??
                  product.img_product_base64,
                barcode,
                "product",
              ),
              uploadProductImage(
                product.imgShelf ??
                  product.img_shelf ??
                  product.img_shelf_base64,
                barcode,
                "shelf",
              ),
              uploadProductImage(
                product.imgStockScanner ??
                  product.img_stock_scanner ??
                  product.img_stock_scanner_base64,
                barcode,
                "scanner",
              ),
            ]);

            return {
              ...(product.id ? { id: Number(product.id) } : {}),
              report_id: reportId,
              barcode,
              descriptions: product.descriptions || "",
              item_scope: product.item_scope || "OUR",
              price_our: Number(product.priceOur ?? product.price_our ?? 0),
              stock_before: Number(
                product.stockBefore ?? product.stock_before ?? 0,
              ),
              sales_qty: Number(product.salesQty ?? product.sales_qty ?? 0),
              stock_after: Number(
                product.stockAfter ?? product.stock_after ?? 0,
              ),
              img_product: imgProduct,
              img_shelf: imgShelf,
              img_stock_scanner: imgStockScanner,
            };
          }),
      );

      for (const product of productRows) {
        const productId = product.id;
        const productData = { ...product };
        delete productData.id;

        const { error } = productId
          ? await supabase
              .from("pg_daily_report_products")
              .update(productData)
              .eq("id", productId)
              .eq("report_id", reportId)
          : await supabase
              .from("pg_daily_report_products")
              .insert([{ ...productData, report_id: reportId }]);

        if (error) throw error;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Admin save report error:", error);
    return { success: false, message: error.message };
  }
}

// 14. 📌 ดึงรายชื่อสาขาที่ User ได้รับมอบหมายตามรอบจัดเชียร์ขายใน pg_user_store_schedules
export async function getAssignedStoresByUserAction(userId: number) {
  await requireUserOrAdminSession(userId);
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
  try {
    const supabase = await getCustomerPortalClientInstance();
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
            item_scope,
            credit_factor,
            promotion_target_qty,
            competitor_price,
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
      supabase.from("pg_stores").select("store_code, store_name, account"),
      supabase.from("store_targets").select("*"),
      supabase
        .from("promotions")
        .select(
          "id, campaign_title, target_type, target_value, start_date, end_date, is_active, items:promotion_items(item_scope, target_qty, price)",
        ),
    ];

    const [storesRes, targetsRes, promotionsRes] =
      await Promise.all(storeQueries);
    const promotionList = (promotionsRes.data || []) as any[];
    const summarizePromotion = (promo: any) => {
      const ourItems = (promo?.items || []).filter(
        (item: any) => item.item_scope !== "COMPETITOR",
      );
      return {
        packs: ourItems.reduce(
          (sum: number, item: any) => sum + Number(item.target_qty || 0),
          0,
        ),
        revenue: ourItems.reduce(
          (sum: number, item: any) =>
            sum + Number(item.target_qty || 0) * (Number(item.price) || 0),
          0,
        ),
        name: String(promo?.campaign_title || ""),
      };
    };
    const normalizeKey = (value: unknown) =>
      String(value ?? "")
        .trim()
        .toLowerCase();
    const targetLookup = new Map<string, number>();
    const targetRevenueLookup = new Map<string, number>();
    const targetPromotionLookup = new Map<string, string>();
    for (const target of (targetsRes.data || []) as any[]) {
      if (!target?.store_code) continue;
      const code = String(target.store_code).trim();
      targetLookup.set(code, getStoreTargetPacks(target));
      const productRevenue = Array.from({ length: 10 }, (_, i) => {
        return (
          Number(target[`target${i + 1}`] || 0) *
          Number(target[`price${i + 1}`] || 0)
        );
      }).reduce((sum, value) => sum + value, 0);
      targetRevenueLookup.set(
        code,
        productRevenue > 0
          ? productRevenue
          : Number(target.target_revenue || 0),
      );
      if (target.promotion_name) {
        targetPromotionLookup.set(code, String(target.promotion_name));
      }
    }

    for (const item of storesRes.data || []) {
      if (!item?.store_code) continue;
      const key = String(item.store_code).trim();
      const existing = storeLookup.get(key);
      storeLookup.set(key, {
        ...existing,
        store_code: item.store_code,
        store_name: item.store_name || existing?.store_name || "",
        account: item.account || existing?.account || "",
      });
    }

    for (const item of targetsRes.data || []) {
      if (!item?.store_code) continue;
      const key = String(item.store_code).trim();
      if (!storeLookup.has(key)) {
        storeLookup.set(key, { store_code: item.store_code, store_name: "" });
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
      const resolvedStoreAccount =
        row.account ??
        row.store_account ??
        attendanceMatch?.account ??
        storeLookup.get(String(resolvedStoreCode).trim())?.account ??
        "";

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

      const storedCompetitorPrices =
        row.competitor_prices && typeof row.competitor_prices === "object"
          ? row.competitor_prices
          : row.competitorPrices && typeof row.competitorPrices === "object"
            ? row.competitorPrices
            : {};
      const competitorPrices = normalizeCompetitorPrices({
        ...row,
        ...storedCompetitorPrices,
      });
      if (!competitorPrices.cellox_satin_4) {
        competitorPrices.cellox_satin_4 =
          Number(row.price_comp_cellox ?? row.compCellox) || 0;
      }
      if (!competitorPrices.kleenex_silky_4) {
        competitorPrices.kleenex_silky_4 =
          Number(row.price_comp_kleenex ?? row.compKleenex) || 0;
      }
      if (!competitorPrices.scott_safesoft_4) {
        competitorPrices.scott_safesoft_4 =
          Number(row.price_comp_paseo ?? row.compPaseo) || 0;
      }

      const reportDay = String(row.report_date ?? row.reportDate ?? "").slice(
        0,
        10,
      );
      const storeTargetKey = String(resolvedStoreCode).trim();
      const hasStoreTarget =
        (targetLookup.get(storeTargetKey) ?? 0) > 0 ||
        (targetRevenueLookup.get(storeTargetKey) ?? 0) > 0;
      const matchedPromotion =
        promotionList.find(
          (promo) =>
            row.promotion_id != null &&
            String(promo.id) === String(row.promotion_id),
        ) ||
        promotionList.find((promo) => {
          if (!promo.is_active) return false;
          if (
            promo.start_date &&
            reportDay < String(promo.start_date).slice(0, 10)
          )
            return false;
          if (promo.end_date && reportDay > String(promo.end_date).slice(0, 10))
            return false;
          if (promo.target_type === "ALL") return true;
          if (promo.target_type === "STORE_CODE") {
            return String(promo.target_value) === storeTargetKey;
          }
          return (
            promo.target_type === "COMPANY_TAG" &&
            normalizeKey(promo.target_value) ===
              normalizeKey(resolvedStoreAccount)
          );
        });
      const promotionTarget = matchedPromotion
        ? summarizePromotion(matchedPromotion)
        : null;

      return {
        ...row,
        id: row.id,
        userId,
        userName: resolvedUserName,
        storeCode: resolvedStoreCode,
        storeName: resolvedStoreName,
        account: resolvedStoreAccount,
        reportDate: row.report_date ?? row.reportDate ?? "",
        traffic: Number(row.traffic_count ?? row.traffic ?? 0),
        approach: Number(row.approach_count ?? row.approach ?? 0),
        closedSales: Number(row.closed_sales_count ?? row.closedSales ?? 0),
        competitorPrices,
        compCellox: competitorPrices.cellox_satin_4,
        compKleenex: competitorPrices.kleenex_silky_4,
        compPaseo: competitorPrices.scott_safesoft_4,
        targetPacks: Number(
          (hasStoreTarget ? targetLookup.get(storeTargetKey) : undefined) ??
            promotionTarget?.packs ??
            row.target_packs ??
            row.target ??
            0,
        ),
        feedback: row.feedback_store ?? row.feedback ?? "",
        targetRevenue: hasStoreTarget
          ? (targetRevenueLookup.get(storeTargetKey) ?? 0)
          : (promotionTarget?.revenue ?? 0),
        targetPromotionName:
          targetPromotionLookup.get(storeTargetKey) ||
          promotionTarget?.name ||
          "",
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
