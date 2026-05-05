# Route Manager Design System

## Brand Palette (Logo-Based)

Updated design system based on Route Manager logo colors and typography.

### Color Tokens

| Token | Color | Hex | Usage |
|-------|-------|-----|-------|
| Primary | Forest Green | `#1F5F47` | Buttons, links, interactive elements |
| Primary Bright | Teal | `#20D9A3` | Accents, highlights, hover states |
| Primary Deep | Dark Green | `#0F3D2C` | Button hover, darker variants |
| Accent | Teal | `#20D9A3` | Secondary highlights, accents |
| Accent Deep | Darker Teal | `#0F9465` | Accent hover states |
| Success | Green | `#10B981` | Success states, confirmations |
| Danger | Red | `#F87171` | Error states, destructive actions |
| Warning | Amber | `#FBBF24` | Warning states |
| Background | Navy | `#07091A` | Page background |
| Surface | Dark Blue | `#11162B` | Card backgrounds |
| Border | Dark | `#1F2847` | Dividers, borders |
| Text | Off-white | `#F1F5FF` | Body text |
| Text Secondary | Light Gray | `#C7D0E5` | Secondary text |
| Text Muted | Muted Gray | `#5A6488` | Disabled, metadata |

### CSS Variables

All tokens available as CSS custom properties:

```css
:root {
  --primary: #1F5F47;
  --primary-bright: #20D9A3;
  --primary-deep: #0F3D2C;
  --primary-glow: rgba(31, 95, 71, .35);
  --accent: #20D9A3;
  --accent-deep: #0F9465;
  --accent-glow: rgba(32, 217, 163, .25);
  --success: #10B981;
  --danger: #F87171;
  --warning: #FBBF24;
}
```

## Typography

### Font Stack

| Type | Font | Weights | Use Case |
|------|------|---------|----------|
| Headings | **SORA** | 400, 500, 600, 700, 800 | h1–h6, page titles, section headings |
| Body | **INTER** | 400, 500, 600, 700 | Paragraphs, labels, UI text |

**Font imports:**
```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
```

### Heading Styles

```css
/* Automatically applied to: */
h1, h2, h3, h4, h5, h6,
.hero-title, .page-title, .section-title,
.auth-title, .step-title, .feature-title {
  font-family: 'Sora', sans-serif;
  font-weight: 700;
}
```

### Font Sizes (Responsive)

| Element | Mobile | Desktop | Usage |
|---------|--------|---------|-------|
| Hero Title | `2.25rem` | `3.75rem` | Large hero headlines |
| Page Title | `1.3rem` | `1.625rem` | Page headers |
| Section Title | `1.75rem` | `2.5rem` | Feature sections |
| Body | `0.875rem` | `0.9rem` | Paragraph text |
| Small | `0.78rem` | `0.82rem` | Labels, metadata |

## Component Colors

### Buttons

- **Primary (CTA)** — `linear-gradient(135deg, #1F5F47 → #0F3D2C)`
- **Success** — `linear-gradient(135deg, #10B981 → #059669)`
- **Secondary** — `var(--surface-2)` with `var(--border)`
- **Danger** — `var(--danger-light)` with `var(--danger)` text

### Cards

- **Background** — `var(--surface)` (`#11162B`)
- **Border** — `var(--border)` (`#1F2847`)
- **Hover Border** — `var(--border-bright)` (`#2D3866`)
- **Glow** — `rgba(31, 95, 71, .35)` (forest green glow)

### Badges & Pills

- **Primary Badge** — `rgba(31, 95, 71, .12)` bg with `#20D9A3` text
- **Success Badge** — `rgba(52, 211, 153, .12)` bg with `#10B981` text

## Spacing Scale

```css
Padding scale: 8px, 12px, 16px, 20px, 24px, 28px, 32px, 36px, 40px, 48px, 56px
Gap scale: 8px, 10px, 12px, 14px, 16px, 20px, 24px, 28px, 32px, 36px, 40px, 48px, 60px, 80px
```

## Border Radius

- Small: `10px` (`--radius-sm`)
- Medium: `14px` (`--radius`)
- Large: `20px` (`--radius-lg`)

## Shadows

- Small: `0 1px 2px rgba(0,0,0,.4)`
- Medium: `0 4px 24px rgba(0,0,0,.4), 0 1px 2px rgba(0,0,0,.3)`
- Large: `0 24px 60px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.3)`
- Glow: `0 0 0 1px rgba(31, 95, 71, .35), 0 8px 32px rgba(31, 95, 71, .35)`

## Pages Styled

✓ Home (landing) — Hero, features, testimonials, pricing preview  
✓ Login/Register — Auth cards, forms  
✓ Dashboard — Route builder, cards, forms  
✓ Upload — Drop zone, form inputs  
✓ Results — Stats, route cards, stops  
✓ Plans — Pricing cards  
✓ Admin — Standard components  
✓ TermosDeUso/PoliticaDePrivacidade — Typography  

## Implementation Notes

- All primary blue (#3B82F6) replaced with forest green (#1F5F47)
- All accent purple (#A78BFA) replaced with teal (#20D9A3)
- All gradients use new palette (linear-gradient, radial-gradient)
- SORA font auto-applied to all heading elements
- INTER font used for body copy and UI labels
- Grid texture and glow effects updated to green tones
- Responsive typography maintained via clamp() functions

## Files Modified

- `frontend/src/index.css` — Main stylesheet with all tokens and component styles
- `frontend/index.html` — Unchanged (no additional imports needed)

