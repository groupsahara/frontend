"use client";

/**
 * Per-item booking schedules (web port of the RN `bookingSchedules` util).
 *
 * The backend cart doesn't store the date/shift a user picked, so we keep each
 * item's schedule here — keyed by service + variant — in localStorage. This lets
 * the checkout show every cart item with its own chosen date/shift, and book
 * each one accordingly.
 */

export interface BookingSchedule {
  date: string; // ISO yyyy-mm-dd
  dateLabel: string;
  startTime: string; // "HH:00"
  label: string; // "11 AM – 4 PM"
  durationHours: number;
  variantName?: string | null;
}

const KEY = "rc.booking.schedules";

type ScheduleMap = Record<string, BookingSchedule>;

const itemKey = (serviceId: number, variantId?: number | null) =>
  `${serviceId}:${variantId ?? 0}`;

function read(): ScheduleMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ScheduleMap) : {};
  } catch {
    return {};
  }
}

function write(map: ScheduleMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore quota/availability errors */
  }
}

export function saveBookingSchedule(
  serviceId: number,
  variantId: number | null | undefined,
  schedule: BookingSchedule,
): void {
  const map = read();
  map[itemKey(serviceId, variantId)] = schedule;
  write(map);
}

export function getBookingSchedule(
  serviceId: number,
  variantId?: number | null,
): BookingSchedule | null {
  return read()[itemKey(serviceId, variantId)] ?? null;
}

export function removeBookingSchedule(
  serviceId: number,
  variantId?: number | null,
): void {
  const map = read();
  delete map[itemKey(serviceId, variantId)];
  write(map);
}
