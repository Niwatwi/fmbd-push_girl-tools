"use server";

import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/utils/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function database() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey)
    throw new Error("ระบบยังไม่ได้ตั้งค่าฐานข้อมูลฝั่งเซิร์ฟเวอร์");
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function validatePeriod(startDate: string, endDate: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
    startDate > endDate
  ) {
    throw new Error("ช่วงงวดค่าใช้จ่ายไม่ถูกต้อง");
  }
}

function normalizeEmployeeId(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export async function getPayrollSummaryAdjustmentsAction(
  startDate: string,
  endDate: string,
) {
  try {
    await requireAdminSession();
    validatePeriod(startDate, endDate);
    const { data, error } = await database()
      .from("payroll_summary_adjustments")
      .select("employee_id, other_expenses, note")
      .eq("period_start", startDate)
      .eq("period_end", endDate);
    if (error) throw error;
    return { success: true as const, data: data || [] };
  } catch (error: any) {
    return {
      success: false as const,
      data: [],
      message: error.message || "โหลดค่าใช้จ่ายเพิ่มเติมไม่สำเร็จ",
    };
  }
}

export async function savePayrollSummaryAdjustmentsAction(
  startDate: string,
  endDate: string,
  adjustments: Array<{
    employeeId: string;
    otherExpenses: number;
    note: string;
  }>,
) {
  try {
    const admin = await requireAdminSession();
    validatePeriod(startDate, endDate);
    if (!Array.isArray(adjustments) || adjustments.length > 1000) {
      throw new Error("รายการค่าใช้จ่ายไม่ถูกต้อง");
    }
    const rows = adjustments.map((item) => {
      const employeeId = String(item.employeeId || "").trim();
      const otherExpenses = Number(item.otherExpenses || 0);
      const note = String(item.note || "").trim();
      if (
        !employeeId ||
        employeeId.length > 100 ||
        !Number.isFinite(otherExpenses) ||
        otherExpenses < 0 ||
        note.length > 1000
      ) {
        throw new Error("กรุณาตรวจสอบรหัสพนักงาน ค่าใช้จ่าย และหมายเหตุ");
      }
      return {
        period_start: startDate,
        period_end: endDate,
        employee_id: employeeId,
        other_expenses: otherExpenses,
        note,
        updated_by: admin.id,
        updated_at: new Date().toISOString(),
      };
    });
    if (rows.length) {
      const { error } = await database()
        .from("payroll_summary_adjustments")
        .upsert(rows, { onConflict: "period_start,period_end,employee_id" });
      if (error) throw error;
    }
    return { success: true as const };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "บันทึกค่าใช้จ่ายเพิ่มเติมไม่สำเร็จ",
    };
  }
}

export async function getApprovedPayrollKpiReportAction(
  month: string,
  employeeId?: string,
) {
  try {
    await requireAdminSession();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new Error("รอบ KPI ไม่ถูกต้อง");
    }
    const periodMonth = `${month}-01`;
    const supabase = database();
    const [baResult, koeResult] = await Promise.all([
      supabase
        .from("ba_kpi_entries")
        .select(
          "period_month, sheet_type, employee_id, username, employee_name, store_name, amount, score_percent, note, status",
        )
        .eq("period_month", periodMonth)
        .eq("status", "approved"),
      supabase
        .from("koe_kpi_evaluations")
        .select(
          "target_user_id, period_month, assessment_type, score_percent, amount, criteria, note, review_note, status",
        )
        .eq("period_month", periodMonth)
        .eq("status", "approved"),
    ]);
    if (baResult.error) throw baResult.error;
    if (koeResult.error) throw koeResult.error;

    const targetIds = Array.from(
      new Set((koeResult.data || []).map((row) => row.target_user_id)),
    );
    const profileResult = targetIds.length
      ? await supabase
          .from("user_profiles")
          .select("id, employee_id, username, display_name")
          .in("id", targetIds)
      : { data: [], error: null };
    if (profileResult.error) throw profileResult.error;
    const profileById = new Map(
      (profileResult.data || []).map((profile) => [
        String(profile.id),
        profile,
      ]),
    );
    const selectedEmployee = normalizeEmployeeId(employeeId);
    const rows = [
      ...(baResult.data || []).map((row) => ({
        periodMonth: month,
        source: "KPI BA",
        employeeId: row.employee_id,
        username: row.username || "",
        employeeName: row.employee_name,
        assessmentType: row.sheet_type,
        scorePercent: row.score_percent,
        amount: Number(row.amount || 0),
        storeName: row.store_name || "",
        note: row.note || "",
        criteria: null,
      })),
      ...(koeResult.data || []).flatMap((row) => {
        const profile = profileById.get(String(row.target_user_id));
        if (!profile) return [];
        return [
          {
            periodMonth: month,
            source: "KPI KOE",
            employeeId: profile.employee_id || profile.username || "",
            username: profile.username || "",
            employeeName: profile.display_name || profile.username || "",
            assessmentType: row.assessment_type,
            scorePercent: row.score_percent,
            amount: Number(row.amount || 0),
            storeName: "",
            note: [row.note, row.review_note].filter(Boolean).join(" / "),
            criteria: row.criteria,
          },
        ];
      }),
    ].filter((row) => {
      if (!selectedEmployee) return true;
      return [row.employeeId, row.username]
        .map(normalizeEmployeeId)
        .includes(selectedEmployee);
    });

    rows.sort((left, right) =>
      `${left.employeeName}${left.assessmentType}`.localeCompare(
        `${right.employeeName}${right.assessmentType}`,
        "th",
      ),
    );
    return { success: true as const, data: rows };
  } catch (error: any) {
    return {
      success: false as const,
      data: [],
      message: error.message || "โหลดรายงาน KPI ไม่สำเร็จ",
    };
  }
}
