"use server";

import { getKoeServerDatabase, requireKoeAccess } from "@/utils/koe-access";
import {
  calculateCheerKpi,
  calculateOosAchievement,
  calculateSupervisorKpi,
  type CheerGrade,
} from "@/utils/koe-kpi";
import { getUserSession, requireAdminSession } from "@/utils/auth";

export async function getKoeDashboardAction(
  startDate: string,
  endDate: string,
) {
  try {
    const { database, areas } = await requireKoeAccess();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
      startDate > endDate
    )
      throw new Error("ช่วงวันที่ไม่ถูกต้อง");
    const nextDay = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(nextDay.getTime()))
      throw new Error("ช่วงวันที่ไม่ถูกต้อง");
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    if (!areas.length)
      return {
        success: true as const,
        areas: [],
        team: [],
        reports: [],
        attendance: [],
      };
    const profiles = await database
      .from("user_profiles")
      .select("id, employee_id, username, display_name, area, company_tag")
      .eq("is_active", true)
      .in("area", areas)
      .in("company_tag", [
        "BA",
        "BA_CHEER",
        "SURVEYOR",
        "BA_SUPERVISOR",
        "SUPERVISOR",
      ])
      .order("display_name");
    if (profiles.error) throw profiles.error;
    const team = profiles.data || [];
    const ids = team.map((profile) => profile.id);
    if (!ids.length)
      return {
        success: true as const,
        areas,
        team,
        reports: [],
        attendance: [],
      };
    const reports: any[] = [];
    const attendance: any[] = [];
    for (let offset = 0; ; offset += 1000) {
      const result = await database
        .from("pg_daily_activity_reports")
        .select(
          "id, user_id, store_code, report_date, promotion_id, feedback_store, remark, pg_daily_report_products(id, barcode, descriptions, item_scope, sales_qty, credit_factor, stock_after)",
        )
        .in("user_id", ids)
        .gte("report_date", startDate)
        .lte("report_date", endDate)
        .order("id", { ascending: false })
        .range(offset, offset + 999);
      if (result.error) throw result.error;
      reports.push(...(result.data || []));
      if (!result.data || result.data.length < 1000) break;
    }
    for (let offset = 0; ; offset += 1000) {
      const result = await database
        .from("pg_attendance_logs")
        .select(
          "id, user_id, store_code, store_name, check_in_at, check_out_at",
        )
        .in("user_id", ids)
        .gte("check_in_at", `${startDate}T00:00:00+07:00`)
        .lt(
          "check_in_at",
          `${nextDay.toISOString().slice(0, 10)}T00:00:00+07:00`,
        )
        .order("id", { ascending: false })
        .range(offset, offset + 999);
      if (result.error) throw result.error;
      attendance.push(...(result.data || []));
      if (!result.data || result.data.length < 1000) break;
    }
    return { success: true as const, areas, team, reports, attendance };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "โหลดข้อมูลทีมไม่สำเร็จ",
    };
  }
}

export async function updateKoeAttendanceAction(input: {
  id: number;
  checkInAt: string;
  checkOutAt: string | null;
  expectedInAt: string;
  expectedOutAt: string | null;
  reason: string;
}) {
  try {
    const { session, database } = await requireKoeAccess();
    if (
      !Number.isInteger(input.id) ||
      input.id <= 0 ||
      !Number.isFinite(Date.parse(input.checkInAt)) ||
      (input.checkOutAt && !Number.isFinite(Date.parse(input.checkOutAt)))
    )
      throw new Error("ข้อมูลเวลาไม่ถูกต้อง");
    const { error } = await database.rpc("koe_update_attendance", {
      p_actor_id: session.id,
      p_log_id: input.id,
      p_check_in: input.checkInAt,
      p_check_out: input.checkOutAt,
      p_reason: String(input.reason || "").trim(),
      p_expected_in: input.expectedInAt,
      p_expected_out: input.expectedOutAt,
    });
    if (error) throw error;
    return { success: true as const };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "แก้ไขเวลาไม่สำเร็จ",
    };
  }
}

const cheerTags = new Set(["BA", "BA_CHEER", "SURVEYOR"]);
const supervisorTags = new Set(["BA_SUPERVISOR", "SUPERVISOR"]);
const dateOnly = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

