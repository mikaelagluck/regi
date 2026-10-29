# regi — Design Tokens

**Source of truth for all visual values.** The moodboard (`design/Regi-moodboard.html`) defines the visual system. The wireframes (`design/Regi_Wireframes.html`) define layout, hierarchy, and copy only — their colours are an earlier palette and must NOT be used.

Confirmed values are below. Anything not listed (neutral greys, exact type scale, shadows, radii): extract from the moodboard HTML's CSS. If the moodboard doesn't define it, use the defaults marked *(default)* and list it in `DECISIONS.md`.

## Colour — meaning only
Colour is never decoration. Each hue carries exactly one meaning, and every coloured state also has a non-colour cue (icon, shape, weight, or label) per PRD A4.

| Token | Hex | Meaning | Examples |
|---|---|---|---|
| `pink` | `#FF6FE7` | **Active** | active tab, active regimen pill, checked step, timer fill, primary CTA, logo asterisk |
| `blue` | `#0057FF` | **Informational** | helper text emphasis, links, "Available" username state, schedule-conflict note, retroactive-log marker |
| `yellow` | `#FFE030` | **Sharing** | share CTA, share pills/status, My Shares accents, share web view highlights |
| `white` | `#FFFFFF` | Background | all surfaces — pure white, no off-white |
| `ink` | from moodboard *(default `#111111`)* | Text, icons, borders | |
| `ink-secondary` / `ink-tertiary` / `hairline` | from moodboard *(default ink at 60% / 38% / 12%)* | Secondary text, placeholders, dividers | |

Tints (e.g. the ~8–10% timer fill, selected-row backgrounds) are opacity variants of the meaning colour, never new hues.

## Typography
| Role | Font | Notes |
|---|---|---|
| Display / logo / screen titles | **Spectral**, italic, 700 | Google Fonts via `next/font` |
| Body / UI | **Instrument Sans** | Google Fonts via `next/font`; weights 400 / 500 / 600 |

Type scale: take from moodboard. Use `rem` units so text respects the user's browser font size.

## Logo
`*regi` — rendered as a single text run with two styled spans so kerning stays natural:
- `*` in `pink`
- `regi` in `ink`
- Spectral italic 700

SVG form (for web share view / app icon work):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40">
  <text x="0" y="30" font-family="Spectral" font-style="italic" font-weight="700" font-size="32">
    <tspan fill="#FF6FE7">*</tspan><tspan fill="#111111">regi</tspan>
  </text>
</svg>
```
HTML form: `<span class="logo"><span class="logo-star">*</span>regi</span>` with Spectral italic 700 on `.logo` and `color: var(--pink)` on `.logo-star`.

## Spacing / radius *(defaults unless the moodboard says otherwise)*
- Spacing: 4 / 8 / 14 / 18 / 24
- Radius: 6 / 8 / 12 / pill 14 (or fully rounded)
- Bottom sheet drag handle: 4×36 (PRD B9.1)
- Empty state: 64 icon → 16 medium headline → 12 secondary subhead (max width 240) → CTA (PRD B9.2)

## Icons
Tabler Icons (outline) via `@tabler/icons-react`, per PRD B1.4 — use the exact five tab icons named there.
