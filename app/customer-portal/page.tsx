"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  BarChart3,
  FileText,
  CheckCircle,
  TrendingUp,
  Target,
  Download,
  MapPin,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  getAttendanceReportForAccounting,
  getCustomerSalesVsTargetReport,
} from "../dashboard/actions";

export default function CustomerReportPortal() {
  const [activeTab, setActiveTab] = useState<"attendance" | "analytics">(
    "analytics",
  );
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      const attRes = await getAttendanceReportForAccounting();
      const anaRes = await getCustomerSalesVsTargetReport();

      if (attRes.success) setAttendanceData(attRes.data);
      if (anaRes.success) setAnalyticsData(anaRes.data);
      setLoading(false);
    }
    loadDashboardData();
  }, []);

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return "-";
    return (
      new Date(isoString).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* TOP PORTAL BAR */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <Building2 size={18} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-400 block tracking-wider">
                CUSTOMER WEB VIEW
              </span>
              <span className="text-sm font-black text-slate-800 block -mt-0.5">
                ระบบสรุปผลงานและรายงานสาขา
              </span>
            </div>
          </div>

          {/* TAB CONTROLLERS */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === "analytics" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <BarChart3 size={14} /> วิเคราะห์ยอดขาย & Target
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === "attendance" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Users size={14} /> ข้อมูลเวลาเข้างาน (Time Attendance)
            </button>
          </div>
        </div>
      </nav>

      {/* DASHBOARD BODY CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400 font-bold">
                กำลังประมวลผลสถิติภาพรวม...
              </p>
            </div>
          </div>
        ) : activeTab === "analytics" ? (
          <div className="space-y-6 animate-fade-in">
            {/* 📊 ส่วนที่ 1: กราฟเปรียบเทียบยอดขายแยกประเภทเทียบกับเป้าหมายแต่ละร้านค้า */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs text-left">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    กราฟวิเคราะห์ยอดจำหน่ายสะสมแยกตามสาขา
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold">
                    ข้อมูลอัปเดตเรียลไทม์เปรียบเทียบสัดส่วนยอดขายสินค้าแต่ละรุ่น
                  </p>
                </div>
              </div>

              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="storeName"
                      tick={{ fontSize: 10, fontWeight: "bold" }}
                    />
                    <YAxis tick={{ fontSize: 10, fontWeight: "bold" }} />
                    <Tooltip
                      contentStyle={{ fontSize: "11px", borderRadius: "12px" }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }}
                    />
                    {/* แยกแท่งตามประเภทสินค้าสีที่น้องเชียร์ขายหน้างาน */}
                    <Bar
                      dataKey="greenSales"
                      name="รุ่นสีเขียว 90"
                      fill="#10b981"
                      stackId="a"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="blueSales"
                      name="รุ่นสีฟ้า 90"
                      fill="#3b82f6"
                      stackId="a"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="orangeSales"
                      name="รุ่นสีส้ม 100"
                      fill="#f97316"
                      stackId="a"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="targetPacks"
                      name="เป้าหมาย Target (ห่อ)"
                      fill="#e2e8f0"
                      barSize={14}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 📋 ส่วนที่ 2: ตารางผลรวมยอดขายเทียบ Target อ้างอิงจากแบบฟอร์มหลัก */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 text-left">
                <h3 className="text-sm font-black text-slate-800">
                  ตารางสรุปเปอร์เซ็นต์ความสำเร็จยอดขายแคมเปญ
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-bold">รหัสสาขา</th>
                      <th className="p-4 font-bold">
                        ชื่อร้านค้า/จุดปฏิบัติงาน
                      </th>
                      <th className="p-4 font-bold text-center">
                        ยอดขายจริง (ห่อ)
                      </th>
                      <th className="p-4 font-bold text-center">
                        เป้าหมายประจำเดือน
                      </th>
                      <th className="p-4 font-bold text-center">
                        เปอร์เซ็นต์ความสำเร็จ
                      </th>
                      <th className="p-4 font-bold text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {analyticsData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-mono font-bold text-slate-500">
                          {row.storeCode}
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          {row.storeName}
                        </td>
                        <td className="p-4 text-center font-bold text-blue-600">
                          {row.actualPacks} ห่อ
                        </td>
                        <td className="p-4 text-center text-slate-400 font-bold">
                          {row.targetPacks} ห่อ
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-slate-800">
                            {row.achievedPercent}%
                          </span>
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full"
                              style={{
                                width: `${Math.min(100, row.achievedPercent)}%`,
                              }}
                            ></div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {row.achievedPercent >= 100 ? (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-emerald-200">
                              ถึงเป้าแล้ว 🏆
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-amber-200">
                              กำลังดำเนินการ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ⏱️ แท็บตารางเวลาเข้างาน (Time Attendance View) เพื่อส่งฝ่ายบัญชี */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden animate-fade-in text-left">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  บันทึกข้อมูลเวลาการปฏิบัติงานของพนักงาน
                </h3>
                <p className="text-[11px] text-slate-400 font-bold">
                  ใช้สำหรับประมวลผลแนบเบิกจ่ายค่าแรงและค่าเดินทางส่งบัญชี
                </p>
              </div>
              <button
                onClick={() => alert("กำลังส่งออกไฟล์ Excel สำหรับส่งบัญชี...")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition shadow-xs"
              >
                <Download size={14} /> Export to Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold">รหัสพนักงาน</th>
                    <th className="p-4 font-bold">จุดปฏิบัติงาน</th>
                    <th className="p-4 font-bold text-center">
                      เวลาเข้างาน (Check-in)
                    </th>
                    <th className="p-4 font-bold text-center">
                      เวลาออกงาน (Check-out)
                    </th>
                    <th className="p-4 font-bold text-center">
                      ตรวจสอบพิกัด GPS
                    </th>
                    <th className="p-4 font-bold text-center">สถานะการทำงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {attendanceData.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="p-4 font-mono font-bold text-slate-800">
                        PG-{log.user_id}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 block">
                          {log.store_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold font-mono">
                          {log.store_code}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-emerald-600">
                        {formatDateTime(log.check_in_at)}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-rose-600">
                        {formatDateTime(log.check_out_at)}
                      </td>
                      <td className="p-4 text-center">
                        {log.check_in_lat ? (
                          <a
                            href={`https://www.google.com/maps?q=${log.check_in_lat},${log.check_in_lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold"
                          >
                            <MapPin size={12} /> ดูแผนที่ Google Map
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {log.check_out_at ? (
                          <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-blue-200">
                            ปฏิบัติงานเสร็จสิ้น
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-emerald-200 animate-pulse">
                            กำลังปฏิบัติงาน
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
