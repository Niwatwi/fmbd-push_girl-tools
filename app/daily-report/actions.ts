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
  img_product_base64: string;
  img_shelf_base64: string;
  img_stock_scanner_base64: string;
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
  products: ProductReportPayload[];

  priceOurGreen90?: number;
  stockBeforeGreen90?: number;
  salesQtyGreen90?: number;
  stockAfterGreen90?: number;
  priceOurBlue90?: number;
  stockBeforeBlue90?: number;
  salesQtyBlue90?: number;
  stockAfterBlue90?: number;
  priceOurOrange100?: number;
  stockBeforeOrange100?: number;
  salesQtyOrange100?: number;
  stockAfterOrange100?: number;

  giftOrangeBefore?: number;
  giftOrangeGiven?: number;
  giftOrangeAfter?: number;
  giftNourishBefore?: number;
  giftNourishGiven?: number;
  giftNourishAfter?: number;
}

// 📸 ฟังก์ชันภายใน: แปลง Base64 และอัปโหลดไฟล์รูปขึ้น Storage Bucket (pg-attendance-photos)
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
    const fileName = `${userId}_${prefix}_${Date.now()}.jpg`;

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

// 3. 🎁 ดึงยอดยกมาของแถมเริ่มต้นของสาขา (Auto Carryover จากรายงานล่าสุด)
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
      // คำนวณคงเหลือจริงจาก (before - given) ป้องกันค่าคงเหลือใน DB ผิดพลาด
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

    // กรณีสาขาใหม่ที่ยังไม่มีรายงานย้อนหลัง ให้ใช้ค่าเริ่มต้นมาตรฐาน Tops (480 และ 60)
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

