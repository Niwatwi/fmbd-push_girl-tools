"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 🔑 ฟังก์ชันดึง Supabase Client แบบปลอดภัย
function getClientInstance() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(supabaseUrl, serviceKey);
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export interface ActivityPhotoPayload {
  type: string;
  label: string;
  base64: string;
}

export interface ProductReportPayload {
  barcode: string;
  descriptions: string;
  price_our: number;
  stock_before: number;
  sales_qty: number;
  stock_after: number;
  img_product_base64?: string;
  img_shelf_base64?: string;
  img_stock_scanner_base64?: string;
}

export interface DbProductItem {
  id: number;
  code: string;
  descriptions: string;
  barcode: string;
  imageurl: string | null;
  brand: string | null;
  segment: string | null;
}

export interface FullActivityReportInput {
  attendanceLogId: number;
  userId: number;
  storeCode: string;
  trafficCount: number;
  approachCount: number;
  closedSalesCount: number;
  priceCompCellox: number;
  priceCompKleenex: number;
  priceCompPaseo: number;
  feedbackStore: string;
  competitorPromotion: string;
  remark?: string;
  activityPhotos: ActivityPhotoPayload[];
  products: ProductReportPayload[]; // 👈 รายการสินค้าแบบ Dynamic (รองรับทุก SKU)

  giftOrangeBefore?: number;
  giftOrangeGiven?: number;
  giftOrangeAfter?: number;
  giftNourishBefore?: number;
  giftNourishGiven?: number;
  giftNourishAfter?: number;
}

