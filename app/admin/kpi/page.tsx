"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, Pencil, Plus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import {
  deleteBaKpiEntryAction,
  getBaKpiCompanyTagsAction,
  getBaKpiEmployeesAction,
  getBaKpiEntriesAction,
  getBaKpiStoresAction,
  saveBaKpiEntryAction,
} from "./actions";

const sheets = [
  { value: "SUPERVISOR", label: "KPI BA Supervisor" },
  { value: "BKK", label: "KPI BA BKK", detail: "กรุงเทพมหานคร" },
  { value: "UPC", label: "KPI BA UPC", detail: "ต่างจังหวัด" },
] as const;

type SheetType = (typeof sheets)[number]["value"];
type KpiEntry = {
  id: number;
  username: string;
  company_tag: string;
  employee_id: string;
  employee_name: string;
  store_names: string[];
  store_name: string;
  amount: number;
  note: string;
};
type EmployeeOption = {
  username: string;
  display_name: string;
  employee_id: string | null;
  company_tag: string;
};
type StoreOption = {
  store_code: string;
  store_name: string;
  mer_code: string;
};

const currentMonth = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
})
  .format(new Date())
  .slice(0, 7);

const emptyForm = {
  companyTag: "",
  username: "",
  employeeName: "",
  storeCodes: [] as string[],
  amount: "",
  note: "",
};

