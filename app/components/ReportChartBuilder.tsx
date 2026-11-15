"use client";

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AggregatedChart {
  data: Array<Record<string, string | number>>;
  series: Array<{ label: string; dataKey: string; color: string }>;
}

interface PrismBarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
}

export function PrismBarShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill = "#2563eb",
}: PrismBarShapeProps) {
  if (width <= 0 || height <= 0) return null;

  const depth = Math.min(7, height / 3);
  const frontHeight = height - depth;

  return (
    <g>
      <polygon
        points={`${x},${y + depth} ${x + depth},${y} ${x + width + depth},${y} ${x + width},${y + depth}`}
        fill={fill}
        fillOpacity={0.62}
      />
      <polygon
        points={`${x + width},${y + depth} ${x + width + depth},${y} ${x + width + depth},${y + frontHeight} ${x + width},${y + height}`}
        fill={fill}
        fillOpacity={0.78}
      />
      <rect
        x={x}
        y={y + depth}
        width={width}
        height={frontHeight}
        rx={1}
        fill={fill}
      />
    </g>
  );
}

function buildAggregatedChart(
  rows: ReportChartRow[],
  metric: ReportChartMetric | undefined,
  dimension: ReportChartDimension | undefined,
  seriesDimension: ReportChartDimension | undefined,
  seriesLimit = 8,
  categoryLimit = 24,
): AggregatedChart {
  if (!metric || !dimension) return { data: [], series: [] };

  type Aggregate = { total: number; count: number; seen: Set<string> };
  const groups = new Map<string, Map<string, Aggregate>>();
  const seriesLabels = new Map<string, string>();

  rows.forEach((row) => {
    const rawValue = row[metric.key];
    if (
      rawValue === null ||
      rawValue === undefined ||
      !Number.isFinite(Number(rawValue))
    ) {
      return;
    }

    const category = String(row[dimension.key] ?? "ไม่ระบุ");
    const seriesValue = seriesDimension
      ? String(row[seriesDimension.key] ?? "ไม่ระบุ")
      : metric.label;
    if (!groups.has(category)) groups.set(category, new Map());
    const categoryGroup = groups.get(category)!;
    if (!categoryGroup.has(seriesValue)) {
      categoryGroup.set(seriesValue, { total: 0, count: 0, seen: new Set() });
    }

    const aggregate = categoryGroup.get(seriesValue)!;
    if (metric.uniqueBy) {
      const uniqueValue = String(row[metric.uniqueBy] ?? "");
      if (uniqueValue && aggregate.seen.has(uniqueValue)) return;
      if (uniqueValue) aggregate.seen.add(uniqueValue);
    }
    aggregate.total += Number(rawValue);
    aggregate.count += 1;
    seriesLabels.set(seriesValue, seriesValue);
  });

  const totalsBySeries = new Map<string, number>();
  groups.forEach((series) =>
    series.forEach((aggregate, label) => {
      totalsBySeries.set(
        label,
        (totalsBySeries.get(label) || 0) + Math.abs(aggregate.total),
      );
    }),
  );
  const visibleSeries = Array.from(seriesLabels.keys())
    .sort((a, b) => (totalsBySeries.get(b) || 0) - (totalsBySeries.get(a) || 0))
    .slice(0, seriesLimit)
    .map((label, index) => {
      const firstRow = seriesDimension?.colorKey
        ? rows.find(
            (row) => String(row[seriesDimension.key] ?? "ไม่ระบุ") === label,
          )
        : undefined;
      return {
        label,
        dataKey: `series_${index}`,
        color:
          (firstRow?.[seriesDimension?.colorKey || ""] as string) ||
          SERIES_COLORS[index % SERIES_COLORS.length],
      };
    });

  const categoryTotals = Array.from(groups.entries()).map(
    ([category, values]) => ({
      category,
      total: Array.from(values.values()).reduce(
        (sum, aggregate) => sum + Math.abs(aggregate.total),
        0,
      ),
    }),
  );
  const visibleCategories =
    dimension.key === "date"
      ? categoryTotals
          .sort((a, b) => a.category.localeCompare(b.category))
          .slice(-categoryLimit)
      : categoryTotals
          .sort((a, b) => b.total - a.total)
          .slice(0, categoryLimit);

  const data = visibleCategories.map(({ category }) => {
    const point: Record<string, string | number> = { category };
    visibleSeries.forEach((series) => {
      const aggregate = groups.get(category)?.get(series.label);
      point[series.dataKey] = aggregate
        ? metric.aggregation === "average"
          ? aggregate.total / aggregate.count
          : aggregate.total
        : 0;
    });
    return point;
  });

  return { data, series: visibleSeries };
}
export type ReportChartRow = Record<string, string | number | null | undefined>;

export interface ReportChartDimension {
  key: string;
  label: string;
  colorKey?: string;
}

