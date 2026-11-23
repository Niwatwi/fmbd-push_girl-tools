"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  type FormEvent,
} from "react";
import {
  Clock,
  Calendar,
  Search,
  Printer,
  RefreshCw,
  MapPin,
  Edit3,
  ArrowLeft,
  DollarSign,
  Users,
  Plus,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  createAdminAttendanceLogAction,
  getAdminAttendanceEntryOptionsAction,
  getAdminAttendanceStoresForUserAction,
  getAdminAttendanceExpenseReportAction,
  updateAdminAttendanceLogAction,
} from "@/app/dashboard/actions";
import { getSalaryPeriodForMonth } from "@/utils/salary-period";

type EntryOptions = {
  users: Array<{
    id: number;
    display_name: string | null;
    employee_id: string | null;
    username: string | null;
  }>;
};

async function compressTimestampImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("กรุณาเลือกไฟล์รูปภาพ");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("ไฟล์ต้นฉบับต้องมีขนาดไม่เกิน 15 MB");
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("ไม่สามารถประมวลผลรูปภาพได้");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("บีบอัดรูปภาพไม่สำเร็จ")),
      "image/jpeg",
      0.72,
    );
  });
  if (blob.size > 750_000)
    throw new Error("รูปมีขนาดใหญ่เกินไป กรุณาเลือกภาพที่มีความละเอียดต่ำลง");
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
    reader.readAsDataURL(blob);
  });
}

function parseThaiDateTime(value: string) {
  return value ? new Date(`${value}:00+07:00`).toISOString() : null;
}

