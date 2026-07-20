"use client";

import React, { useState, useEffect } from "react";
import {
  Target,
  Store,
  Coins,
  ShoppingBag,
  Save,
  Edit3,
  PlusCircle,
  RefreshCw,
  LayoutDashboard,
  Trash2,
  Search,
  Calculator,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getStoreTargets,
  saveStoreTargetAction,
  getAvailableStores,
  deleteStoreTargetAction,
} from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";

export default function AdminTargetManagement() {
  const router = useRouter();
  const [targetsList, setTargetsList] = useState<any[]>([]);
  const [masterStores, setMasterStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // States สำหรับฟอร์มแยกราย SKU
  const [storeCode, setStoreCode] = useState("");
  const [storeName, setStoreName] = useState("");

  const [targetGreen, setTargetGreen] = useState<number>(30); // เป้าสีเขียว (ชุด)
  const [targetBlue, setTargetBlue] = useState<number>(30); // เป้าสีฟ้า (ชุด)
  const [targetOrange, setTargetOrange] = useState<number>(20); // เป้าสีส้ม (ชุด)

  const PRICE_GREEN = 150;
  const PRICE_BLUE = 142;
  const PRICE_ORANGE = 100;

  const [isEditing, setIsEditing] = useState(false);

  // คำนวณยอดรวมอัตโนมัติ
  const totalSets =
    (Number(targetGreen) || 0) +
    (Number(targetBlue) || 0) +
    (Number(targetOrange) || 0);
  const totalPacksIncludeFree = totalSets * 2; // 1 แถม 1 = 2 ชิ้น
  const totalCalculatedRevenue =
    (Number(targetGreen) || 0) * PRICE_GREEN +
    (Number(targetBlue) || 0) * PRICE_BLUE +
    (Number(targetOrange) || 0) * PRICE_ORANGE;

  const initPageData = async () => {
    setLoading(true);
    const storesRes = await getAvailableStores();
    const targetsRes = await getStoreTargets();

    if (storesRes.success) setMasterStores(storesRes.data);
    if (targetsRes.success) setTargetsList(targetsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    initPageData();
  }, []);

  const handleStoreChange = (selectedCode: string) => {
    setStoreCode(selectedCode);
    const foundStore = masterStores.find((s) => s.store_code === selectedCode);
    setStoreName(foundStore ? foundStore.store_name : "");
  };

  const handleEditClick = (item: any) => {
    setIsEditing(true);
    setStoreCode(item.store_code);
    setStoreName(item.store_name);
    setTargetGreen(Number(item.target_green90 || 0));
    setTargetBlue(Number(item.target_blue90 || 0));
    setTargetOrange(Number(item.target_orange100 || 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = async (code: string, name: string) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบเป้าหมาย?",
      text: `คุณต้องการลบเป้าหมายสาขา ${name} (${code}) ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบรายการ",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await deleteStoreTargetAction(code);
      if (res.success) {
        Swal.fire(
          "ลบสำเร็จ",
          `ลบเป้าหมายสาขา ${name} เรียบร้อยแล้ว`,
          "success",
        );
        initPageData();
      } else {
        Swal.fire("เกิดข้อผิดพลาด", res.message, "error");
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setStoreCode("");
    setStoreName("");
    setTargetGreen(30);
    setTargetBlue(30);
    setTargetOrange(20);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeCode) {
      Swal.fire(
        "ข้อมูลไม่ครบ",
        "กรุณาเลือกร้านค้าที่ต้องการตั้งเป้าหมายค่ะ",
        "warning",
      );
      return;
    }

    setIsSubmitting(true);
    const res = await saveStoreTargetAction({
      store_code: storeCode,
      store_name: storeName,
      target_green90: targetGreen,
      target_blue90: targetBlue,
      target_orange100: targetOrange,
      price_green90: PRICE_GREEN,
      price_blue90: PRICE_BLUE,
      price_orange100: PRICE_ORANGE,
    });
    setIsSubmitting(false);

    if (res.success) {
      Swal.fire({
        title: "บันทึกสำเร็จ",
        text: `ตั้งเป้าหมายสาขา ${storeName} เรียบร้อยแล้วค่ะ`,
        icon: "success",
        confirmButtonColor: "#1e3a8a",
      });
      resetForm();
      initPageData();
    } else {
      Swal.fire("เกิดข้อผิดพลาด", res.message, "error");
    }
  };

  const filteredTargets = targetsList.filter(
    (item) =>
      item.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.store_code?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* HEADER TOP BAR */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-2 rounded-xl">
              <Target size={18} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-400 block tracking-wider">
                BACKEND MANAGEMENT
              </span>
              <span className="text-sm font-black text-slate-800 block -mt-0.5">
                ระบบจัดการ Target ประจำสาขา (แยกรายสินค้า)
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push("/customer-portal")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition cursor-pointer"
          >
            <LayoutDashboard size={14} /> กลับหน้าดูรีพอร์ตรวม
          </button>
        </div>
      </nav>

      {/* MAIN BODY CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📋 ฝั่งซ้าย: ฟอร์มตั้งเป้าหมายประจำสาขา */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs h-fit space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              {isEditing ? (
                <Edit3 size={16} className="text-amber-500" />
              ) : (
                <PlusCircle size={16} className="text-blue-600" />
              )}
              {isEditing ? "แก้ไขเป้าหมายสาขา" : "เพิ่มเป้าหมายสาขาใหม่"}
            </h3>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded-md font-bold transition cursor-pointer"
              >
                ยกเลิกแก้ไข
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* เลือกร้านค้า */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                เลือกร้านค้าปฏิบัติงาน
              </label>
              <div className="relative">
                <Store
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={14}
                />
                <select
                  value={storeCode}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  disabled={isEditing}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">-- กรุณาเลือกร้านค้า --</option>
                  {masterStores.map((store) => (
                    <option key={store.id} value={store.store_code}>
                      {store.store_name} ({store.company_tag})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ส่วนกรอก Target แยกตาม SKU */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-black text-slate-700 block">
                🎯 กำหนดเป้าหมายขายรายสินค้า (จำนวนชุด / โปร 1 แถม 1)
              </span>

              {/* สีเขียว 90 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    สีเขียว 90 (เป้าหมายชุด)
                  </span>
                  <span className="text-slate-400">
                    ราคา {PRICE_GREEN} ฿/ชุด
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={targetGreen}
                  onChange={(e) => setTargetGreen(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border rounded-xl text-xs font-mono font-bold text-slate-800 bg-emerald-50/30 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* สีฟ้า 90 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-blue-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    สีฟ้า 90 (เป้าหมายชุด)
                  </span>
                  <span className="text-slate-400">
                    ราคา {PRICE_BLUE} ฿/ชุด
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={targetBlue}
                  onChange={(e) => setTargetBlue(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border rounded-xl text-xs font-mono font-bold text-slate-800 bg-blue-50/30 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* สีส้ม 100 */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-orange-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    สีส้ม 100 (เป้าหมายชุด)
                  </span>
                  <span className="text-slate-400">
                    ราคา {PRICE_ORANGE} ฿/ชุด
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={targetOrange}
                  onChange={(e) => setTargetOrange(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border rounded-xl text-xs font-mono font-bold text-slate-800 bg-orange-50/30 focus:bg-white focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* กล่องสรุปผลคำนวณอัตโนมัติ */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-2 text-[11px]">
              <div className="flex items-center gap-1 text-amber-400 font-bold border-b border-slate-800 pb-1.5">
                <Calculator size={13} /> สรุปยอดเป้าหมายรวมอัตโนมัติ
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-400">รวมโปรโมชัน:</span>
                <span className="text-white font-mono">
                  {totalSets.toLocaleString()} ชุด
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-400">
                  รวมจำนวนชิ้น (คิด 1 แถม 1):
                </span>
                <span className="text-amber-300 font-mono">
                  {totalPacksIncludeFree.toLocaleString()} ชิ้น/ห่อ
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-400">รวมเป้าหมายมูลค่าขาย:</span>
                <span className="text-emerald-400 font-mono font-black text-xs">
                  {totalCalculatedRevenue.toLocaleString()} ฿
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 rounded-xl text-xs font-black text-white shadow-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                isEditing
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {isEditing
                ? "อัปเดตการแก้ไขเป้าหมาย"
                : "บันทึกและเปิดเป้าหมายสาขา"}
            </button>
          </form>
        </div>

        {/* 📊 ฝั่งขวา: รายการตารางเป้าหมายปัจจุบัน */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
            <div>
              <h3 className="text-sm font-black text-slate-800">
                รายการเป้าหมายแต่ละร้านค้าในระบบปัจจุบัน
              </h3>
              <p className="text-[11px] text-slate-400 font-bold">
                แสดงผลแยกราย SKU และยอดรวมคิดสัดส่วนโปรโมชัน 1 แถม 1
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search
                  className="absolute left-2.5 top-2.5 text-slate-400"
                  size={12}
                />
                <input
                  type="text"
                  placeholder="ค้นหาสาขา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border rounded-xl text-[11px] bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>

              <button
                onClick={initPageData}
                className={`p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition cursor-pointer ${
                  loading ? "animate-spin" : ""
                }`}
              >
                <RefreshCw size={14} className="text-slate-500" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-bold">
                กำลังดึงข้อมูลจากตารางระบบ...
              </div>
            ) : filteredTargets.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 font-bold">
                {searchTerm
                  ? "ไม่พบข้อมูลเป้าหมายที่ค้นหา"
                  : "ยังไม่มีการกำหนดเป้าหมายสาขาใดๆ ในระบบ"}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3 font-bold">สาขา / รหัส</th>
                    <th className="p-3 font-bold text-center">
                      เขียว 90 (ชุด)
                    </th>
                    <th className="p-3 font-bold text-center">ฟ้า 90 (ชุด)</th>
                    <th className="p-3 font-bold text-center">ส้ม 100 (ชุด)</th>
                    <th className="p-3 font-bold text-center">รวมชิ้น (แถม)</th>
                    <th className="p-3 font-bold text-right">เป้ารวม (บาท)</th>
                    <th className="p-3 font-bold text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredTargets.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 transition"
                    >
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">
                          {item.store_name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {item.store_code}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600 bg-emerald-50/30">
                        {Number(item.target_green90 || 0)}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-blue-600 bg-blue-50/30">
                        {Number(item.target_blue90 || 0)}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-orange-600 bg-orange-50/30">
                        {Number(item.target_orange100 || 0)}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-amber-600">
                        {Number(item.target_packs || 0).toLocaleString()} ชิ้น
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-800">
                        {Number(item.target_revenue || 0).toLocaleString()} ฿
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-bold transition cursor-pointer"
                            title="แก้ไขเป้า"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteClick(
                                item.store_code,
                                item.store_name,
                              )
                            }
                            className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 font-bold transition cursor-pointer"
                            title="ลบเป้า"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
