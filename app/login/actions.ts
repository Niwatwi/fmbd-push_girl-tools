"use server";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("กรุณาตั้งค่า Supabase Environment Variables ใน .env.local");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 1. ฟังก์ชันจัดเก็บรูปถ่ายเข้า Bucket และดึง Public URL มาตรฐาน ---
async function uploadPhoto(
  userId: number,
  type: "checkin" | "checkout",
  base64Image: string,
) {
  try {
    // แปลง base64 กลับเป็น Buffer เพื่อเตรียมอัปโหลดขึ้น Storage
    const buffer = Buffer.from(
      base64Image.replace(/^data:image\/\w+;base64,/, ""),
      "base64",
    );

    // ตั้งชื่อไฟล์ระบุตัวตนพนักงานและเวลา: userId_ประเภท_timestamp.jpg
    const fileName = `${userId}_${type}_${Date.now()}.jpg`;

    // 1. อัปโหลดไฟล์ดิบเข้าสู่ Supabase Storage
    const { error } = await supabase.storage
      .from("pg-attendance-photos")
      .upload(fileName, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    // 2. ใช้คำสั่งมาตรฐานของ Supabase ดึง Public URL ของไฟล์นั้นออกมา
    const { data } = supabase.storage
      .from("pg-attendance-photos")
      .getPublicUrl(fileName);

    // ส่งค่า URL ข้อความธรรมดา (เช่น https://.../image.jpg) กลับไปบันทึกในตารางฐานข้อมูล
    return data.publicUrl;
  } catch (error) {
    console.error("Storage upload error:", error);
    throw new Error("ไม่สามารถอัปโหลดรูปภาพได้");
  }
}

// --- 2. ฟังก์ชันตรวจสอบว่าวันนี้เคยลงเวลาไปแล้วหรือยัง ---
export async function checkTodayAttendance(userId: number) {
  try {
    const now = new Date();
    const ictDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now); // MM/DD/YYYY

    const [month, day, year] = ictDate.split("/");
    const startOfToday = `${year}-${month}-${day}T00:00:00+07:00`;
    const endOfToday = `${year}-${month}-${day}T23:59:59+07:00`;

    const { data, error } = await supabase
      .from("pg_attendance_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("check_in_at", startOfToday)
      .lte("check_in_at", endOfToday)
      .maybeSingle();

    if (error) throw error;

    return { success: true, log: data };
  } catch (error) {
    console.error("Check attendance error:", error);
    return { success: false, log: null };
  }
}

// --- 3. ฟังก์ชันบันทึก Check-in เข้าฐานข้อมูล ---
export async function saveCheckInAction({
  userId,
  storeCode,
  storeName,
  latitude,
  longitude,
  base64Image,
}: {
  userId: number;
  storeCode: string;
  storeName: string;
  latitude: number;
  longitude: number;
  base64Image: string;
}) {
  try {
    const imageUrl = await uploadPhoto(userId, "checkin", base64Image);

    const { data, error } = await supabase
      .from("pg_attendance_logs")
      .insert({
        user_id: userId,
        store_code: storeCode,
        store_name: storeName,
        check_in_latitude: latitude,
        check_in_longitude: longitude,
        check_in_image_url: imageUrl,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, log: data };
  } catch (error: any) {
    console.error("Save Checkin Error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการบันทึก Check-in",
    };
  }
}

// --- 4. ฟังก์ชันบันทึก Check-out เข้าฐานข้อมูล ---
export async function saveCheckOutAction({
  logId,
  userId,
  latitude,
  longitude,
  base64Image,
}: {
  logId: number;
  userId: number;
  latitude: number;
  longitude: number;
  base64Image: string;
}) {
  try {
    const imageUrl = await uploadPhoto(userId, "checkout", base64Image);

    const { data, error } = await supabase
      .from("pg_attendance_logs")
      .update({
        check_out_at: new Date().toISOString(),
        check_out_latitude: latitude,
        check_out_longitude: longitude,
        check_out_image_url: imageUrl,
      })
      .eq("id", logId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, log: data };
  } catch (error: any) {
    console.error("Save Checkout Error:", error);
    return {
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการบันทึก Check-out",
    };
  }
}

// --- 5. ฟังก์ชันเข้าสู่ระบบ ตรวจสอบรายบุคคลประสิทธิภาพสูง ---
export async function handleLogin(
  usernameInput: string,
  passwordInput: string,
) {
  try {
    const cleanUsername = usernameInput.trim();
    const cleanPassword = passwordInput.trim();

    // คิวรีตรงไปยังฐานข้อมูลหาแถวที่ตรงกับ username เท่านั้น ไม่ดึงข้อมูลพนักงานคนอื่นออกมา
    const { data: user, error } = await supabase
      .from("user_profiles")
      .select(
        "id, username, password_text, display_name, company_tag, area, is_active, image_url",
      )
      .eq("username", cleanUsername)
      .maybeSingle();

    if (error) {
      console.error("Supabase fetch error:", error);
      return {
        success: false,
        message: "เกิดข้อผิดพลาดทางเทคนิคในการเชื่อมต่อฐานข้อมูล",
      };
    }

    // ตรวจสอบว่ามีผู้ใช้งานในระบบ และมีสถานะ Active หรือไม่
    if (!user || (user.is_active !== true && user.is_active !== "true")) {
      return {
        success: false,
        message: "ไม่พบชื่อผู้ใช้งานนี้ในระบบ หรือบัญชีถูกระงับ",
      };
    }

    // ตรวจสอบรหัสผ่านตรง ๆ (เพิ่มความทนทานเรื่องช่องว่างด้วย .trim())
    if (user.password_text?.toString().trim() !== cleanPassword) {
      return {
        success: false,
        message: "รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
      };
    }

    // สร้าง Session ผ่าน Cookie
    const cookieStore = await cookies();
    cookieStore.set(
      "user_session",
      JSON.stringify({
        id: user.id,
        display_name: user.display_name,
        company_tag: user.company_tag,
        area: user.area,
        image_url: user.image_url,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 วัน
        path: "/",
      },
    );

    return {
      success: true,
      user: {
        display_name: user.display_name,
        company_tag: user.company_tag,
      },
    };
  } catch (error) {
    console.error("Unexpected login error:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดทางเทคนิคในระบบหลังบ้าน",
    };
  }
}

// --- 6. ฟังก์ชันออกจากระบบ ลบเซสชันคุกกี้ ---
export async function handleLogout() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("user_session");
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, message: "ไม่สามารถออกจากระบบได้" };
  }
}

