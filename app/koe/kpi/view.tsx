"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import {
  calculateSupervisorKpi,
  cheerKpiCriteria,
  cheerKpiRegionCriteria,
  type CheerGrade,
} from "@/utils/koe-kpi";
import {
  getKoeDashboardAction,
  getKoeKpiFormAction,
  getKoeKpiSummaryAction,
  saveKoeKpiEvaluationAction,
} from "../actions";

type TeamMember = {
  id: number;
  username: string;
  display_name: string;
  employee_id: string | null;
  company_tag: string;
  area: string;
};
type Evaluation = {
  id: number;
  status: string;
  score_percent: number;
  amount: number;
  ytdAverageScore: number;
  ytdApprovedAmount: number;
  assessment_type: string;
  employee?: TeamMember;
};
const currentMonth = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
const money = (value: number) =>
  Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const statusLabel: Record<string, string> = {
  draft: "แบบร่าง",
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ส่งกลับแก้ไข",
};

export default function KoeKpiPage() {
  const [month, setMonth] = useState(currentMonth);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [targetId, setTargetId] = useState("");
  const [form, setForm] = useState<any>(null);
  const [grades, setGrades] = useState<Record<string, CheerGrade>>({});
  const [training, setTraining] = useState("");
  const [planning, setPlanning] = useState("");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<Evaluation[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSummary() {
    const lastDay = new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)),
      0,
    ).getDate();
    const [teamResult, summaryResult] = await Promise.all([
      getKoeDashboardAction(
        `${month}-01`,
        `${month}-${String(lastDay).padStart(2, "0")}`,
      ),
      getKoeKpiSummaryAction(month),
    ]);
    if (!teamResult.success) {
      setError(teamResult.message);
      return;
    }
    if (!summaryResult.success) {
      setError(summaryResult.message);
      return;
    }
    const nextTeam = teamResult.team as TeamMember[];
    setTeam(nextTeam);
    setSummary(summaryResult.rows as Evaluation[]);
    if (!targetId && nextTeam.length) setTargetId(String(nextTeam[0].id));
  }

  useEffect(() => {
    void loadSummary();
  }, [month]);
  useEffect(() => {
    if (!targetId) {
      setForm(null);
      return;
    }
    let cancelled = false;
    getKoeKpiFormAction(Number(targetId), month).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setForm(null);
        setError(result.message);
        return;
      }
      setError("");
      setForm(result);
      setGrades(result.evaluation?.criteria?.grades || {});
      const achievement = result.evaluation?.criteria?.achievements;
      setTraining(achievement?.[0] == null ? "" : String(achievement[0]));
      setPlanning(achievement?.[3] == null ? "" : String(achievement[3]));
      setNote(result.evaluation?.note || "");
    });
    return () => {
      cancelled = true;
    };
  }, [targetId, month]);

  const selected = team.find((item) => String(item.id) === targetId);
  const isCheer = form?.assessmentType === "BA_CHEER";
  const cheerRegion = form?.cheerRegion === "UPC" ? "UPC" : "BKK";
  const cheerCriteria = cheerKpiRegionCriteria[cheerRegion];
  const cheerMaximum = cheerRegion === "UPC" ? 1500 : 2600;
  const gradeAmount = useMemo(
    () =>
      cheerCriteria.reduce(
        (sum, criterion) =>
          sum +
          (grades[criterion.key]
            ? criterion.amounts[grades[criterion.key]]
            : 0),
        0,
      ),
    [grades, cheerCriteria],
  );
  const supervisorPreview = useMemo(() => {
    if (
      form?.derived.attendancePercent == null ||
      form?.derived.oosPercent == null
    )
      return null;
    try {
      return calculateSupervisorKpi([
        Number(training),
        form.derived.attendancePercent,
        form.derived.oosPercent,
        Number(planning),
      ]);
    } catch {
      return null;
    }
  }, [form, training, planning]);

  async function save(submit: boolean) {
    if (!selected) return;
    if (!isCheer && (!training.trim() || !planning.trim())) {
      setError("กรุณากรอก Training & Coaching และ Report & Planning");
      return;
    }
    if (
      !isCheer &&
      (Number(training) < 0 ||
        Number(training) > 500 ||
        Number(planning) < 0 ||
        Number(planning) > 500)
    ) {
      setError("คะแนน Achievement ต้องอยู่ระหว่าง 0–500%");
      return;
    }
    setBusy(true);
    setError("");
    const result = await saveKoeKpiEvaluationAction({
      targetUserId: selected.id,
      month,
      grades,
      trainingPercent: Number(training),
      reportPlanningPercent: Number(planning),
      note,
      submit,
    });
    if (!result.success) setError(result.message);
    else {
      await loadSummary();
      const next = await getKoeKpiFormAction(selected.id, month);
      if (next.success) setForm(next);
    }
    setBusy(false);
  }

  return (
    <main className="staff-theme min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/koe"
          className="inline-flex items-center gap-2 text-sm text-blue-700"
        >
          <ArrowLeft size={16} /> กลับภาพรวมทีม
        </Link>
        <h1 className="text-xl font-bold">ประเมิน KPI รายเดือน</h1>
        {error && (
          <p
            role="alert"
            className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold">
            เดือน
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"
            />
          </label>
          <label className="text-xs font-bold">
            พนักงาน
            <select
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"
            >
              <option value="">เลือกพนักงาน</option>
              {team.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.display_name} · {item.area}
                </option>
              ))}
            </select>
          </label>
        </div>
        {form && selected && (
          <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
            <div className="flex justify-between gap-2">
              <div>
                <h2 className="font-bold">
                  {isCheer ? "BA Cheer" : "BA Supervisor"}
                </h2>
                <p className="text-xs text-slate-500">
                  {selected.display_name} ·{" "}
                  {selected.employee_id || selected.username}
                </p>
              </div>
              <span className="h-fit rounded border border-slate-200 px-2 py-1 text-xs">
                {statusLabel[form.evaluation?.status || "draft"]}
              </span>
            </div>
            {form.evaluation?.status === "approved" && (
              <p className="rounded bg-emerald-50 p-2 text-xs text-emerald-800">
                รายการอนุมัติแล้ว ไม่สามารถแก้ไขได้
              </p>
            )}
            {isCheer ? (
              cheerCriteria.map((criterion) => (
                <fieldset
                  key={criterion.key}
                  disabled={form.evaluation?.status === "approved"}
                  className="rounded border border-slate-200 p-3"
                >
                  <legend className="px-1 text-xs font-bold">
                    {criterion.label} · Credit {criterion.amounts.A} บาท
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(["A", "B", "C"] as const).map((grade) => (
                      <label
                        key={grade}
                        className={`flex cursor-pointer items-center justify-between rounded border p-2 text-sm ${grades[criterion.key] === grade ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
                      >
                        <span>
                          <input
                            type="radio"
                            name={criterion.key}
                            checked={grades[criterion.key] === grade}
                            onChange={() =>
                              setGrades((current) => ({
                                ...current,
                                [criterion.key]: grade,
                              }))
                            }
                          />{" "}
                          {grade}
                        </span>
                        <strong>{criterion.amounts[grade]}฿</strong>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))
            ) : (
              <div className="space-y-3">
                <p className="rounded bg-slate-50 p-3 text-xs">
                  BA Team Sales Achievement · เข้าตรงเวลา{" "}
                  {form.derived.shifts
                    ? (
                        100 -
                        (form.derived.late / form.derived.shifts) * 100
                      ).toFixed(2)
                    : "-"}
                  % · สาย {form.derived.late}/{form.derived.shifts} ครั้ง
                </p>
                <p className="rounded bg-slate-50 p-3 text-xs">
                  OOS · สินค้าต่ำกว่า 3 ชิ้น {form.derived.oos}/
                  {form.derived.universe} รายการ SKU × วัน · Achievement{" "}
                  {form.derived.oosPercent == null
                    ? "-"
                    : `${form.derived.oosPercent.toFixed(2)}%`}
                </p>
                {[
                  {
                    label: "Training & Coaching Achievement (%)",
                    value: training,
                    set: setTraining,
                  },
                  {
                    label: "Report & Planning Achievement (%)",
                    value: planning,
                    set: setPlanning,
                  },
                ].map((item) => (
                  <label key={item.label} className="block text-xs font-bold">
                    {item.label}
                    <input
                      type="number"
                      min="0"
                      max="500"
                      step="0.01"
                      value={item.value}
                      onChange={(event) => item.set(event.target.value)}
                      disabled={form.evaluation?.status === "approved"}
                      className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
                    />
                  </label>
                ))}
              </div>
            )}
            <label className="block text-xs font-bold">
              หมายเหตุ
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={2000}
                disabled={form.evaluation?.status === "approved"}
                className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
              />
            </label>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <strong className="text-sm">
                ยอดประเมิน:{" "}
                {money(isCheer ? gradeAmount : supervisorPreview?.total || 0)}{" "}
                บาท
              </strong>
              <span className="text-xs text-slate-500">
                คะแนน{" "}
                {isCheer
                  ? `${((gradeAmount / cheerMaximum) * 100).toFixed(2)}%`
                  : `${supervisorPreview?.percentage.toFixed(2) || "-"}%`}
              </span>
            </div>
            {form.evaluation?.review_note && (
              <p className="text-xs text-rose-700">
                หมายเหตุ Admin: {form.evaluation.review_note}
              </p>
            )}
            {form.evaluation?.status !== "approved" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save(false)}
                  className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm font-bold"
                >
                  บันทึกร่าง
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save(true)}
                  className="flex-1 rounded bg-blue-700 px-3 py-2 text-sm font-bold text-white"
                >
                  {busy ? "กำลังส่ง..." : "ส่ง Admin อนุมัติ"}
                </button>
              </div>
            )}
          </section>
        )}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <ClipboardCheck size={16} /> Summary KPI · YTD
          </h2>
          {summary.map((row) => (
            <article
              key={row.id}
              className="rounded-md border border-slate-200 bg-white p-3"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">
                    {row.employee?.display_name || "-"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {row.assessment_type === "BA_CHEER"
                      ? "BA Cheer"
                      : "BA Supervisor"}{" "}
                    · {row.employee?.area || ""}
                  </p>
                </div>
                <span className="rounded border border-slate-200 px-2 py-1 text-xs">
                  {statusLabel[row.status] || row.status}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <p>
                  คะแนนเดือน{" "}
                  <strong>{Number(row.score_percent).toFixed(2)}%</strong>
                </p>
                <p>
                  ยอดเดือน <strong>{money(Number(row.amount))} บาท</strong>
                </p>
                <p>
                  คะแนนเฉลี่ย YTD{" "}
                  <strong>{Number(row.ytdAverageScore).toFixed(2)}%</strong>
                </p>
                <p>
                  ยอดอนุมัติ YTD{" "}
                  <strong>{money(Number(row.ytdApprovedAmount))} บาท</strong>
                </p>
              </div>
            </article>
          ))}
          {!summary.length && (
            <p className="text-center text-xs text-slate-500">
              ยังไม่มีผลประเมินในเดือนนี้
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
