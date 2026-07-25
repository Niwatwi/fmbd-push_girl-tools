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

      // BigC: เขียว x2 + ฟ้า x2
      // Tops: เขียว x1 (แถม FOC) + ฟ้า x1 (แถม FOC) + ส้ม x2 (แถมสินค้าปกติหน้าร้าน)
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

// 6. ดึงโปรไฟล์พนักงาน + สถานที่ Check-in + ยอดขายจริงวันนี้
export async function getUserDashboardDataAction(userId: number) {
  const supabase = getClientInstance();
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, employee_id, area, company_tag")
      .eq("id", userId)
      .maybeSingle();

    const now = new Date();
    const ictDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const [month, day, year] = ictDate.split("/");

    const { data: attendance } = await supabase
      .from("pg_attendance_logs")
      .select("store_code, store_name")
      .eq("user_id", userId)
      .gte("check_in_at", `${year}-${month}-${day}T00:00:00+07:00`)
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

    const { data: todayReport } = await supabase
      .from("pg_daily_activity_reports")
      .select(
        `
        sales_qty_green90,
        sales_qty_blue90,
        sales_qty_orange100,
        price_our_green90,
        price_our_blue90,
        price_our_orange100,
        gift_orange_given,
        gift_nourish_given
      `,
      )
      .eq("user_id", userId)
      .gte("report_date", `${year}-${month}-${day}`)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

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

// 8. คำนวณ Commission ประจำสัปดาห์
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

  // คำนวณจำนวนแพ็คที่ออกจากสต๊อกจริง
  const totalPacksSold = isBigC
    ? (Number(greenSets) + Number(blueSets)) * 2
    : Number(greenSets) + Number(blueSets) + Number(orangeSets) * 2;

  const target80Sets = 45 * workingDays;
  const target100Sets = 60 * workingDays;

  const baseSalary = workingDays * 700;
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

// 9. 📸 ดึงรายงานกิจกรรมฉบับเต็ม + คำนวณตัดสต๊อกตามเงื่อนไข Tops (ส้ม 100 ตัด x2 หน้าร้าน)
export async function getCustomerFullActivityReport() {
  const supabase = getClientInstance();
  try {
    const { data: stores } = await supabase.from("pg_stores").select("*");
    const { data: targets } = await supabase.from("store_targets").select("*");

    const { data: userProfiles, error: userError } = await supabase
      .from("user_profiles")
      .select("id, display_name, employee_id, username");

    if (userError) {
      console.error(
        "Fetch user_profiles for Customer Portal error:",
        userError,
      );
    }

    const { data: reports, error } = await supabase
      .from("pg_daily_activity_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const reportIds = (reports || []).map((r) => r.id);
    let productItems: any[] = [];
    if (reportIds.length > 0) {
      const { data: prodData } = await supabase
        .from("pg_daily_report_products")
        .select(
          "report_id, barcode, descriptions, img_product, img_shelf, img_stock_scanner",
        )
        .in("report_id", reportIds);
      productItems = prodData || [];
    }

    const formattedData = (reports || []).map((r) => {
      const storeCodeStr = String(r.store_code || "").trim();

      const masterStore = (stores || []).find(
        (s) => String(s.store_code).trim() === storeCodeStr,
      );
      const targetObj = (targets || []).find(
        (t) => String(t.store_code).trim() === storeCodeStr,
      );

      const userObj = (userProfiles || []).find(
        (p) => Number(p.id) === Number(r.user_id),
      );

      const finalStoreName =
        masterStore?.store_name ||
        targetObj?.store_name ||
        `สาขา ${storeCodeStr}`;

      const isBigC = checkIsBigC(storeCodeStr, finalStoreName);

      let parsedActivityPhotos: any[] = [];
      if (r.activity_photos) {
        if (typeof r.activity_photos === "string") {
          try {
            parsedActivityPhotos = JSON.parse(r.activity_photos);
          } catch (e) {
            parsedActivityPhotos = [];
          }
        } else if (Array.isArray(r.activity_photos)) {
          parsedActivityPhotos = r.activity_photos;
        }
      }

      const matchingProdItems = productItems.filter(
        (p) => p.report_id === r.id,
      );
      const productPhotos: any[] = [];

      matchingProdItems.forEach((pItem) => {
        const itemDesc = pItem.descriptions || pItem.barcode || "สินค้า";
        if (pItem.img_product) {
          productPhotos.push({
            url: pItem.img_product,
            type: "img_product",
            label: `รูปสินค้า: ${itemDesc}`,
          });
        }
        if (pItem.img_shelf) {
          productPhotos.push({
            url: pItem.img_shelf,
            type: "img_shelf",
            label: `รูปเชลฟ์: ${itemDesc}`,
          });
        }
        if (pItem.img_stock_scanner) {
          productPhotos.push({
            url: pItem.img_stock_scanner,
            type: "img_stock_scanner",
            label: `รูปสแกนสต๊อก: ${itemDesc}`,
          });
        }
      });

      const allPhotos = [...parsedActivityPhotos, ...productPhotos];

      const greenPacks = Number(r.sales_qty_green90 || 0);
      const bluePacks = Number(r.sales_qty_blue90 || 0);
      const orangePacks = Number(r.sales_qty_orange100 || 0);

      const stockBeforeGreenVal = Number(r.stock_before_green90 || 0);
      const stockBeforeBlueVal = Number(r.stock_before_blue90 || 0);
      const stockBeforeOrangeVal = Number(r.stock_before_orange100 || 0);

      // สต๊อก FOC เริ่มต้นของ Tops
      const INITIAL_FOC_ORANGE_100 = 480;
      const INITIAL_FOC_GREEN_40 = 60;

      const giftOrangeGiven = Number(r.gift_orange_given || 0);
      const giftNourishGiven = Number(r.gift_nourish_given || 0);

      let stockAfterGreen = 0;
      let stockAfterBlue = 0;
      let stockAfterOrange = 0;
      let totalActualPacks = 0;

      let giftOrangeBefore = 0;
      let giftOrangeAfter = 0;

      let giftNourishBefore = 0;
      let giftNourishAfter = 0;

      if (isBigC) {
        // 🟢 BigC: ซื้อ 1 แถม 1 หน้าร้าน (เขียว, ฟ้า ตัด x2)
        const physicalGreen = greenPacks * 2;
        const physicalBlue = bluePacks * 2;

        stockAfterGreen =
          stockBeforeGreenVal > 0
            ? Math.max(0, stockBeforeGreenVal - physicalGreen)
            : Number(r.stock_after_green90 || 0);

        stockAfterBlue =
          stockBeforeBlueVal > 0
            ? Math.max(0, stockBeforeBlueVal - physicalBlue)
            : Number(r.stock_after_blue90 || 0);

        stockAfterOrange = 0;
        totalActualPacks = physicalGreen + physicalBlue;
      } else {
        // 🔴 Tops:
        // - เขียว 90 & ฟ้า 90 แถม FOC -> ตัดสต๊อกเชลฟ์ 1:1
        // - ส้ม 100 แถมสินค้าขายปกติสีส้ม 100 -> ตัดสต๊อกเชลฟ์ 1:2 (orangePacks * 2)
        const physicalOrange = orangePacks * 2;

        stockAfterGreen =
          stockBeforeGreenVal > 0
            ? Math.max(0, stockBeforeGreenVal - greenPacks)
            : Number(r.stock_after_green90 || 0);

        stockAfterBlue =
          stockBeforeBlueVal > 0
            ? Math.max(0, stockBeforeBlueVal - bluePacks)
            : Number(r.stock_after_blue90 || 0);

        stockAfterOrange =
          stockBeforeOrangeVal > 0
            ? Math.max(0, stockBeforeOrangeVal - physicalOrange)
            : Number(r.stock_after_orange100 || 0);

        totalActualPacks = greenPacks + bluePacks + physicalOrange;

        // ของแถม FOC
        giftOrangeBefore = Number(
          r.gift_orange_before || INITIAL_FOC_ORANGE_100,
        );
        giftOrangeAfter = Math.max(0, giftOrangeBefore - giftOrangeGiven);

        giftNourishBefore = Number(
          r.gift_nourish_before || INITIAL_FOC_GREEN_40,
        );
        giftNourishAfter = Math.max(0, giftNourishBefore - giftNourishGiven);
      }

      const traffic = Number(r.traffic_count || 0);
      const approach = Number(r.approach_count || 0);
      const closed = Number(r.closed_sales_count || 0);

      const approachRate =
        traffic > 0 ? Math.round((approach / traffic) * 100) : 0;
      const closingRate =
        approach > 0 ? Math.round((closed / approach) * 100) : 0;

      return {
        id: r.id,
        userId: r.user_id,
        userName:
          userObj?.display_name || userObj?.username || `PG-${r.user_id}`,
        userEmpId:
          userObj?.employee_id || userObj?.username || `PG-${r.user_id}`,
        storeCode: storeCodeStr,
        storeName: finalStoreName,
        reportDate: r.report_date,
        targetPacks: Number(targetObj?.target_packs || 0),

        traffic,
        approach,
        closedSales: closed,
        approachRate,
        closingRate,

        priceGreen: Number(r.price_our_green90 || 150),
        priceBlue: Number(r.price_our_blue90 || 142),
        priceOrange: Number(r.price_our_orange100 || 100),

        compCellox: Number(r.price_comp_cellox || 0),
        compKleenex: Number(r.price_comp_kleenex || 0),
        compPaseo: Number(r.price_comp_paseo || 0),

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

        feedback: r.feedback_store || "",
        competitorPromo: r.competitor_promotion || "",
        activityPhotos: allPhotos,
      };
    });

    return { success: true, data: formattedData };
  } catch (error: any) {
    console.error("Get customer full report error:", error);
    return { success: false, data: [], message: error.message };
  }
}

// 🇹🇭 Helper Function: คำนวณค่าแรงรายวันตามจำนวนชั่วโมงทำงานจริง
function calculateDailyWage(hours: number, baseRate: number = 700): number {
  if (hours >= 9) {
    return baseRate; // 9 ชม. ขึ้นไป = 700 บาท
  } else if (hours >= 1) {
    return baseRate / 2; // 1 ชม. ถึง 8.9 ชม. = 350 บาท
  } else {
    return 0; // น้อยกว่า 1 ชม. = 0 บาท
  }
}

// 10. 📅 ดึงรายงาน Time Attendance & Expense (ปรับปรุงการคิดค่าแรงตามชั่วโมงทำงาน)
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

      // 🎯 คำนวณค่าแรงรายวันตามเกณฑ์ชั่วโมงทำงานจริง
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

// 11. 💰 สรุปรายได้เงินเดือนพนักงาน PG
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

    let attendanceQuery = supabase
      .from("pg_attendance_logs")
      .select("user_id, check_in_at, store_code, store_name");

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
        storeName: "-",
        storeCode: "-",
        baseSalaryRate: user.base_salary ? Number(user.base_salary) : 700,
        workDaysCount: 0,
        dailyReportsList: [],
      });
    });

    (attendanceLogs || []).forEach((log: any) => {
      const uId = Number(log.user_id);
      if (userSummaryMap.has(uId)) {
        const item = userSummaryMap.get(uId);
        item.workDaysCount += 1;
        if (log.store_name && item.storeName === "-")
          item.storeName = log.store_name;
        if (log.store_code && item.storeCode === "-")
          item.storeCode = log.store_code;
      }
    });

    reportList.forEach((report: any) => {
      const uId = Number(report.user_id);
      if (userSummaryMap.has(uId)) {
        const item = userSummaryMap.get(uId);
        if (report.store_name && item.storeName === "-")
          item.storeName = report.store_name;
        if (report.store_code && item.storeCode === "-")
          item.storeCode = report.store_code;

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
        const totalDailyWage = item.workDaysCount * item.baseSalaryRate;

        const sortedReports = item.dailyReportsList.sort(
          (a: any, b: any) =>
            new Date(a.created_at || a.report_date).getTime() -
            new Date(b.created_at || b.report_date).getTime(),
        );

        let totalGreenPacks = 0;
        let totalBluePacks = 0;
        let totalOrangePacks = 0;
        let totalPacks = 0;
        let totalSets = 0;
        let totalCommission = 0;

        const cycleChunkSize = 3;
        for (let i = 0; i < sortedReports.length; i += cycleChunkSize) {
          const chunk = sortedReports.slice(i, i + cycleChunkSize);

          let cycleGreenPacks = 0;
          let cycleBluePacks = 0;
          let cycleOrangePacks = 0;

          chunk.forEach((rep: any) => {
            const prods = rep.products || [];
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
                cycleGreenPacks += qty;
              } else if (
                bc === "8858678423339" ||
                desc.includes("nourish") ||
                desc.includes("ฟ้า") ||
                desc.includes("blue")
              ) {
                cycleBluePacks += qty;
              } else {
                cycleOrangePacks += qty;
              }
            });
          });

          const isBigC = checkIsBigC(item.storeCode, item.storeName);

          const cycleGSets = cycleGreenPacks;
          const cycleBSets = cycleBluePacks;
          const cycleOSets = isBigC ? 0 : cycleOrangePacks;

          const cycleSetsTotal = cycleGSets + cycleBSets + cycleOSets;

          let cycleComm = 0;
          try {
            const commRes = await calculateBigCCommission(
              cycleGSets,
              cycleBSets,
              cycleOSets,
              chunk.length,
              item.storeCode || item.storeName || item.empId,
            );
            cycleComm = commRes?.incentiveAmount ?? 0;
          } catch {
            cycleComm = 0;
          }

          totalGreenPacks += cycleGreenPacks;
          totalBluePacks += cycleBluePacks;
          totalOrangePacks += cycleOrangePacks;

          totalPacks += isBigC
            ? (cycleGreenPacks + cycleBluePacks) * 2
            : cycleGreenPacks + cycleBluePacks + cycleOrangePacks * 2;

          totalSets += cycleSetsTotal;
          totalCommission += cycleComm;
        }

        return {
          userId: item.userId,
          empId: item.empId,
          displayName: item.displayName,
          storeName: item.storeName,
          storeCode: item.storeCode,
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