// ฟังก์ชันดึงรายชื่อร้านค้าตามเขตพื้นที่ของพนักงาน
// ในไฟล์ app/login/actions.ts
export async function getStoresByArea(area: string) {
  // สำคัญ: ต้องเช็ค area ให้ตรง และกรองเฉพาะที่ is_active เป็น true
  const { data, error } = await supabase
    .from("pg_stores")
    .select("*")
    .eq("area", area) // เช่น PGTO01
    .eq("is_active", true); // เพิ่มเงื่อนไขเช็คสถานะร้าน

  if (error) {
    console.error("Error fetching stores:", error);
    return { success: false, stores: [] };
  }

  return { success: true, stores: data || [] };
}

export interface PgDailySalesReport {
  id: number;
  attendance_log_id: number;
  user_id: number;
  store_code: string;
  barcode: string;
  product_name: string;
  segment: string;
  quantity_sold: number;
  total_sales_amount: number;
  stock_on_hand: number;
  is_oos: boolean;
  report_date: string;
}

export interface PgCommissionRule {
  id: number;
  company_tag: string | null;
  segment: string | null;
  barcode: string | null;
  rule_type: "per_unit" | "percentage";
  rate: number;
  target_threshold: number;
  is_active: boolean;
}

export interface PgMonthlyPayroll {
  id: number;
  user_id: number;
  period_month: string; // รูปแบบ '2026-07'
  total_days_worked: number;
  total_allowance: number;
  total_sales_volume: number;
  total_sales_value: number;
  total_commission: number;
  base_salary: number;
  other_expenses: number;
  net_income: number;
  status: "pending" | "approved" | "paid";
  calculated_at: string;
  updated_at: string;
}


