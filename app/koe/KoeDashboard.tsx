"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardCheck,
  Clock,
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
  company_tag: string;
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
  store_code: string;
  store_name: string;
  check_in_at: string;
  check_out_at: string | null;
};
type StoreOption = { code: string; name: string };
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
  const [currentTime, setCurrentTime] = useState("");
  const [area, setArea] = useState("");
  const [baUserId, setBaUserId] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
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

  useEffect(() => {
    const updateTime = () =>
      setCurrentTime(
        new Intl.DateTimeFormat("th-TH", {
          timeZone: "Asia/Bangkok",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        }).format(new Date()),
      );
    updateTime();
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const areaTeam = useMemo(
    () => data.team.filter((member) => !area || member.area === area),
    [area, data.team],
  );
  const cheerTeam = useMemo(
    () =>
      areaTeam.filter((member) =>
        ["BA", "BA_CHEER", "SURVEYOR"].includes(
          String(member.company_tag || "")
            .trim()
            .toUpperCase(),
        ),
      ),
    [areaTeam],
  );
  const reportStores = useMemo(() => {
    const allowed = baUserId
      ? cheerTeam.filter((member) => String(member.id) === baUserId)
      : cheerTeam;
    const ids = new Set(allowed.map((member) => String(member.id)));
    const stores = new Map<string, string>();
    for (const report of data.reports) {
      if (ids.has(String(report.user_id)) && report.store_code) {
        stores.set(report.store_code, stores.get(report.store_code) || "");
      }
    }
    for (const log of data.attendance) {
      if (ids.has(String(log.user_id)) && log.store_code) {
        stores.set(
          log.store_code,
          log.store_name || stores.get(log.store_code) || "",
        );
      }
    }
    return Array.from(stores, ([code, name]) => ({ code, name })).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }, [baUserId, cheerTeam, data.attendance, data.reports]);

  const buildActionHref = (path: string) => {
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (storeFilter) params.set("store", storeFilter);
    const suffix = params.toString();
    return suffix ? `${path}?${suffix}` : path;
  };

  const buildSelectedBaDashboardHref = () => {
    const params = new URLSearchParams({ userId: baUserId });
    if (storeFilter) params.set("store", storeFilter);
    return `/dashboard?${params.toString()}`;
  };

  const summary = useMemo(() => {
    const team = baUserId
      ? cheerTeam.filter((member) => String(member.id) === baUserId)
      : areaTeam;
    const ids = new Set(team.map((member) => String(member.id)));
    const reports = data.reports.filter(
      (report) =>
        ids.has(String(report.user_id)) &&
        (!storeFilter || report.store_code === storeFilter),
    );
    const attendance = data.attendance.filter(
      (log) =>
        ids.has(String(log.user_id)) &&
        (!storeFilter || log.store_code === storeFilter),
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
        lastReport: personalReports[0] || null,
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
  }, [areaTeam, baUserId, cheerTeam, data, storeFilter]);

  return (
    <div className="staff-theme koe-dashboard min-h-screen bg-slate-100 pb-10 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-blue-950/20 bg-[#1e3a8a] text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="กลับ" title="กลับ">
              <ArrowLeft size={20} />
            </Link>
            <img
              src="/rvp.png"
              alt="Reverpro Intertrade logo"
              className="h-10 w-10 shrink-0 rounded-full bg-white p-1 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-blue-100">
                RVI-PUSH GIRL · Reverpro Intertrade Co., Ltd.
              </p>
              <h1 className="text-base font-bold">KOE Dashboard</h1>
              <p className="truncate text-xs text-blue-100">{name}</p>
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
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-xs font-semibold text-blue-900 shadow-sm">
          <Clock size={16} className="shrink-0 text-blue-700" />
          <span>{currentTime || "กำลังโหลดวันและเวลา..."} น.</span>
        </div>

        <div className="koe-filter-panel rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                View Report
              </p>
              <h2 className="text-base font-black">ตัวกรองทีม BA Cheer</h2>
            </div>
            <Link
              href="/koe/chat"
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-900 transition hover:bg-blue-100"
            >
              <MessageCircle size={12} /> ทีม
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold">
              วันที่เริ่มต้น
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="text-xs font-bold">
              วันที่สิ้นสุด
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today()}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="text-xs font-bold">
              Area
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={area}
                onChange={(event) => {
                  setArea(event.target.value);
                  setBaUserId("");
                  setStoreFilter("");
                }}
              >
                <option value="">ทุก Area</option>
                {data.areas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold">
              BA Cheer ในทีม
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={baUserId}
                onChange={(event) => {
                  setBaUserId(event.target.value);
                  setStoreFilter("");
                }}
              >
                <option value="">BA Cheer ทุกคนในทีม</option>
                {cheerTeam.map((member) => (
                  <option key={member.id} value={String(member.id)}>
                    {member.display_name || member.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold sm:col-span-2">
              สาขาของ BA Cheer
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={storeFilter}
                onChange={(event) => setStoreFilter(event.target.value)}
              >
                <option value="">ทุกสาขา</option>
                {reportStores.map((store) => (
                  <option key={store.code} value={store.code}>
                    {store.name ? `${store.name} · ` : ""}
                    {store.code}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p className="rounded-xl border border-white/15 bg-slate-950/40 py-8 text-center text-sm text-slate-100">
            กำลังโหลดข้อมูลทีม...
          </p>
        ) : (
          !error && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "พนักงาน", value: summary.rows.length },
                  { label: "รายงาน", value: summary.reports },
                  { label: "ครั้งลงเวลา", value: summary.shifts },
                  { label: "ยอดผลงาน", value: amount(summary.sales) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="koe-stat-card rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-1 text-xl font-bold text-blue-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Link
                  href={buildActionHref("/daily-report")}
                  className="koe-action-link flex w-full items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-4 text-left text-sm font-bold text-blue-900 shadow-sm transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <span className="flex items-center gap-2">
                    <ClipboardCheck size={18} /> ส่งงาน Daily Report
                  </span>
                  <span className="text-lg">›</span>
                </Link>
                <Link
                  href={buildActionHref("/sales-videos/upload")}
                  className="koe-action-link flex w-full items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-4 text-left text-sm font-bold text-blue-900 shadow-sm transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <span className="flex items-center gap-2">
                    <Users size={18} /> อัปโหลดคลิปวิดีโอการเชียร์ขาย
                  </span>
                  <span className="text-lg">›</span>
                </Link>
                <Link
                  href={buildActionHref("/promotions")}
                  className="koe-action-link flex w-full items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-4 text-left text-sm font-bold text-blue-900 shadow-sm transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <span className="flex items-center gap-2">
                    <MessageCircle size={18} /> ข้อมูลข่าวสาร & Promotion
                  </span>
                  <span className="text-lg">›</span>
                </Link>
                <Link
                  href={baUserId ? buildSelectedBaDashboardHref() : "#"}
                  aria-disabled={!baUserId}
                  onClick={(event) => {
                    if (!baUserId) event.preventDefault();
                  }}
                  className={`koe-action-link flex w-full items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-4 text-left text-sm font-bold text-blue-900 shadow-sm transition ${baUserId ? "hover:border-blue-400 hover:bg-blue-50" : "cursor-not-allowed opacity-60"}`}
                >
                  <span className="flex items-center gap-2">
                    <ClipboardCheck size={18} />
                    {baUserId
                      ? "Dashboard วิเคราะห์ผลงาน"
                      : "เลือก BA Cheer เพื่อเปิด Dashboard"}
                  </span>
                  <span className="text-lg">›</span>
                </Link>
              </div>

              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <Users size={16} /> รายงานของทีมตามร้านที่เลือก
                </h2>
                <div className="space-y-2">
                  {summary.rows.map(
                    ({ member, reports, lastReport, logs, sales }) => (
                      <article
                        key={member.id}
                        className="koe-member-card rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
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
                          {reports} รายงาน · {logs.length} ครั้งเข้าร้าน ·
                          {lastReport
                            ? ` ร้านล่าสุด ${lastReport.store_code}`
                            : " ยังไม่มีรายงาน"}
                        </p>
                      </article>
                    ),
                  )}
                  {!summary.rows.length && (
                    <p className="rounded-xl border border-white/15 bg-slate-950/40 py-6 text-center text-sm text-slate-100">
                      ไม่มีพนักงานใน Area / ร้านค้าที่เลือก
                    </p>
                  )}
                </div>
              </section>
            </>
          )
        )}
      </main>
    </div>
  );
}
