"use server";

import { createClient } from "@/utils/supabase/server";
import { requireAdminSession, requireUserOrAdminSession } from "@/utils/auth";
import { cookies } from "next/headers";
import { verifyUserSessionToken } from "@/utils/session-token";

// ----------------------------------------------------------------
// Interfaces & Types
// ----------------------------------------------------------------
export interface Product {
  id: number | string;
  code?: string;
  sku_code?: string;
  descriptions: string;
  barcode: string;
  company?: string;
  category?: string;
  company_type?: string;
}

export interface PromotionCommissionTier {
  achievement_percent: number;
  payout: number;
  min_credited_qty?: number;
}

export interface PromotionCommissionRules {
  mode: "TARGET_PERCENT";
  tiers: PromotionCommissionTier[];
  step: {
    start_qty?: number;
    step_qty?: number;
    start_percent?: number;
    step_percent?: number;
    payout: number;
  };
}

export interface PromotionItem {
  id?: number | string;
  product_code: string;
  product_name?: string;
  label?: string; // เพิ่ม label เพื่อรองรับหน้า daily-report
  barcode?: string;
  price: string;
  condition: string;
  item_scope?: "OUR" | "COMPETITOR";
  target_qty?: number | string;
  credit_factor?: number | string;
  products?: {
    descriptions?: string;
    barcode?: string;
    sku_code?: string;
    company?: string;
  };
}

export interface PromotionConfig {
  id: number | string;
  target_type: "COMPANY_TAG" | "STORE_CODE" | "ALL";
  target_value: string;
  campaign_title: string;
  start_date?: string | null;
  end_date?: string | null;
  special_tier_text?: string;
  is_active: boolean;
  staff_group?: "ALL" | "BA" | "PG";
  commission_rules?: PromotionCommissionRules;
  items?: PromotionItem[];
}

export interface SavePromotionPayload {
  id?: number;
  target_type: "COMPANY_TAG" | "STORE_CODE" | "ALL";
  target_value: string;
  campaign_title: string;
  start_date: string | null;
  end_date: string | null;
  special_tier_text?: string;
  is_active: boolean;
  staff_group: "ALL" | "BA" | "PG";
  commission_rules: PromotionCommissionRules;
  items: Array<{
    product_code: string;
    price: string;
    condition: string;
    item_scope: "OUR" | "COMPETITOR";
    target_qty: number;
    credit_factor: number;
  }>;
}

// ----------------------------------------------------------------
// Server Actions
// ----------------------------------------------------------------
export async function getAllPromotionsAction() {
  const supabase = await createClient();

  // ลองดึงแบบเชื่อมตาราง products
  const { data, error } = await supabase
    .from("promotions")
    .select("*, items:promotion_items(*, products(*))")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Error fetching promotions with products join:",
      error.message,
    );

    // ถ้าดึงแบบจอยตารางไม่ผ่าน ให้ดึงแบบปกติสำรองไว้ก่อน
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("promotions")
      .select("*, items:promotion_items(*)")
      .order("created_at", { ascending: false });

    if (fallbackError) {
      return { success: false, message: fallbackError.message, promotions: [] };
    }

    return { success: true, promotions: fallbackData || [] };
  }

  return { success: true, promotions: data || [] };
}

// ดึงโปรโมชันตามรหัสสาขา (storeCode) หรือกลุ่มห้าง (companyTag)
// app/admin/promotions/actions.ts

export async function getPromotionOptionsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("promotions")
    .select(
      "id, campaign_title, target_type, target_value, special_tier_text, is_active, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, message: error.message, promotions: [] };
  }

  return {
    success: true,
    promotions: (data || []).map((promo: any) => ({
      ...promo,
      title: promo.campaign_title || promo.title || "โปรโมชั่น",
      name: promo.campaign_title || promo.title || "โปรโมชั่น",
    })),
  };
}

