"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/utils/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const productImagesBucket = "product-images";

function getAdminProductsClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "ไม่พบ SUPABASE_SERVICE_ROLE_KEY สำหรับบันทึก Master Product",
    );
  }
  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface ProductMasterInput {
  code?: string;
  category_code?: string;
  category: string;
  sub_category?: string;
  segment?: string;
  company?: string;
  company_type: "Company" | "Competitor";
  brand_type?: string;
  brand?: string;
  sub_brand?: string;
  pack_name: string;
  descriptions: string;
  barcode: string;
  img_front?: string;
  img_back?: string;
  img_left?: string;
  img_right?: string;
  img_top?: string;
  img_bottom?: string;
  is_active: boolean;
  imageurl?: string;
  img_price_tag?: string;
  img_planogram?: string;
  Dimension?: string;
  sku_code?: string;
}

function buildProductPayload(input: ProductMasterInput) {
  const optionalText = (value?: string) => String(value || "").trim() || null;
  const payload: Record<string, unknown> = {
    category_code: optionalText(input.category_code),
    category: String(input.category || "").trim(),
    sub_category: optionalText(input.sub_category),
    segment: optionalText(input.segment),
    company: optionalText(input.company),
    company_type: input.company_type,
    brand_type: optionalText(input.brand_type),
    brand: optionalText(input.brand),
    sub_brand: optionalText(input.sub_brand),
    pack_name: String(input.pack_name || "").trim(),
    descriptions: String(input.descriptions || "").trim(),
    barcode: String(input.barcode || "").trim(),
    img_front: optionalText(input.img_front),
    img_back: optionalText(input.img_back),
    img_left: optionalText(input.img_left),
    img_right: optionalText(input.img_right),
    img_top: optionalText(input.img_top),
    img_bottom: optionalText(input.img_bottom),
    is_active: Boolean(input.is_active),
    imageurl: optionalText(input.imageurl),
    img_price_tag: optionalText(input.img_price_tag),
    img_planogram: optionalText(input.img_planogram),
    Dimension: optionalText(input.Dimension),
    sku_code: optionalText(input.sku_code),
  };
  const code = String(input.code || "").trim();
  if (code) payload.code = code;
  return payload;
}

export async function getRecentMasterProductsAction(
  search = "",
  page = 1,
  pageSize = 20,
) {
  try {
    await requireAdminSession();
    const supabase = getAdminProductsClient();
    const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize)));
    const safePage = Math.max(1, Math.floor(page));
    const offset = (safePage - 1) * safePageSize;
    const normalizedSearch = String(search || "")
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ");
    let query = supabase
      .from("products")
      .select(
        "id, code, company, company_type, category, pack_name, descriptions, barcode, sku_code, is_active",
        { count: "exact" },
      );
    if (normalizedSearch) {
      const pattern = `%${normalizedSearch}%`;
      query = query.or(
        ["code", "barcode", "sku_code", "descriptions", "brand", "company"]
          .map((column) => `${column}.ilike.${pattern}`)
          .join(","),
      );
    }
    const {
      data: products,
      error: searchError,
      count: totalCount,
    } = await query
      .order("id", { ascending: false })
      .range(offset, offset + safePageSize - 1);

    if (searchError) throw searchError;
    return {
      success: true,
      products: products || [],
      total: totalCount || 0,
      page: safePage,
      pageSize: safePageSize,
    };
  } catch (error: any) {
    return {
      success: false,
      products: [],
      total: 0,
      message: error.message || "โหลด Master Products ไม่สำเร็จ",
    };
  }
}

export async function getMasterProductForEditAction(id: number) {
  try {
    await requireAdminSession();
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error("รหัสสินค้าไม่ถูกต้อง");
    }

    const supabase = getAdminProductsClient();
    const [productResult, logsResult] = await Promise.all([
      supabase.from("products").select("*").eq("id", productId).maybeSingle(),
      supabase
        .from("product_change_logs")
        .select(
          "id, changed_at, changed_by, changed_by_name, old_values, new_values",
        )
        .eq("product_id", productId)
        .order("changed_at", { ascending: false })
        .limit(30),
    ]);
    if (productResult.error) throw productResult.error;
    if (logsResult.error) throw logsResult.error;
    if (!productResult.data) throw new Error("ไม่พบสินค้าใน Master");

    return {
      success: true,
      product: productResult.data as ProductMasterInput & { id: number },
      logs: logsResult.data || [],
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "โหลดรายละเอียดสินค้าไม่สำเร็จ",
      logs: [],
    };
  }
}

export async function getMasterProductChangeLogsAction(id: number) {
  try {
    await requireAdminSession();
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error("รหัสสินค้าไม่ถูกต้อง");
    }

    const supabase = getAdminProductsClient();
    const { data, error } = await supabase
      .from("product_change_logs")
      .select(
        "id, changed_at, changed_by, changed_by_name, old_values, new_values",
      )
      .eq("product_id", productId)
      .order("changed_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return { success: true, logs: data || [] };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "โหลดประวัติการแก้ไขไม่สำเร็จ",
      logs: [],
    };
  }
}

