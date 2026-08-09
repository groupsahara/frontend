export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "10:00" → "10:00 AM", so a roster reads the way people say it. */
export function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Takes anything with the two clock fields — the full shift, or a slim row. */
export const shiftWindow = (s: { startTime: string; endTime: string }) =>
  `${fmt12h(s.startTime)} – ${fmt12h(s.endTime)}`;

/** "Mon–Sat" rather than six chips, when the days are consecutive. */
export function daysLabel(days: number[]): string {
  if (!days?.length) return "—";
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return "All week";
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  return consecutive && sorted.length > 2
    ? `${DAYS[sorted[0]]}–${DAYS[sorted[sorted.length - 1]]}`
    : sorted.map((d) => DAYS[d]).join(", ");
}