// เพิ่มเข้าไปในไฟล์ app/login/actions.ts เพื่อใช้คำนวณเงินระบบคอมมิชชัน

interface WeeklyCalculationParam {
  userId: number;
  startDate: string; // วันเริ่มต้นสัปดาห์ เช่น '2026-07-13' (วันจันทร์)
  endDate: string; // วันสิ้นสุดสัปดาห์ เช่น '2026-07-19' (วันอาทิตย์)
}

export async function calculateWeeklyPayrollAction({
  userId,
  startDate,
  endDate,
}: WeeklyCalculationParam) {
  try {
    // 1. นับจำนวนวันที่ลงเวลางานสมบูรณ์ในสัปดาห์นั้น (เพื่อคิดค่าจ้างรายวัน วันละ 700)
    const { count: daysWorked, error: attendError } = await supabase
      .from("pg_attendance_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("check_out_at", "is", null)
      .gte("check_in_at", `${startDate}T00:00:00+07:00`)
      .lte("check_in_at", `${endDate}T23:59:59+07:00`);

    if (attendError) throw attendError;

    // 2. รวมยอดขายสินค้าทั้งหมด (นับเป็นเซ็ท) จากตาราง Daily Report ในสัปดาห์นั้น
    const { data: salesData, error: salesError } = await supabase
      .from("pg_daily_sales_reports")
      .select("quantity_sold, total_sales_amount")
      .eq("user_id", userId)
      .gte("report_date", startDate)
      .lte("report_date", endDate);

    if (salesError) throw salesError;

    // คำนวณยอดรวมชิ้นและยอดเงินดิบ
    const totalSetsSold =
      salesData?.reduce((sum, item) => sum + (item.quantity_sold || 0), 0) || 0;
    const totalSalesValue =
      salesData?.reduce(
        (sum, item) => sum + (Number(item.total_sales_amount) || 0),
        0,
      ) || 0;

    // 3. เริ่มคำนวณรายได้ตาม Logic ใบงานคอมมิชชัน
    const DAILY_WAGE_RATE = 700;
    const baseWageTotal = (daysWorked || 0) * DAILY_WAGE_RATE; // ค่าจ้างพื้นฐานรวม

    let commissionBonus = 0;

    // เช็คเงื่อนไขขั้นบันไดคอมมิชชันสัปดาห์ละ 3 วัน
    if (totalSetsSold >= 180) {
      // เคสที่ 1: ทะลุเป้า 100% (ได้ 500 บาท + Extra ทุกๆ 15 เซ็ท)
      commissionBonus = 500;
      const extraSets = totalSetsSold - 180;
      if (extraSets >= 15) {
        const extraMultiplier = Math.floor(extraSets / 15);
        commissionBonus += extraMultiplier * 100;
      }
    } else if (totalSetsSold >= 144) {
      // เคสที่ 2: ถึงเป้าขั้นต่ำ 80% แต่ไม่ถึง 100% (ได้ 200 บาท)
      commissionBonus = 200;
    } else {
      // เคสที่ 3: ไม่ถึงเป้าขั้นต่ำ 80%
      commissionBonus = 0;
    }

    const netWeeklyIncome = baseWageTotal + commissionBonus;

    return {
      success: true,
      summary: {
        daysWorked,
        baseWageTotal,
        totalSetsSold,
        totalSalesValue,
        commissionBonus,
        netWeeklyIncome,
      },
    };
  } catch (error: any) {
    console.error("Weekly Payroll Calculation Error:", error);
    return {
      success: false,
      message: error.message || "ไม่สามารถคำนวณค่าใช้จ่ายได้",
    };
  }
}
