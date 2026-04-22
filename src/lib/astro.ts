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

// Zodiac order (Western tropical / Vedic forward).
export const ZODIAC = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

// Rahu/Ketu move retrograde through the zodiac (backward).
const REVERSE_PLANETS = new Set<Planet>(["rahu", "ketu"]);

function previousSign(planet: Planet, sign: string): string {
  const idx = ZODIAC.indexOf(sign.toLowerCase() as typeof ZODIAC[number]);
  if (idx < 0) return sign;
  // For Rahu/Ketu (moving backward), the "previous" sign in time is the NEXT zodiac sign.
  const delta = REVERSE_PLANETS.has(planet) ? 1 : -1;
  const prev = (idx + delta + 12) % 12;
  return ZODIAC[prev];
}

// Given ingress events, return the sign each planet is in on `onDate`.
// Falls back to the sign preceding the first known future ingress when no past data exists.
export function currentPositions(
  ingresses: Array<{ planet: string | null; sign: string | null; date: string }>,
  onDate: string,
): Partial<Record<Planet, string>> {
  const result: Partial<Record<Planet, string>> = {};
  const past = [...ingresses]
    .filter(e => e.date <= onDate && e.planet && e.sign)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const e of past) {
    const p = e.planet as Planet;
    if (!PLANETS.includes(p)) continue;
    if (result[p]) continue;
    result[p] = e.sign as string;
  }
  // Fallback: planets without past ingress — use sign before earliest future ingress.
  const future = [...ingresses]
    .filter(e => e.date > onDate && e.planet && e.sign)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const e of future) {
    const p = e.planet as Planet;
    if (!PLANETS.includes(p)) continue;
    if (result[p]) continue;
    result[p] = previousSign(p, e.sign as string);
  }
  return result;
}

// Determine which planets are currently retrograde on `onDate`.
// Heuristic: a planet is retrograde if its most recent retrograde-start event
// is more recent than its most recent ingress (i.e. retrograde began and the
// planet hasn't yet moved into a new sign — typical retro window).
export function retrogradePlanets(
  events: Array<{ planet: string | null; event_type: string; date: string }>,
  onDate: string,
): Set<Planet> {
  const lastRetro: Partial<Record<Planet, string>> = {};
  const lastIngress: Partial<Record<Planet, string>> = {};
  for (const e of events) {
    if (!e.planet || e.date > onDate) continue;
    const p = e.planet as Planet;
    if (!PLANETS.includes(p)) continue;
    if (e.event_type === "retrograde") {
      if (!lastRetro[p] || e.date > lastRetro[p]!) lastRetro[p] = e.date;
    } else if (e.event_type === "ingress") {
      if (!lastIngress[p] || e.date > lastIngress[p]!) lastIngress[p] = e.date;
    }
  }
  const result = new Set<Planet>();
  for (const p of PLANETS) {
    const r = lastRetro[p];
    if (!r) continue;
    const i = lastIngress[p];
    if (!i || r > i) result.add(p);
  }
  return result;
}
