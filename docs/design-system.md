# CarDeal design system

The rules every screen follows. Tokens live in `app/globals.css` and `tailwind.config.ts`; shared pieces live in `components/ui` and `components/layout`.

## Principles
- **Calm and exact.** Tight corners, hairline borders, no decorative shadows or gradients.
- **One width.** Content never exceeds 1200px (`container`), with 16px/24px gutters.
- **Tables for records.** Anything a user scans or compares (bids, deals, inventory, admin data) is a table on desktop and a compact list on phones.
- **Right-to-left first.** Use logical spacing (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`). Never `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` in app code.

## Color (unchanged palette)
| Token | Use |
|---|---|
| `primary` `#297A79` | Buttons, links, selected states (5.1:1 under white text) |
| `brand` `#3C9F9D` | Logo mark and icon accents only, never text or button fills |
| `ink` `#112B2D` | Top bar, rare high-emphasis surfaces |
| `foreground` / `muted-foreground` | Body text / secondary text (≥ 5.4:1) |
| `background` / `card` / `muted` / `border` | Page, surfaces, subtle fills, hairlines |
| `status-{warning,success,danger,neutral}` + `-foreground` | Status badges and highlighted stats only |

Don't use raw Tailwind palette colors (`gray-*`, `green-*`, `blue-*` …) or hex values in app code.

## Shape and elevation
- Radius: `rounded-sm` 4px (badges, chips), `rounded-md` 6px (controls), `rounded-lg` 8px (surfaces). `rounded-xl`/`2xl`/`3xl` are capped at 8px.
- `rounded-full` only for avatars, dots and numbered step markers.
- Elevation: borders, not shadows. `shadow-md` for popovers and floating bars, `shadow-xl` for dialogs.

## Type (Tajawal 400/500/700/800)
| Class | Size | Use |
|---|---|---|
| `.page-title` | 24/32 bold | One per page |
| `.section-title` | 16/24 bold | Blocks within a page |
| `text-sm` | 14/20 | Default UI text |
| `.eyebrow` / `text-xs` | 12/16 | Labels, table headers, hints |
| `.num` | tabular figures | Prices, counts, dates |

## Spacing
4px grid. Page blocks are `space-y-6`; inside a surface use `p-4`/`p-5`; form fields `space-y-1.5` (label → control) and `space-y-4` between fields.

## Controls
- Button heights: `sm` 36px, default 40px, `lg` 44px (primary mobile actions). Variants: `default` (one per view), `outline` (neutral), `ghost`, `destructive`, `link`.
- Inputs and selects: 40px, 6px radius, teal focus border.
- Icons: 16px (`h-4 w-4`) inside controls; buttons get `gap-2` automatically.

## Building blocks
- `PageHeader` (`components/layout/page-header.tsx`): eyebrow, title, description, actions. Every page starts with it (except the home hero and auth pages).
- `Section`: titled block without card chrome.
- `.surface`: the standard bordered container (use instead of ad-hoc cards).
- `StatGroup` + `Stat` (`components/ui/stat.tsx`): metrics as one divided strip, never a wall of cards. Tones mark items needing attention.
- `Table` (`components/ui/table.tsx`): 40px header on a muted band, 12px bold header text, `text-end` for money.
- `EmptyState` (`components/ui/empty-state.tsx`): icon, title, one sentence, optional action.
- `StatusBadge` (`components/status-badge.tsx`): the only way to show a bid/deal/ticket/listing status.
- `AuthShell` (`components/layout/auth-shell.tsx`): narrow centered frame for sign-in/sign-up.
- Tabs are underlined (`components/ui/tabs.tsx`); counts go inside the trigger.

## Responsive
- Breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1200.
- Sidebars (filters, admin nav) appear at `lg`; below that they collapse into a toggle or a scrolling row.
- Tables that don't fit become lists below `md`, or scroll inside their own `overflow-x-auto`. The page itself never scrolls sideways.
- Primary actions on phones sit in a bottom bar when the form is far down the page (car details).
