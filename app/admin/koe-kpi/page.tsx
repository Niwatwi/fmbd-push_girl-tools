"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, RefreshCw, X } from "lucide-react";
import {
  getKoeKpiApprovalsAction,
  reviewKoeKpiAction,
} from "@/app/koe/actions";

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
    <main className="mx-auto min-h-screen max-w-4xl space-y-4 bg-slate-50 p-4 text-slate-900">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-blue-700"
      >
        <ArrowLeft size={16} /> กลับ Admin
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">อนุมัติ KPI KOE</h1>
        <button
          type="button"
          title="รีเฟรช"
          aria-label="รีเฟรช"
          onClick={() => void load()}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <label className="block text-xs font-bold">
        รอบเดือน
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm sm:max-w-xs"
        />
      </label>
      <section className="space-y-3">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-md border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold">
                  {row.employee?.display_name || "-"}
                </h2>
                <p className="text-xs text-slate-500">
                  {row.employee?.employee_id || ""} · {row.employee?.area || ""}{" "}
                  ·{" "}
                  {row.assessment_type === "BA_CHEER"
                    ? "BA Cheer"
                    : "BA Supervisor"}
                </p>
              </div>
              <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold">
                {row.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <p>
                คะแนนเดือน:{" "}
                <strong>{Number(row.score_percent).toFixed(2)}%</strong>
              </p>
              <p>
                ยอดประเมิน: <strong>{money(Number(row.amount))} บาท</strong>
              </p>
              <p>
                รอบ: <strong>{String(row.period_month).slice(0, 7)}</strong>
              </p>
              <p>
                คะแนนเฉลี่ย YTD:{" "}
                <strong>{Number(row.ytdAverageScore).toFixed(2)}%</strong>
              </p>
              <p>
                ยอดอนุมัติสะสม YTD:{" "}
                <strong>{money(Number(row.ytdApprovedAmount))} บาท</strong>
              </p>
            </div>
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-bold">
                รายละเอียดคะแนน
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-[10px]">
                {JSON.stringify(row.criteria, null, 2)}
              </pre>
              {row.note && <p className="mt-2">หมายเหตุ KOE: {row.note}</p>}
            </details>
            {row.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy === row.id}
                  onClick={() => void review(row, true)}
                  className="flex-1 rounded bg-emerald-700 px-3 py-2 text-sm font-bold text-white"
                >
                  <Check size={15} className="mr-1 inline" />
                  อนุมัติ
                </button>
                <button
                  type="button"
                  disabled={busy === row.id}
                  onClick={() => void review(row, false)}
                  className="flex-1 rounded border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700"
                >
                  <X size={15} className="mr-1 inline" />
                  ส่งกลับแก้ไข
                </button>
              </div>
            )}
          </article>
        ))}
        {!rows.length && (
          <p className="py-10 text-center text-sm text-slate-500">
            ไม่มีรายการ KPI ในเดือนนี้
          </p>
        )}
      </section>
    </main>
  );
}
