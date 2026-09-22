# UI/UX Specification — Equipment Evacuation App (פינוי ציוד)

---

## 1. Core Principles

- **Mobile-First:** All screens are designed for mobile viewports (360–430 px wide). Touch targets are at minimum 44 × 44 px.
- **RTL / Hebrew First:** All layouts use `dir="rtl"`. Text, icon placement, and directional arrows are right-to-left throughout.
- **Single Active Task:** Each screen focuses on one action at a time. Multi-step flows use a linear wizard pattern — no tabs, no sidebars.
- **Optimistic Clarity:** Status is always visible. Every entity (room, packing unit, transport) shows a clear, color-coded status chip at all times.

---

## 2. Design Tokens & Color Palette

All colors are defined as `oklch` CSS custom properties in `src/styles.css` and consumed via Tailwind utility classes. Never hardcode hex values in components.

| Token | Role | Light Value |
|---|---|---|
| `--background` | Page background | Light gray `oklch(0.975 0.003 260)` |
| `--card` | Card / surface background | Pure white `oklch(1 0 0)` |
| `--foreground` | Primary text | Dark slate `oklch(0.21 0.02 260)` |
| `--muted-foreground` | Secondary / label text | Medium gray `oklch(0.55 0.015 260)` |
| `--primary` | Primary action (buttons, badges) | Vivid blue `oklch(0.575 0.201 262)` |
| `--primary-soft` | Icon container backgrounds | Soft blue tint `oklch(0.955 0.025 262)` |
| `--secondary` | Pressed / hover states | Near-white `oklch(0.965 0.005 260)` |
| `--success` | Completed / moved status | Green `oklch(0.6 0.14 158)` |
| `--success-soft` | Completed background tint | `oklch(0.955 0.04 158)` |
| `--warning` | In-progress / in-transit status | Amber `oklch(0.72 0.15 75)` |
| `--warning-soft` | In-progress background tint | `oklch(0.96 0.05 85)` |
| `--destructive` | Error / missing / not moved | Red `oklch(0.58 0.21 22)` |
| `--destructive-soft` | Error background tint | `oklch(0.958 0.03 22)` |
| `--border` | Card and input borders | `oklch(0.92 0.006 260)` |

---

## 3. Typography

- **Font family:** `Heebo` (Google Fonts) — primary sans-serif for all Hebrew and Latin text.
- **Mono font:** `IBM Plex Mono` — used for IDs and numeric codes only.
- **Scale in use:**

| Usage | Class | Size |
|---|---|---|
| Screen title | `text-xl font-bold` | ~20 px |
| Section heading | `text-base font-semibold` | ~16 px |
| Body / list items | `text-sm` | ~14 px |
| Labels / captions | `text-xs` | ~12 px |
| Micro labels (KPI cards) | `text-[11px]` | 11 px |

---

## 4. Layout System

### Shell — `MobileShell`
Every screen is wrapped in `MobileShell`, which provides:

- **Sticky header** — screen title, optional subtitle, optional back-navigation chevron (right side, RTL).
- **Scrollable main content area** — `overflow-y-auto`, full remaining viewport height.
- **Optional sticky footer** — used for primary CTA buttons on wizard steps.

### Cards — `card-soft`
The `card-soft` utility class is the standard surface for all cards and list items:
- White background, `1 px` border (`--border`), `border-radius: var(--radius-xl)` (~16 px), soft drop shadow.

### Spacing
- Screen padding: `px-4` (16 px horizontal), `py-4` (16 px top/bottom).
- Card internal padding: `p-4` (16 px all sides) for list items, `p-5` for content cards.
- Vertical rhythm between cards: `space-y-3` (12 px) or `space-y-4` (16 px).

---

## 5. Screen Inventory

### 5.1 Dashboard (`/`)

**Purpose:** High-level status overview and entry point to the evacuation hub.

