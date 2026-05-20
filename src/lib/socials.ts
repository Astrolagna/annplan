export type SocialKey =
  | "telegram"
  | "instagram"
  | "vk"
  | "youtube"
  | "tiktok"
  | "x"
  | "threads"
  | "facebook"
  | "linkedin";

export const SOCIALS: { key: SocialKey; label: string; short: string; icon: string }[] = [
  { key: "telegram", label: "Telegram", short: "TG", icon: "✈️" },
  { key: "instagram", label: "Instagram", short: "IG", icon: "📷" },
  { key: "vk", label: "VK", short: "VK", icon: "🅥" },
  { key: "youtube", label: "YouTube", short: "YT", icon: "▶️" },
  { key: "tiktok", label: "TikTok", short: "TT", icon: "🎵" },
  { key: "x", label: "X", short: "X", icon: "𝕏" },
  { key: "threads", label: "Threads", short: "TH", icon: "@" },
  { key: "facebook", label: "Facebook", short: "FB", icon: "f" },
  { key: "linkedin", label: "LinkedIn", short: "in", icon: "in" },
];

export const SOCIAL_MAP: Record<string, { label: string; short: string; icon: string }> =
  Object.fromEntries(SOCIALS.map(s => [s.key, { label: s.label, short: s.short, icon: s.icon }]));
