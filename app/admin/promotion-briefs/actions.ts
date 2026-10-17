"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { getUserSession, requireAdminSession } from "@/utils/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const bucketName = "promotion-briefs";

function getServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "กรุณาตั้งค่า SUPABASE_SERVICE_ROLE_KEY เพื่อจัดการไฟล์บรีฟ",
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAllowedMimeType(mediaType: string, mimeType: string) {
  const allowedTypes =
    mediaType === "VIDEO"
      ? ["video/mp4", "video/webm"]
      : ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  return allowedTypes.includes(mimeType);
}

export async function getPromotionBriefAdminDataAction() {
  await requireAdminSession();

  try {
    const supabase = getServiceRoleClient();
    const [promotionsResult, mediaResult] = await Promise.all([
      supabase
        .from("promotions")
        .select(
          "id, campaign_title, target_type, target_value, start_date, end_date, is_active",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("promotion_brief_media")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
    ]);

    if (promotionsResult.error) throw promotionsResult.error;
    if (mediaResult.error) throw mediaResult.error;

    return {
      success: true,
      promotions: promotionsResult.data || [],
      media: mediaResult.data || [],
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "โหลดข้อมูลจัดการบรีฟไม่สำเร็จ",
      promotions: [],
      media: [],
    };
  }
}

export async function getPromotionBriefMediaAction(promotionIds: string[]) {
  const session = await getUserSession();
  if (!session) return { success: false, media: [] };

  const ids = Array.from(
    new Set((promotionIds || []).map(String).filter(Boolean)),
  );
  if (ids.length === 0) return { success: true, media: [] };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("promotion_brief_media")
      .select(
        "id, promotion_id, media_type, title, media_url, mime_type, poster_url, duration, sort_order",
      )
      .in("promotion_id", ids)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    return { success: true, media: data || [] };
  } catch (error: any) {
    console.error("Load promotion brief media failed:", error);
    return { success: false, media: [] };
  }
}

export async function createPromotionBriefUploadAction(input: {
  promotionId: string;
  mediaType: "VIDEO" | "DOCUMENT";
  fileName: string;
  mimeType: string;
}) {
  await requireAdminSession();

  try {
    const promotionId = Number(input.promotionId);
    if (!Number.isInteger(promotionId) || promotionId <= 0) {
      throw new Error("กรุณาเลือกแคมเปญให้ถูกต้อง");
    }
    if (!getAllowedMimeType(input.mediaType, input.mimeType)) {
      throw new Error("ชนิดไฟล์ไม่รองรับ");
    }

    const supabase = getServiceRoleClient();
    const { data: promotion, error: promotionError } = await supabase
      .from("promotions")
      .select("id")
      .eq("id", promotionId)
      .maybeSingle();
    if (promotionError) throw promotionError;
    if (!promotion) throw new Error("ไม่พบแคมเปญที่เลือก");

    const safeName = input.fileName
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(-100);
    const path = `${promotionId}/${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(path);
    if (error) throw error;

    return { success: true, path: data.path, token: data.token };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "สร้างลิงก์อัปโหลดไม่สำเร็จ",
    };
  }
}

interface SavePromotionBriefMediaInput {
  id?: string | number;
  promotion_id: string | number;
  media_type: "VIDEO" | "DOCUMENT";
  title: string;
  media_url: string;
  mime_type?: string;
  storage_path?: string | null;
  poster_url?: string | null;
  poster_path?: string | null;
  duration?: string | null;
  sort_order: number;
  is_active: boolean;
}

export async function savePromotionBriefMediaAction(
  input: SavePromotionBriefMediaInput,
) {
  await requireAdminSession();

  try {
    const promotionId = Number(input.promotion_id);
    if (!Number.isInteger(promotionId) || promotionId <= 0) {
      throw new Error("กรุณาเลือกแคมเปญ");
    }
    const title = String(input.title || "").trim();
    const mediaUrl = String(input.media_url || "").trim();
    if (!title || !mediaUrl) throw new Error("กรุณากรอกชื่อและ URL ของสื่อ");
    if (!/^https?:\/\//i.test(mediaUrl))
      throw new Error("URL สื่อต้องขึ้นต้นด้วย http:// หรือ https://");
    if (input.poster_url && !/^https?:\/\//i.test(input.poster_url)) {
      throw new Error("URL ภาพปกไม่ถูกต้อง");
    }

    const supabase = getServiceRoleClient();
    const payload = {
      promotion_id: promotionId,
      media_type: input.media_type,
      title,
      media_url: mediaUrl,
      mime_type: input.mime_type || null,
      storage_path: input.storage_path || null,
      poster_url: input.poster_url || null,
      poster_path: input.poster_path || null,
      duration:
        input.media_type === "VIDEO" ? input.duration?.trim() || null : null,
      sort_order: Number(input.sort_order) || 0,
      is_active: Boolean(input.is_active),
    };

    let previous: {
      storage_path?: string | null;
      poster_path?: string | null;
    } | null = null;
    if (input.id) {
      const { data, error } = await supabase
        .from("promotion_brief_media")
        .select("storage_path, poster_path")
        .eq("id", input.id)
        .maybeSingle();
      if (error) throw error;
      previous = data;

      const { error: updateError } = await supabase
        .from("promotion_brief_media")
        .update(payload)
        .eq("id", input.id);
      if (updateError) throw updateError;
    } else {
      const { error } = await supabase
        .from("promotion_brief_media")
        .insert(payload);
      if (error) throw error;
    }

    const obsoletePaths = [
      previous?.storage_path,
      previous?.poster_path,
    ].filter(
      (path): path is string =>
        Boolean(path) &&
        path !== payload.storage_path &&
        path !== payload.poster_path,
    );
    if (obsoletePaths.length > 0) {
      await supabase.storage.from(bucketName).remove(obsoletePaths);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || "บันทึกสื่อไม่สำเร็จ" };
  }
}

export async function deletePromotionBriefMediaAction(id: string | number) {
  await requireAdminSession();

  try {
    const supabase = getServiceRoleClient();
    const { data, error: lookupError } = await supabase
      .from("promotion_brief_media")
      .select("storage_path, poster_path")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const { error } = await supabase
      .from("promotion_brief_media")
      .delete()
      .eq("id", id);
    if (error) throw error;

    const paths = [data?.storage_path, data?.poster_path].filter(
      Boolean,
    ) as string[];
    if (paths.length > 0) await supabase.storage.from(bucketName).remove(paths);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || "ลบสื่อไม่สำเร็จ" };
  }
}