**Layout:**
1. **Hero card** — app name, brief description, and a full-width primary CTA button ("כניסה לפינוי ציוד") linking to `/processes`.
2. **KPI grid (3 cards, equal columns)** — room status counters:
   - **חדרים שעברו** — count of rooms with status `"חדר סגור"`. Value rendered in `text-success`.
   - **חדרים שלא עברו** — count of rooms with status `"חדר פתוח"`. Value in `text-destructive`.
   - **חדרים במעבר** — count of rooms with status `"אריזה בתהליך"` or `"ממתין לגריטה"`. Value in `text-warning`.
3. **Department breakdown chart** — horizontal stacked bar chart (recharts), one bar per branch (`ענף`), stacked segments for the 3 room statuses above. Includes a color-coded RTL legend and a custom RTL tooltip. Colors map directly to the success / warning / destructive tokens.

**Empty state:** KPI cards always render even when all counts are 0. The chart renders with zero-value bars.

---

### 5.2 Equipment Evacuation Hub (`/processes`)

**Purpose:** Entry menu for the four process categories.

**Layout:** Vertical list of four process cards, each containing:
- Left edge: `ChevronLeft` icon (RTL navigation indicator) or a count badge.
- Center: Icon container (`size-11`, `bg-primary-soft`, `rounded-xl`) + title (`text-base font-semibold`) + description (`text-xs text-muted-foreground`).
- Right edge: (in RTL, this is the leading side) — dynamic counter badge or chevron.

**Category Cards & Badge Logic:**

| Card | Badge Source | Always Enabled |
|---|---|---|
| יצירת אריזה | No badge — shows `ChevronLeft` | **Yes** |
| יצירת הובלה | Count of packing units with status `"אריזה נסגרה"` | No |
| קבלת ציוד | Count of transports with status `"יחידת הובלה בדרך"` | No |
| פיזור ציוד | Count of packing units with status `"אריזה התקבלה"` | No |

**Enabled state (count > 0):** Rendered as a `<Link>`. Badge is a filled blue pill (`bg-primary text-primary-foreground`).

**Disabled state (count = 0):** Rendered as a `<div>` with `aria-disabled="true"`, `opacity-40`, `cursor-not-allowed`. Badge shows a grey "0" pill. Non-interactive — no tap/click response.

---

### 5.3 Create Packing (`/packing`)

**Purpose:** Open a new packing unit for a room and record its contents.

**Flow (4 wizard steps):**

1. **Location** — Select branch → section → room. Only `mapped: true` rooms shown. Rooms already at `"חדר סגור"` are excluded.
2. **Unit Type** — Select packing unit type (`קרטון אישי`, `קרטון מקצועי`, `פלטה`, `דולב`, `ארקסטרציה`) from a visual option list.
3. **Items** — Checklist of room items with quantities. Each item shows its current status chip. User adjusts packed quantities.
4. **Destination** — Enter target building, floor, and room number. Confirm closes the unit (`"אריזה נסגרה"`).

**Navigation:** Back/Next via sticky footer buttons. Step indicator shown in the header subtitle.

---

### 5.4 Create Transport (`/transport`)

**Purpose:** Create a transport unit and load sealed packing units onto it.

**Flow:**

1. **Vehicle details** — Enter license plate, select vehicle type (`משאית` / `אחר`).
2. **Load units** — Multi-select list of packing units with status `"אריזה נסגרה"`. Each row shows unit ID, type, source room, and destination. Confirm dispatches the transport (`"יחידת הובלה בדרך"`) and triggers an SMS notification.

---

### 5.5 Receive Equipment (`/receiving`)

**Purpose:** Confirm arrival and unload a transport.

**Flow:**

1. **Select transport** — List of transports with status `"יחידת הובלה בדרך"`. Each row shows transport ID, plate, unit count, and dispatch time.
2. **Confirm units** — Checklist of packing units on the selected transport. User marks received units. Missing units are flagged (`"אריזה חסרה"`), triggering an SMS alert.