export async function getProductCategoryOptionsAction() {
  try {
    await requireAdminSession();
    const supabase = getAdminProductsClient();
    const { data, error } = await supabase
      .from("products")
      .select("category, category_code")
      .not("category", "is", null)
      .order("category", { ascending: true })
      .limit(2000);

    if (error) throw error;

    const categories = new Map<string, string>();
    for (const row of data || []) {
      const category = String(row.category || "").trim();
      if (!category) continue;
      const key = category.toLowerCase();
      if (!categories.has(key) || (!categories.get(key) && row.category_code)) {
        categories.set(key, String(row.category_code || ""));
      }
    }

    return {
      success: true,
      categories: Array.from(categories, ([key, category_code]) => ({
        category:
          (data || []).find(
            (row) =>
              String(row.category || "")
                .trim()
                .toLowerCase() === key,
          )?.category || key,
        category_code,
      })).sort((a, b) => a.category.localeCompare(b.category)),
    };
  } catch (error: any) {
    return {
      success: false,
      categories: [],
      message: error.message || "โหลดหมวดสินค้าไม่สำเร็จ",
    };
  }
}

export async function createProductImageUploadAction(input: {
  fileName: string;
  mimeType: string;
}) {
  try {
    await requireAdminSession();
    if (!["image/jpeg", "image/png", "image/webp"].includes(input.mimeType)) {
      throw new Error("รองรับไฟล์ JPG, PNG หรือ WebP เท่านั้น");
    }

    const supabase = getAdminProductsClient();
    const safeName = String(input.fileName || "product-image.jpg")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(-80);
    const path = `master-products/${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await supabase.storage
      .from(productImagesBucket)
      .createSignedUploadUrl(path);

    if (error) throw error;
    return { success: true, path: data.path, token: data.token };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "เตรียมอัปโหลดรูปไม่สำเร็จ",
    };
  }
}

export async function createMasterProductAction(input: ProductMasterInput) {
  try {
    await requireAdminSession();

    const category = String(input.category || "").trim();
    const packName = String(input.pack_name || "").trim();
    const descriptions = String(input.descriptions || "").trim();
    const barcode = String(input.barcode || "").trim();
    const companyType = input.company_type;

    if (!category || !packName || !descriptions || !barcode) {
      throw new Error(
        "กรุณากรอก Category, Pack name, รายละเอียดสินค้า และ Barcode ให้ครบ",
      );
    }
    if (companyType !== "Company" && companyType !== "Competitor") {
      throw new Error("กรุณาเลือกประเภท Company หรือ Competitor");
    }

    const supabase = getAdminProductsClient();
    const { data: duplicateBarcode, error: barcodeError } = await supabase
      .from("products")
      .select("id, code, descriptions")
      .eq("barcode", barcode)
      .limit(1)
      .maybeSingle();
    if (barcodeError) throw barcodeError;
    if (duplicateBarcode) {
      throw new Error(
        `Barcode นี้มีใน Master แล้ว (${duplicateBarcode.code}: ${duplicateBarcode.descriptions})`,
      );
    }

    const code = String(input.code || "").trim();
    if (code) {
      const { data: duplicateCode, error: codeError } = await supabase
        .from("products")
        .select("id")
        .eq("code", code)
        .limit(1)
        .maybeSingle();
      if (codeError) throw codeError;
      if (duplicateCode) throw new Error("Product code นี้ถูกใช้แล้ว");
    }

    const payload = buildProductPayload(input);

    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select(
        "id, code, company, company_type, category, pack_name, descriptions, barcode, sku_code, is_active",
      )
      .single();

    if (error) throw error;
    return { success: true, product: data };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "เพิ่มสินค้าไม่สำเร็จ",
    };
  }
}

export async function updateMasterProductAction(
  id: number,
  input: ProductMasterInput,
) {
  try {
    const session = await requireAdminSession();
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new Error("รหัสสินค้าไม่ถูกต้อง");
    }

    const category = String(input.category || "").trim();
    const packName = String(input.pack_name || "").trim();
    const descriptions = String(input.descriptions || "").trim();
    const barcode = String(input.barcode || "").trim();
    const code = String(input.code || "").trim();
    if (!category || !packName || !descriptions || !barcode || !code) {
      throw new Error(
        "กรุณากรอก Product code, Category, Pack name, รายละเอียดสินค้า และ Barcode ให้ครบ",
      );
    }
    if (
      input.company_type !== "Company" &&
      input.company_type !== "Competitor"
    ) {
      throw new Error("กรุณาเลือกประเภท Company หรือ Competitor");
    }

    const supabase = getAdminProductsClient();
    const [barcodeResult, codeResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, code, descriptions")
        .eq("barcode", barcode)
        .neq("id", productId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("products")
        .select("id")
        .eq("code", code)
        .neq("id", productId)
        .limit(1)
        .maybeSingle(),
    ]);
    if (barcodeResult.error) throw barcodeResult.error;
    if (codeResult.error) throw codeResult.error;
    if (barcodeResult.data) {
      throw new Error(
        `Barcode นี้ถูกสินค้า ${barcodeResult.data.code} ใช้อยู่แล้ว`,
      );
    }
    if (codeResult.data) throw new Error("Product code นี้ถูกใช้แล้ว");

    const { data, error } = await supabase.rpc(
      "update_master_product_with_log",
      {
        p_product_id: productId,
        p_product_data: buildProductPayload(input),
        p_changed_by: session.id,
        p_changed_by_name: session.display_name,
      },
    );
    if (error) throw error;

    return {
      success: true,
      product: data?.product,
      logId: data?.log_id,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "แก้ไขสินค้าไม่สำเร็จ",
    };
  }
}
