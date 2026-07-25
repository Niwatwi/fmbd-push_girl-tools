"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  Search,
  Download,
  Printer,
  RefreshCw,
  MapPin,
  Image as ImageIcon,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  DollarSign,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getAdminAttendanceExpenseReportAction,
  updateAdminAttendanceLogAction,
} from "@/app/dashboard/actions";

export default function AdminAttendanceExpensePage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Filter Logic Search
  useEffect(() => {
    let result = [...logs];
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.displayName.toLowerCase().includes(q) ||
          item.empId.toLowerCase().includes(q) ||
          item.storeName.toLowerCase().includes(q) ||
          item.storeCode.toLowerCase().includes(q),
      );
    }
    setFilteredLogs(result);
  }, [searchQuery, logs]);

  // ✏️ ฟังก์ชันเปิด Modal แก้ไขข้อมูล Check-In / Check-Out
  const handleEditLog = (log: any) => {
    // แปลง Format เป็น YYYY-MM-DDTHH:mm สำหรับใส่ใน input datetime-local
    const formatForInput = (dateStr: string) => {
      if (!dateStr || dateStr === "ยังไม่เลิกงาน" || dateStr === "-") return "";
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        // ปรับเป็นเวลาไทย UTC+7
        const tzOffset = 7 * 60 * 60 * 1000;
        const localDate = new Date(d.getTime() + tzOffset);
        return localDate.toISOString().slice(0, 16);
      } catch {
        return "";
      }
    };

    const initialIn = formatForInput(
      log.checkInDateRaw ? `${log.checkInDateRaw}T10:00` : "",
    );

    Swal.fire({
      title: `✏️ แก้ไขบันทึกเวลา: ${log.displayName}`,
      html: `
        <div className="text-left space-y-3 text-xs text-slate-700">
          <div>
            <label className="font-bold block mb-1">ชื่อสาขา / รหัสสาขา:</label>
            <input id="swal-store-name" class="swal2-input !mt-0 !w-full !text-xs" value="${log.storeName}" placeholder="ชื่อสาขา" />
          </div>
          <div className="mt-2">
            <label className="font-bold block mb-1">เวลา Check-IN (เข้างาน):</label>
            <input id="swal-check-in" type="datetime-local" class="swal2-input !mt-0 !w-full !text-xs" value="${initialIn}" />
          </div>
          <div className="mt-2">
            <label className="font-bold block mb-1">เวลา Check-OUT (ออกงาน):</label>
            <input id="swal-check-out" type="datetime-local" class="swal2-input !mt-0 !w-full !text-xs" placeholder="ปล่อยว่างหากยังไม่เลิกงาน" />
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

        return {
          id: log.id,
          storeName: storeName.trim(),
          checkInAt: new Date(checkInVal).toISOString(),
          checkOutAt: checkOutVal ? new Date(checkOutVal).toISOString() : null,
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
  const handleViewMap = (lat: number, lon: number, name: string) => {
    if (!lat || !lon) {
      Swal.fire("ไม่พบพิกัด", "รายการนี้ไม่มีการบันทึกพิกัด GPS", "warning");
      return;
    }
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, "_blank");
  };

  // 🖼️ ดูรูปถ่ายเข้า/ออกงาน
  const handleViewPhoto = (url: string, title: string) => {
    if (!url) {
      Swal.fire("ไม่พบรูปภาพ", "รายการนี้ไม่มีรูปถ่ายบันทึกไว้", "warning");
      return;
    }
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
            <a
              href="/admin"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition border border-blue-700"
            >
              <ArrowLeft size={14} /> หน้าหลัก Admin
            </a>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
            >
              <Printer size={14} /> ปริ้นท์ PDF
            </button>
            <button
              onClick={loadAttendanceData}
              className={`p-2 bg-blue-800 hover:bg-blue-700 rounded-xl transition ${
                loading ? "animate-spin" : ""
              }`}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
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
                ยอดค่าแรง/เบี้ยเลี้ยงรวม (700฿/วัน)
              </span>
              <span className="text-xl font-black text-emerald-600 block">
                {totalWage.toLocaleString()}{" "}
                <span className="text-xs font-bold text-slate-400">บาท</span>
              </span>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
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
                  <th className="p-3 text-center">ค่าแรงรายวัน</th>
                  <th className="p-3 text-center">พิกัด GPS</th>
                  <th className="p-3 text-center">รูปถ่ายเข้า-ออก</th>
                  <th className="p-3 text-center">จัดการ</th>
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
                          {log.empId}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">
                          {log.storeName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {log.storeCode}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">
                        {log.checkInAt}
                      </td>
                      <td className="p-3 font-mono text-blue-600 font-bold">
                        {log.checkOutAt}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        {typeof log.workedHours === "number"
                          ? `${log.workedHours} ชม.`
                          : log.workedHours}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600">
                        {log.dailyWage} ฿
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            handleViewMap(
                              log.checkInLat,
                              log.checkInLon,
                              log.storeName,
                            )
                          }
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin size={12} /> แผนที่
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {log.checkInPhoto && (
                            <button
                              onClick={() =>
                                handleViewPhoto(log.checkInPhoto, "รูปเข้างาน")
                              }
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              รูปเข้า
                            </button>
                          )}
                          {log.checkOutPhoto && (
                            <button
                              onClick={() =>
                                handleViewPhoto(log.checkOutPhoto, "รูปเลิกงาน")
                              }
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              รูปออก
                            </button>
                          )}
                        </div>
                      </td>
                      {/* ✏️ ปุ่มกดแก้ไขข้อมูลสำหรับ Admin */}
                      <td className="p-3 text-center">
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