---

### 5.6 Distribute Equipment (`/distribution`)

**Purpose:** Distribute items from a received packing unit to their target rooms.

**Flow:**

1. **Select unit** — List of packing units with status `"אריזה התקבלה"`. Each row shows unit ID, type, destination, and item count.
2. **Distribute items** — Checklist of items in the unit with target quantities. User confirms distributed quantities. Incomplete distribution marks the unit `"אריזה פוזרה עם חוסר"` and triggers an SMS alert.

---

## 6. Shared Components

### `StatusChip`
Color-coded pill badge used on all entity rows and detail screens.

| Status | Color |
|---|---|
| `חדר פתוח` | Neutral gray |
| `אריזה בתהליך` | Blue (primary) |
| `ממתין לגריטה` | Amber (warning) |
| `חדר סגור` | Green (success) |
| `נפתחה לנאמן לאריזה` | Blue soft |
| `אריזה נסגרה` | Green soft |
| `אריזה בדרך` | Amber |
| `אריזה התקבלה` | Green |
| `אריזה חסרה` | Red (destructive) |
| `אריזה פוזרה` | Green |
| `אריזה פוזרה עם חוסר` | Orange/Red |
| `יחידת הובלה בדרך` | Amber |
| `יחידת הובלה נפרקה במלואה` | Green |

### `Sheet`
Bottom-sheet modal overlay for contextual actions (e.g., confirming a destructive action, showing item detail). On mobile renders from the bottom edge; on tablet (≥ 768 px) centers as a dialog.

### `PrimaryButton` / `GhostButton`
Defined inside `MobileShell`. `PrimaryButton` uses full `bg-primary` fill; `GhostButton` is borderless with `text-primary`. Both are full-width in sticky footers.

### Counter Badge (process hub)
- **Active:** `bg-primary text-primary-foreground`, rounded-full pill, `text-xs font-bold`, min-width `1.375rem`.
- **Disabled (zero):** `bg-muted text-muted-foreground`, same shape, shows "0".

---

## 7. Navigation & Routing

The app uses **TanStack Router** with file-based routing under `src/routes/`.

| Route | Screen |
|---|---|
| `/` | Dashboard |
| `/processes` | Equipment Evacuation Hub |
| `/packing` | Create Packing |
| `/transport` | Create Transport |
| `/receiving` | Receive Equipment |
| `/distribution` | Distribute Equipment |

Back navigation is always a single level up, handled by the `backTo` prop on `MobileShell`. There is no global nav bar or tab bar — navigation is strictly linear and contextual.

---

## 8. State & Data Flow

- All application state lives in a single React Context (`RelocationProvider`) backed by `localStorage` (`relocation-state-v1`).
- Components read state via the `useRelocation()` hook — no prop drilling.
- All derived counts (KPI metrics, badge counters) are computed inline from the raw arrays (`rooms`, `units`, `transports`) — no separate derived state.
- SMS notifications are generated automatically inside store actions (`loadTransport`, `receiveTransport`, `distributeUnit`) when key events occur. They are stored in `messages[]` but no longer surfaced on the dashboard (replaced by the department chart).
- `resetAll()` restores the seed dataset (6 rooms across 3 branches, pre-populated items, empty units/transports/messages).

---

## 9. Accessibility & RTL Notes

- All interactive disabled states use `aria-disabled="true"` (not the `disabled` HTML attribute, which removes from tab order differently).
- Icons are decorative and wrapped in containers that carry the accessible text via adjacent labels — no standalone icon buttons without labels.
- Chart tooltips and legends are RTL-aware (`dir="rtl"`), with Hebrew labels matching the data keys.
- Color is never the sole indicator of status — every status chip also shows a Hebrew text label.
- Tap targets on list rows are full-width with `p-4` padding, meeting the 44 px minimum touch target height.