async function getKpiContext(targetUserId: number, month: string) {
  const { database, areas, session } = await requireKoeAccess();
  if (
    !Number.isInteger(targetUserId) ||
    targetUserId <= 0 ||
    !/^\d{4}-\d{2}$/.test(month)
  )
    throw new Error("ข้อมูลการประเมินไม่ถูกต้อง");
  const periodMonth = `${month}-01`;
  const monthEnd = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);
  const { data: target, error: targetError } = await database
    .from("user_profiles")
    .select("id,username,employee_id,display_name,company_tag,area,is_active")
    .eq("id", targetUserId)
    .maybeSingle();
  if (
    targetError ||
    !target ||
    target.is_active !== true ||
    !areas.includes(String(target.area || ""))
  )
    throw new Error("ไม่มีสิทธิ์ประเมินพนักงาน Area นี้");
  const targetTag = String(target.company_tag || "")
    .trim()
    .toUpperCase();
  const assessmentType = supervisorTags.has(targetTag)
    ? "BA_SUPERVISOR"
    : cheerTags.has(targetTag)
      ? "BA_CHEER"
      : null;
  if (!assessmentType)
    throw new Error("ไม่พบประเภท BA Cheer หรือ BA Supervisor ของผู้ใช้");
  return {
    database,
    areas,
    session,
    target,
    assessmentType,
    periodMonth,
    monthStart: `${month}-01`,
    monthEnd,
  };
}

