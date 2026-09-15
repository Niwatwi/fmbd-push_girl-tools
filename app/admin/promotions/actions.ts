"use server";

import { createClient } from "@/utils/supabase/server";

// ----------------------------------------------------------------
// Interfaces & Types
// ----------------------------------------------------------------
export interface Product {
  id: number | string;
  code?: string;
  descriptions: string;
  barcode: string;
  company?: string;
  category?: string;
}

export interface PromotionItem {
  id?: number | string;
  product_code: string;
  product_name?: string;
  label?: string; // เพิ่ม label เพื่อรองรับหน้า daily-report
  barcode?: string;
  price: string;
  condition: string;
  products?: {
    descriptions?: string;
    barcode?: string;
  };
}

export interface PromotionConfig {
  id: number | string;
  target_type: "COMPANY_TAG" | "STORE_CODE" | "ALL";
  target_value: string;
  campaign_title: string;
  special_tier_text?: string;
  is_active: boolean;
  items?: PromotionItem[];
}

export interface SavePromotionPayload {
  id?: number;
  target_type: "COMPANY_TAG" | "STORE_CODE" | "ALL";
  target_value: string;
  campaign_title: string;
  special_tier_text?: string;
  is_active: boolean;
  items: Array<{
    product_code: string;
    price: string;
    condition: string;
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

export async function getPromotionByStoreAction(
  storeCode?: string,
  companyTag?: string,
) {
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

  // กรองเฉพาะโปรโมชันที่ตรงกับเงื่อนไขของสาขานั้นๆ
  const filteredPromotions = data.filter((promo) => {
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
      promo.target_value === companyTag
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

export async function savePromotionAction(payload: SavePromotionPayload) {
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
    .select("id, store_name, store_code")
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
    .select("id, code, descriptions, barcode")
    .eq("company", company)
    .eq("category", category);

  if (error) return { success: false, products: [] };
  return { success: true, products: data || [] };
}