export interface ReportChartMetric {
  key: string;
  label: string;
  aggregation: "sum" | "average";
  uniqueBy?: string;
  dimensions?: string[];
  seriesDimensions?: string[];
}

interface ReportChartBuilderProps {
  title: string;
  rows: ReportChartRow[];
  dimensions: ReportChartDimension[];
  metrics: ReportChartMetric[];
  defaultDimension: string;
  defaultMetric: string;
  defaultSeries?: string;
  pairedComparison?: boolean;
  topRankLimit?: number;
}

const SERIES_COLORS = [
  "#2563eb",
  "#059669",
  "#ea580c",
  "#db2777",
  "#0891b2",
  "#7c3aed",
  "#ca8a04",
  "#475569",
];

export default function ReportChartBuilder({
  title,
  rows,
  dimensions,
  metrics,
  pairedComparison = false,
  defaultDimension,
  defaultMetric,
  defaultSeries = "",
  topRankLimit,
}: ReportChartBuilderProps) {
  const [dimensionKey, setDimensionKey] = useState(defaultDimension);
  const [metricKey, setMetricKey] = useState(defaultMetric);
  const [seriesKey, setSeriesKey] = useState(defaultSeries);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  const availableMetrics = useMemo(
    () =>
      metrics.filter((metric) =>
        rows.some((row) => {
          const value = row[metric.key];
          return (
            value !== null &&
            value !== undefined &&
            Number.isFinite(Number(value))
          );
        }),
      ),
    [metrics, rows],
  );
  const activeMetric =
    availableMetrics.find((metric) => metric.key === metricKey) ||
    availableMetrics[0];
  const availableDimensions = dimensions.filter(
    (dimension) =>
      !activeMetric?.dimensions ||
      activeMetric.dimensions.includes(dimension.key),
  );
  const activeDimension =
    availableDimensions.find((dimension) => dimension.key === dimensionKey) ||
    availableDimensions[0];
  const availableSeriesDimensions = dimensions.filter(
    (dimension) =>
      dimension.key !== activeDimension?.key &&
      (!activeMetric?.seriesDimensions ||
        activeMetric.seriesDimensions.includes(dimension.key)),
  );
  const activeSeriesDimension = availableSeriesDimensions.find(
    (dimension) => dimension.key === seriesKey,
  );

  const chart = useMemo(
    () =>
      buildAggregatedChart(
        rows,
        activeMetric,
        activeDimension,
        activeSeriesDimension,
        topRankLimit,
      ),
    [activeDimension, activeMetric, activeSeriesDimension, rows, topRankLimit],
  );
  const barChart = useMemo(
    () =>
      buildAggregatedChart(
        rows,
        activeMetric,
        activeDimension,
        activeSeriesDimension,
        topRankLimit,
        topRankLimit,
      ),
    [activeDimension, activeMetric, activeSeriesDimension, rows, topRankLimit],
  );
  const pairedCharts = useMemo(() => {
    const salesMetric = metrics.find((metric) => metric.key === "salesQty");
    const priceMetric = metrics.find((metric) => metric.key === "unitPrice");
    return {
      sales: buildAggregatedChart(
        rows,
        salesMetric,
        activeDimension,
        activeSeriesDimension,
        topRankLimit,
        topRankLimit,
      ),
      prices: buildAggregatedChart(
        rows,
        priceMetric,
        activeDimension,
        activeSeriesDimension,
        topRankLimit,
      ),
    };
  }, [activeDimension, activeSeriesDimension, metrics, rows, topRankLimit]);

  const selectorClass =
    "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h2 className="text-sm font-black text-slate-800">{title}</h2>
        <span className="text-[10px] font-bold text-slate-500">
          {pairedComparison
            ? `${pairedCharts.sales.data.length} กลุ่ม · ${pairedCharts.sales.series.length} SKU`
            : `${chart.data.length} กลุ่ม · ${chart.series.length} ชุดข้อมูล`}
        </span>
      </div>

      <div
        className={`mb-4 grid grid-cols-2 gap-2 ${pairedComparison ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}
      >
        {!pairedComparison && (
          <label className="text-[10px] font-bold text-slate-500">
            ค่าที่แสดง
            <select
              value={activeMetric?.key || ""}
              onChange={(event) => setMetricKey(event.target.value)}
              className={selectorClass}
              disabled={availableMetrics.length === 0}
            >
              {availableMetrics.map((metric) => (
                <option key={metric.key} value={metric.key}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-[10px] font-bold text-slate-500">
          จัดกลุ่มตาม
          <select
            value={activeDimension?.key || ""}
            onChange={(event) => setDimensionKey(event.target.value)}
            className={selectorClass}
            disabled={!activeDimension}
          >
            {availableDimensions.map((dimension) => (
              <option key={dimension.key} value={dimension.key}>
                {dimension.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold text-slate-500">
          แยกชุดข้อมูล
          <select
            value={activeSeriesDimension?.key || ""}
            onChange={(event) => setSeriesKey(event.target.value)}
            className={selectorClass}
          >
            <option value="">ไม่แยก</option>
            {availableSeriesDimensions.map((dimension) => (
              <option key={dimension.key} value={dimension.key}>
                {dimension.label}
              </option>
            ))}
          </select>
        </label>
        {!pairedComparison && (
          <label className="text-[10px] font-bold text-slate-500">
            รูปแบบกราฟ
            <select
              value={chartType}
              onChange={(event) =>
                setChartType(event.target.value as "bar" | "line")
              }
              className={selectorClass}
            >
              <option value="bar">กราฟแท่ง</option>
              <option value="line">กราฟเส้น</option>
            </select>
          </label>
        )}
      </div>

      {pairedComparison ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-blue-50/60 p-3 shadow-[0_5px_14px_rgba(15,23,42,0.08)]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-black text-slate-800">
                ยอดขายเราเทียบคู่แข่ง
              </h3>
              <span className="text-[9px] font-bold text-blue-700">ชิ้น</span>
            </div>
            <div className="h-60 w-full min-w-0 sm:h-64">
              {pairedCharts.sales.data.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
                  ไม่มีข้อมูลยอดขายตามตัวเลือกนี้
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pairedCharts.sales.data}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                    barCategoryGap="24%"
                  >
                    <defs>
                      {pairedCharts.sales.series.map((series) => (
                        <linearGradient
                          key={series.dataKey}
                          id={`paired-sales-${series.dataKey}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={series.color}
                            stopOpacity={0.72}
                          />
                          <stop
                            offset="100%"
                            stopColor={series.color}
                            stopOpacity={1}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={100}
                      tick={{ fontSize: 9 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [`${value} ชิ้น`, name]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "9px", lineHeight: "16px" }}
                    />
                    {pairedCharts.sales.series.map((series) => (
                      <Bar
                        key={series.dataKey}
                        dataKey={series.dataKey}
                        name={series.label}
                        fill={`url(#paired-sales-${series.dataKey})`}
                        stroke={series.color}
                        strokeOpacity={0.6}
                        stackId="sales-comparison"
                        shape={PrismBarShape}
                        maxBarSize={34}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-emerald-50/50 p-3 shadow-[0_5px_14px_rgba(15,23,42,0.08)]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-black text-slate-800">
                ราคาเราเทียบคู่แข่ง
              </h3>
              <span className="text-[9px] font-bold text-emerald-700">บาท</span>
            </div>
            <div className="h-60 w-full min-w-0 sm:h-64">
              {pairedCharts.prices.data.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
                  ไม่มีข้อมูลราคาในรายงานล่าสุด
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={pairedCharts.prices.data}
                    margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 9, fontWeight: 700 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(value, name) => [`฿${value}`, name]} />
                    <Legend
                      wrapperStyle={{ fontSize: "9px", lineHeight: "16px" }}
                    />
                    {pairedCharts.prices.series.map((series, index) => (
                      <Line
                        key={series.dataKey}
                        type="monotone"
                        dataKey={series.dataKey}
                        name={series.label}
                        stroke={series.color}
                        strokeWidth={Math.max(1.5, 2.8 - index * 0.25)}
                        strokeOpacity={Math.max(0.45, 1 - index * 0.12)}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="h-72 w-full min-w-0 sm:h-80">
          {chart.data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
              ไม่มีข้อมูลตัวเลขสำหรับตัวเลือกนี้
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart
                  data={barChart.data}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={112}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  {barChart.series.length > 1 && (
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                  )}
                  {barChart.series.map((series) => (
                    <Bar
                      key={series.dataKey}
                      dataKey={series.dataKey}
                      name={series.label}
                      fill={series.color}
                      stackId="chart-series"
                      shape={PrismBarShape}
                    />
                  ))}
                </BarChart>
              ) : (
                <LineChart
                  data={chart.data}
                  margin={{ top: 8, right: 12, left: -18, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  {chart.series.length > 1 && (
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                  )}
                  {chart.series.map((series, index) => (
                    <Line
                      key={series.dataKey}
                      type="monotone"
                      dataKey={series.dataKey}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={Math.max(1.5, 2.8 - index * 0.25)}
                      strokeOpacity={Math.max(0.45, 1 - index * 0.12)}
                      dot={false}
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      )}
      <p className="mt-2 text-[10px] text-slate-400">
        {pairedComparison
          ? "กราฟทั้งสองใช้ตัวกรองเดียวกัน; กราฟวันที่แสดง 24 วันล่าสุด และกรณีไม่กำหนดวันที่จะแสดงข้อมูลวันที่รายงานล่าสุด"
          : "แสดงสูงสุด 24 กลุ่มและ 8 ชุดข้อมูล เรียงตามยอดรวม; กราฟตามวันที่แสดง 24 วันล่าสุด"}
      </p>
    </section>
  );
}
