/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  handleLogout,
  checkTodayAttendance,
  saveCheckInAction,
  saveCheckOutAction,
  getStoresByArea,
} from "./login/actions";
import {
  MapPin,
  Camera,
  LogOut,
  FileSpreadsheet,
  Newspaper,
  BarChart3,
  Store,
  ChevronRight,
  RefreshCw,
  Clock,
} from "lucide-react";

interface UserSession {
  id: number;
  display_name: string;
  company_tag: string;
  area: string;
  image_url: string;
}

interface StoreItem {
  store_code: string;
  store_name: string;
}

export default function PghMainHubClient({ user }: { user: UserSession }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logId, setLogId] = useState<number | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<
    "not_checked_in" | "checked_in" | "checked_out"
  >("not_checked_in");
  const [currentTime, setCurrentTime] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [storesList, setStoresList] = useState<StoreItem[]>([]);
  const [selectedStoreIndex, setSelectedStoreIndex] = useState<number>(0);
  const [activeStoreDisplay, setActiveStoreDisplay] =
    useState<StoreItem | null>(null);
  const [activeAction, setActiveAction] = useState<
    "checkin" | "checkout" | null
  >(null);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 800;
          const scale = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
      };
    });
  };

  const initHubData = async () => {
    setIsRefreshing(true);
    if (!user?.id) return;
    try {
      const storeRes = await getStoresByArea(user.area);
      if (storeRes.success && storeRes.stores.length > 0)
        setStoresList(storeRes.stores);

      const attendRes = await checkTodayAttendance(user.id);
      if (attendRes.success && attendRes.log) {
        setLogId(attendRes.log.id);
        setActiveStoreDisplay({
          store_code: attendRes.log.store_code,
          store_name: attendRes.log.store_name,
        });

        const formatTime = (iso: string) =>
          new Date(iso).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Bangkok",
          });

        if (attendRes.log.check_out_at) {
          setAttendanceStatus("checked_out");
          setCheckInTime(formatTime(attendRes.log.check_in_at));
          setCheckOutTime(formatTime(attendRes.log.check_out_at));
        } else {
          setAttendanceStatus("checked_in");
          setCheckInTime(formatTime(attendRes.log.check_in_at));
          setCheckOutTime(null);
        }
      } else {
        setLogId(null);
        setActiveStoreDisplay(null);
        setAttendanceStatus("not_checked_in");
        setCheckInTime(null);
        setCheckOutTime(null);
      }
    } catch (e) {
      console.error("Refresh failed", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    initHubData();
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        `${now.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}, ${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} น.`,
      );
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, [user]);

  const startAttendanceFlow = async (type: "checkin" | "checkout") => {
    if (type === "checkin" && attendanceStatus !== "not_checked_in") {
      Swal.fire({
        title: "บันทึกเวลาแล้ว",
        text: `วันนี้คุณได้ทำรายการ Check-in เข้างานเรียบร้อยแล้วค่ะ (เวลา: ${checkInTime} น.)`,
        icon: "info",
        confirmButtonColor: "#1e3a8a",
      });
      return;
    }

    if (type === "checkout" && attendanceStatus === "checked_out") {
      Swal.fire({
        title: "ทำรายการเสร็จสิ้นแล้ว",
        text: `คุณได้ลงเวลา Check-out ออกจากงานของวันนี้เรียบร้อยแล้วค่ะ`,
        icon: "success",
        confirmButtonColor: "#1e3a8a",
      });
      return;
    }

    if (type === "checkout" && attendanceStatus !== "checked_in") {
      Swal.fire({
        title: "กรุณา Check-in ก่อน",
        text: "คุณต้องทำการบันทึกเวลาเข้างาน (Check-in) ก่อนจึงจะสามารถกดลงเวลาออกงานได้ค่ะ",
        icon: "warning",
        confirmButtonColor: "#1e3a8a",
      });
      return;
    }

    const targetStore =
      type === "checkin" ? storesList[selectedStoreIndex] : activeStoreDisplay;
    if (!targetStore) {
      Swal.fire(
        "ไม่พบข้อมูลสาขา",
        "กรุณาเลือกสาขาปฏิบัติงานในรายชื่อก่อนทำรายการค่ะ",
        "error",
      );
      return;
    }

    Swal.fire({
      title:
        type === "checkin" ? "บันทึกเวลา Check-in" : "ยืนยันการ Check-out?",
      text: `สถานที่: ${targetStore.store_name}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "บันทึกพิกัดและถ่ายรูป",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: type === "checkin" ? "#10b981" : "#ef4444",
    }).then((result) => {
      if (result.isConfirmed) {
        setActiveAction(type);
        fileInputRef.current?.click();
      }
    });
  };

  const handleCaptureComplete = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !activeAction) return;

    Swal.fire({
      title: "กำลังตรวจสอบพิกัด GPS และอัปโหลดข้อมูล...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const pos = await new Promise<{ lat: number; lon: number }>(
        (res, rej) => {
          navigator.geolocation.getCurrentPosition(
            (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
            (e) => rej(e),
            { enableHighAccuracy: true },
          );
        },
      );

      const base64Image = await resizeImage(file);
      const targetStore = storesList[selectedStoreIndex];

      if (activeAction === "checkin") {
        const res = await saveCheckInAction({
          userId: user.id,
          storeCode: targetStore.store_code,
          storeName: targetStore.store_name,
          latitude: pos.lat,
          longitude: pos.lon,
          base64Image,
        });
        if (res.success) {
          setAttendanceStatus("checked_in");
          await initHubData();
          Swal.fire("สำเร็จ", "บันทึกเวลาเข้างานเรียบร้อย", "success");
        } else {
          Swal.fire("ผิดพลาด", res.message, "error");
        }
      } else {
        const res = await saveCheckOutAction({
          logId: logId!,
          userId: user.id,
          latitude: pos.lat,
          longitude: pos.lon,
          base64Image,
        });
        if (res.success) {
          setAttendanceStatus("checked_out");
          await initHubData();
          Swal.fire("สำเร็จ", "สิ้นสุดงานวันนี้เรียบร้อย", "success");
        } else {
          Swal.fire("ผิดพลาด", res.message, "error");
        }
      }
    } catch (err: any) {
      Swal.fire(
        "ข้อผิดพลาด",
        "โปรดเปิดสิทธิ์เข้าถึงพิกัด GPS บนอุปกรณ์ของคุณเพื่อทำรายการ",
        "error",
      );
    }
  };

  const onLogoutClick = async () => {
    const result = await Swal.fire({
      title: "ออกจากระบบ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
    });
    if (result.isConfirmed) {
      await handleLogout();
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12 select-none">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleCaptureComplete}
        className="hidden"
      />

      <header className="bg-[#1e3a8a] text-white p-6 rounded-b-[2rem] shadow-lg sticky top-0 z-50">
        <div className="max-w-md mx-auto">
          <div className="flex flex-col items-center gap-1 mb-6">
            <img
              src="/rvp.png"
              alt="RVP Logo"
              className="w-12 h-12 bg-white rounded-full p-1.5 shadow-md mb-1"
            />
            <h1 className="text-lg font-black tracking-widest text-white">
              RVI-PUSH GIRL
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-200 font-bold">
              Reverpro Intertrade Co., Ltd
            </p>
          </div>
          <div className="flex justify-between items-center border-t border-blue-700/60 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-blue-400 overflow-hidden shrink-0">
                <img
                  src={user?.image_url || "/rvp.png"}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <h2 className="text-xs font-black tracking-tight">
                  {user?.display_name}
                </h2>
                <p className="text-[9px] text-blue-200 uppercase">
                  {user?.area} | {user?.company_tag}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogoutClick}
              className="p-2 bg-blue-800/40 rounded-full hover:bg-red-700/60 transition"
            >
              <LogOut size={16} className="text-blue-100" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6 space-y-4">
        <div className="flex items-center justify-between bg-white p-3 px-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-blue-900 font-black">
            <Clock size={16} />
            <span className="font-mono text-[11px]">{currentTime}</span>
          </div>
          <button
            onClick={initHubData}
            className={`p-2 rounded-full hover:bg-slate-100 transition ${isRefreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex items-start gap-3">
          <div className="p-3 bg-blue-50 text-[#1e3a8a] rounded-xl">
            <Store size={20} />
          </div>
          <div className="space-y-1.5 text-left w-full">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              สาขาปฏิบัติงาน
            </p>
            {attendanceStatus === "not_checked_in" ? (
              <select
                value={selectedStoreIndex}
                onChange={(e) => setSelectedStoreIndex(Number(e.target.value))}
                className="w-full p-2 border rounded-lg text-xs font-bold bg-white text-slate-800"
              >
                {storesList.map((s, idx) => (
                  <option key={s.store_code} value={idx}>
                    {s.store_name}
                  </option>
                ))}
              </select>
            ) : (
              <h4 className="text-sm font-black text-blue-800">
                {activeStoreDisplay?.store_name || "ไม่ได้เลือกร้านค้า"}
              </h4>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => startAttendanceFlow("checkin")}
            className="p-4 bg-emerald-600 text-white rounded-xl font-bold text-xs h-24 shadow-sm active:scale-95 transition flex flex-col items-center justify-center gap-1.5"
          >
            <span>บันทึก Check-in</span>
            {checkInTime && (
              <span className="text-[10px] font-mono font-normal bg-emerald-800/30 px-2 py-0.5 rounded-md animate-fade-in">
                เวลา: {checkInTime} น.
              </span>
            )}
          </button>

          <button
            onClick={() => startAttendanceFlow("checkout")}
            className="p-4 bg-rose-600 text-white rounded-xl font-bold text-xs h-24 shadow-sm active:scale-95 transition flex flex-col items-center justify-center gap-1.5"
          >
            <span>บันทึก Check-out</span>
            {checkOutTime && (
              <span className="text-[10px] font-mono font-normal bg-rose-800/30 px-2 py-0.5 rounded-md">
                เวลา: {checkOutTime} น.
              </span>
            )}
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push(`/daily-report?userId=${user?.id}`)}
            className="w-full bg-white p-4 rounded-xl border flex items-center justify-between hover:border-blue-400 transition"
          >
            <span className="font-black text-slate-800 flex items-center gap-3">
              <FileSpreadsheet className="text-blue-600" /> ส่งรายงาน Daily
              Report
            </span>
            <ChevronRight size={16} />
          </button>

          <button
            onClick={() => router.push("/promotions")}
            className="w-full bg-white p-4 rounded-xl border flex items-center justify-between hover:border-blue-400 transition"
          >
            <span className="font-black text-slate-800 flex items-center gap-3">
              <Newspaper className="text-amber-600" /> ข้อมูลข่าวสาร & Promotion
            </span>
            <ChevronRight size={16} />
          </button>

          {/* 🎯 แก้ไขปุ่มนำทางไปหน้าแดชบอร์ดให้พ่วงค่าพารามิเตอร์ของพนักงานไปด้วยเรียบร้อยครับ */}
          <button
            onClick={() => router.push(`/dashboard?userId=${user?.id}`)}
            className="w-full bg-white p-4 rounded-xl border flex items-center justify-between hover:border-blue-400 transition"
          >
            <span className="font-black text-slate-800 flex items-center gap-3">
              <BarChart3 className="text-indigo-600" /> Dashboard วิเคราะห์ผลงาน
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </main>

      <footer className="max-w-md mx-auto mt-12 text-center text-[9px] text-slate-400 font-bold">
        © 2026 Reverpro Intertrade Co., Ltd.
      </footer>
    </div>
  );
}
