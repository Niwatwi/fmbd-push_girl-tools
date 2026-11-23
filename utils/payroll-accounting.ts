export function calculatePayrollAccountingAmounts(input: {
  wages: number;
  kpi: number;
  commission: number;
  otherExpenses: number;
}) {
  const taxableTotal = input.wages + input.kpi + input.commission;
  const withholdingTax =
    Math.round((taxableTotal * 0.03 + Number.EPSILON) * 100) / 100;
  const netPayable = taxableTotal + input.otherExpenses - withholdingTax;

  return { taxableTotal, withholdingTax, netPayable };
}