export async function getKoeKpiFormAction(targetUserId: number, month: string) {
  try {
    const context = await getKpiContext(targetUserId, month);
    const { data, error } = await context.database
      .from("koe_kpi_evaluations")
      .select("*")
      .eq("target_user_id", targetUserId)
      .eq("period_month", context.periodMonth)
      .eq("assessment_type", context.assessmentType)
      .maybeSingle();
    if (error) throw error;
    let derived = {
      attendancePercent: null as number | null,
      oosPercent: null as number | null,
      late: 0,
      shifts: 0,
      oos: 0,
      universe: 0,
    };
    if (context.assessmentType === "BA_SUPERVISOR") {
      const { data: team, error: teamError } = await context.database
        .from("user_profiles")
        .select("id,company_tag")
        .eq("is_active", true)
        .in("area", context.areas);
      if (teamError) throw teamError;
      const cheerIds = (team || [])
        .filter((item) =>
          cheerTags.has(
            String(item.company_tag || "")
              .trim()
              .toUpperCase(),
          ),
        )
        .map((item) => item.id);
      if (cheerIds.length) {
        const [attendanceResult, scheduleResult, reportResult] =
          await Promise.all([
            context.database
              .from("pg_attendance_logs")
              .select("id,user_id,store_code,check_in_at")
              .in("user_id", cheerIds)
              .gte("check_in_at", `${context.monthStart}T00:00:00+07:00`)
              .lt(
                "check_in_at",
                `${new Date(Date.parse(`${context.monthEnd}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)}T00:00:00+07:00`,
              ),
            context.database
              .from("pg_user_store_schedules")
              .select("user_id,store_code,start_date,end_date,shift_start_time")
              .in("user_id", cheerIds)
              .eq("is_active", true)
              .lte("start_date", context.monthEnd)
              .gte("end_date", context.monthStart),
            context.database
              .from("pg_daily_activity_reports")
              .select(
                "id,user_id,report_date,pg_daily_report_products(item_scope,stock_after)",
              )
              .in("user_id", cheerIds)
              .gte("report_date", context.monthStart)
              .lte("report_date", context.monthEnd),
          ]);
        if (attendanceResult.error) throw attendanceResult.error;
        if (scheduleResult.error) throw scheduleResult.error;
        if (reportResult.error) throw reportResult.error;
        const schedules = scheduleResult.data || [];
        const shiftRows = (attendanceResult.data || []).flatMap((log: any) => {
          const date = dateOnly(log.check_in_at);
          const schedule = schedules.find(
            (item: any) =>
              String(item.user_id) === String(log.user_id) &&
              item.store_code === log.store_code &&
              item.start_date <= date &&
              item.end_date >= date,
          );
          if (!schedule) return [];
          const shift = String(schedule.shift_start_time || "10:00:00").slice(
            0,
            8,
          );
          return [
            {
              scheduledAt: `${date}T${shift}+07:00`,
              checkedInAt: log.check_in_at,
            },
          ];
        });
        const attendance = shiftRows.length
          ? (await import("@/utils/koe-kpi")).calculateAttendanceAchievement(
              shiftRows,
            )
          : null;
        const stocks = (reportResult.data || []).flatMap((report: any) =>
          (report.pg_daily_report_products || [])
            .filter(
              (item: any) =>
                String(item.item_scope || "OUR").toUpperCase() !== "COMPETITOR",
            )
            .map((item: any) =>
              item.stock_after == null ? null : Number(item.stock_after),
            ),
        );
        const oos = calculateOosAchievement(stocks);
        derived = {
          attendancePercent: attendance?.percentage ?? null,
          oosPercent: oos?.percentage ?? null,
          late: attendance?.late ?? 0,
          shifts: attendance?.shifts ?? 0,
          oos: oos?.shortages ?? 0,
          universe: oos?.universe ?? 0,
        };
      }
    }
    return {
      success: true as const,
      target: context.target,
      assessmentType: context.assessmentType,
      evaluation: data,
      derived,
    };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "โหลดแบบประเมิน KPI ไม่สำเร็จ",
    };
  }
}

export async function saveKoeKpiEvaluationAction(input: {
  targetUserId: number;
  month: string;
  grades?: Record<string, CheerGrade>;
  trainingPercent?: number;
  reportPlanningPercent?: number;
  note: string;
  submit: boolean;
}) {
  try {
    const context = await getKpiContext(
      Number(input.targetUserId),
      input.month,
    );
    let criteria: Record<string, unknown>;
    let scorePercent: number;
    let totalAmount: number;
    if (context.assessmentType === "BA_CHEER") {
      const result = calculateCheerKpi(input.grades || {});
      criteria = { grades: input.grades, amounts: result.amounts };
      scorePercent = result.percentage;
      totalAmount = result.total;
    } else {
      const training = Number(input.trainingPercent);
      const planning = Number(input.reportPlanningPercent);
      if (
        !Number.isFinite(training) ||
        training < 0 ||
        training > 500 ||
        !Number.isFinite(planning) ||
        planning < 0 ||
        planning > 500
      )
        throw new Error(
          "Training และ Report & Planning ต้องอยู่ระหว่าง 0–500%",
        );
      const derivedResult = await getKoeKpiFormAction(
        context.target.id,
        input.month,
      );
      if (!derivedResult.success) throw new Error(derivedResult.message);
      if (
        derivedResult.derived.attendancePercent == null ||
        derivedResult.derived.oosPercent == null
      )
        throw new Error(
          "ข้อมูลกะหรือรายงานสินค้าใน Area ยังไม่ครบ ไม่สามารถคำนวณ KPI Supervisor ได้",
        );
      const achievements = [
        training,
        derivedResult.derived.attendancePercent,
        derivedResult.derived.oosPercent,
        planning,
      ];
      const result = calculateSupervisorKpi(achievements);
      criteria = {
        achievements,
        amounts: result.amounts,
        attendance: derivedResult.derived,
        oos: {
          shortages: derivedResult.derived.oos,
          universe: derivedResult.derived.universe,
          percentage: 100 - derivedResult.derived.oosPercent,
        },
      };
      scorePercent = result.percentage;
      totalAmount = result.total;
    }
    const { data, error } = await context.database.rpc("koe_save_evaluation", {
      p_actor_id: context.session.id,
      p_target_user_id: context.target.id,
      p_period_month: context.periodMonth,
      p_assessment_type: context.assessmentType,
      p_submit: input.submit === true,
      p_criteria: criteria,
      p_score_percent: scorePercent,
      p_amount: totalAmount,
      p_note: String(input.note || "").slice(0, 2000),
    });
    if (error) throw error;
    return { success: true as const, id: data, scorePercent, totalAmount };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "บันทึกแบบประเมินไม่สำเร็จ",
    };
  }
}

export async function getKoeKpiSummaryAction(month: string) {
  try {
    const { database, areas } = await requireKoeAccess();
    if (!/^\d{4}-\d{2}$/.test(month))
      throw new Error("เดือนที่เลือกไม่ถูกต้อง");
    const { data: profiles, error: profileError } = await database
      .from("user_profiles")
      .select("id,username,employee_id,display_name,company_tag,area")
      .eq("is_active", true)
      .in("area", areas);
    if (profileError) throw profileError;
    const ids = (profiles || []).map((profile) => profile.id);
    if (!ids.length) return { success: true as const, rows: [] };
    const yearStart = `${month.slice(0, 4)}-01-01`;
    const monthStart = `${month}-01`;
    const [monthlyResult, ytdResult] = await Promise.all([
      database
        .from("koe_kpi_evaluations")
        .select(
          "id,target_user_id,period_month,assessment_type,status,score_percent,amount,criteria,review_note",
        )
        .in("target_user_id", ids)
        .eq("period_month", monthStart),
      database
        .from("koe_kpi_evaluations")
        .select(
          "target_user_id,period_month,assessment_type,status,score_percent,amount",
        )
        .in("target_user_id", ids)
        .gte("period_month", yearStart)
        .lte("period_month", monthStart),
    ]);
    if (monthlyResult.error) throw monthlyResult.error;
    if (ytdResult.error) throw ytdResult.error;
    const ytdByKey = new Map<
      string,
      { score: number; months: Set<string>; approvedAmount: number }
    >();
    for (const row of ytdResult.data || []) {
      const key = `${row.target_user_id}:${row.assessment_type}`;
      const current = ytdByKey.get(key) || {
        score: 0,
        months: new Set<string>(),
        approvedAmount: 0,
      };
      if (row.status === "pending" || row.status === "approved") {
        current.score += Number(row.score_percent || 0);
        current.months.add(String(row.period_month).slice(0, 7));
      }
      if (row.status === "approved")
        current.approvedAmount += Number(row.amount || 0);
      ytdByKey.set(key, current);
    }
    const profileMap = new Map(
      (profiles || []).map((profile) => [String(profile.id), profile]),
    );
    const rows = (monthlyResult.data || []).map((row: any) => {
      const ytd = ytdByKey.get(
        `${row.target_user_id}:${row.assessment_type}`,
      ) || { score: 0, months: new Set<string>(), approvedAmount: 0 };
      return {
        ...row,
        employee: profileMap.get(String(row.target_user_id)),
        ytdAverageScore: ytd.months.size ? ytd.score / ytd.months.size : 0,
        ytdApprovedAmount: ytd.approvedAmount,
      };
    });
    return { success: true as const, rows };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "โหลดสรุป KPI ไม่สำเร็จ",
    };
  }
}

export async function getKoeKpiApprovalsAction(month: string) {
  try {
    await requireAdminSession();
    if (!/^\d{4}-\d{2}$/.test(month))
      throw new Error("เดือนที่เลือกไม่ถูกต้อง");
    const database = getKoeServerDatabase();
    const yearStart = `${month.slice(0, 4)}-01-01`;
    const periodMonth = `${month}-01`;
    const [{ data, error }, ytdResult] = await Promise.all([
      database
        .from("koe_kpi_evaluations")
        .select("*")
        .eq("period_month", periodMonth)
        .order("submitted_at"),
      database
        .from("koe_kpi_evaluations")
        .select(
          "target_user_id,period_month,assessment_type,status,score_percent,amount",
        )
        .gte("period_month", yearStart)
        .lte("period_month", periodMonth),
    ]);
    if (error) throw error;
    if (ytdResult.error) throw ytdResult.error;
    const ids = Array.from(
      new Set((data || []).map((item: any) => item.target_user_id)),
    );
    const profiles = ids.length
      ? await database
          .from("user_profiles")
          .select("id,employee_id,display_name,area,company_tag")
          .in("id", ids)
      : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    const ytd = new Map<
      string,
      { score: number; months: Set<string>; approvedAmount: number }
    >();
    for (const item of ytdResult.data || []) {
      const key = `${item.target_user_id}:${item.assessment_type}`;
      const value = ytd.get(key) || {
        score: 0,
        months: new Set<string>(),
        approvedAmount: 0,
      };
      if (item.status === "pending" || item.status === "approved") {
        value.score += Number(item.score_percent || 0);
        value.months.add(String(item.period_month).slice(0, 7));
      }
      if (item.status === "approved")
        value.approvedAmount += Number(item.amount || 0);
      ytd.set(key, value);
    }
    const lookup = new Map(
      (profiles.data || []).map((profile: any) => [
        String(profile.id),
        profile,
      ]),
    );
    return {
      success: true as const,
      rows: (data || []).map((item: any) => ({
        ...item,
        employee: lookup.get(String(item.target_user_id)),
        ytdAverageScore:
          ytd.get(`${item.target_user_id}:${item.assessment_type}`)?.months
            .size || 0
            ? ytd.get(`${item.target_user_id}:${item.assessment_type}`)!.score /
              ytd.get(`${item.target_user_id}:${item.assessment_type}`)!.months
                .size
            : 0,
        ytdApprovedAmount:
          ytd.get(`${item.target_user_id}:${item.assessment_type}`)
            ?.approvedAmount || 0,
      })),
    };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "โหลดรายการอนุมัติไม่สำเร็จ",
    };
  }
}

export async function reviewKoeKpiAction(
  id: number,
  approve: boolean,
  note: string,
) {
  try {
    const session = await requireAdminSession();
    if (!Number.isInteger(id) || id <= 0 || typeof approve !== "boolean")
      throw new Error("รายการอนุมัติไม่ถูกต้อง");
    const { data, error } = await getKoeServerDatabase().rpc(
      "koe_review_evaluation",
      {
        p_actor_id: session.id,
        p_evaluation_id: id,
        p_approve: approve,
        p_note: String(note || "").slice(0, 2000),
      },
    );
    if (error) throw error;
    return { success: true as const, data };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "บันทึกผลอนุมัติไม่สำเร็จ",
    };
  }
}

export async function updateKoeReportAction(input: {
  id: number;
  feedback: string;
  remark: string;
  products: Array<{
    id: number;
    sales_qty: number;
    stock_after: number | null;
  }>;
  reason: string;
}) {
  try {
    const { session, database } = await requireKoeAccess();
    if (
      !Number.isInteger(input.id) ||
      input.id <= 0 ||
      !Array.isArray(input.products) ||
      input.products.length > 100
    )
      throw new Error("ข้อมูลรายงานไม่ถูกต้อง");
    const cleanProducts = input.products.map((item) => {
      if (
        !Number.isInteger(item.id) ||
        item.id <= 0 ||
        !Number.isInteger(item.sales_qty) ||
        item.sales_qty < 0 ||
        (item.stock_after !== null &&
          (!Number.isInteger(item.stock_after) || item.stock_after < 0))
      )
        throw new Error("จำนวนขายหรือสต็อกไม่ถูกต้อง");
      return item;
    });
    if (
      new Set(cleanProducts.map((item) => item.id)).size !==
      cleanProducts.length
    )
      throw new Error("พบรายการสินค้าในรายงานซ้ำ กรุณารีเฟรช");
    const { error } = await database.rpc("koe_update_report", {
      p_actor_id: session.id,
      p_report_id: input.id,
      p_products: cleanProducts,
      p_feedback: String(input.feedback || "").slice(0, 5000),
      p_remark: String(input.remark || "").slice(0, 5000),
      p_reason: String(input.reason || "").slice(0, 500),
    });
    if (error) throw error;
    return { success: true as const };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "บันทึกรายงานไม่สำเร็จ",
    };
  }
}

async function getChatParticipant(database: any, id: number) {
  const { data, error } = await database
    .from("user_profiles")
    .select("id,display_name,username,company_tag,area,is_active")
    .eq("id", id)
    .maybeSingle();
  if (error || !data || data.is_active !== true)
    throw new Error("ไม่พบผู้ร่วมสนทนาที่เปิดใช้งาน");
  return data;
}

async function authorizeKoeConversation(
  database: any,
  actorId: number,
  peerId: number,
) {
  const session = await getUserSession();
  if (!session || session.id !== actorId)
    throw new Error("กรุณาเข้าสู่ระบบใหม่");
  const [actor, peer] = await Promise.all([
    getChatParticipant(database, actorId),
    getChatParticipant(database, peerId),
  ]);
  const actorTag = String(actor.company_tag || "").toUpperCase();
  const peerTag = String(peer.company_tag || "").toUpperCase();
  const actorIsKoe = session.role === "koe";
  if (actorIsKoe) {
    const { areas } = await requireKoeAccess();
    if (
      !areas.includes(String(peer.area || "").trim()) ||
      !["BA", "BA_CHEER", "SURVEYOR"].includes(peerTag)
    )
      throw new Error("ไม่มีสิทธิ์สนทนากับผู้ใช้รายนี้");
    return { area: String(peer.area).trim(), peer };
  }
  if (
    session.role !== "staff" ||
    !["BA", "BA_CHEER", "SURVEYOR"].includes(actorTag)
  )
    throw new Error("เฉพาะ BA Cheer และ KOE ที่ส่งข้อความหากันได้");
  const { data, error } = await database
    .from("koe_areas")
    .select("area")
    .eq("koe_user_id", peerId);
  if (error) throw error;
  if (
    !data?.some(
      (item: any) =>
        String(item.area).trim() === String(actor.area || "").trim(),
    )
  )
    throw new Error("ไม่มีสิทธิ์สนทนากับผู้ใช้รายนี้");
  if (!["KOE", "KEY_ACCOUNT_OPERATION_EXECUTIVE"].includes(peerTag))
    throw new Error("ไม่มีสิทธิ์สนทนากับผู้ใช้รายนี้");
  return { area: String(actor.area).trim(), peer };
}

export async function getKoeChatContactsAction() {
  try {
    const session = await getUserSession();
    if (!session) throw new Error("กรุณาเข้าสู่ระบบ");
    const database = getKoeServerDatabase();
    const actor = await getChatParticipant(database, session.id);
    const tag = String(actor.company_tag || "").toUpperCase();
    if (session.role === "koe") {
      const { areas } = await requireKoeAccess();
      if (!areas.length) return { success: true as const, contacts: [] };
      const { data, error } = await database
        .from("user_profiles")
        .select("id,display_name,username,area,company_tag")
        .eq("is_active", true)
        .in("area", areas)
        .in("company_tag", ["BA", "BA_CHEER", "SURVEYOR"])
        .order("display_name");
      if (error) throw error;
      return { success: true as const, contacts: data || [] };
    }
    if (
      session.role !== "staff" ||
      !["BA", "BA_CHEER", "SURVEYOR"].includes(tag)
    )
      throw new Error("บัญชีนี้ไม่มีสิทธิ์ใช้แชตทีม");
    const { data: areas, error: areasError } = await database
      .from("koe_areas")
      .select("koe_user_id,area")
      .eq("area", actor.area);
    if (areasError) throw areasError;
    const ids = Array.from(
      new Set((areas || []).map((item: any) => item.koe_user_id)),
    );
    if (!ids.length) return { success: true as const, contacts: [] };
    const { data, error } = await database
      .from("user_profiles")
      .select("id,display_name,username,area,company_tag")
      .eq("is_active", true)
      .in("id", ids);
    if (error) throw error;
    return {
      success: true as const,
      contacts: (data || []).filter((item: any) =>
        ["KOE", "KEY_ACCOUNT_OPERATION_EXECUTIVE"].includes(
          String(item.company_tag || "")
            .trim()
            .toUpperCase(),
        ),
      ),
    };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "โหลดรายชื่อสนทนาไม่สำเร็จ",
    };
  }
}

export async function getKoeUnreadMessageCountAction() {
  try {
    const session = await getUserSession();
    if (!session) throw new Error("กรุณาเข้าสู่ระบบ");
    const database = getKoeServerDatabase();
    const actor = await getChatParticipant(database, session.id);
    const actorTag = String(actor.company_tag || "")
      .trim()
      .toUpperCase();
    let areas: string[];

    if (session.role === "koe") {
      areas = (await requireKoeAccess()).areas;
    } else if (
      session.role === "staff" &&
      ["BA", "BA_CHEER", "SURVEYOR"].includes(actorTag)
    ) {
      areas = [String(actor.area || "").trim()].filter(Boolean);
    } else {
      throw new Error("บัญชีนี้ไม่มีสิทธิ์ใช้แชตทีม");
    }

    if (!areas.length) return { success: true as const, unreadCount: 0 };

    let query: any = database
      .from("koe_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", session.id)
      .in("area", areas)
      .is("read_at", null);

    if (session.role === "staff") {
      const { data: assignments, error: assignmentError } = await database
        .from("koe_areas")
        .select("koe_user_id")
        .in("area", areas);
      if (assignmentError) throw assignmentError;
      const koeIds = Array.from(
        new Set(
          (assignments || []).map((item: any) => Number(item.koe_user_id)),
        ),
      );
      if (!koeIds.length) return { success: true as const, unreadCount: 0 };
      query = query.in("sender_id", koeIds);
    }

    const { count, error } = await query;
    if (error) throw error;
    return { success: true as const, unreadCount: count || 0 };
  } catch (error: any) {
    return {
      success: false as const,
      unreadCount: 0,
      message: error.message || "โหลดจำนวนข้อความที่ยังไม่อ่านไม่สำเร็จ",
    };
  }
}

export async function getKoeChatMessagesAction(peerId: number, afterId = 0) {
  try {
    const session = await getUserSession();
    if (
      !session ||
      !Number.isInteger(peerId) ||
      peerId <= 0 ||
      !Number.isInteger(afterId) ||
      afterId < 0
    )
      throw new Error("ข้อมูลสนทนาไม่ถูกต้อง");
    const database = getKoeServerDatabase();
    const { area } = await authorizeKoeConversation(
      database,
      session.id,
      peerId,
    );
    const { data, error } = await database
      .from("koe_chat_messages")
      .select("id,sender_id,recipient_id,body,created_at,read_at")
      .eq("area", area)
      .or(
        `and(sender_id.eq.${session.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${session.id})`,
      )
      .gt("id", afterId)
      .order("id")
      .limit(100);
    if (error) throw error;
    return { success: true as const, messages: data || [] };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "โหลดข้อความไม่สำเร็จ",
    };
  }
}

export async function sendKoeChatMessageAction(
  peerId: number,
  bodyInput: string,
) {
  try {
    const session = await getUserSession();
    const body = String(bodyInput || "").trim();
    if (
      !session ||
      !Number.isInteger(peerId) ||
      peerId <= 0 ||
      !body ||
      body.length > 2000
    )
      throw new Error("ข้อความไม่ถูกต้อง");
    const database = getKoeServerDatabase();
    const { area } = await authorizeKoeConversation(
      database,
      session.id,
      peerId,
    );
    const { data, error } = await database
      .from("koe_chat_messages")
      .insert({ sender_id: session.id, recipient_id: peerId, area, body })
      .select("id,sender_id,recipient_id,body,created_at,read_at")
      .single();
    if (error) throw error;
    return { success: true as const, message: data };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "ส่งข้อความไม่สำเร็จ",
    };
  }
}

export async function markKoeChatReadAction(
  peerId: number,
  messageIds: number[],
) {
  try {
    const session = await getUserSession();
    if (
      !session ||
      !Number.isInteger(peerId) ||
      !Array.isArray(messageIds) ||
      messageIds.length > 100 ||
      messageIds.some((id) => !Number.isInteger(id) || id <= 0)
    )
      throw new Error("ข้อมูลข้อความไม่ถูกต้อง");
    if (!messageIds.length) return { success: true as const };
    const database = getKoeServerDatabase();
    const { area } = await authorizeKoeConversation(
      database,
      session.id,
      peerId,
    );
    const { error } = await database
      .from("koe_chat_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("area", area)
      .eq("sender_id", peerId)
      .eq("recipient_id", session.id)
      .in("id", messageIds)
      .is("read_at", null);
    if (error) throw error;
    return { success: true as const };
  } catch (error: any) {
    return {
      success: false as const,
      message: error.message || "อัปเดตสถานะอ่านข้อความไม่สำเร็จ",
    };
  }
}
