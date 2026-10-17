/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  BookOpen,
  Eye,
  X,
  ChevronRight,
  Play,
  Film,
  Tag,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { getCurrentUserPromotionBriefAction } from "@/app/admin/promotions/actions";
import { getPromotionBriefMediaAction } from "@/app/admin/promotion-briefs/actions";

interface BriefVideo {
  id: string | number;
  src: string;
  poster: string;
  title: string;
  duration: string;
  campaignTitle?: string;
}

interface BriefDocument {
  id: string | number;
  src: string;
  title: string;
  mime_type?: string | null;
}

export default function PromotionsBriefPage() {
  const router = useRouter();
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [briefMedia, setBriefMedia] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    getCurrentUserPromotionBriefAction()
      .then(async (result) => {
        const matchedCampaigns = result.success ? result.promotions || [] : [];
        if (active) setCampaigns(matchedCampaigns);
        if (matchedCampaigns.length > 0) {
          const mediaResult = await getPromotionBriefMediaAction(
            matchedCampaigns.map((campaign: any) => String(campaign.id)),
          );
          if (active) {
            setBriefMedia(mediaResult.success ? mediaResult.media || [] : []);
          }
        }
      })
      .catch(() => {
        if (active) {
          setCampaigns([]);
          setBriefMedia([]);
        }
      })
      .finally(() => {
        if (active) setCampaignLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const legacyVideoClips: BriefVideo[] = [
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

  const legacyBriefPages: BriefDocument[] = [
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

  const hasCampaignMedia = briefMedia.length > 0;
  const videoClips: BriefVideo[] = hasCampaignMedia
    ? briefMedia
        .filter((item) => item.media_type === "VIDEO")
        .map((item) => ({
          id: item.id,
          src: item.media_url,
          poster: item.poster_url || "/briefs/video-poster-1.jpg",
          title: item.title,
          duration: item.duration || "",
          campaignTitle: campaigns.find(
            (campaign) => String(campaign.id) === String(item.promotion_id),
          )?.campaign_title,
        }))
    : legacyVideoClips;
  const briefPages: BriefDocument[] = hasCampaignMedia
    ? briefMedia
        .filter((item) => item.media_type === "DOCUMENT")
        .map((item) => ({
          id: item.id,
          src: item.media_url,
          title: item.title,
          mime_type: item.mime_type,
        }))
    : legacyBriefPages;

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
    <div className="staff-theme min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12 select-none">
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
          <ThemeToggle className="ml-auto bg-blue-800/40 text-blue-100 hover:bg-blue-700/60" />
        </div>
      </header>

      {/* 📄 MAIN CONTENT CONTAINER */}
      <main className="max-w-md mx-auto px-4 mt-6 space-y-5">
        <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-xs text-left">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-sm font-black text-slate-800">
                แคมเปญประจำสาขา
              </h2>
              <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                รายการสินค้าและเป้าหมายสำหรับรอบปัจจุบัน
              </p>
            </div>
            <Tag size={16} className="text-emerald-700" />
          </div>
          {campaignLoading ? (
            <p className="text-xs text-slate-500">กำลังโหลดแคมเปญ...</p>
          ) : campaigns.length === 0 ? (
            <p className="text-xs text-slate-500">
              ไม่พบแคมเปญที่ตรงกับ Account หรือสาขาที่รับผิดชอบ
            </p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <article
                  key={campaign.id}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black text-emerald-950">
                        {campaign.campaign_title}
                      </h3>
                      <p className="mt-1 text-[10px] font-bold text-slate-600">
                        {campaign.target_type === "STORE_CODE"
                          ? `สาขา ${campaign.target_value}`
                          : campaign.target_type === "COMPANY_TAG"
                            ? `Account ${campaign.target_value}`
                            : "ทุก Account"}
                        {` · ${campaign.staff_group === "ALL" ? "BA และ PG" : campaign.staff_group || "BA และ PG"}`}
                      </p>
                    </div>
                    <span className="rounded-md bg-white px-2 py-1 text-[9px] font-black text-emerald-800">
                      {campaign.items?.length || 0} SKU
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {(campaign.items || []).map((item: any, index: number) => (
                      <div
                        key={item.id || index}
                        className="flex items-start justify-between gap-2 border-t border-emerald-100 pt-1.5 text-[10px]"
                      >
                        <div className="min-w-0">
                          <p className="break-words font-bold text-slate-800">
                            {item.products?.descriptions ||
                              item.product_name ||
                              item.label ||
                              "สินค้า"}
                          </p>
                          <p className="font-mono text-[9px] text-slate-500">
                            {item.products?.sku_code ||
                              item.sku_code ||
                              item.barcode ||
                              ""}
                            {item.item_scope === "COMPETITOR"
                              ? " · คู่แข่ง"
                              : " · สินค้าเรา"}
                          </p>
                          {item.condition && (
                            <p className="mt-0.5 text-amber-800">
                              {item.condition}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right font-bold text-slate-700">
                          {item.item_scope === "COMPETITOR" ? (
                            <span>ราคา {item.price || "-"} บาท</span>
                          ) : (
                            <>
                              <span className="block">
                                Target{" "}
                                {Number(item.target_qty || 0).toLocaleString()}
                              </span>
                              <span className="block text-slate-500">
                                นับ ×
                                {Number(
                                  item.credit_factor ?? 1,
                                ).toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {campaign.commission_rules?.tiers?.length > 0 && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2">
                      <p className="text-[10px] font-black text-amber-900">
                        คอมมิชชั่นตาม % เป้าหมาย
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-amber-900">
                        {campaign.commission_rules.tiers.map(
                          (tier: any, index: number) => (
                            <span key={index}>
                              {tier.min_credited_qty != null
                                ? `${Number(tier.min_credited_qty).toLocaleString()} หน่วย · ${tier.achievement_percent}%`
                                : `${tier.achievement_percent}%`}{" "}
                              = ฿{Number(tier.payout || 0).toLocaleString()}
                            </span>
                          ),
                        )}
                        <span>
                          เกิน{" "}
                          {campaign.commission_rules.step?.start_qty ??
                            campaign.commission_rules.step?.start_percent}{" "}
                          หน่วย ทุก{" "}
                          {campaign.commission_rules.step?.step_qty ??
                            campaign.commission_rules.step?.step_percent}{" "}
                          หน่วย เพิ่ม ฿
                          {Number(
                            campaign.commission_rules.step?.payout || 0,
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                  {campaign.special_tier_text && (
                    <p className="mt-2 text-[10px] font-bold text-rose-700">
                      {campaign.special_tier_text}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push("/daily-report")}
                    className="mt-3 w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    เปิดแบบฟอร์มรายงานรอบนี้
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Title Card */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <h2 className="text-sm font-black text-slate-800">
            {hasCampaignMedia
              ? "Campaign Brief: โปรโมชั่นประจำรอบ"
              : "Campaign Brief: Product Mild Luxury"}
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            คู่มือการปฏิบัติงานสนาม ข้อมูลโปรโมชัน และคลิปตัวอย่าง
          </p>
        </div>

        {/* 🎥 SECTION 1: วิดีโอตัวอย่างเทคนิคการขาย (3 คลิป) */}
        {videoClips.length > 0 && (
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
                    {video.campaignTitle && (
                      <span className="mb-1 truncate text-[9px] font-bold text-emerald-700">
                        {video.campaignTitle}
                      </span>
                    )}
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
        )}

        {/* 📄 SECTION 2: เอกสารข้อมูลสินค้า Brief PDF/JPG */}
        {briefPages.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-2 text-slate-700 font-black text-xs uppercase tracking-wider pl-1">
              <BookOpen size={14} className="text-blue-700" />
              <span>เอกสารข้อมูลและโปรโมชัน ({briefPages.length} หน้า)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {briefPages.map((page, index) => (
                <div
                  key={page.id}
                  onClick={() => setActiveImageIndex(index)}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-blue-400 active:scale-95 transition cursor-pointer flex flex-col group"
                >
                  <div className="bg-slate-100 aspect-[3/4] relative flex items-center justify-center overflow-hidden">
                    {page.mime_type === "application/pdf" ||
                    /\.pdf(?:$|\?)/i.test(page.src) ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-200 text-slate-600">
                        <BookOpen size={30} />
                        <span className="text-xs font-black">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={page.src}
                        alt={page.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/300x400/1e3a8a/white?text=Promotion+Brief";
                        }}
                      />
                    )}
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
        )}
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
            {briefPages[activeImageIndex].mime_type === "application/pdf" ||
            /\.pdf(?:$|\?)/i.test(briefPages[activeImageIndex].src) ? (
              <iframe
                src={briefPages[activeImageIndex].src}
                title={briefPages[activeImageIndex].title}
                className="h-[80vh] w-full rounded-lg bg-white"
              />
            ) : (
              <img
                src={briefPages[activeImageIndex].src}
                alt={briefPages[activeImageIndex].title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            )}
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