// 📝 4. บันทึกรายงานกิจกรรมพร้อมอัปโหลดรูปภาพและคำนวณยอดคงเหลือของแถม (after) ถูกต้อง
export async function submitFullDailyActivityReportAction(
  payload: FullActivityReportInput,
) {
  const supabase = getClientInstance();
  try {
    const userId = payload.userId;

    // 1. กำหนดวันที่รายงานตามเวลาประเทศไทย (Asia/Bangkok YYYY-MM-DD)
    const now = new Date();
    const reportDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    // 2. คำนวณยอดคงเหลือของแถมจริงป้องกันข้อมูลใน DB คลาดเคลื่อน
    const giftOrangeBefore = Number(payload.giftOrangeBefore || 0);
    const giftOrangeGiven = Number(payload.giftOrangeGiven || 0);
    const giftOrangeAfter = Math.max(0, giftOrangeBefore - giftOrangeGiven);

    const giftNourishBefore = Number(payload.giftNourishBefore || 0);
    const giftNourishGiven = Number(payload.giftNourishGiven || 0);
    const giftNourishAfter = Math.max(0, giftNourishBefore - giftNourishGiven);

    // 3. อัปโหลดรูปภาพกิจกรรม (Activity Photos) ขึ้น Storage
    const processedActivityPhotos: Array<{
      type: string;
      label: string;
      url: string;
    }> = [];
    if (Array.isArray(payload.activityPhotos)) {
      for (let i = 0; i < payload.activityPhotos.length; i++) {
        const photo = payload.activityPhotos[i];
        if (photo.base64 && photo.base64.startsWith("data:")) {
          const url = await uploadBase64File(
            photo.base64,
            userId,
            `act_${photo.type || i}`,
            supabase,
          );
          if (url) {
            processedActivityPhotos.push({
              type: photo.type,
              label: photo.label,
              url: url,
            });
          }
        }
      }
    }

    // 4. เตรียม Record บันทึกลงตารางหลัก pg_daily_activity_reports
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
      activity_photos: JSON.stringify(processedActivityPhotos),

      price_our_green90: Number(payload.priceOurGreen90 || 0),
      stock_before_green90: Number(payload.stockBeforeGreen90 || 0),
      sales_qty_green90: Number(payload.salesQtyGreen90 || 0),
      stock_after_green90: Number(payload.stockAfterGreen90 || 0),

      price_our_blue90: Number(payload.priceOurBlue90 || 0),
      stock_before_blue90: Number(payload.stockBeforeBlue90 || 0),
      sales_qty_blue90: Number(payload.salesQtyBlue90 || 0),
      stock_after_blue90: Number(payload.stockAfterBlue90 || 0),

      price_our_orange100: Number(payload.priceOurOrange100 || 0),
      stock_before_orange100: Number(payload.stockBeforeOrange100 || 0),
      sales_qty_orange100: Number(payload.salesQtyOrange100 || 0),
      stock_after_orange100: Number(payload.stockAfterOrange100 || 0),

      // บันทึกยอดของแถมที่คำนวณการตัดยอดถูกต้องแล้ว
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

    // 5. อัปโหลดรูปภาพผลิตภัณฑ์รายบาร์โค้ด & บันทึกลงตาราง pg_daily_report_products
    if (
      Array.isArray(payload.products) &&
      payload.products.length > 0 &&
      reportData?.id
    ) {
      const productRecords = [];
      for (let idx = 0; idx < payload.products.length; idx++) {
        const prod = payload.products[idx];

        let imgProductUrl = "";
        let imgShelfUrl = "";
        let imgStockScannerUrl = "";

        if (prod.img_product_base64) {
          imgProductUrl =
            (await uploadBase64File(
              prod.img_product_base64,
              userId,
              `prod_${prod.barcode}_item`,
              supabase,
            )) || "";
        }

        if (prod.img_shelf_base64) {
          imgShelfUrl =
            (await uploadBase64File(
              prod.img_shelf_base64,
              userId,
              `prod_${prod.barcode}_shelf`,
              supabase,
            )) || "";
        }

        if (prod.img_stock_scanner_base64) {
          imgStockScannerUrl =
            (await uploadBase64File(
              prod.img_stock_scanner_base64,
              userId,
              `prod_${prod.barcode}_scan`,
              supabase,
            )) || "";
        }

        productRecords.push({
          report_id: reportData.id,
          barcode: prod.barcode,
          descriptions: prod.descriptions,
          price_our: Number(prod.price_our || 0),
          stock_before: Number(prod.stock_before || 0),
          sales_qty: Number(prod.sales_qty || 0),
          stock_after: Number(prod.stock_after || 0),
          img_product: imgProductUrl,
          img_shelf: imgShelfUrl,
          img_stock_scanner: imgStockScannerUrl,
        });
      }

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

// 📌 ฟังก์ชันสำหรับ Admin: บันทึกใหม่หรือแก้ไขรายงานย้อนหลัง
export async function adminUpsertDailyReportAction(
  payload: FullActivityReportInput & { reportId?: number; reportDateInput?: string }
) {
  const supabase = getClientInstance();
  try {
    const userId = payload.userId;

    // 1. กำหนดวันที่รายงาน (หากระบุวันย้อนหลังให้ใช้วันที่ส่งมา ถ้าไม่ระบุใช้ วันปัจจุบัน)
    const reportDate = payload.reportDateInput || new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // 2. คำนวณยอดยกไปของแถม (After) ให้ถูกต้อง
    const giftOrangeBefore = Number(payload.giftOrangeBefore || 0);
    const giftOrangeGiven = Number(payload.giftOrangeGiven || 0);
    const giftOrangeAfter = Math.max(0, giftOrangeBefore - giftOrangeGiven);

    const giftNourishBefore = Number(payload.giftNourishBefore || 0);
    const giftNourishGiven = Number(payload.giftNourishGiven || 0);
    const giftNourishAfter = Math.max(0, giftNourishBefore - giftNourishGiven);

    // 3. เตรียมข้อมูลสำหรับ บันทึก / แก้ไข
    const recordToUpsert: any = {
      attendance_log_id: payload.attendanceLogId || null,
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
      competitor_promotion: payload.competitorPromotion || "",
      remark: payload.remark || "",

      price_our_green90: Number(payload.priceOurGreen90 || 0),
      stock_before_green90: Number(payload.stockBeforeGreen90 || 0),
      sales_qty_green90: Number(payload.salesQtyGreen90 || 0),
      stock_after_green90: Number(payload.stockAfterGreen90 || 0),

      price_our_blue90: Number(payload.priceOurBlue90 || 0),
      stock_before_blue90: Number(payload.stockBeforeBlue90 || 0),
      sales_qty_blue90: Number(payload.salesQtyBlue90 || 0),
      stock_after_blue90: Number(payload.stockAfterBlue90 || 0),

      price_our_orange100: Number(payload.priceOurOrange100 || 0),
      stock_before_orange100: Number(payload.stockBeforeOrange100 || 0),
      sales_qty_orange100: Number(payload.salesQtyOrange100 || 0),
      stock_after_orange100: Number(payload.stockAfterOrange100 || 0),

      gift_orange_before: giftOrangeBefore,
      gift_orange_given: giftOrangeGiven,
      gift_orange_after: giftOrangeAfter,
      gift_nourish_before: giftNourishBefore,
      gift_nourish_given: giftNourishGiven,
      gift_nourish_after: giftNourishAfter,
    };

    let resultData;

    // กรณีแก้ไข (Update) ข้อมูลเดิมที่มี id อยู่แล้ว
    if (payload.reportId) {
      const { data, error } = await supabase
        .from("pg_daily_activity_reports")
        .update(recordToUpsert)
        .eq("id", payload.reportId)
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    } else {
      // กรณีคีย์ย้อนหลังใหม่ (Insert)
      const { data, error } = await supabase
        .from("pg_daily_activity_reports")
        .insert([recordToUpsert])
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    }

    return { success: true, data: resultData };
  } catch (error: any) {
    console.error("adminUpsertDailyReportAction error:", error);
    return { success: false, message: error.message };
  }
}
