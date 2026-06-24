export function todayUTC(): string {
  return new Date().toISOString().split("T")[0]!;
}

export function yesterdayUTC(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0]!;
}

export function startOfMonthUTC(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function startOfMonthForDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function endOfMonthUTC(): string {
  const d = new Date();
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function daysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    days.push(current.toISOString().split("T")[0]!);
    current.setDate(current.getDate() + 1);
  }
  return days;
}
