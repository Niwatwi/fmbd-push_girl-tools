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

test("salary period uses prior month 16 through selected month 15", () => {
    assert.deepEqual(getSalaryPeriodForMonth("2026-11"), {
        payrollStartDate: "2026-10-16",
        payrollEndDate: "2026-11-15",
        commissionStartDate: "2026-10-01",
        commissionEndDate: "2026-10-31",
        kpiPeriodMonth: "2026-10-01",
    });
});

test("salary period and commission month cross the year boundary", () => {
    assert.deepEqual(getSalaryPeriodForMonth("2026-01"), {
        payrollStartDate: "2025-12-16",
        payrollEndDate: "2026-01-15",
        commissionStartDate: "2025-12-01",
        commissionEndDate: "2025-12-31",
        kpiPeriodMonth: "2025-12-01",
    });
});