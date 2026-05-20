export type SocialKey =
  | "telegram"
  | "instagram"
  | "vk"
  | "youtube"
  | "threads"
  | "zen"
  | "max";

export const SOCIALS: { key: SocialKey; label: string; short: string; icon: string }[] = [
  { key: "telegram", label: "Telegram", short: "TG", icon: "✈️" },
  { key: "instagram", label: "Instagram", short: "IG", icon: "📷" },
  { key: "vk", label: "VK", short: "VK", icon: "🅥" },
  { key: "youtube", label: "YouTube", short: "YT", icon: "▶️" },
  { key: "threads", label: "Threads", short: "TH", icon: "@" },
  { key: "zen", label: "Яндекс Дзен", short: "Дзен", icon: "Я" },
  { key: "max", label: "MAX", short: "MAX", icon: "M" },
];

export const SOCIAL_MAP: Record<string, { label: string; short: string; icon: string }> =
  Object.fromEntries(SOCIALS.map(s => [s.key, { label: s.label, short: s.short, icon: s.icon }]));
