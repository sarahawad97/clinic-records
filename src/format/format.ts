import type { Address, ClinicSettings, CurrencyCode } from "../domain/types";

export function formatPersonName(givenName: string, familyName: string): string {
  return `${givenName} ${familyName}`;
}

export interface Formatters {
  formatDate: (value: string) => string;
  formatTime: (value: string) => string;
  formatDateTime: (value: string) => string;
  formatDay: (value: Date) => string;
  formatWeekday: (value: Date) => string;
  formatMoney: (amount: number) => string;
  formatPhone: (value: string) => string;
  formatAddress: (address: Address) => string;
  formatTooth: (fdi: string) => string;
}

function toDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date(value);
}

function dateLocale(settings: ClinicSettings): string {
  if (settings.localeId === "he") return "he";
  if (settings.localeId === "ar") return "ar";
  return settings.dateFormat === "monthDay" ? "en-US" : "en-GB";
}

export function createFormatters(settings: ClinicSettings): Formatters {
  const locale = dateLocale(settings);
  const hour12 = settings.timeFormat === "12h";
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12 };
  const dateTimeOptions: Intl.DateTimeFormatOptions = { ...dateOptions, ...timeOptions };

  return {
    formatDate(value: string) {
      return new Intl.DateTimeFormat(locale, dateOptions).format(toDate(value));
    },
    formatTime(value: string) {
      return new Intl.DateTimeFormat(locale, timeOptions).format(new Date(value));
    },
    formatDateTime(value: string) {
      return new Intl.DateTimeFormat(locale, dateTimeOptions).format(new Date(value));
    },
    formatDay(value: Date) {
      return new Intl.DateTimeFormat(locale, dateOptions).format(value);
    },
    formatWeekday(value: Date) {
      return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(value);
    },
    formatMoney(amount: number) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: settings.currency,
      }).format(amount);
    },
    formatPhone(value: string) {
      return formatPhone(value, settings.phoneFormat);
    },
    formatAddress(address: Address) {
      return formatAddress(address, settings.addressOrder);
    },
    formatTooth(fdi: string) {
      if (!fdi) return "";
      if (settings.toothNotation === "fdi") return fdi;
      return fdi;
    },
  };
}

function formatPhone(value: string, style: ClinicSettings["phoneFormat"]): string {
  const compact = value.replace(/[^\d+]/g, "");
  const match = compact.match(/^\+972(\d)(\d{3})(\d{4})$/);
  if (!match) return value;
  if (style === "grouped") return `0${match[1]} ${match[2]} ${match[3]}`;
  return `+972 ${match[1]} ${match[2]} ${match[3]}`;
}

function formatAddress(address: Address, order: ClinicSettings["addressOrder"]): string {
  const street = address.line1;
  const locality = [address.city, address.postalCode].filter(Boolean).join(" ");
  const parts =
    order === "cityFirst"
      ? [locality, street, address.country]
      : [street, locality, address.country];
  return parts.filter(Boolean).join(", ");
}

export const CURRENCIES: CurrencyCode[] = ["ILS", "USD", "EUR"];

export function ageInYears(dateOfBirth: string, today = new Date()): number {
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}
