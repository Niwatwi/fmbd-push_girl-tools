"use server";

import { createClient } from "@supabase/supabase-js";
import { normalizeCompetitorPrices } from "@/utils/competitor-prices";
import { getUserSession, requireUserOrAdminSession } from "@/utils/auth";

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
  item_scope?: "OUR" | "COMPETITOR";
  credit_factor?: number;
  promotion_target_qty?: number;
  competitor_price?: number;
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
  sku_code: string | null;
  descriptions: string;
  barcode: string;
  imageurl: string | null;
  img_front: string | null;
  brand: string | null;
  segment: string | null;
  company?: string | null;
  company_type?: string | null;
}

export interface FullActivityReportInput {
  attendanceLogId: number;
  userId: number;
  storeCode: string;
  promotionId?: number | string;
  promotionCommissionRules?: Record<string, unknown> | null;
  trafficCount: number;
  approachCount: number;
  closedSalesCount: number;
  priceCompCellox: number;
  priceCompKleenex: number;
  priceCompPaseo: number;
  competitorPrices?: Record<string, number | string>;
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
  promotionGiftGiven?: Record<string, number>;
}

// 📸 อัปโหลดรูปภาพขึ้น Storage Bucket
async function uploadBase64File(
  base64Data: string,
  userId: number,
  prefix: string,
  supabaseClient: any,
): Promise<string | null> {
  if (!base64Data) return null;
  if (base64Data.startsWith("https://")) return base64Data;
  if (!base64Data.startsWith("data:image/")) return null;
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

export async function uploadDailyReportPhotoAction(input: {
  userId: number;
  base64: string;
  prefix: string;
}) {
  await requireUserOrAdminSession(input.userId);

  if (!input.base64.startsWith("data:image/")) {
    return { success: false, message: "ไฟล์รูปภาพไม่ถูกต้อง" };
  }

  const encodedImage = input.base64.split(",", 2)[1] || "";
  if (Buffer.byteLength(encodedImage, "base64") > 3 * 1024 * 1024) {
    return {
      success: false,
      message: "รูปภาพมีขนาดใหญ่เกินไป กรุณาเลือกรูปใหม่",
    };
  }

  const safePrefix = input.prefix.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const url = await uploadBase64File(
    input.base64,
    input.userId,
    safePrefix,
    getClientInstance(),
  );

  return url
    ? { success: true, url }
    : { success: false, message: "อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองอีกครั้ง" };
}

// 1. ค้นหาบาร์โค้ดสินค้าในตารางหลัก
export async function getProductByBarcode(barcode: string) {
  const supabase = getClientInstance();
  const cleanBarcode = barcode.toString().trim();
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, code, sku_code, descriptions, barcode, imageurl, img_front, brand, segment, company, company_type",
      )
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
export async function getTodayActiveAttendance() {
  const session = await getUserSession();
  if (!session) {
    return {
      success: false,
      user: null,
      log: null,
      message: "กรุณาเข้าสู่ระบบ",
    };
  }

  const userId = session.id;
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

    const { data: todayLogs, error } = await supabase
      .from("pg_attendance_logs")
      .select("id, store_code, store_name, check_out_at")
      .eq("user_id", userId)
      .gte("check_in_at", startOfToday)
      .lte("check_in_at", endOfToday)
      .order("check_in_at", { ascending: false });

    if (error) throw error;

    // ใช้ร้านที่ยังไม่ Check-out ก่อน ไม่มีจึงใช้ร้านล่าสุด
    const data =
      (todayLogs || []).find((item) => !item.check_out_at) ||
      todayLogs?.[0] ||
      null;

    const [profileResult, storeResult] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("display_name, company_tag")
        .eq("id", userId)
        .maybeSingle(),
      data?.store_code
        ? supabase
            .from("pg_stores")
            .select("account")
            .eq("store_code", data.store_code)
            .order("id", { ascending: true })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      success: true,
      user: {
        id: userId,
        display_name: profileResult.data?.display_name || session.display_name,
      },
      log: data
        ? {
            ...data,
            staff_group: profileResult.data?.company_tag || "",
            store_company_tag: storeResult.data?.account || "",
          }
        : data,
    };
  } catch (error: any) {
    return {
      success: false,
      user: { id: userId, display_name: session.display_name },
      log: null,
      message: error.message,
    };
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

export async function getPromotionGiftInventoryAction(
  promotionId: number | string,
  storeCode: string,
  userId: number,
) {
  await requireUserOrAdminSession(userId);
  const supabase = getClientInstance();
  const [receiptsResult, reportsResult] = await Promise.all([
    supabase
      .from("promotion_gift_receipts")
      .select("id, gift_key, received_date, quantity")
      .eq("promotion_id", String(promotionId))
      .eq("store_code", storeCode)
      .order("received_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("pg_daily_activity_reports")
      .select("promotion_gift_given")
      .eq("promotion_id", String(promotionId))
      .eq("store_code", storeCode),
  ]);

  if (receiptsResult.error) throw new Error(receiptsResult.error.message);
  if (reportsResult.error) throw new Error(reportsResult.error.message);

  const totals: Record<string, { received: number; given: number }> = {};
  for (const receipt of receiptsResult.data || []) {
    const entry = (totals[receipt.gift_key] ||= { received: 0, given: 0 });
    entry.received += Number(receipt.quantity || 0);
  }
  for (const report of reportsResult.data || []) {
    const given = report.promotion_gift_given || {};
    for (const [giftKey, quantity] of Object.entries(given)) {
      const entry = (totals[giftKey] ||= { received: 0, given: 0 });
      entry.given += Number(quantity || 0);
    }
  }

  return {
    success: true,
    totals: Object.fromEntries(
      Object.entries(totals).map(([giftKey, value]) => [
        giftKey,
        {
          ...value,
          remaining: Math.max(0, value.received - value.given),
        },
      ]),
    ),
    receipts: receiptsResult.data || [],
  };
}

export async function receivePromotionGiftStockAction(input: {
  promotionId: number | string;
  giftKey: string;
  storeCode: string;
  receivedDate: string;
  quantity: number;
  userId: number;
}) {
  await requireUserOrAdminSession(input.userId);
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      success: false,
      message: "จำนวนรับเข้าต้องเป็นจำนวนเต็มมากกว่า 0",
    };
  }

  const supabase = getClientInstance();
  const { data: promotion, error: promotionError } = await supabase
    .from("promotions")
    .select("track_gift_inventory, gift_items")
    .eq("id", String(input.promotionId))
    .maybeSingle();
  if (promotionError || !promotion?.track_gift_inventory) {
    return { success: false, message: "ไม่พบแคมเปญที่เปิดติดตามสต๊อกของแถม" };
  }
  if (
    !(promotion.gift_items || []).some(
      (gift: any) => gift.key === input.giftKey,
    )
  ) {
    return { success: false, message: "ไม่พบรายการของแถมในแคมเปญนี้" };
  }

  const { error } = await supabase.from("promotion_gift_receipts").insert({
    promotion_id: input.promotionId,
    gift_key: input.giftKey,
    store_code: input.storeCode,
    received_date: input.receivedDate,
    quantity,
    created_by: input.userId,
  });
  if (error) return { success: false, message: error.message };
  return { success: true };
}

