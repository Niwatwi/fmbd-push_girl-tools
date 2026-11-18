export type CheerGrade = "A" | "B" | "C";

export const cheerKpiCriteria = [
  {
    key: "knowledge",
    label: "Product Knowledge",
    amounts: { A: 300, B: 150, C: 0 },
  },
  {
    key: "promotion",
    label: "Promotion Execution / Sale out Report",
    amounts: { A: 300, B: 150, C: 0 },
  },
  {
    key: "dailyReport",
    label: "Daily Report / OOS Report",
    amounts: { A: 200, B: 100, C: 0 },
  },
  {
    key: "display",
    label: "การจัดเรียงและความสะอาดสินค้า",
    amounts: { A: 200, B: 100, C: 0 },
  },
  { key: "attendance", label: "Attendance", amounts: { A: 500, B: 200, C: 0 } },
] as const;

export function calculateCheerKpi(grades: Record<string, CheerGrade>) {
  const amounts = cheerKpiCriteria.map((criterion) => {
    const grade = grades[criterion.key];
    if (grade !== "A" && grade !== "B" && grade !== "C")
      throw new Error("กรุณาประเมินทุกหัวข้อ");
    return { key: criterion.key, grade, amount: criterion.amounts[grade] };
  });
  const total = amounts.reduce((sum, item) => sum + item.amount, 0);
  return { amounts, total, maximum: 1500, percentage: (total / 1500) * 100 };
}

export function calculateSupervisorKpi(achievements: number[]) {
  const maximums = [900, 700, 700, 700];
  const weights = [0.3, 0.3, 0.2, 0.2];
  if (
    achievements.length !== maximums.length ||
    achievements.some((value) => !Number.isFinite(value) || value < 0)
  )
    throw new Error("คะแนนไม่ถูกต้อง");
  const amounts = achievements.map((value, index) =>
    value < 80 ? 0 : (maximums[index] * Math.min(value, 100)) / 100,
  );
  return {
    amounts,
    total: amounts.reduce((sum, value) => sum + value, 0),
    percentage: achievements.reduce(
      (sum, value, index) => sum + Math.min(value, 100) * weights[index],
      0,
    ),
  };
}

export function calculateOosAchievement(stocks: Array<number | null>) {
  const available = stocks.filter(
    (value): value is number =>
      value !== null && Number.isFinite(value) && value >= 0,
  );
  if (!available.length) return null;
  const shortages = available.filter((value) => value < 3).length;
  return {
    universe: available.length,
    shortages,
    percentage: 100 - (shortages / available.length) * 100,
  };
}

export function calculateAttendanceAchievement(
  shifts: Array<{ scheduledAt: string; checkedInAt: string }>,
) {
  if (!shifts.length) return null;
  let late = 0;
  for (const shift of shifts) {
    const scheduled = Date.parse(shift.scheduledAt);
    const checkedIn = Date.parse(shift.checkedInAt);
    if (!Number.isFinite(scheduled) || !Number.isFinite(checkedIn))
      throw new Error("ไม่พบเวลาเริ่มงานหรือเวลาเช็กอินที่ถูกต้อง");
    if (checkedIn - scheduled > 5 * 60 * 1000) late += 1;
  }
  return {
    shifts: shifts.length,
    late,
    percentage: 100 - (late / shifts.length) * 100,
  };
}