// 📸 อัปโหลดรูปภาพขึ้น Storage Bucket
async function uploadBase64File(
  base64Data: string,
  userId: number,
  prefix: string,
  supabaseClient: any,
): Promise<string | null> {
  if (!base64Data || !base64Data.startsWith("data:")) return null;
  try {
    const buffer = Buffer.from(
      base64Data.replace(/^data:image\/\w+;base64,/, ""),
      "base64",
    );
    const fileName = `${userId}_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

    const { error } = await supabaseClient.storage
      .from("pg-attendance-photos")
      .upload(fileName, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error(`Upload photo [${prefix}] error:`, error.message);
      return null;
    }

    const { data } = supabaseClient.storage
      .from("pg-attendance-photos")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error("Upload base64 photo exception:", error);
    return null;
  }
}

// 1. ค้นหาบาร์โค้ดสินค้าในตารางหลัก
export async function getProductByBarcode(barcode: string) {
  const supabase = getClientInstance();
  const cleanBarcode = barcode.toString().trim();
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, code, descriptions, barcode, imageurl, brand, segment")
      .eq("barcode", cleanBarcode)
      .eq("is_active", true)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, product: data as DbProductItem };
  } catch (error: any) {
    console.error("Query Error:", error);
    return { success: false, product: null, message: error.message };
  }
}

// 2. ดึงสถานะการเช็คอินวันนี้
export async function getTodayActiveAttendance(userId: number) {
  const supabase = getClientInstance();
  try {
    const now = new Date();
    const ictDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const [month, day, year] = ictDate.split("/");
    const startOfToday = `${year}-${month}-${day}T00:00:00+07:00`;
    const endOfToday = `${year}-${month}-${day}T23:59:59+07:00`;

    const { data, error } = await supabase
      .from("pg_attendance_logs")
      .select("id, store_code, store_name")
      .eq("user_id", userId)
      .gte("check_in_at", startOfToday)
      .lte("check_in_at", endOfToday)
      .maybeSingle();

    if (error) throw error;
    return { success: true, log: data };
  } catch (error: any) {
    return { success: false, log: null, message: error.message };
  }
}

// 3. 🎁 ดึงยอดยกมาของแถมเริ่มต้นของสาขา
export async function getStoreInitialGiftsAction(storeCode: string) {
  const supabase = getClientInstance();
  try {
    const { data, error } = await supabase
      .from("pg_daily_activity_reports")
      .select(
        "gift_orange_before, gift_orange_given, gift_nourish_before, gift_nourish_given",
      )
      .eq("store_code", storeCode)
      .order("report_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const orangeRemaining = Math.max(
        0,
        Number(data.gift_orange_before || 0) -
          Number(data.gift_orange_given || 0),
      );
      const nourishRemaining = Math.max(
        0,
        Number(data.gift_nourish_before || 0) -
          Number(data.gift_nourish_given || 0),
      );

      return {
        success: true,
        giftOrangeBefore: orangeRemaining,
        giftNourishBefore: nourishRemaining,
      };
    }

    return {
      success: true,
      giftOrangeBefore: 480,
      giftNourishBefore: 60,
    };
  } catch (error: any) {
    console.error("getStoreInitialGiftsAction error:", error);
    return {
      success: false,
      giftOrangeBefore: 480,
      giftNourishBefore: 60,
      message: error.message,
    };
  }
}

// 📝 4. บันทึกรายงานกิจกรรมประจำวัน (แยกคอลัมน์รูปภาพกิจกรรม)
export async function submitFullDailyActivityReportAction(
  payload: FullActivityReportInput,
) {
  const supabase = getClientInstance();
  try {
    const userId = payload.userId;

    const now = new Date();
    const reportDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const giftOrangeBefore = Number(payload.giftOrangeBefore || 0);
    const giftOrangeGiven = Number(payload.giftOrangeGiven || 0);
    const giftOrangeAfter = Math.max(0, giftOrangeBefore - giftOrangeGiven);

    const giftNourishBefore = Number(payload.giftNourishBefore || 0);
    const giftNourishGiven = Number(payload.giftNourishGiven || 0);
    const giftNourishAfter = Math.max(0, giftNourishBefore - giftNourishGiven);

    // อัปโหลดรูปภาพกิจกรรมแยกตามประเภท
    let photoStaffHolding = "";
    let photoCheerSales = "";
    let photoCustomerBasket1 = "";
    let photoCustomerBasket2 = "";
    let photoAtmosphere1 = "";
    let photoAtmosphere2 = "";

    if (
      Array.isArray(payload.activityPhotos) &&
      payload.activityPhotos.length > 0
    ) {
      const uploadPromises = payload.activityPhotos.map(async (photo) => {
        if (photo.base64 && photo.base64.startsWith("data:")) {
          const url = await uploadBase64File(
            photo.base64,
            userId,
            `act_${photo.type}`,
            supabase,
          );
          return { type: photo.type, url: url || "" };
        }
        return null;
      });

      const results = await Promise.all(uploadPromises);

      for (const res of results) {
        if (!res) continue;
        if (res.type === "staff_holding") photoStaffHolding = res.url;
        else if (res.type === "cheer_sales") photoCheerSales = res.url;
        else if (res.type === "customer_basket_1")
          photoCustomerBasket1 = res.url;
        else if (res.type === "customer_basket_2")
          photoCustomerBasket2 = res.url;
        else if (res.type === "atmosphere_1") photoAtmosphere1 = res.url;
        else if (res.type === "atmosphere_2") photoAtmosphere2 = res.url;
      }
    }

    // บันทึกตารางหลัก pg_daily_activity_reports พร้อมคอลัมน์รูปภาพใหม่
    const recordToInsert = {
      attendance_log_id: payload.attendanceLogId,
      user_id: userId,
      store_code: payload.storeCode,
      report_date: reportDate,
      traffic_count: Number(payload.trafficCount || 0),
      approach_count: Number(payload.approachCount || 0),
      closed_sales_count: Number(payload.closedSalesCount || 0),
      price_comp_cellox: Number(payload.priceCompCellox || 0),
      price_comp_kleenex: Number(payload.priceCompKleenex || 0),
      price_comp_paseo: Number(payload.priceCompPaseo || 0),
      feedback_store: payload.feedbackStore || "",
      remark: payload.remark || "",
      competitor_promotion: payload.competitorPromotion || "",

      // 📌 บันทึกลงคอลัมน์แยกแต่ละประเภท
      photo_staff_holding: photoStaffHolding,
      photo_cheer_sales: photoCheerSales,
      photo_customer_basket_1: photoCustomerBasket1,
      photo_customer_basket_2: photoCustomerBasket2,
      photo_atmosphere_1: photoAtmosphere1,
      photo_atmosphere_2: photoAtmosphere2,

      gift_orange_before: giftOrangeBefore,
      gift_orange_given: giftOrangeGiven,
      gift_orange_after: giftOrangeAfter,
      gift_nourish_before: giftNourishBefore,
      gift_nourish_given: giftNourishGiven,
      gift_nourish_after: giftNourishAfter,
    };

    const { data: reportData, error: reportError } = await supabase
      .from("pg_daily_activity_reports")
      .insert([recordToInsert])
      .select()
      .single();

    if (reportError) throw reportError;

    // บันทึกรายการสินค้าเข้าตาราง pg_daily_report_products (Dynamic)
    if (
      Array.isArray(payload.products) &&
      payload.products.length > 0 &&
      reportData?.id
    ) {
      const productPromises = payload.products.map(async (prod) => {
        const [imgProductUrl, imgShelfUrl, imgStockScannerUrl] =
          await Promise.all([
            prod.img_product_base64
              ? uploadBase64File(
                  prod.img_product_base64,
                  userId,
                  `prod_${prod.barcode}_item`,
                  supabase,
                )
              : Promise.resolve(""),
            prod.img_shelf_base64
              ? uploadBase64File(
                  prod.img_shelf_base64,
                  userId,
                  `prod_${prod.barcode}_shelf`,
                  supabase,
                )
              : Promise.resolve(""),
            prod.img_stock_scanner_base64
              ? uploadBase64File(
                  prod.img_stock_scanner_base64,
                  userId,
                  `prod_${prod.barcode}_scan`,
                  supabase,
                )
              : Promise.resolve(""),
          ]);

        return {
          report_id: reportData.id,
          barcode: prod.barcode,
          descriptions: prod.descriptions,
          price_our: Number(prod.price_our || 0),
          stock_before: Number(prod.stock_before || 0),
          sales_qty: Number(prod.sales_qty || 0),
          stock_after: Number(prod.stock_after || 0),
          img_product: imgProductUrl || "",
          img_shelf: imgShelfUrl || "",
          img_stock_scanner: imgStockScannerUrl || "",
        };
      });

      const productRecords = await Promise.all(productPromises);

      if (productRecords.length > 0) {
        const { error: prodInsertError } = await supabase
          .from("pg_daily_report_products")
          .insert(productRecords);

        if (prodInsertError) {
          console.error(
            "Insert pg_daily_report_products error:",
            prodInsertError.message,
          );
        }
      }
    }

    return { success: true, data: reportData };
  } catch (error: any) {
    console.error("submitFullDailyActivityReportAction error:", error);
    return { success: false, message: error.message };
  }
}

// 📌 5. ดึงข้อมูลรายงานประจำวันพร้อมรายการสินค้าแบบ Dynamic สำหรับแสดงผลตาราง
export async function getDailyReportWithProductsAction(
  startDate?: string,
  endDate?: string,
  storeCode?: string,
) {
  const supabase = getClientInstance();
  try {
    let query = supabase
      .from("pg_daily_activity_reports")
      .select(
        `
        *,
        pg_daily_report_products (*)
      `,
      )
      .order("report_date", { ascending: false });

    if (startDate) query = query.gte("report_date", startDate);
    if (endDate) query = query.lte("report_date", endDate);
    if (storeCode) query = query.eq("store_code", storeCode);

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error("getDailyReportWithProductsAction error:", error);
    return { success: false, data: [], message: error.message };
  }
}