// 📝 4. บันทึกรายงานกิจกรรมประจำวัน (แยกคอลัมน์รูปภาพกิจกรรม)
export async function submitFullDailyActivityReportAction(
  payload: FullActivityReportInput,
) {
  await requireUserOrAdminSession(payload.userId);
  const supabase = getClientInstance();
  try {
    const userId = payload.userId;

    if (payload.promotionId) {
      const { data: campaign, error: campaignError } = await supabase
        .from("promotions")
        .select("*, items:promotion_items(*, products(barcode))")
        .eq("id", String(payload.promotionId))
        .eq("is_active", true)
        .maybeSingle();
      if (campaignError || !campaign) {
        throw new Error("ไม่พบแคมเปญหรือแคมเปญถูกปิดใช้งานแล้ว");
      }

      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      if (
        (campaign.start_date && String(campaign.start_date) > today) ||
        (campaign.end_date && String(campaign.end_date) < today)
      ) {
        throw new Error("แคมเปญนี้อยู่นอกช่วงวันที่ใช้งาน");
      }

      const { data: storeResult } = await supabase
        .from("pg_stores")
        .select("account")
        .eq("store_code", payload.storeCode)
        .maybeSingle();

      const storeCompanyTag = String(storeResult?.account || "");
      const targetMatches =
        campaign.target_type === "ALL" ||
        (campaign.target_type === "STORE_CODE" &&
          String(campaign.target_value) === String(payload.storeCode)) ||
        (campaign.target_type === "COMPANY_TAG" &&
          String(campaign.target_value).trim().toLowerCase() ===
            storeCompanyTag.trim().toLowerCase());
      if (!targetMatches) {
        throw new Error("แคมเปญนี้ไม่ได้กำหนดให้กับ Account/สาขานี้");
      }

      const allowedBarcodes = new Set<string>(
        (campaign.items || [])
          .map((item: any) =>
            String(item.products?.barcode || item.barcode || "").trim(),
          )
          .filter(Boolean),
      );
      const invalidProduct = (payload.products || []).some(
        (product) => !allowedBarcodes.has(String(product.barcode).trim()),
      );
      if (invalidProduct) {
        throw new Error("พบสินค้าที่ไม่ได้ถูกกำหนดไว้ในแคมเปญนี้");
      }
    }

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
    const promotionGiftGiven = Object.fromEntries(
      Object.entries(payload.promotionGiftGiven || {})
        .map(([giftKey, quantity]) => [
          giftKey,
          Math.max(0, Math.floor(Number(quantity) || 0)),
        ])
        .filter(([, quantity]) => Number(quantity) > 0),
    );
    const competitorPrices = normalizeCompetitorPrices(
      payload.competitorPrices,
    );

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
        if (
          photo.base64 &&
          (photo.base64.startsWith("data:") ||
            photo.base64.startsWith("https://"))
        ) {
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
      promotion_id: payload.promotionId ? String(payload.promotionId) : null,
      promotion_commission_rules: payload.promotionCommissionRules || null,
      report_date: reportDate,
      traffic_count: Number(payload.trafficCount || 0),
      approach_count: Number(payload.approachCount || 0),
      closed_sales_count: Number(payload.closedSalesCount || 0),
      price_comp_cellox: Number(payload.priceCompCellox || 0),
      price_comp_kleenex: Number(payload.priceCompKleenex || 0),
      price_comp_paseo: Number(payload.priceCompPaseo || 0),
      competitor_prices: competitorPrices,
      ...competitorPrices,
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
      ...(Object.keys(promotionGiftGiven).length > 0
        ? { promotion_gift_given: promotionGiftGiven }
        : {}),
    };

    const { data: reportData, error: reportError } = await supabase
      .from("pg_daily_activity_reports")
      .upsert([recordToInsert], {
        onConflict: "user_id,store_code,report_date",
      })
      .select()
      .single();

    if (reportError) {
      if (
        Object.keys(promotionGiftGiven).length > 0 &&
        /promotion_gift_given/i.test(reportError.message || "")
      ) {
        throw new Error(
          "ยังบันทึกยอดแจกของแถมไม่ได้ กรุณารัน migration 202610200001_promotion_gift_inventory.sql ใน Supabase",
        );
      }
      throw reportError;
    }

    const { error: deleteProductsError } = await supabase
      .from("pg_daily_report_products")
      .delete()
      .eq("report_id", reportData.id);

    if (deleteProductsError) throw deleteProductsError;

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
          item_scope: prod.item_scope || "OUR",
          credit_factor: Number(prod.credit_factor ?? 1),
          promotion_target_qty: Number(prod.promotion_target_qty || 0),
          competitor_price: Number(prod.competitor_price || 0),
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
    return {
      success: false,
      message:
        error?.message ||
        error?.details ||
        "เกิดข้อผิดพลาดระหว่างบันทึกรายงาน กรุณาตรวจสอบข้อมูลแล้วลองใหม่",
    };
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
