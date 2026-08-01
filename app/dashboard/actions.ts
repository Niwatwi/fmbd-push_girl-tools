"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseDefault = createClient(supabaseUrl, supabaseAnonKey);

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

// 4. บันทึกหรืออัปเดตข้อมูลเป้าหมายสาขาแบบแยกราย SKU
export async function saveStoreTargetAction(payload: {
  store_code: string;
  store_name: string;
  target_green90: number;
  target_blue90: number;
  target_orange100: number;
  price_green90?: number;
  price_blue90?: number;
  price_orange100?: number;
}) {
  const supabase = getClientInstance();
  try {
    const green = Number(payload.target_green90 || 0);
    const blue = Number(payload.target_blue90 || 0);
    const orange = Number(payload.target_orange100 || 0);

    const priceGreen = Number(payload.price_green90 || 150);
    const priceBlue = Number(payload.price_blue90 || 142);
    const priceOrange = Number(payload.price_orange100 || 100);

    const isBigC = checkIsBigC(payload.store_code, payload.store_name);

    const targetSetsCounted = isBigC ? green + blue : green + blue + orange;
    const totalPacks = targetSetsCounted * 2;

    const totalRevenue =
      green * priceGreen + blue * priceBlue + orange * priceOrange;

    const { data, error } = await supabase
      .from("store_targets")
      .upsert(
        {
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

// 5. ดึงรายชื่อร้านค้าเปิดใช้งานทั้งหมดจากตาราง pg_stores
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

// 6. 🏆 ดึงโปรไฟล์พนักงาน + สถานที่ Check-in + ยอดขายจริงวันนี้ + ยอดสะสมประจำเดือน
export async function getUserDashboardDataAction(userIdInput: number | string) {
  const supabase = getClientInstance();
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
      monthlyReports.forEach((r) => {
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
  const supabase = getClientInstance();
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

// 9. 📸 ดึงรายงานกิจกรรมฉบับเต็มสำหรับ Customer Portal
export async function getCustomerFullActivityReport() {
  const supabase = getClientInstance();
  try {
    const { data: rawReports, error: reportError } = await supabase
      .from("pg_daily_activity_reports")
      .select("*")
      .order("report_date", { ascending: false });

    if (reportError) throw reportError;

    const { data: userProfiles } = await supabase
      .from("user_profiles")
      .select("id, display_name, employee_id, username, base_salary");

    const userMap = new Map<number, any>();
    (userProfiles || []).forEach((u: any) => userMap.set(Number(u.id), u));

    const { data: attendanceLogs } = await supabase
      .from("pg_attendance_logs")
      .select(
        "id, user_id, check_in_at, check_out_at, store_code, check_in_image_url, check_in_photo, check_out_image_url, check_out_photo",
      );

    const attendancePhotoByIdMap = new Map<number, any[]>();
    const attendancePhotoByStoreDateMap = new Map<string, any[]>();
    const attendancePhotoByUserDateMap = new Map<string, any[]>();

    const attendanceWages = (attendanceLogs || []).map((log: any) => {
      const dateStr = getIctDateStr(log.check_in_at);
      const rawStoreCode = (log.store_code || "").trim();
      const cleanStoreCode = rawStoreCode.toLowerCase().replace(/\s+/g, "");

      const attPhotos: any[] = [];
      const checkInImg = log.check_in_image_url || log.check_in_photo;
      if (
        checkInImg &&
        typeof checkInImg === "string" &&
        checkInImg.trim() !== ""
      ) {
        attPhotos.push({
          url: checkInImg.trim(),
          type: "staff_holding",
          label: "รูป Check-in เข้างาน",
        });
      }

      const checkOutImg = log.check_out_image_url || log.check_out_photo;
      if (
        checkOutImg &&
        typeof checkOutImg === "string" &&
        checkOutImg.trim() !== ""
      ) {
        attPhotos.push({
          url: checkOutImg.trim(),
          type: "atmosphere",
          label: "รูป Check-out เลิกงาน",
        });
      }

      if (attPhotos.length > 0) {
        attendancePhotoByIdMap.set(Number(log.id), attPhotos);
        const storeDateKey = `${log.user_id}_${cleanStoreCode}_${dateStr}`;
        if (!attendancePhotoByStoreDateMap.has(storeDateKey)) {
          attendancePhotoByStoreDateMap.set(storeDateKey, []);
        }
        attendancePhotoByStoreDateMap.get(storeDateKey)?.push(...attPhotos);

        const userDateKey = `${log.user_id}_${dateStr}`;
        if (!attendancePhotoByUserDateMap.has(userDateKey)) {
          attendancePhotoByUserDateMap.set(userDateKey, []);
        }
        attendancePhotoByUserDateMap.get(userDateKey)?.push(...attPhotos);
      }

      const userObj = userMap.get(Number(log.user_id));
      const baseRate = userObj?.base_salary ? Number(userObj.base_salary) : 700;

      let workedHours = 0;
      if (log.check_in_at && log.check_out_at) {
        const checkIn = new Date(log.check_in_at).getTime();
        const checkOut = new Date(log.check_out_at).getTime();
        workedHours = Number(
          ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(1),
        );
      }

      const calculatedWage =
        workedHours > 0 ? calculateDailyWage(workedHours, baseRate) : baseRate;

      return {
        id: log.id,
        userId: log.user_id,
        storeCode: rawStoreCode,
        date: dateStr,
        wage: calculatedWage,
        dailyWage: calculatedWage,
        baseSalary: baseRate,
      };
    });

    const { data: storesData } = await supabase
      .from("pg_stores")
      .select("store_code, store_name, company_tag");

    const { data: targetsData } = await supabase
      .from("store_targets")
      .select("store_code, store_name, target_packs");

    const storeTargetMap = new Map<string, number>();
    const storeMasterMap = new Map<string, { name: string; account: string }>();

    (targetsData || []).forEach((t: any) => {
      if (t.store_code) {
        const code = t.store_code.trim();
        storeTargetMap.set(code, Number(t.target_packs || 0));
        const acc = checkIsBigC(t.store_code, t.store_name) ? "Big C" : "Tops";
        storeMasterMap.set(code, { name: t.store_name, account: acc });
      }
    });

    (storesData || []).forEach((s: any) => {
      if (s.store_code) {
        const code = s.store_code.trim();
        const acc =
          s.company_tag ||
          (checkIsBigC(s.store_code, s.store_name) ? "Big C" : "Tops");
        if (!storeMasterMap.has(code)) {
          storeMasterMap.set(code, { name: s.store_name, account: acc });
        }
      }
    });

    const reportIds = (rawReports || []).map((r: any) => r.id);
    const productsMap = new Map<
      number,
      {
        img_product: string[];
        img_shelf: string[];
        img_stock_scanner: string[];
      }
    >();

    if (reportIds.length > 0) {
      const { data: reportProductsData } = await supabase
        .from("pg_daily_report_products")
        .select("report_id, img_product, img_shelf, img_stock_scanner")
        .in("report_id", reportIds);

      (reportProductsData || []).forEach((p: any) => {
        const rId = Number(p.report_id);
        if (!productsMap.has(rId)) {
          productsMap.set(rId, {
            img_product: [],
            img_shelf: [],
            img_stock_scanner: [],
          });
        }
        const item = productsMap.get(rId)!;
        if (
          p.img_product &&
          typeof p.img_product === "string" &&
          p.img_product.trim() !== ""
        ) {
          item.img_product.push(p.img_product.trim());
        }
        if (
          p.img_shelf &&
          typeof p.img_shelf === "string" &&
          p.img_shelf.trim() !== ""
        ) {
          item.img_shelf.push(p.img_shelf.trim());
        }
        if (
          p.img_stock_scanner &&
          typeof p.img_stock_scanner === "string" &&
          p.img_stock_scanner.trim() !== ""
        ) {
          item.img_stock_scanner.push(p.img_stock_scanner.trim());
        }
      });
    }

    const formattedData = (rawReports || []).map((r: any) => {
      const uId = Number(r.user_id);
      const userObj = userMap.get(uId);

      const userName =
        userObj?.display_name || userObj?.username || `PG-${r.user_id}`;
      const userEmpId =
        userObj?.employee_id || userObj?.username || `PG-${r.user_id}`;
      const userBaseSalary = userObj?.base_salary
        ? Number(userObj.base_salary)
        : 700;

      const storeCodeStr = (r.store_code || "").trim();
      const cleanReportStoreCode = storeCodeStr
        .toLowerCase()
        .replace(/\s+/g, "");
      const reportDateStr = r.report_date ? r.report_date.split("T")[0] : "";
      const masterInfo = storeMasterMap.get(storeCodeStr);

      let finalStoreName =
        r.store_name && r.store_name !== storeCodeStr
          ? r.store_name
          : masterInfo?.name || storeCodeStr;
      let accountName =
        masterInfo?.account ||
        (checkIsBigC(storeCodeStr, finalStoreName) ? "Big C" : "Tops");

      const storeTargetPacks = storeTargetMap.get(storeCodeStr);
      const targetPacks =
        storeTargetPacks !== undefined && storeTargetPacks > 0
          ? storeTargetPacks
          : Number(r.target_packs || 120);

      const isBigCStore = checkIsBigC(storeCodeStr, finalStoreName);

      const greenPacks = Number(r.sales_qty_green90 || 0);
      const bluePacks = Number(r.sales_qty_blue90 || 0);
      const orangePacks = Number(r.sales_qty_orange100 || 0);

      const stockBeforeGreenVal = Number(r.stock_before_green90 || 0);
      const stockBeforeBlueVal = Number(r.stock_before_blue90 || 0);
      const stockBeforeOrangeVal = Number(r.stock_before_orange100 || 0);

      let stockAfterGreen = 0;
      let stockAfterBlue = 0;
      let stockAfterOrange = 0;
      let totalActualPacks = 0;

      if (isBigCStore) {
        const physicalGreen = greenPacks * 2;
        const physicalBlue = bluePacks * 2;
        stockAfterGreen =
          r.stock_after_green90 !== null && Number(r.stock_after_green90) > 0
            ? Number(r.stock_after_green90)
            : Math.max(0, stockBeforeGreenVal - physicalGreen);
        stockAfterBlue =
          r.stock_after_blue90 !== null && Number(r.stock_after_blue90) > 0
            ? Number(r.stock_after_blue90)
            : Math.max(0, stockBeforeBlueVal - physicalBlue);
        stockAfterOrange = 0;
        totalActualPacks = physicalGreen + physicalBlue;
      } else {
        const physicalOrange = orangePacks * 2;
        stockAfterGreen =
          r.stock_after_green90 !== null && Number(r.stock_after_green90) > 0
            ? Number(r.stock_after_green90)
            : Math.max(0, stockBeforeGreenVal - greenPacks);
        stockAfterBlue =
          r.stock_after_blue90 !== null && Number(r.stock_after_blue90) > 0
            ? Number(r.stock_after_blue90)
            : Math.max(0, stockBeforeBlueVal - bluePacks);
        stockAfterOrange =
          r.stock_after_orange100 !== null &&
          Number(r.stock_after_orange100) > 0
            ? Number(r.stock_after_orange100)
            : Math.max(0, stockBeforeOrangeVal - physicalOrange);
        totalActualPacks = greenPacks + bluePacks + physicalOrange;
      }

      const compCellox = Number(
        r.comp_cellox_price || r.price_comp_cellox || r.cellox_price || 0,
      );
      const compKleenex = Number(
        r.comp_kleenex_price || r.price_comp_kleenex || r.kleenex_price || 0,
      );
      const compPaseo = Number(
        r.comp_paseo_price || r.price_comp_paseo || r.paseo_price || 0,
      );

      const feedbackText =
        r.feedback_store ||
        r.feedback_notes ||
        r.feedback ||
        r.store_feedback ||
        "";
      const competitorPromoText =
        r.competitor_promotion || r.competitor_promo || r.comp_promo || "";
      const remarkText =
        r.remark ||
        r.remark_store ||
        r.remarkStore ||
        r.remarks ||
        r.note ||
        "";

      const rawActivityPhotos = parsePhotoArray(r.activity_photos);
      const prodData = productsMap.get(Number(r.id)) || {
        img_product: [],
        img_shelf: [],
        img_stock_scanner: [],
      };

      const productPhotos = prodData.img_product.map((url) => ({
        url,
        type: "img_product",
        label: "รูปสินค้า",
      }));
      const shelfPhotos = prodData.img_shelf.map((url) => ({
        url,
        type: "img_shelf",
        label: "รูปเชลฟ์ชั้นวาง",
      }));
      const stockPhotos = prodData.img_stock_scanner.map((url) => ({
        url,
        type: "img_stock_scanner",
        label: "รูปสแกนสต๊อก",
      }));

      let attPhotos: any[] = [];
      if (r.attendance_log_id) {
        attPhotos =
          attendancePhotoByIdMap.get(Number(r.attendance_log_id)) || [];
      }
      if (attPhotos.length === 0) {
        const storeDateKey = `${r.user_id}_${cleanReportStoreCode}_${reportDateStr}`;
        attPhotos = attendancePhotoByStoreDateMap.get(storeDateKey) || [];
      }
      if (attPhotos.length === 0) {
        const userDateKey = `${r.user_id}_${reportDateStr}`;
        attPhotos = attendancePhotoByUserDateMap.get(userDateKey) || [];
      }

      const activityPhotos = [
        ...rawActivityPhotos,
        ...productPhotos,
        ...shelfPhotos,
        ...stockPhotos,
        ...attPhotos,
      ];

      const giftOrangeBefore = Number(r.gift_orange_before || 0);
      const giftOrangeGiven = Number(r.gift_orange_given || 0);
      const giftOrangeAfter = Math.max(0, giftOrangeBefore - giftOrangeGiven);

      const giftNourishBefore = Number(r.gift_nourish_before || 0);
      const giftNourishGiven = Number(r.gift_nourish_given || 0);
      const giftNourishAfter = Math.max(
        0,
        giftNourishBefore - giftNourishGiven,
      );

      return {
        id: r.id,
        userId: r.user_id,
        userName,
        userEmpId,
        dailyWage: userBaseSalary,
        account: accountName,
        storeCode: storeCodeStr,
        storeName: finalStoreName,
        reportDate: r.report_date || "",
        targetPacks,

        traffic: Number(r.traffic_count || 0),
        approach: Number(r.approach_count || 0),
        closedSales: Number(r.closed_sales_count || 0),
        approachRate:
          Number(r.traffic_count || 0) > 0
            ? Math.round(
                (Number(r.approach_count || 0) / Number(r.traffic_count || 1)) *
                  100,
              )
            : 0,
        closingRate:
          Number(r.approach_count || 0) > 0
            ? Math.round(
                (Number(r.closed_sales_count || 0) /
                  Number(r.approach_count || 1)) *
                  100,
              )
            : 0,

        priceGreen: Number(r.price_our_green90 || r.price_green90 || 150),
        priceBlue: Number(r.price_our_blue90 || r.price_blue90 || 142),
        priceOrange: Number(r.price_our_orange100 || r.price_orange100 || 100),

        compCellox,
        compKleenex,
        compPaseo,

        stockBeforeGreen: stockBeforeGreenVal,
        salesGreen: greenPacks,
        stockAfterGreen,

        stockBeforeBlue: stockBeforeBlueVal,
        salesBlue: bluePacks,
        stockAfterBlue,

        stockBeforeOrange: stockBeforeOrangeVal,
        salesOrange: orangePacks,
        stockAfterOrange,

        actualPacksTotal: totalActualPacks,

        giftOrangeBefore,
        giftOrangeGiven,
        giftOrangeAfter,
        giftNourishBefore,
        giftNourishGiven,
        giftNourishAfter,

        feedback: feedbackText,
        competitorPromo: competitorPromoText,
        remark: remarkText,

        activityPhotos,
        productPhotos,
        shelfPhotos,
        stockPhotos,
      };
    });

    return { success: true, data: formattedData, attendanceWages };
  } catch (error: any) {
    console.error("Get customer full report error:", error);
    return {
      success: false,
      data: [],
      attendanceWages: [],
      message: error.message,
    };
  }
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
  const supabase = getClientInstance();
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

      const wageRate = userObj?.base_salary ? Number(userObj.base_salary) : 700;
      const dailyWage = calculateDailyWage(workedHours, wageRate);

      const lat = log.check_in_latitude || log.check_in_lat || null;
      const lon = log.check_in_longitude || log.check_in_lon || null;
      const checkInImg = log.check_in_image_url || log.check_in_photo || null;
      const checkOutImg =
        log.check_out_image_url || log.check_out_photo || null;

      return {
        id: log.id,
        userId: log.user_id,
        empId: empCode,
        displayName: empDisplayName,
        storeCode: log.store_code || "-",
        storeName: log.store_name || log.store_code || "-",
        checkInAt: formatThaiDateTime(log.check_in_at),
        checkOutAt: log.check_out_at
          ? formatThaiDateTime(log.check_out_at)
          : "ยังไม่เลิกงาน",
        checkInDateRaw: log.check_in_at ? log.check_in_at.split("T")[0] : "-",
        workedHours: workedHours > 0 ? workedHours : 0,
        checkInLat: lat,
        checkInLon: lon,
        checkInPhoto: checkInImg,
        checkOutPhoto: checkOutImg,
        dailyWage: dailyWage,
        totalExpense: dailyWage,
      };
    });

    return { success: true, data: formattedLogs };
  } catch (error: any) {
    console.error("Fetch attendance expense report error:", error);
    return { success: false, data: [], message: error.message };
  }
}

// 11. 💰 สรุปรายได้เงินเดือนพนักงาน PG (แก้ไขคำนวณคอมมิชชั่นตามจำนวนวันทำงานรวมของงวด)
export async function getAdminSalarySummaryReportAction(params?: {
  startDate?: string;
  endDate?: string;
  storeCode?: string;
}) {
  const supabase = getClientInstance();
  try {
    const { data: userProfiles, error: userError } = await supabase
      .from("user_profiles")
      .select(
        "id, display_name, employee_id, username, base_salary, company_tag",
      );

    if (userError) {
      console.error("Error fetching user_profiles:", userError);
    }

    const { data: storesData } = await supabase
      .from("pg_stores")
      .select("store_code, store_name");

    const { data: targetsData } = await supabase
      .from("store_targets")
      .select("store_code, store_name");

    const storeNameMap = new Map<string, string>();
    (storesData || []).forEach((s: any) => {
      if (s.store_code && s.store_name)
        storeNameMap.set(s.store_code.trim(), s.store_name.trim());
    });
    (targetsData || []).forEach((t: any) => {
      if (t.store_code && t.store_name)
        storeNameMap.set(t.store_code.trim(), t.store_name.trim());
    });

    let attendanceQuery = supabase
      .from("pg_attendance_logs")
      .select("user_id, check_in_at, check_out_at, store_code, store_name");

    if (params?.startDate && params.startDate.trim() !== "") {
      attendanceQuery = attendanceQuery.gte(
        "check_in_at",
        `${params.startDate}T00:00:00+07:00`,
      );
    }
    if (params?.endDate && params.endDate.trim() !== "") {
      attendanceQuery = attendanceQuery.lte(
        "check_in_at",
        `${params.endDate}T23:59:59+07:00`,
      );
    }

    const { data: attendanceLogs } = await attendanceQuery;

    let dailyReportsQuery = supabase
      .from("pg_daily_activity_reports")
      .select("*")
      .order("created_at", { ascending: true });

    if (params?.startDate && params.startDate.trim() !== "") {
      dailyReportsQuery = dailyReportsQuery.gte(
        "created_at",
        `${params.startDate}T00:00:00+07:00`,
      );
    }
    if (params?.endDate && params.endDate.trim() !== "") {
      dailyReportsQuery = dailyReportsQuery.lte(
        "created_at",
        `${params.endDate}T23:59:59+07:00`,
      );
    }

    const { data: dailyReports } = await dailyReportsQuery;
    const reportList: any[] = dailyReports || [];

    let reportProductsMap = new Map<number, any[]>();
    if (reportList.length > 0) {
      const reportIds = reportList.map((r: any) => r.id);
      const { data: productsData, error: prodErr } = await supabase
        .from("pg_daily_report_products")
        .select("*")
        .in("report_id", reportIds);

      if (prodErr) {
        console.error("Error fetching pg_daily_report_products:", prodErr);
      }

      (productsData || []).forEach((prod: any) => {
        const rId = Number(prod.report_id);
        if (!reportProductsMap.has(rId)) {
          reportProductsMap.set(rId, []);
        }
        reportProductsMap.get(rId)?.push(prod);
      });
    }

    const userSummaryMap = new Map<number, any>();

    (userProfiles || []).forEach((user: any) => {
      const uId = Number(user.id);
      userSummaryMap.set(uId, {
        userId: uId,
        empId: user.employee_id || user.username || `PG-${uId}`,
        displayName: user.display_name || user.username || `PG-${uId}`,
        storeNamesSet: new Set<string>(),
        baseSalaryRate: user.base_salary ? Number(user.base_salary) : 700,
        workDaysCount: 0,
        totalDailyWage: 0,
        dailyReportsList: [],
      });
    });

    (attendanceLogs || []).forEach((log: any) => {
      const uId = Number(log.user_id);
      if (userSummaryMap.has(uId)) {
        const item = userSummaryMap.get(uId);
        item.workDaysCount += 1;

        const sCode = (log.store_code || "").trim();
        const sName = log.store_name || storeNameMap.get(sCode) || sCode;
        if (sName && sName !== "-") {
          item.storeNamesSet.add(sName);
        }

        let workedHours = 0;
        if (log.check_in_at && log.check_out_at) {
          const checkIn = new Date(log.check_in_at).getTime();
          const checkOut = new Date(log.check_out_at).getTime();
          workedHours = Number(
            ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(1),
          );
        }

        const wageForShift = calculateDailyWage(
          workedHours,
          item.baseSalaryRate,
        );
        item.totalDailyWage += wageForShift;
      }
    });

    reportList.forEach((report: any) => {
      const uId = Number(report.user_id);
      if (userSummaryMap.has(uId)) {
        const item = userSummaryMap.get(uId);

        const sCode = (report.store_code || "").trim();
        const sName = report.store_name || storeNameMap.get(sCode) || sCode;
        if (sName && sName !== "-") {
          item.storeNamesSet.add(sName);
        }

        let prods = reportProductsMap.get(Number(report.id)) || [];

        if (prods.length === 0) {
          const g = Number(report.sales_qty_green90 || 0);
          const b = Number(report.sales_qty_blue90 || 0);
          const o = Number(report.sales_qty_orange100 || 0);
          if (g > 0)
            prods.push({
              barcode: "8858678423681",
              descriptions: "Baby Soft Green",
              sales_qty: g,
            });
          if (b > 0)
            prods.push({
              barcode: "8858678423339",
              descriptions: "Nourish Soft Blue",
              sales_qty: b,
            });
          if (o > 0)
            prods.push({
              barcode: "orange100",
              descriptions: "Orange 100",
              sales_qty: o,
            });
        }

        item.dailyReportsList.push({
          ...report,
          products: prods,
        });
      }
    });

    const resultList = await Promise.all(
      Array.from(userSummaryMap.values()).map(async (item: any) => {
        const totalDailyWage = item.totalDailyWage;

        const storeNameDisplay =
          item.storeNamesSet.size > 0
            ? Array.from(item.storeNamesSet).join(" / ")
            : "-";

        let totalGreenPacks = 0;
        let totalBluePacks = 0;
        let totalOrangePacks = 0;

        item.dailyReportsList.forEach((rep: any) => {
          const prods = rep.products || [];
          if (prods.length > 0) {
            prods.forEach((p: any) => {
              const qty = Number(p.sales_qty || 0);
              const bc = String(p.barcode || "").trim();
              const desc = String(p.descriptions || "").toLowerCase();

              if (
                bc === "8858678423681" ||
                desc.includes("baby") ||
                desc.includes("เขียว") ||
                desc.includes("green")
              ) {
                totalGreenPacks += qty;
              } else if (
                bc === "8858678423339" ||
                desc.includes("nourish") ||
                desc.includes("ฟ้า") ||
                desc.includes("blue")
              ) {
                totalBluePacks += qty;
              } else {
                totalOrangePacks += qty;
              }
            });
          } else {
            totalGreenPacks += Number(rep.sales_qty_green90 || 0);
            totalBluePacks += Number(rep.sales_qty_blue90 || 0);
            totalOrangePacks += Number(rep.sales_qty_orange100 || 0);
          }
        });

        const isBigC = checkIsBigC(storeNameDisplay, storeNameDisplay);

        const totalSets = isBigC
          ? totalGreenPacks + totalBluePacks
          : totalGreenPacks + totalBluePacks + totalOrangePacks;

        const totalPacks = isBigC
          ? (totalGreenPacks + totalBluePacks) * 2
          : totalGreenPacks + totalBluePacks + totalOrangePacks * 2;

        // คำนวณวันทำงานจริง (อย่างน้อย 1 วันเพื่อป้องกันการหารด้วย 0)
        const effectiveWorkDays = Math.max(
          item.workDaysCount,
          item.dailyReportsList.length,
          1,
        );

        // คำนวณคอมมิชชั่นตามจำนวนวันทำงานรวมของพนักงานท่านนั้นในงวดนี้
        const commRes = await calculateBigCCommission(
          totalGreenPacks,
          totalBluePacks,
          totalOrangePacks,
          effectiveWorkDays,
          storeNameDisplay || item.empId,
        );

        const totalCommission = commRes?.incentiveAmount ?? 0;

        return {
          userId: item.userId,
          empId: item.empId,
          displayName: item.displayName,
          storeName: storeNameDisplay,
          storeCode: Array.from(item.storeNamesSet).join(", "),
          baseSalaryRate: item.baseSalaryRate,
          workDaysCount: item.workDaysCount,
          totalDailyWage: totalDailyWage,
          totalGreenPacks,
          totalBluePacks,
          totalOrangePacks,
          totalPacks,
          totalSets,
          totalCommission,
          totalNetSalary: totalDailyWage + totalCommission,
        };
      }),
    );

    const filteredResult = resultList.filter(
      (item: any) =>
        item.workDaysCount > 0 || item.totalSets > 0 || item.totalPacks > 0,
    );

    return { success: true, data: filteredResult };
  } catch (error: any) {
    console.error("Fetch salary summary report error:", error);
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
  const supabase = getClientInstance();
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
  const supabase = getClientInstance();
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
