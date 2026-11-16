"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Filter,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ThemeToggle from "../components/ThemeToggle";
import {
  getUserDashboardDataAction,
  getUserDashboardHistoryAction,
} from "./actions";

type Product = {
  barcode: string | null;
  descriptions: string | null;
  item_scope: string | null;
  sales_qty: number | null;
  price_our: number | null;
  credit_factor: number | null;
  promotion_target_qty: number | null;
};
type Report = {
  id: number;
  report_date: string;
  store_code: string;
  promotion_id: string | number | null;
  promotion_gift_given: Record<string, number> | null;
  pg_daily_report_products: Product[] | null;
};
type Promotion = {
  id: string | number;
  campaign_title: string;
  start_date: string | null;
  end_date: string | null;
  calculation_period: string | null;
  track_gift_inventory: boolean | null;
  gift_items: { key: string; name: string }[] | null;
};
type Store = {
  store_code: string;
  store_name: string;
  account: string | null;
  company_tag: string | null;
};
type StoreTarget = {
  store_code: string;
  promotion_id: string | number | null;
  calculation_period: string | null;
  target_packs: number;
};
type History = {
  reports: Report[];
  promotions: Promotion[];
  stores: Store[];
  storeTargets: StoreTarget[];
};

const colors = [
  "#0284c7",
  "#10b981",
  "#f97316",
  "#e11d48",
  "#8b5cf6",
  "#ca8a04",
  "#0d9488",
  "#475569",
];
const number = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
const dayOf = (value: string | null | undefined) =>
  String(value || "").slice(0, 10);
const thaiToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const ownProducts = (report: Report) =>
  (report.pg_daily_report_products || []).filter(
    (product) =>
      String(product.item_scope || "OUR").toUpperCase() !== "COMPETITOR",
  );
const sales = (report: Report) =>
  ownProducts(report).reduce(
    (sum, product) =>
      sum + Number(product.sales_qty || 0) * Number(product.credit_factor ?? 1),
    0,
  );
const target = (report: Report) =>
  ownProducts(report).reduce(
    (sum, product) => sum + Number(product.promotion_target_qty || 0),
    0,
  );
