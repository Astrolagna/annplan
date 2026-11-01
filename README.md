# Cosmic Compass (49)

Build a personal Jyotish astrology planner web app.

Tech stack: React, Tailwind CSS, Supabase (auth + database).

Design: Light theme. Background #faf9f7. Primary accent: dusty rose (#e8a4a4). Secondary: sage green (#8fad8f). Text #2a2a2a. Soft shadows, rounded corners 12-16px, generous whitespace, clean minimalist-feminine aesthetic. Serif for headings (Cormorant or Playfair), sans-serif for body (Inter). Mobile-responsive.

Top navigation (always visible): Three tabs — Месяц / Неделя / День. Default after login: Месяц → Обзор.

МЕСЯЦ has 3 sub-pages (secondary tab row):

Обзор — monthly calendar grid. Each day cell shows:

Color dot: green (favorable), pink (challenging), grey (neutral) — from astro_events table

Astro icon if event on that day: 🌑 new moon, 🌕 full moon, ℞ retrograde, ☌ conjunction, → ingress

User's short note (one line, editable inline)

Hover tooltip: list of astro events for that day

Click → navigate to День view for that date

Цели месяца — 5 goal cards, each with: title input, description textarea, checkbox "выполнено".

Транзиты месяца — chronological list of all astro events for the current month. Each row:

Date (DD.MM)

Event name in Russian (e.g. "Венера входит в Весы", "Полнолуние в Овне", "Меркурий ретроградный до 25.04")

Color badge matching day_color

Short 1-sentence description

НЕДЕЛЯ has 2 sub-pages:

План — 7-column grid. Each column: day name + date + astro color strip on top + time slots 8:00-22:00. User adds tasks into slots.

Транзиты недели — compact list of astro events for the 7 days, same format as monthly transits.

ДЕНЬ — single page:

Left panel (1/3 width): Астро дня

Big color badge (green/pink/grey)

List of active transits for this day — each with event name + 1-sentence description

Current Moon sign and nakshatra (if in astro data)

Right panel (2/3 width):

Task list with checkboxes — add/edit/delete/reorder

Free-text notes field below

Date navigation: previous/next day arrows at top

Auth: Supabase email/password. Pages: /login, /register, /app.

Astro data: Static Supabase table astro_events, no external API. Each row: { date, event_type, planet, sign, description_ru, day_color }. Pre-populate 2025-2026 with Vedic sidereal (Lahiri ayanamsha): sign ingresses for all 9 grahas, retrograde start/end, new moons, full moons, major conjunctions.

Supabase tables:

notes — user_id, date, content

tasks — user_id, date, time_slot, title, is_done, sort_order

goals_monthly — user_id, year_month, title, description, is_done

astro_events — date, event_type, planet, sign, description_ru, day_color

All user inputs auto-save on blur with small "сохранено" indicator.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://annplan.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5db41205-1fb8-4434-a59c-d7e31d5c7118).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
