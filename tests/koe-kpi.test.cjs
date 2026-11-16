const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const typescript = require("typescript");

const filename = path.resolve(__dirname, "../utils/koe-kpi.ts");
const source = fs.readFileSync(filename, "utf8");
const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS } }).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled, filename);
const { calculateCheerKpi, calculateSupervisorKpi, calculateOosAchievement, calculateAttendanceAchievement } = loaded.exports;

test("BA Cheer grades total 1300 and require all criteria", () => {
    const grades = { knowledge: "A", promotion: "A", dailyReport: "A", display: "A", attendance: "A" };
    assert.equal(calculateCheerKpi(grades).total, 1300);
    assert.equal(calculateCheerKpi({ ...grades, dailyReport: "B", attendance: "B" }).total, 1100);
    assert.throws(() => calculateCheerKpi({}));
});

test("supervisor amounts follow the 80 percent threshold and cap", () => {
    const result = calculateSupervisorKpi([100, 98, 98, 98]);
    assert.deepEqual(result.amounts, [900, 686, 686, 686]);
    assert.equal(result.total, 2958);
    assert.ok(Math.abs(result.percentage - 98.6) < 0.00001);
    const capped = calculateSupervisorKpi([79, 80, 90, 110]);
    assert.deepEqual(capped.amounts, [0, 560, 630, 700]);
    assert.equal(capped.percentage, 85.7);
});

test("OOS counts reported nonmissing stocks below three", () => {
    assert.deepEqual(calculateOosAchievement([0, 2, 3, 10, null]), { universe: 4, shortages: 2, percentage: 50 });
    assert.equal(calculateOosAchievement([null]), null);
});

test("attendance is late only beyond five minutes", () => {
    const scheduledAt = "2026-10-01T10:00:00+07:00";
    assert.deepEqual(calculateAttendanceAchievement([
        { scheduledAt, checkedInAt: "2026-10-01T10:05:00+07:00" },
        { scheduledAt, checkedInAt: "2026-10-01T10:06:00+07:00" },
    ]), { shifts: 2, late: 1, percentage: 50 });
    assert.equal(calculateAttendanceAchievement([]), null);
    assert.throws(() => calculateAttendanceAchievement([{ scheduledAt: "", checkedInAt: "" }]));
});