export default function AdminBaKpiPage() {
  const [month, setMonth] = useState(currentMonth);
  const [sheetType, setSheetType] = useState<SheetType>("SUPERVISOR");
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyTags, setCompanyTags] = useState<string[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadEntries = async () => {
    setLoading(true);
    const result = await getBaKpiEntriesAction(month, sheetType);
    if (result.success) {
      setEntries(result.data as KpiEntry[]);
    } else {
      setEntries([]);
      Swal.fire("โหลดข้อมูลไม่สำเร็จ", result.message, "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
  }, [month, sheetType]);

  useEffect(() => {
    getBaKpiCompanyTagsAction().then((result) => {
      if (result.success) setCompanyTags(result.data);
      else Swal.fire("โหลดตัวกรองไม่สำเร็จ", result.message, "error");
    });
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEmployees([]);
    setStoreOptions([]);
    setEditingId(null);
  };

  const handleCompanyTagChange = async (companyTag: string) => {
    setForm({ ...emptyForm, companyTag });
    setEmployees([]);
    setStoreOptions([]);
    if (!companyTag) return;
    setLoadingEmployees(true);
    const result = await getBaKpiEmployeesAction(companyTag);
    setLoadingEmployees(false);
    if (result.success) setEmployees(result.data as EmployeeOption[]);
    else Swal.fire("โหลดรายชื่อ BA ไม่สำเร็จ", result.message, "error");
  };

  const handleEmployeeChange = async (username: string) => {
    const employee = employees.find((item) => item.username === username);
    setForm((current) => ({
      ...current,
      username,
      employeeName: employee?.display_name || "",
      storeCodes: [],
    }));
    setStoreOptions([]);
    if (!username) return;
    setLoadingStores(true);
    const result = await getBaKpiStoresAction(username);
    setLoadingStores(false);
    if (result.success) setStoreOptions(result.data as StoreOption[]);
    else Swal.fire("โหลดรายชื่อสาขาไม่สำเร็จ", result.message, "error");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const result = await saveBaKpiEntryAction({
      month,
      sheetType,
      companyTag: form.companyTag,
      username: form.username,
      storeCodes: form.storeCodes,
      amount: Number(form.amount),
      note: form.note,
    });
    setSaving(false);
    if (!result.success) {
      Swal.fire("บันทึกไม่สำเร็จ", result.message, "error");
      return;
    }
    resetForm();
    await loadEntries();
    Swal.fire({
      title: "บันทึก KPI แล้ว",
      icon: "success",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const handleEdit = async (entry: KpiEntry) => {
    const [employeeResult, storeResult] = await Promise.all([
      getBaKpiEmployeesAction(entry.company_tag),
      getBaKpiStoresAction(entry.username),
    ]);
    if (!employeeResult.success || !storeResult.success) {
      Swal.fire(
        "โหลดข้อมูลแก้ไขไม่สำเร็จ",
        employeeResult.message || storeResult.message,
        "error",
      );
      return;
    }
    setEmployees(employeeResult.data as EmployeeOption[]);
    setStoreOptions(storeResult.data as StoreOption[]);
    setEditingId(entry.id);
    setForm({
      companyTag: entry.company_tag,
      username: entry.username,
      employeeName: entry.employee_name,
      storeCodes: entry.store_names || [],
      amount: String(entry.amount),
      note: entry.note || "",
    });
  };

  const handleDelete = async (entry: KpiEntry) => {
    const result = await Swal.fire({
      title: "ลบรายการ KPI?",
      text: `${entry.employee_name} (${entry.employee_id})`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบรายการ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#b91c1c",
    });
    if (!result.isConfirmed) return;
    const response = await deleteBaKpiEntryAction(entry.id);
    if (!response.success) {
      Swal.fire("ลบไม่สำเร็จ", response.message, "error");
      return;
    }
    await loadEntries();
  };

  const totalAmount = entries.reduce(
    (sum, entry) => sum + Number(entry.amount),
    0,
  );
  const activeSheet = sheets.find((sheet) => sheet.value === sheetType)!;

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-5">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700 p-3 text-white">
              <BadgeDollarSign size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black">บันทึก KPI รายได้ BA</h1>
              <p className="mt-1 text-xs text-slate-500">
                ยอด KPI จะรวมในสรุปรายได้ BA ประจำเดือน
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
          >
            <ArrowLeft size={15} /> หน้าหลัก Admin
          </Link>
        </header>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div
            className="flex flex-wrap gap-1 border-b border-slate-300"
            role="tablist"
            aria-label="ประเภท KPI BA"
          >
            {sheets.map((sheet) => (
              <button
                key={sheet.value}
                type="button"
                role="tab"
                aria-selected={sheetType === sheet.value}
                onClick={() => {
                  resetForm();
                  setSheetType(sheet.value);
                }}
                className={`border-b-2 px-4 py-3 text-left text-xs font-bold ${sheetType === sheet.value ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                {sheet.label}
                {"detail" in sheet && sheet.detail && (
                  <span className="ml-1 font-medium text-slate-400">
                    ({sheet.detail})
                  </span>
                )}
              </button>
            ))}
          </div>
          <label className="text-xs font-bold text-slate-600">
            รอบ KPI
            <input
              type="month"
              value={month}
              onChange={(event) => {
                resetForm();
                setMonth(event.target.value);
              }}
              className="ml-2 border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            />
          </label>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <form
            onSubmit={handleSubmit}
            className="space-y-4 border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-black">
                  {editingId ? "แก้ไขรายการ KPI" : "เพิ่มรายการ KPI"}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  {activeSheet.label} · {month}
                </p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  ยกเลิกแก้ไข
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">
                company_tag *
                <select
                  required
                  disabled={editingId !== null}
                  value={form.companyTag}
                  onChange={(event) =>
                    handleCompanyTagChange(event.target.value)
                  }
                  className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium disabled:bg-slate-100"
                >
                  <option value="">เลือก company_tag</option>
                  {companyTags.map((companyTag) => (
                    <option key={companyTag} value={companyTag}>
                      {companyTag}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                รหัสพนักงาน (username) *
                <select
                  required
                  disabled={
                    !form.companyTag || loadingEmployees || editingId !== null
                  }
                  value={form.username}
                  onChange={(event) => handleEmployeeChange(event.target.value)}
                  className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium disabled:bg-slate-100"
                >
                  <option value="">
                    {loadingEmployees
                      ? "กำลังโหลดรายชื่อ..."
                      : "เลือก username"}
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.username} value={employee.username}>
                      {employee.username} · {employee.display_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                ชื่อ BA *
                <input
                  required
                  readOnly
                  value={form.employeeName}
                  className="mt-1 w-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                ยอด KPI (บาท) *
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: event.target.value })
                  }
                  className="mt-1 w-full border border-slate-300 px-3 py-2 text-right text-sm font-bold tabular-nums"
                />
              </label>
            </div>
            <fieldset className="border border-slate-200 p-3">
              <legend className="px-1 text-xs font-bold text-slate-600">
                สาขา / จุดปฏิบัติงาน
              </legend>
              {!form.username ? (
                <p className="text-xs text-slate-400">
                  เลือกรหัสพนักงานเพื่อแสดงสาขาที่รับผิดชอบ
                </p>
              ) : loadingStores ? (
                <p className="text-xs text-slate-400">กำลังโหลดสาขา...</p>
              ) : storeOptions.length === 0 ? (
                <p className="text-xs text-slate-400">
                  ไม่พบสาขาที่ผูกกับ username นี้
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {storeOptions.map((store) => (
                    <label
                      key={store.store_code}
                      className="flex items-start gap-2 text-xs font-medium text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.storeCodes.includes(store.store_code)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            storeCodes: event.target.checked
                              ? [...current.storeCodes, store.store_code]
                              : current.storeCodes.filter(
                                  (code) => code !== store.store_code,
                                ),
                          }))
                        }
                        className="mt-0.5 accent-emerald-700"
                      />
                      <span>{store.store_name}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <label className="block text-xs font-bold text-slate-600">
              หมายเหตุ
              <input
                value={form.note}
                onChange={(event) =>
                  setForm({ ...form, note: event.target.value })
                }
                className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-medium"
              />
            </label>
            <button
              disabled={saving}
              type="submit"
              className="inline-flex items-center gap-2 bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {editingId ? <Pencil size={14} /> : <Plus size={15} />}
              {saving
                ? "กำลังบันทึก..."
                : editingId
                  ? "บันทึกการแก้ไข"
                  : "เพิ่ม / บันทึก KPI"}
            </button>
          </form>

          <section className="min-w-0 border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="text-sm font-black">
                  รายการ {activeSheet.label}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  {entries.length} คน · รวม{" "}
                  {totalAmount.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  บาท
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">รหัส / ชื่อ BA</th>
                    <th className="px-3 py-2">สาขา / หมายเหตุ</th>
                    <th className="px-3 py-2 text-right">KPI (บาท)</th>
                    <th className="px-3 py-2 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-10 text-center text-slate-400"
                      >
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-10 text-center text-slate-400"
                      >
                        ยังไม่มีข้อมูล KPI ในงวดนี้
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <div className="font-bold text-slate-800">
                            {entry.employee_name}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                            {entry.username || entry.employee_id}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div>{entry.store_name || "-"}</div>
                          {entry.note && (
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              {entry.note}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold tabular-nums">
                          {Number(entry.amount).toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-center gap-1">
                            <button
                              type="button"
                              title="แก้ไข"
                              onClick={() => handleEdit(entry)}
                              className="p-2 text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              title="ลบ"
                              onClick={() => handleDelete(entry)}
                              className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
