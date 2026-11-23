type MonthlyWageLog = {
  id: number;
  userId: number | string;
  isMonthly: boolean;
  baseSalaryRate: number;
};

export function getMonthlyWageByLogId(logs: MonthlyWageLog[]) {
  const firstLogByUser = new Map<string, number>();
  for (const log of logs) {
    const userId = String(log.userId);
    if (log.isMonthly && !firstLogByUser.has(userId)) {
      firstLogByUser.set(userId, log.id);
    }
  }

  const wageByLogId = new Map<number, number>();
  for (const log of logs) {
    if (!log.isMonthly) continue;
    const firstLogId = firstLogByUser.get(String(log.userId));
    wageByLogId.set(log.id, firstLogId === log.id ? log.baseSalaryRate : 0);
  }
  return wageByLogId;
}
