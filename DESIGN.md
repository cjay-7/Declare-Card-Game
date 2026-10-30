---
version: alpha
name: Declare
description: Dark, amber-accented design system for Declare, a real-time multiplayer card game with special card powers.
colors:
  surface: "#1a1a1a"
  surface-container: "#232323"
  surface-container-high: "#2d2d2d"
  surface-container-highest: "#383838"
  page-background: "#262626"
  table: "#14271f"
  table-edge: "#0b1511"
  on-surface: "#e6e1e5"
  on-surface-variant: "#9a959e"
  primary: "#f59e0b"
  primary-hover: "#d97706"
  primary-light: "#fbbf24"
  primary-container: "#4a3000"
  on-primary: "#1a1a1a"
  secondary: "#6b7280"
  on-secondary: "#ffffff"
  success: "#34d399"
  warning: "#fbbf24"
  error: "#f87171"
  outline: "#4b5563"
  success-strong: "#16a34a"
  success-container: "#14532d"
  error-strong: "#dc2626"
  error-container: "#7f1d1d"
  warning-strong: "#ca8a04"
  info: "#60a5fa"
  info-strong: "#2563eb"
  info-container: "#1e3a8a"
  power: "#c084fc"
  power-strong: "#9333ea"
  card-red: "#dc2626"
  card-black: "#000000"
  card-face: "#ffffff"
  card-selected: "#f59e0b"
  card-highlighted: "#8b5cf6"
typography:
  display:
    fontFamily: system-ui, sans-serif
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: system-ui, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: system-ui, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: system-ui, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: system-ui, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.02em
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 20px
  full: 9999px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  panel:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  modal:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: 24px
  input:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px
  playing-card:
    backgroundColor: "{colors.card-face}"
    textColor: "{colors.card-black}"
    rounded: "{rounded.sm}"
    width: 64px
    height: 96px
---

## Overview

Declare is a fast, tense, real-time card game played on phones and laptops, often in a dim room with friends. The interface is a **dark, low-glare table** with a single **amber accent** that always means "this is where you act." Cards are the brightest things on screen; chrome stays quiet so the cards and the current turn read first.

Principles:

1. **Cards are the hero.** Playing cards use real card art on a white face. UI chrome (panels, buttons) must never compete with them in brightness or saturation.
2. **One accent, one meaning.** Amber (`primary`) marks the actionable or selected thing: the primary button, the selected card border, the active player. Do not use it decoratively.
3. **State must be legible at a glance.** Whose turn it is, which cards are face-up, and which power is active should be readable without text. Pair color with a second cue (border, icon, label) so it is not color-only.
4. **Surfaces step up, not out.** Depth comes from lighter surface tones plus soft shadow, not borders or gradients.
5. **Touch first.** Everything interactive must work with a thumb; desktop hover is an enhancement.

The non-game screens (login, register, lobby, friends) follow Material 3 conventions via Material Tailwind v3. The game board uses the same tokens but custom card components.

## Colors

The palette is a dark neutral ramp plus amber, with semantic status colors.

- **Surfaces** (`surface` → `surface-container-highest`): four elevation steps from `#1a1a1a` to `#383838`. Page background is `page-background`. Higher elevation means lighter.
- **Table**: the game board sits on a dark felt gradient (`table` to `table-edge`). Zones (opponent, center, you) are rounded translucent-black panels over it. The active player's zone gets a 1px `primary` border and a faint amber tint, and their name plate turns solid amber with `on-primary` text.
- **On-surface** text is `on-surface` (`#e6e1e5`) for primary text and `on-surface-variant` (`#9a959e`) for secondary/helper text.
- **Primary** `#f59e0b` is the only brand color. `primary-hover` is the pressed/hover shade; `primary-container` is a dark amber tint for subtle selected backgrounds. Text on primary is always `on-primary` (near-black), never white.
- **Secondary** gray is for low-emphasis actions.
- **Status**: `success` (confirmed, correct elimination), `warning` (attention, timers), `error` (wrong elimination, validation, disconnects).
- **Card colors**: hearts/diamonds use `card-red`, clubs/spades use `card-black`, on a `card-face` white card. `card-selected` (amber) outlines a selected card; `card-highlighted` (violet) outlines cards eligible for a power (peek, swap).

- **Semantic game tokens**: `outline` (borders), `success-strong`/`error-strong`/`info-strong`/`power-strong` (filled buttons and badges, white text), `*-container` (dark tinted backgrounds), and `info`/`power` (text and borders). They are CSS variables in `client/src/index.css` and Tailwind classes such as `bg-success-strong`, `text-on-surface-variant`, `border-outline`. `success` and `error` as text/border colors are `text-success-fg` and `border-error-fg` because Material Tailwind already owns `success`/`error`.
- Per-player accent colors (indigo, teal, pink, orange) and the blue card back are data colors, not theme tokens.