const dateLabel = (date: string) =>
  date
    ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`
    : "ไม่ระบุ";
const inputClass =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-800";

function HorizontalPrismBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill = "#0284c7",
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
}) {
  if (width <= 0 || height <= 0) return null;
  const depth = Math.min(4, height / 3, width / 2);

  return (
    <g>
      <polygon
        points={`${x},${y + depth} ${x + depth},${y} ${x + width + depth},${y} ${x + width},${y + depth}`}
        fill={fill}
        fillOpacity={0.65}
      />
      <polygon
        points={`${x + width},${y + depth} ${x + width + depth},${y} ${x + width + depth},${y + height - depth} ${x + width},${y + height}`}
        fill={fill}
        fillOpacity={0.8}
      />
      <rect
        x={x}
        y={y + depth}
        width={width}
        height={height - depth}
        fill={fill}
      />
    </g>
  );
}

function StackedBarValue({
  viewBox,
  value,
}: {
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  value?: string | number;
}) {
  const { x = 0, y = 0, width = 0, height = 0 } = viewBox || {};
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue === 0) return null;
  const label = number(numericValue);
  if (width < label.length * 6 + 8 || height < 10) return null;

  return (
    <text
      x={x + width / 2}
      y={y + height / 2 + 1}
      textAnchor="middle"
      dominantBaseline="central"
      fill="white"
      stroke="#0f172a"
      strokeWidth={2}
      paintOrder="stroke"
      fontSize={10}
      fontWeight={700}
      pointerEvents="none"
    >
      {label}
    </text>
  );
}

function Sparkline({
  data,
  dataKey,
  color,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  color: string;
}) {
  return (
    <div className="h-9 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PerformanceDashboard({
  userId,
  initialStoreCode = "",
}: {
  userId: number;
  initialStoreCode?: string;
}) {
  const router = useRouter();
  const [history, setHistory] = useState<History>({
    reports: [],
    promotions: [],
    stores: [],
    storeTargets: [],
  });
  const [name, setName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState(thaiToday);
  const [account, setAccount] = useState("");
  const [storeCode, setStoreCode] = useState(initialStoreCode);
  const [promotionId, setPromotionId] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [chartMetric, setChartMetric] = useState<"products" | "target">(
    "products",
  );

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      setError("");
      try {
        const [result, profile] = await Promise.all([
          getUserDashboardHistoryAction(userId),
          getUserDashboardDataAction(userId),
        ]);
        if (!result.success) throw new Error(result.message);
        setHistory({
          reports: result.reports as Report[],
          promotions: result.promotions as Promotion[],
          stores: result.stores as Store[],
          storeTargets: result.storeTargets as StoreTarget[],
        });
        if (profile.success && profile.profile) {
          setName(profile.profile.display_name || `PG-${userId}`);
          setEmployeeCode(profile.profile.employee_id || `PG-${userId}`);
        }
        if (!manual && result.reports.length) {
          const latest = [...result.reports].sort(
            (left: any, right: any) =>
              String(right.report_date || "").localeCompare(
                String(left.report_date || ""),
              ) || Number(right.id) - Number(left.id),
          )[0];
          const latestStore = result.stores.find(
            (item: any) =>
              String(item.store_code) === String(latest.store_code),
          );
          setAccount(String(latestStore?.account || ""));
          setStoreCode(initialStoreCode || String(latest.store_code || ""));
          setPromotionId(String(latest.promotion_id || ""));
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "ไม่สามารถโหลดประวัติผลงานได้",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [initialStoreCode, userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const stores = useMemo(
    () =>
      new Map(history.stores.map((store) => [String(store.store_code), store])),
    [history.stores],
  );
  const promotions = useMemo(
    () =>
      new Map(
        history.promotions.map((promotion) => [
          String(promotion.id),
          promotion,
        ]),
      ),
    [history.promotions],
  );
  const accountOptions = useMemo(
    () =>
      Array.from(
        new Set(
          history.stores
            .map((store) => String(store.account || "").trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right, "th")),
    [history.stores],
  );
  const storeOptions = useMemo(
    () =>
      history.stores
        .filter(
          (store) => !account || String(store.account || "").trim() === account,
        )
        .sort((left, right) =>
          String(left.store_name || left.store_code).localeCompare(
            String(right.store_name || right.store_code),
            "th",
          ),
        ),
    [history.stores, account],
  );
  const promotionOptions = useMemo(() => {
    const ids = new Set(
      history.reports
        .filter((report) => {
          const store = stores.get(String(report.store_code));
          return (
            (!account || String(store?.account || "").trim() === account) &&
            (!storeCode || String(report.store_code) === storeCode)
          );
        })
        .map((report) => String(report.promotion_id || ""))
        .filter(Boolean),
    );
    return history.promotions
      .filter((promotion) => ids.has(String(promotion.id)))
      .sort((left, right) =>
        String(right.start_date || "").localeCompare(
          String(left.start_date || ""),
        ),
      );
  }, [history, account, storeCode, stores]);

  const filtered = useMemo(
    () =>
      history.reports
        .filter((report) => {
          const reportDay = dayOf(report.report_date);
          const store = stores.get(String(report.store_code));
          const promotion = promotions.get(String(report.promotion_id || ""));
          return (
            Boolean(reportDay) &&
            reportDay <= date &&
            (!account || String(store?.account || "").trim() === account) &&
            (!storeCode || String(report.store_code) === storeCode) &&
            (!promotionId ||
              String(report.promotion_id || "") === promotionId) &&
            (!promotion?.start_date ||
              reportDay >= dayOf(promotion.start_date)) &&
            (!promotion?.end_date || reportDay <= dayOf(promotion.end_date))
          );
        })
        .sort(
          (left, right) =>
            dayOf(left.report_date).localeCompare(dayOf(right.report_date)) ||
            left.id - right.id,
        ),
    [
      history.reports,
      stores,
      promotions,
      date,
      account,
      storeCode,
      promotionId,
    ],
  );

  const selectedPromotion = promotions.get(promotionId);
  const dailyReports = filtered.filter(
    (report) => dayOf(report.report_date) === date,
  );
  const totals = useMemo(() => {
    let dailySales = 0;
    let cumulativeSales = 0;
    let dailyTarget = 0;
    let hasDailyTarget = false;
    let cumulativeDailyTarget = 0;
    const monthlyTargets = new Map<string, number>();
    const daily = new Map<
      string,
      {
        date: string;
        sales: number;
        units: number;
        revenue: number;
        target: number;
        cumulativeSales: number;
        cumulativeTarget: number;
      }
    >();
    const products = new Map<
      string,
      {
        name: string;
        quantity: number;
        credited: number;
        price: number;
        revenue: number;
      }
    >();
    const gifts = new Map<
      string,
      { name: string; store: string; campaign: string; quantity: number }
    >();
    const productNames = new Map<string, string>();
    const productDaily = new Map<string, Map<string, number>>();
    let revenue = 0;
    let units = 0;
    for (const report of filtered) {
      const reportDay = dayOf(report.report_date);
      const reportSales = sales(report);
      const reportTarget = target(report);
      const campaign = promotions.get(String(report.promotion_id || ""));
      const storeTarget = history.storeTargets.find(
        (item) =>
          item.promotion_id != null &&
          String(item.store_code) === String(report.store_code) &&
          String(item.promotion_id) === String(report.promotion_id),
      );
      const period =
        storeTarget?.calculation_period ||
        campaign?.calculation_period ||
        "DAILY";
      cumulativeSales += reportSales;
      if (period === "MONTHLY") {
        const monthlyTarget =
          Number(storeTarget?.target_packs || 0) || reportTarget;
        if (monthlyTarget > 0)
          monthlyTargets.set(
            `${report.store_code}:${report.promotion_id}:${reportDay.slice(0, 7)}`,
            monthlyTarget,
          );
      } else if (reportTarget > 0) {
        cumulativeDailyTarget += reportTarget;
      }
      const monthlyTotal = Array.from(monthlyTargets.values()).reduce(
        (sum, value) => sum + value,
        0,
      );
      const point = daily.get(reportDay) || {
        date: reportDay,
        sales: 0,
        units: 0,
        revenue: 0,
        target: 0,
        cumulativeSales: 0,
        cumulativeTarget: 0,
      };
      point.sales += reportSales;
      if (period !== "MONTHLY") point.target += reportTarget;
      point.cumulativeSales = cumulativeSales;
      point.cumulativeTarget = cumulativeDailyTarget + monthlyTotal;
      daily.set(reportDay, point);
      if (reportDay === date) {
        dailySales += reportSales;
        if (period !== "MONTHLY" && reportTarget > 0) {
          dailyTarget += reportTarget;
          hasDailyTarget = true;
        }
      }
      const store = stores.get(String(report.store_code));
      const isBigC = /big\s*c|pgbc/i.test(
        `${store?.store_name || ""} ${store?.store_code || ""} ${store?.account || ""} ${store?.company_tag || ""}`,
      );
      if (campaign?.track_gift_inventory) {
        for (const [giftKey, quantity] of Object.entries(
          report.promotion_gift_given || {},
        )) {
          const gift = campaign.gift_items?.find(
            (item) => String(item.key) === giftKey,
          );
          if (!gift) continue;
          const key = `${report.store_code}:${report.promotion_id}:${giftKey}`;
          const item = gifts.get(key) || {
            name: gift.name || giftKey,
            store: store?.store_name || report.store_code,
            campaign: campaign.campaign_title,
            quantity: 0,
          };
          item.quantity += Number(quantity || 0);
          gifts.set(key, item);
        }
      }
      for (const product of ownProducts(report)) {
        const key = String(product.barcode || product.descriptions || "สินค้า");
        const productName = product.descriptions || product.barcode || "สินค้า";
        const qty = Number(product.sales_qty || 0);
        productNames.set(key, productName);
        const dayProducts =
          productDaily.get(reportDay) || new Map<string, number>();
        dayProducts.set(key, (dayProducts.get(key) || 0) + qty);
        productDaily.set(reportDay, dayProducts);
        const credited = qty * Number(product.credit_factor ?? 1);
        const price = Number(product.price_our || 0);
        const amount = (isBigC ? Math.floor(qty / 2) : qty) * price;
        point.units += qty;
        point.revenue += amount;
        if (reportDay !== date) continue;
        const item = products.get(key) || {
          name: productName,
          quantity: 0,
          credited: 0,
          price,
          revenue: 0,
        };
        item.quantity += qty;
        item.credited += credited;
        if (item.price !== price) item.price = -1;
        item.revenue += amount;
        products.set(key, item);
        units += qty;
        revenue += amount;
      }
    }
    const cumulativeTarget =
      cumulativeDailyTarget +
      Array.from(monthlyTargets.values()).reduce(
        (sum, value) => sum + value,
        0,
      );
    const series = Array.from(productNames.entries()).map(
      ([key, label], index) => ({
        key,
        label,
        dataKey: `product_${index}`,
        color: colors[index % colors.length],
      }),
    );
    const chartData = Array.from(daily.values()).map((point) => {
      const row: Record<string, string | number> = {
        ...point,
        label: point.date.slice(5).split("-").reverse().join("/"),
      };
      for (const item of series)
        row[item.dataKey] = productDaily.get(point.date)?.get(item.key) || 0;
      return row;
    });
    return {
      dailySales,
      dailyTarget,
      hasDailyTarget,
      cumulativeSales,
      cumulativeTarget,
      products: Array.from(products.values()),
      gifts: Array.from(gifts.entries()),
      units,
      revenue,
      series,
      chartData,
    };
  }, [filtered, date, promotions, stores, history.storeTargets]);

  const comparisonData: Record<string, string | number>[] =
    totals.chartData.map((point) => ({
      ...point,
      remaining: Math.max(
        0,
        Number(point.cumulativeTarget) - Number(point.cumulativeSales),
      ),
    }));
  const activeStore = stores.get(storeCode);
  const periodText = selectedPromotion
    ? `${dateLabel(dayOf(selectedPromotion.start_date))} - ${dateLabel(dayOf(selectedPromotion.end_date))}`
    : "ทุกแคมเปญ";

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-600">
        <RefreshCw size={18} className="mr-2 animate-spin" /> กำลังโหลดผลงาน...
      </div>
    );

  if (error && history.reports.length === 0)
    return (
      <div className="staff-theme min-h-screen bg-slate-50 p-6 text-slate-900">
        <div
          role="alert"
          className="mx-auto max-w-md rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="mt-3 rounded-md border border-red-300 px-3 py-2 font-bold"
          >
            {refreshing ? "กำลังโหลด..." : "ลองอีกครั้ง"}
          </button>
        </div>
      </div>
    );

  return (
    <div className="staff-theme min-h-screen bg-slate-50 text-slate-900 pb-12">
      <header className="sticky top-0 z-30 bg-[#1e3a8a] text-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              title="กลับ"
              aria-label="กลับ"
              onClick={() => router.push(`/?userId=${userId}`)}
              className="p-2"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold">แดชบอร์ดผลงาน</h1>
              <p className="text-[10px] text-blue-200">
                {name || `PG-${userId}`} · {employeeCode || `PG-${userId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="bg-blue-800/80 text-blue-100 border border-blue-400/30" />
            <button
              type="button"
              title="รีเฟรช"
              aria-label="รีเฟรช"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="rounded-md border border-blue-400/30 p-2"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-4">
        <div className="text-right">
          <Link
            href={`/dashboard?userId=${userId}&view=legacy`}
            className="text-xs font-bold text-blue-700 underline"
          >
            ดู Incentive แบบเดิม
          </Link>
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700"
          >
            {error}
          </div>
        )}
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Filter size={15} /> ตัวกรองผลงาน
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="min-w-0 space-y-1 text-[11px] font-bold text-slate-500">
              <span>วันที่</span>
              <input
                aria-label="วันที่"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="min-w-0 space-y-1 text-[11px] font-bold text-slate-500">
              <span>Account</span>
              <select
                aria-label="Account"
                value={account}
                onChange={(event) => {
                  setAccount(event.target.value);
                  setStoreCode("");
                  setPromotionId("");
                }}
                className={inputClass}
              >
                <option value="">ทุก Account</option>
                {accountOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 space-y-1 text-[11px] font-bold text-slate-500">
              <span>ร้านค้า</span>
              <select
                aria-label="ร้านค้า"
                value={storeCode}
                onChange={(event) => {
                  setStoreCode(event.target.value);
                  setPromotionId("");
                }}
                className={inputClass}
              >
                <option value="">ทุกร้านค้า</option>
                {storeOptions.map((store) => (
                  <option key={store.store_code} value={store.store_code}>
                    {store.store_name || store.store_code}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 space-y-1 text-[11px] font-bold text-slate-500">
              <span>แคมเปญ</span>
              <select
                aria-label="แคมเปญ"
                value={promotionId}
                onChange={(event) => setPromotionId(event.target.value)}
                className={inputClass}
              >
                <option value="">ทุกแคมเปญ</option>
                {promotionOptions.map((promotion) => (
                  <option key={promotion.id} value={promotion.id}>
                    {promotion.campaign_title} (
                    {dateLabel(dayOf(promotion.start_date))} -{" "}
                    {dateLabel(dayOf(promotion.end_date))})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 break-words text-[11px] text-slate-500">
            {activeStore?.store_name || (storeCode ? storeCode : "ทุกร้านค้า")}{" "}
            · {selectedPromotion?.campaign_title || "ทุกแคมเปญ"} · {periodText}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-bold text-slate-500">
              ผลงานวันที่ {dateLabel(date)}
            </h2>
            <p className="mt-2 text-lg font-bold text-blue-700">
              {number(totals.dailySales)}{" "}
              <span className="text-xs font-normal text-slate-500">
                / {totals.hasDailyTarget ? number(totals.dailyTarget) : "-"}{" "}
                เป้า
              </span>
            </p>
            <Sparkline
              data={totals.chartData}
              dataKey="sales"
              color="#0284c7"
            />
            <p className="text-[10px] text-slate-500">
              {dailyReports.length
                ? "ยอดคิดผลงาน / เป้ารายวัน"
                : "ไม่มีรายงานในวันที่เลือก"}
            </p>
          </section>
          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-bold text-slate-500">
              สะสมถึงวันที่เลือก
            </h2>
            <p className="mt-2 text-lg font-bold text-emerald-700">
              {number(totals.cumulativeSales)}{" "}
              <span className="text-xs font-normal text-slate-500">
                /{" "}
                {totals.cumulativeTarget > 0
                  ? number(totals.cumulativeTarget)
                  : "-"}{" "}
                เป้า
              </span>
            </p>
            <Sparkline
              data={totals.chartData}
              dataKey="cumulativeSales"
              color="#10b981"
            />
            <p className="text-[10px] text-slate-500">
              จากวันเริ่มแคมเปญตามรายงาน
            </p>
          </section>
          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-bold text-slate-500">
              ยอดตัดสต็อกวันที่เลือก
            </h2>
            <p className="mt-2 text-lg font-bold">
              {number(totals.units)}{" "}
              <span className="text-xs font-normal text-slate-500">ชิ้น</span>
            </p>
            <Sparkline
              data={totals.chartData}
              dataKey="units"
              color="#0d9488"
            />
          </section>
          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-bold text-slate-500">
              มูลค่าขายวันที่เลือก
            </h2>
            <p className="mt-2 text-lg font-bold">
              {number(totals.revenue)}{" "}
              <span className="text-xs font-normal text-slate-500">บาท</span>
            </p>
            <Sparkline
              data={totals.chartData}
              dataKey="revenue"
              color="#ca8a04"
            />
          </section>
        </div>
        <p className="text-[11px] text-slate-500">
          ยอดคิดผลงานใช้ตัวคูณที่บันทึกในรายงาน เป้ารายวันรวมตามรายงาน
          ส่วนเป้ารายเดือนนับหนึ่งครั้งต่อร้าน แคมเปญ และเดือนที่มีรายงาน
          โดยใช้เป้าร้านที่ตั้งอยู่ปัจจุบันเมื่อแคมเปญตรงกัน
          มิฉะนั้นใช้เป้าในรายงาน หากไม่มีเป้าจะแสดงเป็น -
        </p>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <BarChart3 size={16} /> แนวโน้มผลงาน
            </h2>
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="chart-metric">
                ข้อมูลกราฟ
              </label>
              <select
                id="chart-metric"
                className={inputClass}
                value={chartMetric}
                onChange={(event) =>
                  setChartMetric(event.target.value as "products" | "target")
                }
              >
                <option value="products">แยกตามสินค้า</option>
                <option value="target">ยอดสะสมเทียบเป้า</option>
              </select>
              <label className="sr-only" htmlFor="chart-type">
                รูปแบบกราฟ
              </label>
              <select
                id="chart-type"
                className={inputClass}
                value={chartType}
                onChange={(event) =>
                  setChartType(event.target.value as "bar" | "line")
                }
              >
                <option value="bar">3-D Stacked Bar</option>
                <option value="line">Trendline</option>
              </select>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            {chartMetric === "products"
              ? "ยอดตัดสต็อกแต่ละวัน (ชิ้น)"
              : "ยอดคิดผลงานและเป้าสะสมถึงแต่ละวัน"}
          </p>
          {totals.chartData.length ? (
            <div className="mt-3 max-h-[480px] w-full overflow-y-auto">
              <div
                style={{
                  height:
                    chartType === "bar"
                      ? Math.max(256, totals.chartData.length * 24 + 110)
                      : 256,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <LineChart
                      data={
                        chartMetric === "products"
                          ? totals.chartData
                          : comparisonData
                      }
                      margin={{ left: -20, right: 12, top: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {chartMetric === "products" ? (
                        totals.series.map((item) => (
                          <Line
                            key={item.dataKey}
                            dataKey={item.dataKey}
                            name={item.label}
                            stroke={item.color}
                            dot={false}
                            strokeWidth={2}
                            isAnimationActive={false}
                          />
                        ))
                      ) : (
                        <>
                          <Line
                            dataKey="cumulativeSales"
                            name="ผลงานสะสม"
                            stroke="#0284c7"
                            dot={false}
                            strokeWidth={2}
                          />
                          <Line
                            dataKey="cumulativeTarget"
                            name="เป้าสะสม"
                            stroke="#f59e0b"
                            dot={false}
                            strokeWidth={2}
                          />
                        </>
                      )}
                    </LineChart>
                  ) : (
                    <BarChart
                      data={
                        chartMetric === "products"
                          ? totals.chartData
                          : comparisonData
                      }
                      layout="vertical"
                      margin={{ left: 0, right: 16, top: 10 }}
                      barSize={12}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={44}
                        tick={{ fontSize: 10 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {chartMetric === "products" ? (
                        totals.series.map((item) => (
                          <Bar
                            key={item.dataKey}
                            dataKey={item.dataKey}
                            name={item.label}
                            fill={item.color}
                            stackId="products"
                            shape={HorizontalPrismBar}
                            isAnimationActive={false}
                          >
                            <LabelList
                              dataKey={item.dataKey}
                              content={<StackedBarValue />}
                            />
                          </Bar>
                        ))
                      ) : (
                        <>
                          <Bar
                            dataKey="cumulativeSales"
                            name="ผลงานสะสม"
                            fill="#0284c7"
                            stackId="target"
                            shape={HorizontalPrismBar}
                            isAnimationActive={false}
                          >
                            <LabelList
                              dataKey="cumulativeSales"
                              content={<StackedBarValue />}
                            />
                          </Bar>
                          <Bar
                            dataKey="remaining"
                            name="ส่วนที่เหลือถึงเป้า"
                            fill="#f59e0b"
                            stackId="target"
                            shape={HorizontalPrismBar}
                            isAnimationActive={false}
                          >
                            <LabelList
                              dataKey="remaining"
                              content={<StackedBarValue />}
                            />
                          </Bar>
                        </>
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              {chartType === "bar" && (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs">
                  {(chartMetric === "products"
                    ? totals.chartData
                    : comparisonData
                  ).map((point) => (
                    <div
                      key={String(point.date)}
                      className="flex items-start gap-3"
                    >
                      <span className="w-12 shrink-0 font-bold text-slate-500">
                        {String(point.label)}
                      </span>
                      <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                        {chartMetric === "products" ? (
                          totals.series
                            .filter((item) => Number(point[item.dataKey]) !== 0)
                            .map((item) => (
                              <span
                                key={item.dataKey}
                                className="inline-flex min-w-0 items-center gap-1 text-slate-700"
                              >
                                <span
                                  className="h-2 w-2 shrink-0 rounded-sm"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span>
                                  {item.label}:{" "}
                                  <strong>
                                    {number(Number(point[item.dataKey]))}
                                  </strong>
                                </span>
                              </span>
                            ))
                        ) : (
                          <>
                            <span className="text-blue-700">
                              ผลงาน:{" "}
                              <strong>
                                {number(Number(point.cumulativeSales))}
                              </strong>
                            </span>
                            <span className="text-amber-700">
                              เป้า:{" "}
                              <strong>
                                {number(Number(point.cumulativeTarget))}
                              </strong>
                            </span>
                            <span className="text-slate-500">
                              เหลือ:{" "}
                              <strong>{number(Number(point.remaining))}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-slate-500">
              ไม่มีข้อมูลตามตัวกรอง
            </p>
          )}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <TrendingUp size={16} /> รายละเอียดสินค้า · {dateLabel(date)}
          </h2>
          <p className="mt-1 break-words text-[11px] text-slate-500">
            {selectedPromotion?.campaign_title || "ทุกแคมเปญ"} · {periodText}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-2">สินค้า</th>
                  <th className="p-2 text-right">ราคา/ชุด</th>
                  <th className="p-2 text-right">ตัดสต็อก</th>
                  <th className="p-2 text-right">คิดผลงาน</th>
                  <th className="p-2 text-right">รวมเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {totals.products.map((product) => (
                  <tr key={product.name}>
                    <td className="p-2 font-medium">{product.name}</td>
                    <td className="p-2 text-right">
                      {product.price < 0 ? "หลายราคา" : number(product.price)}
                    </td>
                    <td className="p-2 text-right">
                      {number(product.quantity)}
                    </td>
                    <td className="p-2 text-right text-emerald-700">
                      {number(product.credited)}
                    </td>
                    <td className="p-2 text-right">
                      {number(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!totals.products.length && (
              <p className="py-6 text-center text-xs text-slate-500">
                ไม่มีรายการสินค้าสำหรับวันที่เลือก
              </p>
            )}
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-bold">ยอดแจกของแถมสะสมถึงวันที่เลือก</h2>
          {totals.gifts.length ? (
            <div className="mt-3 divide-y divide-slate-100">
              {totals.gifts.map(([key, gift]) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-bold">{gift.name}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {gift.store} · {gift.campaign}
                    </p>
                  </div>
                  <strong>{number(gift.quantity)} ชิ้น</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-slate-500">
              ไม่มีรายการของแถมตามตัวกรอง
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
