// Date helpers — keep all dates as YYYY-MM-DD strings for Supabase consistency.

export const RU_MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export const RU_MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export const RU_WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const RU_WEEKDAYS_FULL = [
  "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье",
];

export function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Build 6x7 month grid (Monday-first) for a given month.
export function monthGrid(year: number, month0: number): Date[] {
  const first = new Date(year, month0, 1);
  // Monday = 0..Sunday = 6
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

// Monday-start week containing date d (length 7).
export function weekDays(d: Date): Date[] {
  const offset = (d.getDay() + 6) % 7;
  const monday = addDays(d, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatDDMM(s: string): string {
  const [, m, d] = s.split("-");
  return `${d}.${m}`;
}

export function formatLong(s: string): string {
  const d = fromISO(s);
  return `${d.getDate()} ${RU_MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

export function isSameMonth(d: Date, year: number, month0: number) {
  return d.getFullYear() === year && d.getMonth() === month0;
}

export function isToday(d: Date) {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}