export default function AdminAttendanceExpensePage() {
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
  })
    .format(new Date())
    .slice(0, 7);
  const defaultPeriod = getSalaryPeriodForMonth(currentMonth);
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [startDate, setStartDate] = useState<string>(
    defaultPeriod.payrollStartDate,
  );
  const [endDate, setEndDate] = useState<string>(defaultPeriod.payrollEndDate);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEmployeeKey, setSelectedEmployeeKey] = useState<string>("");
  const [entryOptions, setEntryOptions] = useState<EntryOptions>({ users: [] });
  const [entryStores, setEntryStores] = useState<
    Array<{ store_code: string; store_name: string }>
  >([]);
  const [entryStoreSource, setEntryStoreSource] = useState<
    "assigned" | "master" | ""
  >("");
  const [entryHasAssignedStores, setEntryHasAssignedStores] = useState(false);
  const [loadingEntryStores, setLoadingEntryStores] = useState(false);
  const entryStoreRequestRef = useRef(0);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryUserId, setEntryUserId] = useState("");
  const [entryStoreCode, setEntryStoreCode] = useState("");
  const [entryCheckInAt, setEntryCheckInAt] = useState("");
  const [entryCheckOutAt, setEntryCheckOutAt] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [entryCheckInFile, setEntryCheckInFile] = useState<File | null>(null);
  const [entryCheckOutFile, setEntryCheckOutFile] = useState<File | null>(null);

  const employeeOptions = useMemo(() => {
    const employees = new Map<
      string,
      { key: string; displayName: string; empId: string; username: string }
    >();

    logs.forEach((log) => {
      const empId = String(
        log.employeeCode ?? log.empId ?? log.employeeId ?? log.username ?? "",
      ).trim();
      const username = String(log.username ?? "").trim();
      const displayName = String(log.displayName ?? "").trim();
      const key = empId || displayName;
      if (key && !employees.has(key)) {
        employees.set(key, { key, displayName, empId, username });
      }
    });

    return Array.from(employees.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "th"),
    );
  }, [logs]);

  // 🇹🇭 ฟังก์ชันแปลงเวลา ISO เป็นเวลาประเทศไทย (Asia/Bangkok) สำหรับแสดงในตาราง
  const formatThaiDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr || dateStr === "ยังไม่เลิกงาน" || dateStr === "-")
      return dateStr || "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
        .format(d)
        .replace(",", "");
    } catch {
      return dateStr;
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);
    const res = await getAdminAttendanceExpenseReportAction({
      startDate,
      endDate,
    });
    if (res.success) {
      setLogs(res.data);
      setFilteredLogs(res.data);
    } else {
      Swal.fire("ข้อผิดพลาด", res.message || "ไม่สามารถดึงข้อมูลได้", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAttendanceData();
  }, [startDate, endDate]);

  useEffect(() => {
    getAdminAttendanceEntryOptionsAction().then((result) => {
      if (result.success) setEntryOptions({ users: result.users });
      else Swal.fire("ข้อผิดพลาด", result.message, "error");
    });
  }, []);

  const handleEntryUserChange = async (
    userId: string,
    requestedSource: "assigned" | "master" = "assigned",
  ) => {
    const requestId = ++entryStoreRequestRef.current;
    setEntryUserId(userId);
    setEntryStoreCode("");
    setEntryStores([]);
    setEntryStoreSource("");
    setEntryHasAssignedStores(false);
    if (!userId) {
      setLoadingEntryStores(false);
      return;
    }
    setLoadingEntryStores(true);
    const result = await getAdminAttendanceStoresForUserAction(
      Number(userId),
      requestedSource,
    );
    if (requestId !== entryStoreRequestRef.current) return;
    if (result.success) {
      setEntryStores(result.stores);
      setEntryStoreSource(result.source);
      setEntryHasAssignedStores(result.hasAssignedStores);
    } else {
      Swal.fire("โหลดสาขาไม่สำเร็จ", result.message, "error");
    }
    setLoadingEntryStores(false);
  };

  const handleCreateHistoricalEntry = async (event: FormEvent) => {
    event.preventDefault();
    if (!entryUserId || !entryStoreCode || !entryCheckInAt) {
      Swal.fire(
        "ข้อมูลไม่ครบ",
        "กรุณาเลือกพนักงาน ร้าน และเวลา Check-in",
        "warning",
      );
      return;
    }
    if (entryNote.trim().length < 3) {
      Swal.fire(
        "กรุณาระบุหมายเหตุ",
        "กรอกเหตุผลยืนยันกับบัญชีอย่างน้อย 3 ตัวอักษร",
        "warning",
      );
      return;
    }
    const selectedStore = entryStores.find(
      (store) => String(store.store_code) === entryStoreCode,
    );
    if (!selectedStore) {
      Swal.fire("ไม่พบร้านค้า", "กรุณาเลือกร้านค้าอีกครั้ง", "warning");
      return;
    }
    if (
      entryCheckOutAt &&
      new Date(entryCheckOutAt).getTime() <= new Date(entryCheckInAt).getTime()
    ) {
      Swal.fire(
        "เวลาไม่ถูกต้อง",
        "เวลา Check-out ต้องอยู่หลัง Check-in",
        "warning",
      );
      return;
    }

    setSavingEntry(true);
    try {
      const [checkInImage, checkOutImage] = await Promise.all([
        entryCheckInFile ? compressTimestampImage(entryCheckInFile) : "",
        entryCheckOutFile ? compressTimestampImage(entryCheckOutFile) : "",
      ]);
      const result = await createAdminAttendanceLogAction({
        userId: Number(entryUserId),
        storeCode: entryStoreCode,
        storeName: selectedStore.store_name,
        checkInAt: parseThaiDateTime(entryCheckInAt) || "",
        checkOutAt: parseThaiDateTime(entryCheckOutAt),
        checkInImage,
        checkOutImage,
        note: entryNote.trim(),
      });
      if (!result.success) throw new Error(result.message);
      setShowEntryForm(false);
      setEntryUserId("");
      setEntryStoreCode("");
      setEntryCheckInAt("");
      setEntryCheckOutAt("");
      setEntryNote("");
      setEntryCheckInFile(null);
      setEntryCheckOutFile(null);
      Swal.fire("สำเร็จ", "เพิ่มข้อมูลลงเวลาย้อนหลังเรียบร้อยแล้ว", "success");
      await loadAttendanceData();
    } catch (error: any) {
      Swal.fire(
        "บันทึกไม่สำเร็จ",
        error.message || "กรุณาลองอีกครั้ง",
        "error",
      );
    } finally {
      setSavingEntry(false);
    }
  };

  // Filter Logic Search
  useEffect(() => {
    let result = [...logs];
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) =>
        [
          item.displayName,
          item.empId,
          item.employeeId,
          item.employeeCode,
          item.username,
          item.userId,
          item.storeName,
          item.storeCode,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }
    if (selectedEmployeeKey) {
      result = result.filter((item) => {
        const key =
          String(item.empId ?? item.employeeId ?? "").trim() ||
          String(item.displayName ?? "").trim();
        return key === selectedEmployeeKey;
      });
    }
    setFilteredLogs(result);
  }, [searchQuery, selectedEmployeeKey, logs]);

  // ✏️ ฟังก์ชันเปิด Modal แก้ไขข้อมูล Check-In / Check-Out
  const handleEditLog = (log: any) => {
    // ฟังก์ชันแปลงเวลาจาก DB ให้เป็นรูปแบบ YYYY-MM-DDTHH:mm สำหรับ <input type="datetime-local"> ตามเวลาไทย
    const formatForInput = (dateStr: string) => {
      if (!dateStr || dateStr === "ยังไม่เลิกงาน" || dateStr === "-") return "";
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        const thaiDateStr = d.toLocaleString("en-US", {
          timeZone: "Asia/Bangkok",
        });
        const thaiDate = new Date(thaiDateStr);
        const year = thaiDate.getFullYear();
        const month = String(thaiDate.getMonth() + 1).padStart(2, "0");
        const day = String(thaiDate.getDate()).padStart(2, "0");
        const hours = String(thaiDate.getHours()).padStart(2, "0");
        const minutes = String(thaiDate.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      } catch {
        return "";
      }
    };

    const initialIn = formatForInput(
      log.checkInAt ||
        (log.checkInDateRaw ? `${log.checkInDateRaw}T10:00` : ""),
    );
    const initialOut = formatForInput(log.checkOutAt);

    Swal.fire({
      title: `✏️ แก้ไขบันทึกเวลา: ${log.displayName}`,
      html: `
        <div class="text-left space-y-3 text-xs text-slate-700">
          <div>
            <label class="font-bold block mb-1">ชื่อสาขา / รหัสสาขา:</label>
            <input id="swal-store-name" class="swal2-input !mt-0 !w-full !text-xs" value="${log.storeName}" placeholder="ชื่อสาขา" />
          </div>
          <div class="mt-2">
            <label class="font-bold block mb-1">เวลา Check-IN (เข้างาน):</label>
            <input id="swal-check-in" type="datetime-local" class="swal2-input !mt-0 !w-full !text-xs" value="${initialIn}" />
          </div>
          <div class="mt-2">
            <label class="font-bold block mb-1">เวลา Check-OUT (ออกงาน):</label>
            <input id="swal-check-out" type="datetime-local" class="swal2-input !mt-0 !w-full !text-xs" value="${initialOut}" placeholder="ปล่อยว่างหากยังไม่เลิกงาน" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "บันทึกการแก้ไข",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      preConfirm: () => {
        const storeName = (
          document.getElementById("swal-store-name") as HTMLInputElement
        ).value;
        const checkInVal = (
          document.getElementById("swal-check-in") as HTMLInputElement
        ).value;
        const checkOutVal = (
          document.getElementById("swal-check-out") as HTMLInputElement
        ).value;

        if (!checkInVal) {
          Swal.showValidationMessage("กรุณาระบุเวลา Check-IN");
          return false;
        }

        // แปลงเวลาจาก Input ในเวลาไทย (+07:00) กลับเป็น ISO String
        const parseThaiInputToISO = (val: string) => {
          if (!val) return null;
          return new Date(`${val}:00+07:00`).toISOString();
        };

        return {
          id: log.id,
          storeName: storeName.trim(),
          checkInAt: parseThaiInputToISO(checkInVal),
          checkOutAt: parseThaiInputToISO(checkOutVal),
        };
      },
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          title: "กำลังบันทึกข้อมูล...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        const res = await updateAdminAttendanceLogAction({
          id: result.value.id,
          storeName: result.value.storeName,
          checkInAt: result.value.checkInAt,
          checkOutAt: result.value.checkOutAt,
        });

        if (res.success) {
          Swal.fire("สำเร็จ!", "แก้ไขข้อมูลบันทึกเวลาเรียบร้อยแล้ว", "success");
          loadAttendanceData();
        } else {
          Swal.fire(
            "ข้อผิดพลาด",
            res.message || "ไม่สามารถแก้ไขข้อมูลได้",
            "error",
          );
        }
      }
    });
  };

  // 🗺️ ดูพิกัดแผนที่
  const handleViewMap = (lat: number, lon: number) => {
    if (
      lat === null ||
      lat === undefined ||
      lon === null ||
      lon === undefined
    ) {
      Swal.fire("ไม่พบพิกัด", "รายการนี้ไม่มีการบันทึกพิกัด GPS", "warning");
      return;
    }
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, "_blank");
  };

  // 🖼️ ดูรูปถ่ายเข้า/ออกงานใหญ่
  const handleViewPhoto = (url: string, title: string) => {
    if (!url) return;
    Swal.fire({
      title: title,
      imageUrl: url,
      imageAlt: title,
      confirmButtonText: "ปิดหน้าต่าง",
      confirmButtonColor: "#1e293b",
    });
  };

  // คำนวณสรุป KPI Cards
  const totalShifts = filteredLogs.length;
  const totalHours = filteredLogs.reduce(
    (sum, log) =>
      sum + (typeof log.workedHours === "number" ? log.workedHours : 0),
    0,
  );
  const totalWage = filteredLogs.reduce(
    (sum, log) => sum + (log.dailyWage || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-blue-800 text-slate-800 font-sans antialiased pb-12">
      {/* 🛑 STYLING สำหรับการพิมพ์ PDF */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          header,
          .no-print,
          th:last-child,
          td:last-child {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
            font-size: 8px !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          main {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .shadow-xs,
          .shadow-sm,
          .shadow-md {
            box-shadow: none !important;
          }
          table {
            width: 100% !important;
            font-size: 8px !important;
          }
          th,
          td {
            padding: 3px 4px !important;
          }
          .print-only {
            display: block !important;
          }
          img {
            display: inline-block !important;
            width: 32px !important;
            height: 32px !important;
            object-fit: cover !important;
            border-radius: 4px !important;
          }
        }
      `}</style>

      {/* HEADER BAR */}
      <header className="bg-blue-900 text-white shadow-md border-b border-blue-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/50 p-2.5 rounded-2xl border border-blue-400/30">
              <Clock size={22} className="text-blue-200" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight">
                ระบบจัดการเวลาทำงาน & ค่าใช้จ่าย (Time Attendance & Expense)
              </h1>
              <p className="text-xs text-blue-200 font-medium">
                สรุปวันทำงาน พิกัดเวลา รูปถ่าย
                และคำนวณเบี้ยเลี้ยงสำหรับฝ่ายบัญชี
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEntryForm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <Plus size={14} /> เพิ่มข้อมูลย้อนหลัง
            </button>
            <a
              href="/admin"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition border border-blue-700"
            >
              <ArrowLeft size={14} /> หน้าหลัก Admin
            </a>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <Printer size={14} /> ปริ้นท์ PDF
            </button>
            <button
              onClick={loadAttendanceData}
              className={`p-2 bg-blue-800 hover:bg-blue-700 rounded-xl transition cursor-pointer ${
                loading ? "animate-spin" : ""
              }`}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {showEntryForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 no-print">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="historical-entry-title"
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <header className="flex items-center justify-between bg-blue-900 px-5 py-4 text-white">
                <div>
                  <h2
                    id="historical-entry-title"
                    className="text-sm font-black"
                  >
                    เพิ่มข้อมูลลงเวลาย้อนหลัง
                  </h2>
                  <p className="mt-1 text-[11px] text-blue-200">
                    แนบรูป Timestamp สำหรับเวลาเข้าและออกได้
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEntryForm(false)}
                  aria-label="ปิดหน้าต่าง"
                  className="rounded-lg p-2 hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </header>
              <form
                onSubmit={handleCreateHistoricalEntry}
                className="space-y-4 p-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-600">
                    พนักงาน
                    <select
                      required
                      value={entryUserId}
                      onChange={(event) =>
                        void handleEntryUserChange(event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-800"
                    >
                      <option value="">เลือกพนักงาน</option>
                      {entryOptions.users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.display_name ||
                            user.username ||
                            `PG-${user.id}`}
                          {user.employee_id ? ` (${user.employee_id})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600">
                      สาขาปฏิบัติงาน
                      <select
                        required
                        value={entryStoreCode}
                        onChange={(event) =>
                          setEntryStoreCode(event.target.value)
                        }
                        disabled={
                          !entryUserId ||
                          loadingEntryStores ||
                          !entryStores.length
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-800"
                      >
                        <option value="">
                          {loadingEntryStores
                            ? "กำลังโหลดสาขา..."
                            : entryStoreSource === "master"
                              ? entryHasAssignedStores
                                ? "เลือกร้านอื่นจาก Master Stores"
                                : "ไม่พบสาขาที่ผูกไว้ เลือกจาก Master Stores"
                              : entryUserId
                                ? "เลือกสาขาที่ผูกกับพนักงาน"
                                : "เลือกพนักงานก่อน"}
                        </option>
                        {entryStores.map((store) => (
                          <option
                            key={store.store_code}
                            value={store.store_code}
                          >
                            {store.store_name} ({store.store_code})
                          </option>
                        ))}
                      </select>
                    </label>
                    {entryHasAssignedStores && (
                      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                        <button
                          type="button"
                          disabled={loadingEntryStores}
                          onClick={() =>
                            void handleEntryUserChange(entryUserId, "assigned")
                          }
                          className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold transition ${
                            entryStoreSource === "assigned"
                              ? "bg-white text-blue-700 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          สาขาที่ผูกกับพนักงาน
                        </button>
                        <button
                          type="button"
                          disabled={loadingEntryStores}
                          onClick={() =>
                            void handleEntryUserChange(entryUserId, "master")
                          }
                          className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold transition ${
                            entryStoreSource === "master"
                              ? "bg-white text-blue-700 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          ร้านอื่นจาก Master
                        </button>
                      </div>
                    )}
                  </div>
                  <label className="text-xs font-bold text-slate-600">
                    เวลา Check-in
                    <input
                      required
                      type="datetime-local"
                      value={entryCheckInAt}
                      onChange={(event) =>
                        setEntryCheckInAt(event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-800"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    เวลา Check-out (ไม่บังคับ)
                    <input
                      type="datetime-local"
                      value={entryCheckOutAt}
                      onChange={(event) =>
                        setEntryCheckOutAt(event.target.value)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-800"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    รูป Timestamp Check-in (ไม่บังคับ)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setEntryCheckInFile(event.target.files?.[0] || null)
                      }
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    รูป Timestamp Check-out (ไม่บังคับ)
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setEntryCheckOutFile(event.target.files?.[0] || null)
                      }
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </label>
                  <label className="sm:col-span-2 text-xs font-bold text-slate-600">
                    หมายเหตุยืนยันกับบัญชี{" "}
                    <span className="text-rose-600">*</span>
                    <textarea
                      required
                      minLength={3}
                      maxLength={1000}
                      rows={3}
                      value={entryNote}
                      onChange={(event) => setEntryNote(event.target.value)}
                      placeholder="เช่น ยืนยันเวลาและรูป Timestamp กับฝ่ายบัญชีแล้ว"
                      className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal text-slate-800"
                    />
                    <span className="mt-1 block text-[10px] font-normal text-slate-400">
                      บันทึกหมายเหตุพร้อมผู้ทำรายการและรายละเอียดเวลาในประวัติ
                      Audit
                    </span>
                  </label>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEntryForm(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={
                      savingEntry ||
                      loadingEntryStores ||
                      !entryOptions.users.length ||
                      !entryStores.length
                    }
                    className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {savingEntry ? "กำลังบันทึก..." : "บันทึกย้อนหลัง"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                จำนวนวันทำงานรวม (SHIFTS)
              </span>
              <span className="text-xl font-black text-slate-800 block">
                {totalShifts}{" "}
                <span className="text-xs font-bold text-slate-400">วัน/คน</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                ชั่วโมงทำงานสะสมรวม
              </span>
              <span className="text-xl font-black text-slate-800 block">
                {totalHours.toFixed(1)}{" "}
                <span className="text-xs font-bold text-slate-400">
                  ชั่วโมง
                </span>
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                ยอดค่าแรงรวม (รายวัน + เงินเดือน)
              </span>
              <span className="text-xl font-black text-emerald-600 block">
                {totalWage.toLocaleString()}{" "}
                <span className="text-xs font-bold text-slate-400">บาท</span>
              </span>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Calendar size={16} className="text-blue-600" /> ตัวกรองข้อมูล:
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border rounded-xl font-bold bg-slate-50 text-slate-700"
              />
              <span className="text-slate-400">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border rounded-xl font-bold bg-slate-50 text-slate-700"
              />
            </div>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="ค้นหาชื่อ PG / รหัสพนักงาน / สาขา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-1.5 border rounded-xl font-medium bg-slate-50 text-xs w-64 focus:bg-white"
              />
            </div>

            <label className="sr-only" htmlFor="employee-filter">
              เลือกบุคคล
            </label>
            <select
              id="employee-filter"
              value={selectedEmployeeKey}
              onChange={(e) => setSelectedEmployeeKey(e.target.value)}
              className="px-3 py-1.5 border rounded-xl font-bold bg-slate-50 text-slate-700 min-w-48 focus:bg-white"
            >
              <option value="">ทุกบุคคล</option>
              {employeeOptions.map((employee) => (
                <option key={employee.key} value={employee.key}>
                  {employee.displayName || employee.empId}
                  {employee.empId ? ` (${employee.empId})` : ""}
                  {employee.username && employee.username !== employee.empId
                    ? ` / ${employee.username}`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ATTENDANCE TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <h2 className="text-xs font-black text-slate-800">
                ตารางบันทึกเวลาทำงาน & คำนวณเบี้ยเลี้ยง PG รายวัน
              </h2>
            </div>
            <p className="print-only hidden text-[10px]">
              ช่วงวันที่ {startDate} ถึง {endDate}
              {selectedEmployeeKey
                ? ` · พนักงาน ${employeeOptions.find((item) => item.key === selectedEmployeeKey)?.displayName || selectedEmployeeKey}`
                : " · พนักงานทุกคน"}
            </p>
            <span className="text-[10px] font-bold text-slate-400">
              แสดงข้อมูลทั้งหมด {filteredLogs.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="p-3 text-center">ลำดับ</th>
                  <th className="p-3">รหัส / ชื่อพนักงาน</th>
                  <th className="p-3">สาขาปฏิบัติงาน</th>
                  <th className="p-3">เวลา CHECK-IN</th>
                  <th className="p-3">เวลา CHECK-OUT</th>
                  <th className="p-3 text-center">ชั่วโมงทำงาน</th>
                  <th className="p-3 text-center">ค่าแรง / เงินเดือน</th>
                  <th className="p-3 text-center no-print">พิกัด GPS</th>
                  <th className="p-3 text-center min-w-[100px]">
                    รูปถ่ายเข้า-ออก
                  </th>
                  <th className="p-3 text-center no-print">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, idx) => (
                    <tr
                      key={log.id || idx}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="p-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">
                          {log.displayName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {log.employeeCode ||
                            log.empId ||
                            log.employeeId ||
                            log.username ||
                            "-"}
                        </div>
                        {log.username &&
                          log.username !==
                            (log.employeeCode ||
                              log.empId ||
                              log.employeeId) && (
                            <div className="text-[9px] font-mono text-slate-400">
                              {log.username}
                            </div>
                          )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">
                          {log.storeName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {log.storeCode}
                        </div>
                      </td>
                      {/* 🇹🇭 แสดงเวลา CHECK-IN ในเวลาประเทศไทย */}
                      <td className="p-3 font-mono text-emerald-600 font-bold">
                        {formatThaiDateTime(log.checkInAt)}
                      </td>
                      {/* 🇹🇭 แสดงเวลา CHECK-OUT ในเวลาประเทศไทย */}
                      <td className="p-3 font-mono text-blue-600 font-bold">
                        {formatThaiDateTime(log.checkOutAt)}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        {typeof log.workedHours === "number"
                          ? `${log.workedHours} ชม.`
                          : log.workedHours}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600">
                        {log.isMonthly
                          ? log.dailyWage > 0
                            ? `${log.dailyWage.toLocaleString()} ฿ (เงินเดือน)`
                            : "-"
                          : `${log.dailyWage.toLocaleString()} ฿`}
                      </td>
                      <td className="p-3 text-center no-print">
                        <button
                          onClick={() =>
                            handleViewMap(log.checkInLat, log.checkInLon)
                          }
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin size={12} /> แผนที่
                        </button>
                      </td>

                      {/* 🖼️ รูปถ่าย Thumbnail เข้า-ออกงาน */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {log.checkInPhoto ? (
                            <img
                              src={log.checkInPhoto}
                              alt="รูปเข้า"
                              onClick={() =>
                                handleViewPhoto(log.checkInPhoto, "รูปเข้างาน")
                              }
                              className="w-9 h-9 object-cover rounded-lg border border-emerald-300 shadow-xs cursor-pointer hover:scale-105 transition"
                              title="คลิกเพื่อดูรูปเข้างาน"
                            />
                          ) : (
                            <span className="text-slate-300 text-[10px] font-mono">
                              -
                            </span>
                          )}

                          {log.checkOutPhoto ? (
                            <img
                              src={log.checkOutPhoto}
                              alt="รูปออก"
                              onClick={() =>
                                handleViewPhoto(log.checkOutPhoto, "รูปเลิกงาน")
                              }
                              className="w-9 h-9 object-cover rounded-lg border border-blue-300 shadow-xs cursor-pointer hover:scale-105 transition"
                              title="คลิกเพื่อดูรูปเลิกงาน"
                            />
                          ) : (
                            <span className="text-slate-300 text-[10px] font-mono">
                              -
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ✏️ ปุ่มกดแก้ไขข้อมูลสำหรับ Admin */}
                      <td className="p-3 text-center no-print">
                        <button
                          onClick={() => handleEditLog(log)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition shadow-xs"
                          title="แก้ไขเวลา / สาขา"
                        >
                          <Edit3 size={12} /> แก้ไข
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-8 text-center text-slate-400 font-bold"
                    >
                      ไม่พบข้อมูลบันทึกเวลาทำงานตามเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
