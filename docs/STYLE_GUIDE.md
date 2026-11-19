# Style guide: Crayon Toybox

A starting point for the dashboard's look. The goal is "a toy diorama drawn with markers on warm paper": chunky shapes, flat colour, thick ink lines, small playful motion.

## Principles

1. **Ink first.** Every 3D object and every HTML card has a dark ink outline (`--ink`). Outlines are what make it read as hand-drawn.
2. **Flat, few tones.** 3D uses cel shading with three light steps (shadow, mid, light). No glossy materials, no realistic textures.
3. **Nothing perfectly straight.** Cards use uneven corner radii and a slight tilt (-1.5° to +1°). Links use wavy underlines.
4. **Status colour is sacred.** Green, yellow, red and grey mean status only. Game colours are chosen to avoid being confused with them where possible, and status is always paired with a symbol (✓ ! ✕ ? –), never colour alone.
5. **Gentle motion.** Islands bob, balloons sway, clouds drift. Motion is slow and small; hover/select adds a little scale and turn.

## Colour tokens

Defined in `src/styles.css` (`:root`) and mirrored in `src/theme.ts` for the 3D scene.

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#2B2118` | Outlines, text, hard shadows |
| `--paper` | `#FFF6E5` | Cards, page bottom |
| `--paper-2` | `#FBECCF` | Code chips, secondary fill |
| `--sky` | `#BFE3F2` | Page top gradient |
| `--ok` | `#5DBB63` | Status: working |
| `--warn` | `#F5B841` | Status: needs attention (building, pending, cancelled) |
| `--down` | `#E5534B` | Status: broken (failed deploy, paused project, site not answering) |
| `--unknown` | `#9AA5B1` | Status: could not check (no key) |
| `--unused` | `#E8E1D3` | Status: game does not use the service |

Island colours live per game in `src/data/games.ts` (`color`). Pick soft, mid-saturation colours.

## Type

- **Gaegu** (Google Fonts) for headings, labels and buttons: the hand-lettered voice.
- **Zen Maru Gothic** for body text and Chinese characters: rounded and easy to read.
- Code and env var names use the system monospace font inside a `--paper-2` chip.

## Shapes and components

- **Sketch card** (`.sketch`): paper fill, 3px ink border, `--wobble` radius, 4px/5px hard ink shadow.
- **Sketch button** (`.sketch-btn`): 2.5px border, hard shadow that collapses on press, tilts slightly on hover. Focus shows a dashed ink outline.
- **Status chip** (`.chip`): blobby circle in the status colour with the status symbol.
- **Note** (`.note`): pale yellow with a dashed border, for "please confirm" messages.

## 3D scene

- Each game is a **floating island**: low-poly 9-sided top in the game's colour, brown earth cone underneath.
- Games get a **tree**, web apps get a **little house**, so the kinds read apart at a glance.
- Each service the game uses is a **flag** on the rim in that service's status colour. Unused services have no flag.
- The **balloon** shows the worst status of the island.
- Outlines use an inverted hull (`src/scene/ToonMesh.tsx`): a copy of the shape pushed out along smoothed normals and drawn back faces only, in `--ink`. Default thickness 0.05 world units; small parts use 0.02–0.03.
- Toon gradient: 3 steps (`src/scene/toon.ts`). One ambient light and one directional light with soft shadows.
- Labels are HTML (drei `<Html>`) so Chinese text renders with the web fonts.

## Next ideas

- Paper texture or hatching shader on the shadow tone.
- Little animated faces on islands (happy / worried / sleeping) instead of balloons.
- Sound: a soft "pop" on select.