export async function getPromotionByStoreAction(
  storeCode?: string,
  companyTag?: string,
  staffGroup?: string,
  userId?: number,
) {
  if (userId) await requireUserOrAdminSession(userId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("promotions")
    .select("*, items:promotion_items(*, products(*))")
    .eq("is_active", true);

  if (error || !data) {
    return {
      success: false,
      message: error?.message || "Error fetching promotions",
      promotions: [],
      promotion: null,
    };
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // กรองเฉพาะโปรโมชันที่ตรงกับเงื่อนไขของสาขานั้นๆ
  const filteredPromotions = data.filter((promo) => {
    if (promo.start_date && String(promo.start_date).slice(0, 10) > today) {
      return false;
    }
    if (promo.end_date && String(promo.end_date).slice(0, 10) < today) {
      return false;
    }
    const promoStaffGroup = String(promo.staff_group || "ALL").toUpperCase();
    const currentStaffGroup = String(staffGroup || "").toUpperCase();
    if (promoStaffGroup !== "ALL" && promoStaffGroup !== currentStaffGroup) {
      return false;
    }
    if (promo.target_type === "ALL") return true;
    if (
      promo.target_type === "STORE_CODE" &&
      storeCode &&
      promo.target_value === storeCode
    )
      return true;
    if (
      promo.target_type === "COMPANY_TAG" &&
      companyTag &&
      String(promo.target_value).trim().toLowerCase() ===
        String(companyTag).trim().toLowerCase()
    )
      return true;
    return false;
  });

  return {
    success: true,
    promotions: filteredPromotions,
    promotion: filteredPromotions[0] || null, // เพิ่ม promotion เพื่อให้สอดคล้องกับ daily-report
  };
}

export async function getCurrentUserPromotionBriefAction() {
  const token = (await cookies()).get("user_session")?.value;
  const session = await verifyUserSessionToken(token);
  if (!session) {
    return { success: false, message: "กรุณาเข้าสู่ระบบ", promotions: [] };
  }

  const supabase = await createClient();
  const { data: attendance } = await supabase
    .from("pg_attendance_logs")
    .select("store_code")
    .eq("user_id", session.id)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const storeCode = String(attendance?.store_code || session.area || "");
  let storeCompanyTag = "";
  if (storeCode) {
    const { data: store } = await supabase
      .from("pg_stores")
      .select("account")
      .eq("store_code", storeCode)
      .maybeSingle();
    storeCompanyTag = String(store?.account || "");
  }

  const result = await getPromotionByStoreAction(
    storeCode,
    storeCompanyTag,
    session.company_tag,
    session.id,
  );
  return {
    ...result,
    storeCode,
    storeCompanyTag,
    staffGroup: session.company_tag,
  };
}

export async function savePromotionAction(payload: SavePromotionPayload) {
  await requireAdminSession();
  const supabase = await createClient();
  const { id, items, ...promoData } = payload;

  if (id) {
    const { error: updateError } = await supabase
      .from("promotions")
      .update(promoData)
      .eq("id", id);

    if (updateError) return { success: false, message: updateError.message };

    await supabase.from("promotion_items").delete().eq("promotion_id", id);

    if (items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        promotion_id: id,
        ...item,
      }));
      const { error: itemError } = await supabase
        .from("promotion_items")
        .insert(itemsToInsert);

      if (itemError) return { success: false, message: itemError.message };
    }
  } else {
    const { data: promo, error: promoError } = await supabase
      .from("promotions")
      .insert([promoData])
      .select()
      .single();

    if (promoError || !promo)
      return {
        success: false,
        message: promoError?.message || "Insert failed",
      };

    if (items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        promotion_id: promo.id,
        ...item,
      }));
      const { error: itemError } = await supabase
        .from("promotion_items")
        .insert(itemsToInsert);

      if (itemError) return { success: false, message: itemError.message };
    }
  }

  return { success: true };
}

export async function deletePromotionAction(id: number | string) {
  await requireAdminSession();
  const supabase = await createClient();

  await supabase.from("promotion_items").delete().eq("promotion_id", id);
  const { error } = await supabase.from("promotions").delete().eq("id", id);

  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function getStoresAction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pg_stores")
    .select("id, store_name, store_code, account")
    .order("store_name");

  if (error) return { success: false, stores: [] };
  return { success: true, stores: data || [] };
}

export async function getCompaniesAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("company");

  if (error || !data) return { success: false, companies: [] };

  const uniqueCompanies = Array.from(
    new Set(
      data.map((item: { company: string }) => item.company).filter(Boolean),
    ),
  );
  return { success: true, companies: uniqueCompanies };
}

export async function getCategoriesAction(company: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .eq("company", company);

  if (error || !data) return { success: false, categories: [] };

  const uniqueCategories = Array.from(
    new Set(
      data.map((item: { category: string }) => item.category).filter(Boolean),
    ),
  );
  return { success: true, categories: uniqueCategories };
}

export async function getProductsByCompanyAndCategoryAction(
  company: string,
  category: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, code, sku_code, descriptions, barcode, company_type")
    .eq("company", company)
    .eq("category", category);

  if (error) return { success: false, products: [] };
  return { success: true, products: data || [] };
}

export async function getProductByBarcodeForPromotionAction(barcode: string) {
  await requireAdminSession();
  const supabase = await createClient();
  const normalizedBarcode = String(barcode || "").trim();
  if (!normalizedBarcode) return { success: false, product: null };

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, code, sku_code, descriptions, barcode, company, category, company_type",
    )
    .eq("barcode", normalizedBarcode)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      product: null,
      message: error?.message || "ไม่พบสินค้าใน catalog",
    };
  }
  return { success: true, product: data as Product };
}
