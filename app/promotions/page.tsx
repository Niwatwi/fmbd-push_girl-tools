/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  BookOpen,
  Eye,
  X,
  ChevronRight,
  Play,
  Film,
} from "lucide-react";

export default function PromotionsBriefPage() {
  const router = useRouter();
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  // 🎥 รายชื่อคลิปวิดีโอตัวอย่างทั้ง 3 คลิป
  // พี่นำไฟล์วิดีโอไปวางใน public/briefs/ ตามชื่อเหล่านี้ได้เลยครับ
  const videoClips = [
    {
      id: 1,
      src: "/briefs/cheer-sales-example-1.mp4",
      poster: "/briefs/video-poster-1.jpg",
      title: "คลิปที่ 1: เทคนิคการเดินเข้าหาและเปิดใจลูกค้าหน้าร้าน",
      duration: "01:45 นาที",
    },
    {
      id: 2,
      src: "/briefs/cheer-sales-example-2.mp4",
      poster: "/briefs/video-poster-2.jpg",
      title: "คลิปที่ 2: การอธิบายจุดเด่นสินค้า Mild Luxury ให้น่าสนใจ",
      duration: "02:30 นาที",
    },
    {
      id: 3,
      src: "/briefs/cheer-sales-example-3.mp4",
      poster: "/briefs/video-poster-3.jpg",
      title: "คลิปที่ 3: เทคนิคการปิดการขายและการตอบข้อโต้แย้งราคา",
      duration: "01:58 นาที",
    },
  ];

  // 📄 รายชื่อรูปภาพ Brief แคมเปญ Mild Luxury ทั้ง 7 หน้า
  const briefPages = [
    {
      id: 1,
      src: "/briefs/Product Mild Luxury-1.jpg",
      title: "หน้า 1: ข้อมูลแคมเปญหลัก",
    },
    {
      id: 2,
      src: "/briefs/Product Mild Luxury-2.jpg",
      title: "หน้า 2: รายละเอียดคุณสมบัติสินค้า",
    },
    {
      id: 3,
      src: "/briefs/Product Mild Luxury-3.jpg",
      title: "หน้า 3: จุดเด่นและข้อเปรียบเทียบ",
    },
    {
      id: 4,
      src: "/briefs/Product Mild Luxury-4.jpg",
      title: "หน้า 4: ราคาและโปรโมชันหน้าร้าน",
    },
    {
      id: 5,
      src: "/briefs/Product Mild Luxury-5.jpg",
      title: "หน้า 5: เทคนิคการเชียร์ขายเป้าหมาย",
    },
    {
      id: 6,
      src: "/briefs/Product Mild Luxury-6.jpg",
      title: "หน้า 6: รูปแบบการจัดเรียง Planogram",
    },
    {
      id: 7,
      src: "/briefs/Product Mild Luxury-7.jpg",
      title: "หน้า 7: แนวทางการลงบันทึกรายงาน",
    },
  ];

  const handleNextPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeImageIndex !== null && activeImageIndex < briefPages.length - 1) {
      setActiveImageIndex(activeImageIndex + 1);
    }
  };

  const handlePrevPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeImageIndex !== null && activeImageIndex > 0) {
      setActiveImageIndex(activeImageIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12 select-none">
      {/* 🟦 HEADER BRANDING BAR */}
      <header className="bg-[#1e3a8a] text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-2 hover:bg-blue-800 rounded-full transition"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-sm font-black tracking-wide uppercase flex items-center gap-2">
              <BookOpen size={16} /> ข้อมูลข่าวสาร & Promotion
            </h1>
            <p className="text-[10px] text-blue-200 font-medium">
              Reverpro Intertrade Co., Ltd
            </p>
          </div>
        </div>
      </header>

      {/* 📄 MAIN CONTENT CONTAINER */}
      <main className="max-w-md mx-auto px-4 mt-6 space-y-5">
        {/* Title Card */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <h2 className="text-sm font-black text-slate-800">
            Campaign Brief: Product Mild Luxury
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            คู่มือการปฏิบัติงานสนาม ข้อมูลโปรโมชัน และคลิปตัวอย่าง
          </p>
        </div>

        {/* 🎥 SECTION 1: วิดีโอตัวอย่างเทคนิคการขาย (3 คลิป) */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-wider pl-1">
            <Film size={14} className="text-blue-700" />
            <span>วิดีโอตัวอย่างเทคนิคการขาย ({videoClips.length} คลิป)</span>
          </div>

          <div className="space-y-3">
            {videoClips.map((video) => (
              <div
                key={video.id}
                onClick={() => setActiveVideoUrl(video.src)}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-blue-400 active:scale-[0.99] transition cursor-pointer flex items-center p-2 gap-3 group"
              >
                {/* Video Thumbnail ด้านซ้ายแบบประหยัดพื้นที่ */}
                <div className="bg-slate-900 w-24 h-16 rounded-lg relative flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  <img
                    src={video.poster}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-65 group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/120x80/0f172a/white?text=Play";
                    }}
                  />
                  <div className="absolute p-1.5 bg-blue-600 text-white rounded-full shadow-md z-10">
                    <Play size={10} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>

                {/* คำอธิบายด้านขวา */}
                <div className="flex flex-col text-left justify-center flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-800 leading-tight group-hover:text-blue-800 transition truncate-2-lines">
                    {video.title}
                  </p>
                  <span className="text-[9px] font-mono text-slate-400 font-bold mt-1">
                    ความยาว: {video.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 📄 SECTION 2: เอกสารข้อมูลสินค้า Brief PDF/JPG */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-wider pl-1">
            <BookOpen size={14} className="text-blue-700" />
            <span>เอกสารข้อมูลและโปรโมชัน (7 หน้า)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {briefPages.map((page, index) => (
              <div
                key={page.id}
                onClick={() => setActiveImageIndex(index)}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-blue-400 active:scale-95 transition cursor-pointer flex flex-col group"
              >
                <div className="bg-slate-100 aspect-[3/4] relative flex items-center justify-center overflow-hidden">
                  <img
                    src={page.src}
                    alt={page.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/300x400/1e3a8a/white?text=Mild+Luxury";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                    <Eye size={18} />
                  </div>
                </div>
                <div className="p-2 bg-white border-t border-slate-100 text-left">
                  <p className="text-[11px] font-black text-slate-700 truncate">
                    {page.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 🔍 LIGHTBOX MODAL FOR IMAGES */}
      {activeImageIndex !== null && (
        <div
          onClick={() => setActiveImageIndex(null)}
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 animate-fade-in"
        >
          <div className="absolute top-4 inset-x-4 max-w-md mx-auto flex justify-between items-center text-white z-50">
            <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-full backdrop-blur-xs">
              หน้า {activeImageIndex + 1} / {briefPages.length}
            </span>
            <button
              onClick={() => setActiveImageIndex(null)}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
            >
              <X size={20} />
            </button>
          </div>
          {activeImageIndex > 0 && (
            <button
              onClick={handlePrevPage}
              className="absolute left-4 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 active:scale-90 transition z-50"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <div className="max-w-md w-full max-h-[80vh] flex items-center justify-center overflow-auto p-2">
            <img
              src={briefPages[activeImageIndex].src}
              alt="Brief"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
          {activeImageIndex < briefPages.length - 1 && (
            <button
              onClick={handleNextPage}
              className="absolute right-4 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 active:scale-90 transition z-50"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}

      {/* 🎬 LIGHTBOX MODAL FOR VIDEO PLAYER */}
      {activeVideoUrl !== null && (
        <div
          onClick={() => setActiveVideoUrl(null)}
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 animate-fade-in"
        >
          <div className="absolute top-4 right-4 text-white z-50">
            <button
              onClick={() => setActiveVideoUrl(null)}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
            >
              <X size={20} />
            </button>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10"
          >
            <video
              src={activeVideoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-white/40 text-[10px] mt-3 font-bold">
            สตรีมมิ่งไฟล์วิดีโอจากระบบคลาวด์ภายในองค์กร RVI
          </p>
        </div>
      )}

      {/* FOOTER */}
      <footer className="max-w-md mx-auto mt-12 text-center text-[9px] text-slate-400 font-bold">
        © 2026 Reverpro Intertrade Co., Ltd. All Rights Reserved.
      </footer>
    </div>
  );
}
