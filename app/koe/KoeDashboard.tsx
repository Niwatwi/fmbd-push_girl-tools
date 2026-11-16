"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardCheck,
  MessageCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import ThemeToggle from "@/app/components/ThemeToggle";
import {
  getKoeDashboardAction,
  updateKoeAttendanceAction,
  updateKoeReportAction,
} from "./actions";

type TeamMember = {
  id: number;
  display_name: string;
  employee_id: string | null;
  username: string;
  area: string;
};
type Product = {
  id: number;
  barcode: string;
  descriptions: string;
  item_scope: string | null;
  sales_qty: number;
  credit_factor: number | null;
  stock_after: number | null;
};
type Report = {
  id: number;
  user_id: number;
  store_code: string;
  report_date: string;
  feedback_store: string;
  remark: string;
  pg_daily_report_products: Product[] | null;
};
type Attendance = {
  id: number;
  user_id: number;
  store_name: string;
  check_in_at: string;
  check_out_at: string | null;
};
type Data = {
  areas: string[];
  team: TeamMember[];
  reports: Report[];
  attendance: Attendance[];
};
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "-";
const amount = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

function thaiInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function AttendanceEditor({
  log,
  onSaved,
}: {
  log: Attendance;
  onSaved: () => void;
}) {
  const [checkIn, setCheckIn] = useState(() => thaiInput(log.check_in_at));
  const [checkOut, setCheckOut] = useState(() => thaiInput(log.check_out_at));
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!checkIn || reason.trim().length < 3) {
      setMessage("กรุณาระบุเวลาเข้าและเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }
    setSaving(true);
    const result = await updateKoeAttendanceAction({
      id: log.id,
      checkInAt: `${checkIn}:00+07:00`,
      checkOutAt: checkOut ? `${checkOut}:00+07:00` : null,
      expectedInAt: log.check_in_at,
      expectedOutAt: log.check_out_at,
      reason,
    });
    if (result.success) onSaved();
    else setMessage(result.message);
    setSaving(false);
  }

  return (
    <details className="mt-2 border-t border-slate-200 pt-2 text-xs">
      <summary className="cursor-pointer font-bold text-blue-700">
        {log.store_name || "ร้านค้า"} · เข้า {dateTime(log.check_in_at)} · ออก{" "}
        {dateTime(log.check_out_at)}
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label>
          เวลาเข้า
          <input
            type="datetime-local"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
          />
        </label>
        <label>
          เวลาออก
          <input
            type="datetime-local"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
          />
        </label>
        <label className="sm:col-span-2">
          เหตุผล
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
          />
        </label>
      </div>
      {message && (
        <p role="alert" className="mt-2 text-red-700">
          {message}
        </p>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-2 rounded bg-blue-700 px-3 py-2 font-bold text-white disabled:opacity-50"
      >
        {saving ? "กำลังบันทึก..." : "บันทึกเวลา"}
      </button>
    </details>
  );
}

function ReportEditor({
  report,
  onSaved,
}: {
  report: Report;
  onSaved: () => void;
}) {
  const [feedback, setFeedback] = useState(report.feedback_store || "");
  const [remark, setRemark] = useState(report.remark || "");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState(
    (report.pg_daily_report_products || [])
      .filter(
        (item) =>
          String(item.item_scope || "OUR").toUpperCase() !== "COMPETITOR",
      )
      .map((item) => ({
        ...item,
        sales_qty: Number(item.sales_qty || 0),
        stock_after: item.stock_after == null ? null : Number(item.stock_after),
      })),
  );

  async function save() {
    if (reason.trim().length < 3) {
      setMessage("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }
    setSaving(true);
    const result = await updateKoeReportAction({
      id: report.id,
      feedback,
      remark,
      products: products.map((item) => ({
        id: item.id,
        sales_qty: Number(item.sales_qty),
        stock_after: item.stock_after == null ? null : Number(item.stock_after),
      })),
      reason,
    });
    if (result.success) onSaved();
    else setMessage(result.message);
    setSaving(false);
  }

  return (
    <details className="mt-2 border-t border-slate-200 pt-2 text-xs">
      <summary className="cursor-pointer font-bold text-blue-700">
        แก้รายงาน {report.report_date} · {report.store_code}
      </summary>
      <div className="mt-3 space-y-3">
        {products.map((item) => (
          <div key={item.id} className="rounded border border-slate-200 p-2">
            <p className="font-bold">{item.descriptions || item.barcode}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label>
                ขาย
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={item.sales_qty}
                  onChange={(event) =>
                    setProducts((current) =>
                      current.map((row) =>
                        row.id === item.id
                          ? { ...row, sales_qty: Number(event.target.value) }
                          : row,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded border p-2"
                />
              </label>
              <label>
                สต็อกหลังขาย
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={item.stock_after ?? ""}
                  onChange={(event) =>
                    setProducts((current) =>
                      current.map((row) =>
                        row.id === item.id
                          ? {
                              ...row,
                              stock_after:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            }
                          : row,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded border p-2"
                />
              </label>
            </div>
          </div>
        ))}
        <label className="block">
          Feedback ร้าน
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            maxLength={5000}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block">
          หมายเหตุ
          <textarea
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            maxLength={5000}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block font-bold">
          เหตุผลการแก้ไข
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        {message && (
          <p role="alert" className="text-red-700">
            {message}
          </p>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded bg-blue-700 px-3 py-2 font-bold text-white disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
        </button>
      </div>
    </details>
  );
}

export default function KoeDashboard({ name }: { name: string }) {
  const [startDate, setStartDate] = useState(() => `${today().slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(today);
  const [area, setArea] = useState("");
  const [data, setData] = useState<Data>({
    areas: [],
    team: [],
    reports: [],
    attendance: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    const result = await getKoeDashboardAction(startDate, endDate);
    if (result.success)
      setData({
        areas: result.areas,
        team: result.team as TeamMember[],
        reports: result.reports as Report[],
        attendance: result.attendance as Attendance[],
      });
    else {
      setData({ areas: [], team: [], reports: [], attendance: [] });
      setError(result.message);
    }
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, [startDate, endDate]);

  const summary = useMemo(() => {
    const team = data.team.filter((member) => !area || member.area === area);
    const ids = new Set(team.map((member) => String(member.id)));
    const reports = data.reports.filter((report) =>
      ids.has(String(report.user_id)),
    );
    const attendance = data.attendance.filter((log) =>
      ids.has(String(log.user_id)),
    );
    const rows = team.map((member) => {
      const personalReports = reports.filter(
        (report) => String(report.user_id) === String(member.id),
      );
      const logs = attendance.filter(
        (log) => String(log.user_id) === String(member.id),
      );
      const sales = personalReports
        .flatMap((report) => report.pg_daily_report_products || [])
        .filter(
          (product) =>
            String(product.item_scope || "OUR").toUpperCase() !== "COMPETITOR",
        )
        .reduce(
          (total, product) =>
            total +
            Number(product.sales_qty || 0) * Number(product.credit_factor ?? 1),
          0,
        );
      return {
        member,
        reports: personalReports.length,
        reportRows: personalReports,
        logs,
        sales,
      };
    });
    return {
      rows,
      reports: reports.length,
      shifts: attendance.length,
      sales: rows.reduce((total, row) => total + row.sales, 0),
    };
  }, [data, area]);

  return (
    <div className="staff-theme min-h-screen bg-slate-50 text-slate-900 pb-10">
      <header className="bg-blue-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="กลับ" title="กลับ">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-base font-bold">ภาพรวมทีม KOE</h1>
              <p className="text-xs text-blue-200">{name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              title="รีเฟรช"
              aria-label="รีเฟรช"
              onClick={() => void load()}
            >
              <RefreshCw size={18} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/koe/kpi"
            className="flex items-center justify-center gap-2 rounded-md bg-blue-700 p-3 text-sm font-bold text-white"
          >
            <ClipboardCheck size={16} /> ประเมิน KPI
          </Link>
          <Link
            href="/koe/chat"
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white p-3 text-sm font-bold"
          >
            <MessageCircle size={16} /> ข้อความทีม
          </Link>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="text-xs font-bold">
            ตั้งแต่
            <input
              className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="text-xs font-bold">
            ถึง
            <input
              className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <label className="col-span-2 text-xs font-bold sm:col-span-1">
            Area
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"
              value={area}
              onChange={(event) => setArea(event.target.value)}
            >
              <option value="">ทุก Area ที่ดูแล</option>
              {data.areas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            กำลังโหลดข้อมูลทีม...
          </p>
        ) : (
          !error && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "พนักงาน", value: summary.rows.length },
                  { label: "ครั้งลงเวลา", value: summary.shifts },
                  { label: "รายงาน", value: summary.reports },
                  { label: "ยอดคิดผลงาน", value: amount(summary.sales) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md border border-slate-200 bg-white p-3"
                  >
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-1 text-xl font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <Users size={16} /> พนักงานในเขต
                </h2>
                <div className="space-y-2">
                  {summary.rows.map(
                    ({ member, reports, reportRows, logs, sales }) => (
                      <article
                        key={member.id}
                        className="rounded-md border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="break-words text-sm font-bold">
                              {member.display_name || member.username}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {member.employee_id || member.username} ·{" "}
                              {member.area}
                            </p>
                          </div>
                          <strong className="shrink-0 text-sm text-emerald-700">
                            {amount(sales)}
                          </strong>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {logs.length} ครั้งลงเวลา · {reports} รายงาน
                        </p>
                        {logs[0] && (
                          <p className="mt-1 text-xs text-slate-500">
                            ล่าสุด {logs[0].store_name || "-"} · เข้า{" "}
                            {dateTime(logs[0].check_in_at)} · ออก{" "}
                            {dateTime(logs[0].check_out_at)}
                          </p>
                        )}
                        {logs.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-bold text-blue-700">
                              ดูและแก้ไขเวลาทำงาน ({logs.length})
                            </summary>
                            {logs.map((log) => (
                              <AttendanceEditor
                                key={log.id}
                                log={log}
                                onSaved={() => void load()}
                              />
                            ))}
                          </details>
                        )}
                        {reportRows.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-bold text-blue-700">
                              รายงานและแก้ไข ({reportRows.length})
                            </summary>
                            {reportRows.map((report) => (
                              <ReportEditor
                                key={report.id}
                                report={report}
                                onSaved={() => void load()}
                              />
                            ))}
                          </details>
                        )}
                      </article>
                    ),
                  )}
                  {!summary.rows.length && (
                    <p className="py-6 text-center text-sm text-slate-500">
                      ไม่มีพนักงานในเขตที่เลือก
                    </p>
                  )}
                </div>
              </section>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ClipboardCheck size={14} /> ข้อมูลตามช่วงวันที่และ Area
                ที่เลือก
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}
