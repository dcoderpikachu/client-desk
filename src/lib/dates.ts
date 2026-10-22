// All dates are plain ISO strings (YYYY-MM-DD) in India time. Math is done in UTC on those
// strings so it never shifts by a day.
export const TZ = "Asia/Kolkata";

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function toISO(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      value,
    );
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return toISO(d);
}

function ms(iso: string): number {
  return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

function fromMs(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return fromMs(ms(iso) + n * 86400000);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((ms(b) - ms(a)) / 86400000);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonths(iso: string, n: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + n;
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 10);
}

export function monthEnd(iso: string): string {
  return addDays(addMonths(monthStart(iso), 1), -1);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function monthShort(iso: string): string {
  return MONTHS[Number(iso.slice(5, 7)) - 1];
}

export function monthLong(iso: string): string {
  return MONTHS_LONG[Number(iso.slice(5, 7)) - 1];
}

/** 22 Oct */
export function dayMonth(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${monthShort(iso)}`;
}

/** Thu 22 Oct */
export function weekdayDayMonth(iso: string): string {
  return `${WEEKDAYS[new Date(ms(iso)).getUTCDay()]} ${dayMonth(iso)}`;
}

/** Thursday, 22 October */
export function longDate(iso: string): string {
  return `${WEEKDAYS_LONG[new Date(ms(iso)).getUTCDay()]}, ${Number(iso.slice(8, 10))} ${monthLong(iso)}`;
}

/** 22 Oct 2026 */
export function fullDate(iso: string): string {
  return `${dayMonth(iso)} ${iso.slice(0, 4)}`;
}

/** March 2025 */
export function monthYear(iso: string): string {
  return `${monthLong(iso)} ${iso.slice(0, 4)}`;
}

/** "today", "yesterday", "9 days ago" */
export function ago(iso: string, today: string): string {
  const d = diffDays(iso, today);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

/** "today", "tomorrow", "in 5 days" */
export function inDays(iso: string, today: string): string {
  const d = diffDays(today, iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d < 0) return `${-d} days ago`;
  return `in ${d} days`;
}

export function lateText(days: number): string {
  if (days >= 14 && days % 7 === 0) return `${days / 7} weeks overdue`;
  if (days >= 21) return `${Math.round(days / 7)} weeks overdue`;
  return `${days} day${days === 1 ? "" : "s"} overdue`;
}

export function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}
