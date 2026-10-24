"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Download,
  Search,
  Store,
  Tag,
  User,
  Video,
} from "lucide-react";
import { getSalesVideosAction } from "@/app/sales-videos/actions";

type SalesVideo = {
  id: number;
  user_name: string | null;
  store_code: string;
  store_name: string | null;
  account: string | null;
  promotion_id: number | null;
  campaign_title: string | null;
  video_url: string;
  file_name: string | null;
  file_size: number | null;
  recorded_at: string;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export default function SalesVideosGalleryPage() {
  const [videos, setVideos] = useState<SalesVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [account, setAccount] = useState("ALL");
  const [campaign, setCampaign] = useState("ALL");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    getSalesVideosAction().then((res) => {
      if (res.success) setVideos(res.videos as SalesVideo[]);
      else setError(res.message || "โหลดคลิปไม่สำเร็จ");
      setLoading(false);
    });
  }, []);

  const accountOf = (v: SalesVideo) => v.account || "ไม่ระบุ Account";
  const campaignOf = (v: SalesVideo) => v.campaign_title || "ไม่ระบุแคมเปญ";

  const accounts = useMemo(
    () => Array.from(new Set(videos.map(accountOf))).sort(),
    [videos],
  );
  const campaigns = useMemo(
    () => Array.from(new Set(videos.map(campaignOf))).sort(),
    [videos],
  );

  const grouped = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filtered = videos.filter(
      (v) =>
        (account === "ALL" || accountOf(v) === account) &&
        (campaign === "ALL" || campaignOf(v) === campaign) &&
        (!kw ||
          `${v.user_name} ${v.store_name} ${v.store_code}`
            .toLowerCase()
            .includes(kw)),
    );
    const map = new Map<string, Map<string, SalesVideo[]>>();
    for (const v of filtered) {
      const c = campaignOf(v);
      const a = accountOf(v);
      if (!map.has(c)) map.set(c, new Map());
      const byAccount = map.get(c)!;
      if (!byAccount.has(a)) byAccount.set(a, []);
      byAccount.get(a)!.push(v);
    }
    return { total: filtered.length, map };
  }, [videos, account, campaign, keyword]);

  const downloadVideo = async (video: SalesVideo) => {
    const ext = video.file_name?.split(".").pop() || "mp4";
    const name =
      `${campaignOf(video)}_${video.store_name || video.store_code}_${video.user_name || ""}_${video.id}.${ext}`.replace(
        /[\\/:*?"<>|\s]+/g,
        "_",
      );
    try {
      const response = await fetch(video.video_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(video.video_url, "_blank", "noopener");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 text-slate-800">
      <nav className="sticky top-0 z-40 bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/customer-portal"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="text-left">
            <h1 className="text-sm sm:text-base font-black flex items-center gap-2">
              <Video size={18} className="text-rose-400" />
              คลังคลิปวิดีโอเชียร์ขาย
            </h1>
            <p className="text-[10px] text-slate-400">
              Sales Pitch Video Library · {grouped.total} คลิป
            </p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 grid gap-3 sm:grid-cols-3 text-left">
          <label className="text-[11px] font-black text-slate-600">
            Account
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-bold"
            >
              <option value="ALL">ทุก Account</option>
              {accounts.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-black text-slate-600">
            แคมเปญ
            <select
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-bold"
            >
              <option value="ALL">ทุกแคมเปญ</option>
              {campaigns.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-black text-slate-600">
            ค้นหาพนักงาน / ร้านค้า
            <div className="relative mt-1">
              <Search
                size={14}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="พิมพ์ชื่อ..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-bold"
              />
            </div>
          </label>
        </div>

        {loading && (
          <p className="text-center text-sm font-bold text-slate-500">
            กำลังโหลดคลิป...
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm font-bold text-rose-700">
            {error}
          </p>
        )}
        {!loading && !error && grouped.total === 0 && (
          <p className="text-center text-sm font-bold text-slate-400 py-12">
            ยังไม่มีคลิปวิดีโอ
          </p>
        )}

        {Array.from(grouped.map.entries()).map(([campaignName, byAccount]) => (
          <section key={campaignName} className="space-y-3 text-left">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900 border-l-4 border-rose-500 pl-3">
              <Tag size={16} className="text-rose-500" />
              {campaignName}
            </h2>
            {Array.from(byAccount.entries()).map(([accountName, items]) => (
              <div
                key={accountName}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
              >
                <h3 className="flex items-center gap-2 text-sm font-black text-blue-800 mb-3">
                  <Building2 size={15} />
                  {accountName}
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {items.length} คลิป
                  </span>
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((video) => (
                    <article
                      key={video.id}
                      className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col"
                    >
                      <video
                        src={video.video_url}
                        controls
                        preload="metadata"
                        playsInline
                        className="w-full aspect-video bg-black"
                      />
                      <div className="p-3 space-y-1 text-[11px] font-bold text-slate-600 flex-1">
                        <p className="flex items-center gap-1.5 text-slate-900">
                          <User size={12} className="text-blue-600" />
                          {video.user_name || "-"}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Store size={12} className="text-amber-600" />
                          {video.store_name || video.store_code}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-emerald-600" />
                          {formatDateTime(video.recorded_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadVideo(video)}
                        className="m-3 mt-0 flex items-center justify-center gap-1.5 rounded-lg bg-blue-900 py-2 text-[11px] font-black text-white hover:bg-blue-800 cursor-pointer"
                      >
                        <Download size={13} /> ดาวน์โหลด
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
