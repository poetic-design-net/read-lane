# Readlane Brand Identity

Source mockups from the brand identity concept (2026-07-31).

## Name & claim

| | |
| --- | --- |
| **Name** | Readlane |
| **Tagline (DE)** | Markdown schön teilen. |
| **Claim (EN)** | Publish beautifully |

## Palette

| Swatch | Hex | Use |
| --- | --- | --- |
| Off-white | `#F7F7F5` | Surfaces |
| Light gray | `#E5E7EB` | Borders / muted |
| Slate | `#6B7C93` | Secondary text / accents |
| Dark slate | `#2B313B` | Wordmark / primary UI |
| Near black | `#121417` | High-contrast text |

## Assets (production)

| File | Purpose |
| --- | --- |
| `public/brand/logo-symbol.svg` | Full-color mark |
| `public/brand/logo-symbol-mono.svg` | Monochrome mark (`currentColor`) |
| `public/brand/logo-horizontal.svg` | Mark + wordmark |
| `public/brand/logo-symbol.png` | Raster mark (512²) |
| `src/components/brand/logo.tsx` | React `<Logo />` / `<LogoMark />` |
| `src/app/icon.tsx` | Favicon (App Router) |
| `src/app/apple-icon.tsx` | Apple touch icon |
| `src/app/opengraph-image.tsx` | Default OG image |

## Usage in UI

```tsx
import { Logo } from "@/components/brand/logo";

// Marketing header
<Logo variant="full" size="lg" showTagline />

// Sidebar / compact chrome
<Logo variant="full" size="md" />

// Icon only
<Logo variant="mark" size="sm" />
```

## Source mockups

Archived in this folder (`ChatGPT Image 31. Juli 2026, …`).
