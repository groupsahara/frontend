/**
 * Shift-slot helpers — web port of the logic in the RN `BookingScheduleScreen`.
 *
 * A chef/service variant on this backend encodes its shift in the name, e.g.
 * "5 Hour Shift (11 AM – 4 PM)". We parse the duration + timing out of that so
 * the booking schedule grid can be built entirely on the client (no slots API).
 */

const WINDOW_START = 8; // fallback grid: first shift can start at 8 AM
const WINDOW_LATEST_START = 22; // fallback grid: last shift starts before 10 PM

export interface DayOption {
  weekday: string;
  day: string;
  value: string; // ISO yyyy-mm-dd
  fullLabel: string;
}

export interface ShiftSlot {
  id: string;
  startHour: number; // 24h start hour; used to hide slots that already started
  startTime: string; // "HH:00"
  label: string; // "11 AM – 4 PM"
}

/** "Now" in IST regardless of the device timezone: ISO date + minutes-since-midnight. */
export function istNow(): { dateISO: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function getNextDays(count = 7): DayOption[] {
  const out: DayOption[] = [];
  const [y, m, d] = istNow().dateISO.split("-").map(Number);
  // Anchor at noon UTC so the displayed weekday/day always matches the ISO date.
  const base = new Date(Date.UTC(y, m - 1, d, 12));
  for (let i = 0; i < count; i += 1) {
    const dt = new Date(base);
    dt.setUTCDate(base.getUTCDate() + i);
    out.push({
      weekday: dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
      day: String(dt.getUTCDate()),
      value: dt.toISOString().slice(0, 10),
      fullLabel: dt.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    });
  }
  return out;
}

/** 24h hour (may exceed 24 for overnight) → "1 PM" / "12 AM". */
export function fmtHour(h: number): string {
  const hh = ((h % 24) + 24) % 24;
  const period = hh < 12 ? "AM" : "PM";
  const display = hh % 12 === 0 ? 12 : hh % 12;
  return `${display} ${period}`;
}

/** Parse "11 AM" / "4 PM" / "12 Midnight" / "12 Noon" into a 24h hour, or null. */
export function parseTimeToken(token: string): number | null {
  const t = token.trim().toLowerCase();
  if (t.includes("midnight")) return 24; // end-of-day / overnight boundary
  if (t.includes("noon")) return 12;
  const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3] === "pm") h += 12;
  return h;
}

/**
 * Extract the duration (hours) and the shift timing string from a variant name
 * like "5 Hour Shift (11 AM – 4 PM)". Either field may be missing.
 */
export function parseVariantShift(variantName?: string | null): {
  durationHours: number | null;
  timing: string | null;
} {
  if (!variantName) return { durationHours: null, timing: null };
  const durMatch = variantName.match(/(\d+)\s*hour/i);
  const durationHours = durMatch ? Number(durMatch[1]) : null;
  const parenMatch = variantName.match(/\(([^)]+)\)/);
  const timing = parenMatch ? parenMatch[1].trim() : null;
  return { durationHours, timing };
}

/**
 * Build the shift slots from the variant's timing strings. Falls back to a
 * generated grid when no timings are supplied.
 */
export function buildShiftSlots(
  timings: string[] | undefined,
  durationHours: number,
): ShiftSlot[] {
  if (timings?.length) {
    return timings
      .map((timing, i): ShiftSlot | null => {
        const startHour = parseTimeToken(timing.split(/[–-]/)[0] ?? "");
        if (startHour == null) return null;
        return {
          id: `${i}-${startHour}`,
          startHour,
          startTime: `${String(startHour).padStart(2, "0")}:00`,
          label: timing.trim(),
        };
      })
      .filter((s): s is ShiftSlot => s !== null);
  }

  // Fallback: discrete blocks spaced by the shift length so they never overlap.
  const slots: ShiftSlot[] = [];
  for (let start = WINDOW_START; start < WINDOW_LATEST_START; start += durationHours) {
    slots.push({
      id: `${start}`,
      startHour: start,
      startTime: `${String(start).padStart(2, "0")}:00`,
      label: `${fmtHour(start)} – ${fmtHour(start + durationHours)}`,
    });
  }
  return slots;
}
