// Astro helpers — UI representation of astro events.

export type DayColor = "green" | "pink" | "grey";

export type AstroEvent = {
  id: string;
  date: string;
  event_type: string;
  planet: string | null;
  sign: string | null;
  description_ru: string;
  day_color: DayColor;
};

export const DAY_COLOR_LABEL: Record<DayColor, string> = {
  green: "Благоприятный",
  pink: "Сложный",
  grey: "Нейтральный",
};

export const DAY_COLOR_BG: Record<DayColor, string> = {
  green: "bg-[var(--color-day-green)]",
  pink: "bg-[var(--color-day-pink)]",
  grey: "bg-[var(--color-day-grey)]",
};

export const DAY_COLOR_RING: Record<DayColor, string> = {
  green: "ring-[var(--color-day-green)]/40",
  pink: "ring-[var(--color-day-pink)]/40",
  grey: "ring-[var(--color-day-grey)]/40",
};

export function eventIcon(ev: { event_type: string }): string {
  switch (ev.event_type) {
    case "new_moon": return "🌑";
    case "full_moon": return "🌕";
    case "retrograde_start":
    case "retrograde_end": return "℞";
    case "conjunction": return "☌";
    case "ingress": return "→";
    default: return "✦";
  }
}

// Pick the "headline" color for a day given multiple events.
// Priority: pink > green > grey (challenges are most important to flag).
export function dominantColor(events: AstroEvent[]): DayColor | null {
  if (events.length === 0) return null;
  if (events.some(e => e.day_color === "pink")) return "pink";
  if (events.some(e => e.day_color === "green")) return "green";
  return "grey";
}

// Group an array of events by date string.
export function groupByDate(events: AstroEvent[]): Record<string, AstroEvent[]> {
  const map: Record<string, AstroEvent[]> = {};
  for (const e of events) {
    (map[e.date] ||= []).push(e);
  }
  return map;
}
