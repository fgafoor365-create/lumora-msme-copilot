
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code: string) => {
    if (code[0] !== '#') {
      const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
      return named[code.toLowerCase()] ?? entity
    }
    const radix = code[1]?.toLowerCase() === 'x' ? 16 : 10
    const digits = radix === 16 ? code.slice(2) : code.slice(1)
    const point = Number.parseInt(digits, radix)
    if (!Number.isInteger(point) || point < 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return entity
    return String.fromCodePoint(point)
  })
}

export function fmtShort(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return fmtINR(n);
}

export function fmtPct(value: number): string {
  return `${(Number.isFinite(value) ? value : 0).toFixed(1)}%`;
}

export function margin(profit: number, sales: number): number {
  return sales > 0 ? (profit / sales) * 100 : 0;
}

export function toNumber(value: string | number | undefined | null): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function todayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(from: string, to: string): number {
  const start = parseDate(from);
  const end = parseDate(to);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function dayOfWeek(value: string): number {
  return parseDate(value).getDay();
}

export function fmtDay(value: string, locale = "en-IN"): string {
  return parseDate(value).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
}

export function fmtMonthShort(value: string): string {
  return parseDate(value).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

export function fmtSigned(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${fmtINR(Math.abs(value))}`;
}

export function fmtWeekday(value: string): string {
  return parseDate(value).toLocaleDateString("en-IN", { weekday: "long" });
}

export function fmtWeekdayShort(value: string): string {
  return parseDate(value).toLocaleDateString("en-IN", { weekday: "short" });
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function uid(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
