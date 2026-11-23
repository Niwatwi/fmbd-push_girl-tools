const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const typescript = require("typescript");

const filename = path.resolve(__dirname, "../utils/salary-period.ts");
const source = require("node:fs").readFileSync(filename, "utf8");
const compiled = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS },
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled, filename);
const { getSalaryPeriodForMonth } = loaded.exports;
const wageFilename = path.resolve(__dirname, "../utils/attendance-wages.ts");
const wageSource = require("node:fs").readFileSync(wageFilename, "utf8");
const wageCompiled = typescript.transpileModule(wageSource, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS },
}).outputText;
const loadedWages = new Module(wageFilename, module);
loadedWages.filename = wageFilename;
loadedWages.paths = module.paths;
loadedWages._compile(wageCompiled, wageFilename);
const { getMonthlyWageByLogId } = loadedWages.exports;
const accountingFilename = path.resolve(
    __dirname,
    "../utils/payroll-accounting.ts",
);
const accountingSource = require("node:fs").readFileSync(
    accountingFilename,
    "utf8",
);
const accountingCompiled = typescript.transpileModule(accountingSource, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS },
}).outputText;
const loadedAccounting = new Module(accountingFilename, module);
loadedAccounting.filename = accountingFilename;
loadedAccounting.paths = module.paths;
loadedAccounting._compile(accountingCompiled, accountingFilename);
const { calculatePayrollAccountingAmounts } = loadedAccounting.exports;

test("salary period uses prior month 16 through selected month 15", () => {
    assert.deepEqual(getSalaryPeriodForMonth("2026-11"), {
        payrollStartDate: "2026-10-16",
        payrollEndDate: "2026-11-15",
        commissionStartDate: "2026-10-01",
        commissionEndDate: "2026-10-31",
        kpiPeriodMonth: "2026-11-01",
    });
});

test("salary period and commission month cross the year boundary", () => {
    assert.deepEqual(getSalaryPeriodForMonth("2026-01"), {
        payrollStartDate: "2025-12-16",
        payrollEndDate: "2026-01-15",
        commissionStartDate: "2025-12-01",
        commissionEndDate: "2025-12-31",
        kpiPeriodMonth: "2026-01-01",
    });
});

test("monthly salary is assigned once across attendance logs", () => {
    const wages = getMonthlyWageByLogId([
        { id: 1, userId: 10, isMonthly: true, baseSalaryRate: 18000 },
        { id: 2, userId: 10, isMonthly: true, baseSalaryRate: 18000 },
        { id: 3, userId: 20, isMonthly: true, baseSalaryRate: 22000 },
        { id: 4, userId: 30, isMonthly: false, baseSalaryRate: 600 },
    ]);

    assert.deepEqual(Array.from(wages.entries()), [
        [1, 18000],
        [2, 0],
        [3, 22000],
    ]);
});

test("withholding is 3 percent of wages, KPI, and commission only", () => {
    assert.deepEqual(
        calculatePayrollAccountingAmounts({
            wages: 22000,
            kpi: 1200,
            commission: 2500,
            otherExpenses: 300,
        }),
        {
            taxableTotal: 25700,
            withholdingTax: 771,
            netPayable: 25229,
        },
    );
});