"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";
import { ArrowLeft, Film, Store, Tag, Upload, Video } from "lucide-react";
import {
  createSalesVideoUploadAction,
  getSalesVideoContextAction,
  saveSalesVideoAction,
} from "../actions";

type Context = {
  userId: number;
  userName: string;
  storeCode: string;
  storeName: string;
  account: string;
  promotions: { id: number; title: string }[];
};

const MAX_SIZE = 150 * 1024 * 1024;

export default function SalesVideoUploadPage() {
  const router = useRouter();
  const [context, setContext] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotionId, setPromotionId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getSalesVideoContextAction().then((res) => {
      if (res.success) {
        const ctx = res as unknown as Context;
        setContext(ctx);
        if (ctx.promotions.length === 1) {
          setPromotionId(String(ctx.promotions[0].id));
        }
      } else {
        Swal.fire({
          title: "ไม่สามารถอัปโหลดได้",
          text: res.message,
          icon: "warning",
          confirmButtonColor: "#1e3a8a",
        }).then(() => router.push("/"));
      }
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (selected: File | null) => {
    if (!selected) return;
    if (selected.size > MAX_SIZE) {
      Swal.fire("ไฟล์ใหญ่เกินไป", "ขนาดไฟล์ต้องไม่เกิน 150 MB", "warning");
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!context || !file) return;
    setUploading(true);
    try {
      const signed = await createSalesVideoUploadAction({
        userId: context.userId,
        fileName: file.name || "pitch.mp4",
        mimeType: file.type,
        fileSize: file.size,
      });
      if (!signed.success || !signed.path || !signed.token) {
        throw new Error(signed.message || "สร้างลิงก์อัปโหลดไม่สำเร็จ");
      }
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error } = await supabase.storage
        .from("sales-pitch-videos")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) throw new Error(error.message);

      const saved = await saveSalesVideoAction({
        userId: context.userId,
        path: signed.path,
        promotionId: promotionId ? Number(promotionId) : null,
        mimeType: file.type,
        fileSize: file.size,
        fileName: file.name,
      });
      if (!saved.success) throw new Error(saved.message);

      await Swal.fire({
        icon: "success",
        title: "อัปโหลดคลิปสำเร็จ",
        confirmButtonColor: "#10b981",
      });
      setFile(null);
      setPreviewUrl("");
    } catch (error: any) {
      Swal.fire("อัปโหลดไม่สำเร็จ", error.message || "กรุณาลองใหม่", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="staff-theme min-h-screen bg-green-200 text-slate-950 pb-12">
      <header className="bg-[#1e3a8a] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-1 hover:bg-blue-800 rounded-lg cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-left">
            <h1 className="text-sm font-black flex items-center gap-1.5">
              <Video size={16} className="text-emerald-400" />
              อัปโหลดคลิปเชียร์ขาย
            </h1>
            <p className="text-[10px] text-blue-200">Sales Pitch Video</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4 text-left">
        {loading ? (
          <p className="text-center text-xs font-bold">กำลังโหลด...</p>
        ) : (
          context && (
            <>
              <div className="bg-slate-900 p-4 rounded-xl text-white flex items-center gap-3">
                <div className="p-2.5 bg-white/10 text-amber-300 rounded-lg">
                  <Store size={16} />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">
                    {context.userName}
                  </p>
                  <h3 className="text-xs font-black">{context.storeName}</h3>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-[11px] font-black text-slate-700">
                  <span className="flex items-center gap-1.5 mb-1">
                    <Tag size={13} className="text-amber-600" /> แคมเปญ
                  </span>
                  <select
                    value={promotionId}
                    onChange={(e) => setPromotionId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold"
                  >
                    <option value="">ไม่ระบุแคมเปญ</option>
                    {context.promotions.map((promo) => (
                      <option key={promo.id} value={promo.id}>
                        {promo.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-4 cursor-pointer bg-slate-50 hover:bg-slate-100">
                  {previewUrl ? (
                    <video
                      src={previewUrl}
                      controls
                      playsInline
                      className="w-full max-h-72 rounded-lg bg-black"
                    />
                  ) : (
                    <>
                      <Film size={32} className="text-slate-400" />
                      <span className="text-xs font-black text-slate-600">
                        ถ่ายวิดีโอ หรือเลือกไฟล์คลิป
                      </span>
                      <span className="text-[10px] text-slate-400">
                        MP4 / WebM / MOV ไม่เกิน 150 MB
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => {
                      handleFile(e.target.files?.[0] || null);
                      e.target.value = "";
                    }}
                  />
                </label>
                {file && (
                  <p className="text-[10px] font-bold text-slate-500 truncate">
                    {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                )}

                <button
                  type="button"
                  disabled={!file || uploading}
                  onClick={handleUpload}
                  className="w-full bg-blue-900 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Upload size={16} />
                  {uploading ? "กำลังอัปโหลด..." : "อัปโหลดคลิป"}
                </button>
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}
