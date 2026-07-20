"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// 🎯 อัปเดตอินเทอร์เฟซให้รองรับฟิลด์แคมเปญและของแถมจากหน้า Frontend
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
  activityPhotos: ActivityPhotoPayload[];
  products: ProductReportPayload[];

  // ฟิลด์พิเศษสำหรับแคมเปญหลักประจำสาขา
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

  // ฟิลด์สำหรับบันทึกและตัดสต๊อกของแถมเครือ Tops
  giftOrangeBefore?: number;
  giftOrangeGiven?: number;
  giftOrangeAfter?: number;
  giftNourishBefore?: number;
  giftNourishGiven?: number;
  giftNourishAfter?: number;
}

// ฟังก์ชันภายใน: แปลง Base64 และอัปโหลดไฟล์รูปขึ้น Storage Bucket
async function uploadBase64File(
  base64Data: string,
  userId: number,
  prefix: string,
  supabaseClient = supabase,
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

    if (error) throw error;

    const { data } = supabaseClient.storage
      .from("pg-attendance-photos")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error("Upload base64 photo error:", error);
    return null;
  }
}

// 1. ค้นหาบาร์โค้ดสินค้าในตารางหลัก
export async function getProductByBarcode(barcode: string) {
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

// 3. บันทึกข้อมูลรายงานกิจกรรมฉบับเต็มลงระบบหลังบ้าน
export async function submitFullDailyActivityReportAction(
  payload: FullActivityReportInput,
) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn(
      "⚠️ [Warning] ไม่พบ SUPABASE_SERVICE_ROLE_KEY ในระบบ สลับไปใช้ Anon Key แทนชั่วคราว",
    );
  }

  const supabaseClient = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    : supabase;

  try {
    // สเต็ปที่ 1: อัปโหลดรูปภาพรวมกิจกรรมทั้ง 6 ใบเข้า Storage
    const uploadedActivityPhotos = [];
    for (const photo of payload.activityPhotos) {
      if (photo.base64) {
        const url = await uploadBase64File(
          photo.base64,
          payload.userId,
          `act_${photo.type}`,
          supabaseClient,
        );
        if (url) {
          uploadedActivityPhotos.push({
            type: photo.type,
            label: photo.label,
            url: url,
          });
        }
      }
    }

    // สเต็ปที่ 2: บันทึกข้อมูลรายงานภาพรวมลงตารางหลัก pg_daily_activity_reports
    // 🔥 เพิ่มการแมตช์คอลัมน์ฝั่งฐานข้อมูลเข้ากับข้อมูลแคมเปญหลักและสต๊อกของแถมที่ส่งมาจาก Frontend
    const { data: report, error: reportError } = await supabaseClient
      .from("pg_daily_activity_reports")
      .insert({
        attendance_log_id: payload.attendanceLogId,
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
        activity_photos: uploadedActivityPhotos,
        report_date: new Date().toISOString().split("T")[0],

        // 🟢 ข้อมูลบันทึกแคมเปญสินค้าแยกสี
        price_our_green90: payload.priceOurGreen90 || 0,
        stock_before_green90: payload.stockBeforeGreen90 || 0,
        sales_qty_green90: payload.salesQtyGreen90 || 0,
        stock_after_green90: payload.stockAfterGreen90 || 0,

        price_our_blue90: payload.priceOurBlue90 || 0,
        stock_before_blue90: payload.stockBeforeBlue90 || 0,
        sales_qty_blue90: payload.salesQtyBlue90 || 0,
        stock_after_blue90: payload.stockAfterBlue90 || 0,

        price_our_orange100: payload.priceOurOrange100 || 0,
        stock_before_orange100: payload.stockBeforeOrange100 || 0,
        sales_qty_orange100: payload.salesQtyOrange100 || 0,
        stock_after_orange100: payload.stockAfterOrange100 || 0,

        // 🟠 ข้อมูลคลังและยอดแจกของแถมเฉพาะสาขาเครือ Tops
        gift_orange_before: payload.giftOrangeBefore || 0,
        gift_orange_given: payload.giftOrangeGiven || 0,
        gift_orange_after: payload.giftOrangeAfter || 0,
        gift_nourish_before: payload.giftNourishBefore || 0,
        gift_nourish_given: payload.giftNourishGiven || 0,
        gift_nourish_after: payload.giftNourishAfter || 0,
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // สเต็ปที่ 3: จัดการอัปโหลดรูปภาพรายตัวสินค้า 3 ใบ แล้วอัปเดตลงตารางย่อย pg_daily_report_products
    for (const prod of payload.products) {
      const imgProductUrl = prod.img_product_base64
        ? await uploadBase64File(
            prod.img_product_base64,
            payload.userId,
            `prod_${prod.barcode}_item`,
            supabaseClient,
          )
        : null;

      const imgShelfUrl = prod.img_shelf_base64
        ? await uploadBase64File(
            prod.img_shelf_base64,
            payload.userId,
            `prod_${prod.barcode}_shelf`,
            supabaseClient,
          )
        : null;

      const imgScannerUrl = prod.img_stock_scanner_base64
        ? await uploadBase64File(
            prod.img_stock_scanner_base64,
            payload.userId,
            `prod_${prod.barcode}_scanner`,
            supabaseClient,
          )
        : null;

      const { error: prodInsertError } = await supabaseClient
        .from("pg_daily_report_products")
        .insert({
          report_id: report.id,
          barcode: prod.barcode,
          descriptions: prod.descriptions,
          price_our: prod.price_our,
          stock_before: prod.stock_before,
          sales_qty: prod.sales_qty,
          stock_after: prod.stock_after,
          img_product: imgProductUrl,
          img_shelf: imgShelfUrl,
          img_stock_scanner: imgScannerUrl,
        });

      if (prodInsertError) throw prodInsertError;
    }

    return { success: true, reportId: report.id };
  } catch (error: any) {
    console.error("Submit full report error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการนำส่งข้อมูลกิจกรรม",
    };
  }
}
