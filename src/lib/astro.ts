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
    case "retrograde":
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

// ---------- Planetary positions ----------

export const PLANETS = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "rahu", "ketu",
] as const;
export type Planet = typeof PLANETS[number];

export const PLANET_RU: Record<Planet, string> = {
  sun: "Солнце",
  moon: "Луна",
  mercury: "Меркурий",
  venus: "Венера",
  mars: "Марс",
  jupiter: "Юпитер",
  saturn: "Сатурн",
  rahu: "Раху",
  ketu: "Кету",
};

export const PLANET_GLYPH: Record<Planet, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  rahu: "☊",
  ketu: "☋",
};

export const SIGN_RU: Record<string, string> = {
  aries: "Овен",
  taurus: "Телец",
  gemini: "Близнецы",
  cancer: "Рак",
  leo: "Лев",
  virgo: "Дева",
  libra: "Весы",
  scorpio: "Скорпион",
  sagittarius: "Стрелец",
  capricorn: "Козерог",
  aquarius: "Водолей",
  pisces: "Рыбы",
};

export function signRu(sign: string | null | undefined): string {
  if (!sign) return "—";
  return SIGN_RU[sign.toLowerCase()] ?? sign;
}

// Given ingress events with date <= onDate, return the latest sign per planet.
export function currentPositions(
  ingresses: Array<{ planet: string | null; sign: string | null; date: string }>,
  onDate: string,
): Partial<Record<Planet, string>> {
  const result: Partial<Record<Planet, string>> = {};
  // Sort descending by date so first match per planet wins.
  const sorted = [...ingresses]
    .filter(e => e.date <= onDate && e.planet && e.sign)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const e of sorted) {
    const p = e.planet as Planet;
    if (!PLANETS.includes(p)) continue;
    if (result[p]) continue;
    result[p] = e.sign as string;
  }
  return result;
}
