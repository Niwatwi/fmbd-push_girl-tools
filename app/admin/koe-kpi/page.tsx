"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, RefreshCw, X } from "lucide-react";
import {
  getKoeKpiApprovalsAction,
  reviewKoeKpiAction,
} from "@/app/koe/actions";

const cheerLabels: Record<string, string> = {
  knowledge: "Product Knowledge",
  promotion: "Promotion Execution / Sale out Report",
  dailyReport: "Daily Report / OOS Report",
  display: "การจัดเรียงและความสะอาดสินค้า",
  attendance: "Attendance",
};

const supervisorLabels = [
  "Training & Coaching Achievement",
  "BA Team Sales Achievement",
  "OOS Achievement",
  "Report & Planning Achievement",
];

function numberValue(value: unknown, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "-";
}

function CriteriaDetails({ row }: { row: Row }) {
  const criteria = row.criteria || {};

  if (row.assessment_type === "BA_CHEER") {
    const grades =
      typeof criteria.grades === "object" && criteria.grades
        ? (criteria.grades as Record<string, unknown>)
        : {};
    const amounts = Array.isArray(criteria.amounts)
      ? (criteria.amounts as Array<{
          key?: string;
          grade?: string;
          amount?: number;
        }>)
      : [];
    const amountByKey = new Map(amounts.map((item) => [item.key, item]));

    return (
      <div className="mt-2 space-y-2">
        {Object.keys(cheerLabels).map((key) => {
          const item = amountByKey.get(key);
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span>{cheerLabels[key]}</span>
              <span className="text-right">
                <strong className="ml-2 text-base">
                  {String(grades[key] || item?.grade || "-")}
                </strong>
                <span className="ml-3 text-slate-600">
                  {money(Number(item?.amount || 0))} บาท
                </span>
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const achievements = Array.isArray(criteria.achievements)
    ? (criteria.achievements as unknown[])
    : [];
  const amounts = Array.isArray(criteria.amounts)
    ? (criteria.amounts as unknown[])
    : [];
  const attendance =
    typeof criteria.attendance === "object" && criteria.attendance
      ? (criteria.attendance as Record<string, unknown>)
      : {};
  const oos =
    typeof criteria.oos === "object" && criteria.oos
      ? (criteria.oos as Record<string, unknown>)
      : {};

  const oosUniverse = Number(oos.universe || 0);
  const oosShortages = Number(oos.shortages || 0);
  const oosAchievement =
    oosUniverse > 0
      ? 100 - (oosShortages / oosUniverse) * 100
      : Number(oos.percentage || 0);

  return (
    <div className="mt-2 space-y-2">
      {supervisorLabels.map((label, index) => (
        <div
          key={label}
          className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <span>{label}</span>
          <span className="text-right">
            <strong>{numberValue(achievements[index])}%</strong>
            <span className="ml-3 text-slate-600">
              {money(Number(amounts[index] || 0))} บาท
            </span>
          </span>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-3">
        <p>
          เข้าตรงเวลา:{" "}
          <strong>{numberValue(attendance.attendancePercent)}%</strong>
        </p>
        <p>
          มาสาย:{" "}
          <strong>
            {String(attendance.late || 0)}/{String(attendance.shifts || 0)}{" "}
            ครั้ง
          </strong>
        </p>
        <p>
          OOS ต่ำกว่า 3:{" "}
          <strong>
            {String(oos.shortages || 0)}/{String(oos.universe || 0)} รายการ
          </strong>
        </p>
        <p>
          OOS Achievement: <strong>{numberValue(oos.percentage)}%</strong>
        </p>
      </div>
    </div>
  );
}

type Row = {
  id: number;
  target_user_id: number;
  period_month: string;
  assessment_type: string;
  status: string;
  criteria: Record<string, unknown>;
  score_percent: number;
  amount: number;
  ytdAverageScore: number;
  ytdApprovedAmount: number;
  note: string;
  review_note: string;
  employee?: { display_name: string; employee_id: string; area: string };
};
const monthNow = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
const money = (value: number) =>
  Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

export default function KoeKpiApprovalPage() {
  const [month, setMonth] = useState(monthNow);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    setError("");
    const result = await getKoeKpiApprovalsAction(month);
    if (!result.success) {
      setRows([]);
      setError(result.message);
      return;
    }
    setRows(result.rows as Row[]);
  }
  useEffect(() => {
    void load();
  }, [month]);
  async function review(row: Row, approve: boolean) {
    const note = window.prompt(
      approve ? "หมายเหตุอนุมัติ (ถ้ามี)" : "เหตุผลที่ส่งกลับแก้ไข",
    );
    if (note === null || (!approve && note.trim().length < 3)) return;
    setBusy(row.id);
    const result = await reviewKoeKpiAction(row.id, approve, note);
    if (!result.success) setError(result.message);
    await load();
    setBusy(null);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> กลับศูนย์ผู้ดูแลระบบ
        </Link>

        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm md:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Executive Approval
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                อนุมัติ KPI ทีม KOE
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                ตรวจสอบคะแนนและยอดประเมินก่อนอนุมัติเข้าสูงสุดการสรุปผล
              </p>
            </div>
            <button
              type="button"
              title="รีเฟรชข้อมูล"
              aria-label="รีเฟรชข้อมูล"
              onClick={() => void load()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <label className="text-xs font-bold text-slate-600">
              รอบเดือน
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 sm:w-48"
              />
            </label>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              รายการรออนุมัติ{" "}
              <strong className="text-slate-800">
                {rows.filter((row) => row.status === "pending").length}
              </strong>
            </div>
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <section className="space-y-4">
          {rows.map((row) => {
            const pending = row.status === "pending";
            const approved = row.status === "approved";
            const statusClass = approved
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : pending
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-100 text-slate-600";

            return (
              <article
                key={row.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {row.employee?.display_name || "-"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.employee?.employee_id || "-"} ·{" "}
                      {row.employee?.area || "ไม่ระบุ Area"} ·{" "}
                      {row.assessment_type === "BA_CHEER"
                        ? "BA Cheer"
                        : "BA Supervisor"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass}`}
                  >
                    {pending
                      ? "รออนุมัติ"
                      : approved
                        ? "อนุมัติแล้ว"
                        : row.status === "rejected"
                          ? "ส่งกลับแก้ไข"
                          : row.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100 md:grid-cols-5 md:divide-y-0">
                  <div className="flex flex-col gap-1 p-4 text-sm">
                    <dt className="font-medium text-slate-700">คะแนนเดือน</dt>
                    <dd className="text-slate-900">
                      {Number(row.score_percent).toFixed(2)}%
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 p-4 text-sm">
                    <dt className="font-medium text-slate-700">ยอดประเมิน</dt>
                    <dd className="text-slate-900">
                      {money(Number(row.amount))} บาท
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 p-4 text-sm">
                    <dt className="font-medium text-slate-700">รอบประเมิน</dt>
                    <dd className="text-slate-900">
                      {String(row.period_month).slice(0, 7)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 p-4 text-sm">
                    <dt className="font-medium text-slate-700">
                      คะแนนเฉลี่ย YTD
                    </dt>
                    <dd className="text-slate-900">
                      {Number(row.ytdAverageScore).toFixed(2)}%
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 p-4 text-sm">
                    <dt className="font-medium text-slate-700">
                      ยอดอนุมัติ YTD
                    </dt>
                    <dd className="text-slate-900">
                      {money(Number(row.ytdApprovedAmount))} บาท
                    </dd>
                  </div>
                </div>

                <div className="px-5 py-4 md:px-6">
                  <details className="group text-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl bg-slate-50 px-4 py-3 font-bold text-slate-700 hover:bg-slate-100">
                      รายละเอียดคะแนน
                      <span className="text-slate-400 group-open:rotate-180">
                        ⌄
                      </span>
                    </summary>
                    <div className="pt-3">
                      <CriteriaDetails row={row} />
                      {row.note && (
                        <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          <strong className="text-slate-800">
                            หมายเหตุ KOE:
                          </strong>{" "}
                          {row.note}
                        </p>
                      )}
                    </div>
                  </details>

                  {pending && (
                    <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => void review(row, false)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <X size={16} /> ส่งกลับแก้ไข
                      </button>
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => void review(row, true)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <Check size={16} /> อนุมัติรายการ
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {!rows.length && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <p className="font-bold text-slate-700">
                ไม่มีรายการ KPI ในรอบเดือนนี้
              </p>
              <p className="mt-1 text-sm text-slate-400">
                เลือกเดือนอื่นเพื่อดูข้อมูลหรือรีเฟรชรายการ
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