Rules: body text on any surface must keep at least 4.5:1 contrast. Do not put `on-surface-variant` on `surface-container-highest` for body-size text. Never use red and green as the only distinction between two states.

## Typography

A single system sans-serif stack (`system-ui`) keeps load fast and avoids a font download on mobile. Hierarchy comes from size and weight, not from multiple families.

- `display` for game-end results and screen titles.
- `headline` and `title` for modal and panel headings.
- `body` and `body-sm` for general copy and lists.
- `label` for buttons, chips and card captions. Card rank/suit are rendered from card art, not text.

Keep line length under about 65 characters in instructions and modals. Use sentence case everywhere.

## Layout

- **Spacing** is a 4px base scale (`spacing.1` to `spacing.12`). Use multiples of 4px only; prefer `spacing.4` (16px) as the default gutter and `spacing.6` (24px) between sections.
- **Containers** on non-game screens cap at 320 to 512px (forms and modals) and center horizontally.
- **Game board** is a table layout: opponents around the top and sides, the deck and discard pile in the center, the local player's hand at the bottom within thumb reach. Hands are rendered as a grid (see HandGrid), not a fan.
- **Breakpoints** follow Tailwind defaults. Design for 360px width first; the board must remain usable in portrait on a phone.
- Card size is fixed at 64 x 96px at the base size so layouts do not shift when cards flip.

## Elevation & Depth

Three shadow levels, always dark and soft:

- `elevation-1`: `0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)` for panels and list rows.
- `elevation-2`: `0 2px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)` for raised buttons and dropdowns.
- `elevation-3`: `0 6px 16px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.25)` for modals and dragged cards.

Pair shadow with the lighter surface step. Separators use `1px solid rgba(255,255,255,0.1)`. Scrollbars are 6px, translucent white thumb.

## Shapes

Corners are rounded but restrained: `rounded.md` (8px) for inputs and buttons, `rounded.lg` (12px) for panels, `rounded.xl` (16px) for modals, `rounded.sm` (6px) for playing cards, `rounded.full` for avatars and pills. Do not mix more than two radii in one component.

## Components

- **Button** (`components/ui/Button.tsx`): variants `primary`, `secondary`, `success`, `warning`, `error`; sizes `sm`, `md`, `lg`; supports `loading`. One primary button per view. Disabled buttons drop to reduced opacity and ignore pointer events.
- **Modal** (`components/ui/Modal.tsx`): `modal` token, centered, `elevation-3`, dimmed backdrop, focus is trapped and returned on close, Escape closes unless the action is destructive.
- **Playing card** (`components/Card.tsx`): face-down shows the card back; face-up shows card art. States: default, selected (amber border), highlighted (violet border for power targets), revealed (flip). Cards support swipe-down to discard where `swipeable` is set.
- **Hand grid** (`components/HandGrid.tsx`): shows each player's cards, handles power usage targets and elimination (declaring a card that matches the discard rank).
- **Notifications** (`NotificationSystem`, `KingPowerNotification`, `InviteNotification`): slide in from the right, auto-dismiss, use status colors with an icon so meaning is not color-only.
- **Forms** (login, register, friends): Material Tailwind inputs on `surface-container-high`, visible label above the field, inline error text in `error`.

Focus: every interactive element shows a 2px `primary` outline with 2px offset on `:focus-visible`.

## Motion

Short and purposeful, and disabled under `prefers-reduced-motion`.

- Interface transitions use 150ms (fast), 200ms (base) or 300ms (slow) with `ease`.
- Card animations: `cardDraw` 500ms ease-out, `cardDiscard` 500ms ease-in, `cardSwap` 800ms ease-in-out, `cardReveal` 400ms ease-out (flip), `slideIn` 300ms for notifications.
- Animate only `transform` and `opacity`. Never block input while an animation plays; game state updates immediately and animation catches up.

## Do's and Don'ts

Do:
- Use design tokens (CSS variables / Tailwind theme) instead of raw hex values or raw Tailwind palette classes like `bg-gray-800`.
- Keep Tailwind v4 set up with `@import "tailwindcss"` and `@config` in `index.css`; the old `@tailwind base/utilities` directives generate almost no utilities in v4.
- Keep amber for the single most important action or selection.
- Give every power-related highlight a text or icon cue as well as color.
- Test layouts at 360px width and with long display names.

Don't:
- Don't introduce new accent colors or a light theme without updating this file.
- Don't use pure white text on amber; use `on-primary`.
- Don't use `!important` color overrides (the existing `.text-red-600` and `.text-black` overrides in `index.css` are legacy; fold them into `card-red` and `card-black`).
- Don't animate layout properties (width, height, top, left).
- Don't rely on hover for anything the user must do on mobile.
