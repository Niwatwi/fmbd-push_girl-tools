"use server";

import { createClient } from "@supabase/supabase-js";
import { getUserSession, requireUserOrAdminSession } from "@/utils/auth";

const bucketName = "sales-pitch-videos";
const allowedMimeTypes = ["video/mp4", "video/webm", "video/quicktime"];
const maxFileSize = 150 * 1024 * 1024;

function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("กรุณาตั้งค่า SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function bangkokDayRange() {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
  }).format(new Date());
  return {
    start: `${day}T00:00:00+07:00`,
    end: `${day}T23:59:59+07:00`,
  };
}

// ข้อมูลบริบทสำหรับหน้าอัปโหลด: ร้านที่ Check-in วันนี้ + แคมเปญที่ใช้งานอยู่
export async function getSalesVideoContextAction() {
  const session = await getUserSession();
  if (!session) return { success: false, message: "กรุณาเข้าสู่ระบบ" };

  try {
    const supabase = getServiceClient();
    const { start, end } = bangkokDayRange();
    const { data: logs, error } = await supabase
      .from("pg_attendance_logs")
      .select("store_code, store_name, check_out_at")
      .eq("user_id", session.id)
      .gte("check_in_at", start)
      .lte("check_in_at", end)
      .order("check_in_at", { ascending: false });
    if (error) throw error;

    const log = (logs || []).find((item) => !item.check_out_at) || logs?.[0];
    if (!log) {
      return {
        success: false,
        message: "กรุณา Check-in ที่หน้าหลักก่อนอัปโหลดคลิป",
      };
    }

    const [storeResult, profileResult, promoResult] = await Promise.all([
      supabase
        .from("pg_stores")
        .select("account")
        .eq("store_code", log.store_code)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("display_name")
        .eq("id", session.id)
        .maybeSingle(),
      supabase
        .from("promotions")
        .select(
          "id, campaign_title, target_type, target_value, start_date, end_date",
        )
        .eq("is_active", true)
        .order("start_date", { ascending: false }),
    ]);

    const account = String(storeResult.data?.account || "");
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
    }).format(new Date());
    const promotions = (promoResult.data || []).filter((promo: any) => {
      const inRange =
        (!promo.start_date || String(promo.start_date).slice(0, 10) <= today) &&
        (!promo.end_date || String(promo.end_date).slice(0, 10) >= today);
      const matches =
        promo.target_type === "ALL" ||
        (promo.target_type === "STORE_CODE" &&
          String(promo.target_value) === String(log.store_code)) ||
        (promo.target_type === "COMPANY_TAG" &&
          String(promo.target_value).trim().toLowerCase() ===
            account.trim().toLowerCase());
      return inRange && matches;
    });

    return {
      success: true,
      userId: session.id,
      userName: profileResult.data?.display_name || session.display_name,
      storeCode: log.store_code as string,
      storeName: (log.store_name || "") as string,
      account,
      promotions: promotions.map((promo: any) => ({
        id: promo.id as number,
        title: promo.campaign_title as string,
      })),
    };
  } catch (error: any) {
    return { success: false, message: error.message || "โหลดข้อมูลไม่สำเร็จ" };
  }
}

export async function createSalesVideoUploadAction(input: {
  userId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
}) {
  await requireUserOrAdminSession(input.userId);
  try {
    if (!allowedMimeTypes.includes(input.mimeType)) {
      throw new Error("รองรับเฉพาะไฟล์วิดีโอ MP4, WebM หรือ MOV");
    }
    if (!(input.fileSize > 0) || input.fileSize > maxFileSize) {
      throw new Error("ไฟล์วิดีโอต้องมีขนาดไม่เกิน 150 MB");
    }
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
    const path = `${input.userId}/${crypto.randomUUID()}-${safeName}`;
    const { data, error } = await getServiceClient()
      .storage.from(bucketName)
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

export async function saveSalesVideoAction(input: {
  userId: number;
  path: string;
  promotionId?: number | null;
  mimeType: string;
  fileSize: number;
  fileName: string;
}) {
  await requireUserOrAdminSession(input.userId);
  try {
    if (!input.path.startsWith(`${input.userId}/`)) {
      throw new Error("ไฟล์ไม่ถูกต้อง");
    }
    const context = await getSalesVideoContextAction();
    if (!context.success) throw new Error(context.message);

    let campaignTitle: string | null = null;
    let promotionId: number | null = null;
    if (input.promotionId) {
      const promo = context.promotions?.find(
        (item) => item.id === Number(input.promotionId),
      );
      if (!promo) throw new Error("ไม่พบแคมเปญที่เลือก");
      promotionId = promo.id;
      campaignTitle = promo.title;
    }

    const supabase = getServiceClient();
    const { data } = supabase.storage.from(bucketName).getPublicUrl(input.path);

    const { error } = await supabase.from("sales_pitch_videos").insert({
      user_id: context.userId,
      user_name: context.userName,
      store_code: context.storeCode,
      store_name: context.storeName,
      account: context.account || null,
      promotion_id: promotionId,
      campaign_title: campaignTitle,
      video_url: data.publicUrl,
      storage_path: input.path,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      file_name: input.fileName,
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || "บันทึกคลิปไม่สำเร็จ" };
  }
}

export async function getSalesVideosAction() {
  const session = await getUserSession();
  if (!session)
    return { success: false, videos: [], message: "กรุณาเข้าสู่ระบบ" };
  try {
    const { data, error } = await getServiceClient()
      .from("sales_pitch_videos")
      .select(
        "id, user_name, store_code, store_name, account, promotion_id, campaign_title, video_url, file_name, file_size, recorded_at",
      )
      .order("recorded_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    return { success: true, videos: data || [] };
  } catch (error: any) {
    return {
      success: false,
      videos: [],
      message: error.message || "โหลดคลิปไม่สำเร็จ",
    };
  }
}
