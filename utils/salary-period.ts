export function getSalaryPeriodForMonth(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("เดือนงวดจ่ายไม่ถูกต้อง");

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error("เดือนงวดจ่ายไม่ถูกต้อง");
  }

  const formatDate = (date: Date) => date.toISOString().slice(0, 10);
  const payrollStartDate = formatDate(
    new Date(Date.UTC(year, monthIndex - 1, 16)),
  );
  const payrollEndDate = formatDate(new Date(Date.UTC(year, monthIndex, 15)));
  const commissionStartDate = formatDate(
    new Date(Date.UTC(year, monthIndex - 1, 1)),
  );
  const commissionEndDate = formatDate(new Date(Date.UTC(year, monthIndex, 0)));

  return {
    payrollStartDate,
    payrollEndDate,
    commissionStartDate,
    commissionEndDate,
    kpiPeriodMonth: `${match[1]}-${match[2]}-01`,
  };
}
