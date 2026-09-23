# Auroras Magic — UI design system

**`cozy-handdrawn-v2`, applied to the chrome.** Three implementers work from
§7 and §8; §2 and §3 are the contract between them.

Proposed 2026-09-20. Art-directed against `src/game/artStyle.ts`
(`cozy-handdrawn-v2`, owner-approved 2026-09-20) and the screen set in
`tools/locale-fit/shots/`.

---

## §1 Direction

**The UI is made of the same three materials as the book: cream paper, warm
plum ink, and painted pastel colour.** Every control the player touches is a
piece of paper with a plum line drawn round it and a pastel wash inside — which
is exactly what the spellbook page and the wardrobe shelf already are, and they
are the only two screens in the game that currently look like they belong to
it. The reference points are a printed picture book (Oliver Jeffers' painted
card stock; Sanrio's confidence about pastel *with* a dark outline) and the
game's own approved `public/images/story/intro-1.webp`. It is explicitly **not**
a hybrid-casual portal template: no navy `#1a2b4b` panels, no near-black
`#0f1a30` outlines, no saturated `#ffcd00 → #f7a000` slot-machine buttons, no
white 900-weight italic uppercase letter-spaced captions on a hard
`3px 3px 0 #000` shadow, no red `#ff3e3e` close button. Those are esports tells
and together they are the "dark" the owner is reacting to. The sentence an
implementer should be able to recite: *plum ink on pastel paper; gold for the
one thing to press, violet for the one thing that is happening, and nothing on
this screen is black.*

**What I overruled in the diagnosis.** Nothing in substance — the two-languages
reading is correct and measurable. Two sharpenings. (a) The storybook language
is not one language but *three already-coherent* ones: the cream/plum page
(spellbook, dialogue leaf, wardrobe shelf), the violet/gold canvas (map node
badges, chapter rail) and the deep-plum duel plate. The violet/gold canvas set
is already right, so §2's accents are **tokenised out of `map.ts`** rather than
invented — that is what keeps the DOM and the un-editable canvas in agreement.
(b) The duel HUD's near-black is not merely off-brand, it *breaks the pinned art
style's own lead rule* ("NO BLACK LINES ANYWHERE… EVERY outline is warm deep
plum `#3A2340`"). `--duel-ink: #0a0713` and `GLYPH_INK = '#0a0713'` are a style
breach, not a taste call, which is what makes this a fix rather than a repaint.

---

## §2 The palette, as tokens

All tokens live on `:root` in a new `src/assets/css/theme.sass` (§8, complete
contents). Prefix `--am-` so nothing collides with the surviving `--duel-*`
aliases or with Tailwind 4's own custom properties.

### 2.1 Surfaces

| Token | Hex | The one job it does |
| --- | --- | --- |
| `--am-surround` | `#9E7CBE` | The cloth the book lies on. DOM letterbox (`AppScene`), `html`/`body`, `<meta name="theme-color">`. The single flat value for every place a gradient is impossible. |
| `--am-surround-top` | `#7B5EA8` | Top stop of the canvas surround gradient (map / wipe / intro backdrops). |
| `--am-surround-bottom` | `#CBA6D6` | Bottom stop of the same gradient — dawn light under the page. |
| `--am-splash-in` | `#A98BCE` | Centre of the boot-splash radial. |
| `--am-splash-out` | `#7B5EA8` | Edge of the boot-splash radial. |
| `--am-paper` | `#FDF6E7` | The default plate: modal frame, HUD button, dialogue leaf, reward ribbon. |
| `--am-parchment` | `#F5E7C0` | The warmer book page: spellbook page, anything meant to read as *inside* the book. |
| `--am-paper-raised` | `#FFFDF6` | A tile sitting **on** paper: spellbook row, rune tile, leaderboard row. |
| `--am-paper-sunken` | `#ECDCB8` | A well cut **into** paper: slider track, select list, table zebra, progress trough. |
| `--am-paper-edge` | `#D8C49A` | Hairline rules and dividers inside paper (already the spellbook's). |
| `--am-frame` | `#5A3A22` | The book's leather/board frame (spellbook cover). |
| `--am-night` | `#4A3566` | The one dark plate that survives: HP trough, empty rune slot, duel loss card. Deep plum, never near-black. |
| `--am-night-deep` | `#3B2A54` | A well inside `--am-night` (the HP bar's unfilled track). |
| `--am-scrim` | `rgba(58, 35, 64, 0.62)` | Every modal / overlay dim. Plum, never black. |
| `--am-scrim-soft` | `rgba(58, 35, 64, 0.38)` | The lighter dim where content must stay legible through it (dialogue, versus setup). |

### 2.2 Ink

| Token | Hex | The one job it does |
| --- | --- | --- |
| `--am-ink` | `#3A2340` | **THE line colour.** Every border, every primary text on paper, every glyph on a pastel face. Mandated by `artStyle.ts`. |
| `--am-ink-2` | `#6B4F6E` | Secondary text on paper: captions, "of N", table headers, hints. |
| `--am-ink-3` | `#5F4667` | Text on a *tinted* light surface (locked chapter tab, disabled button face) where `--am-ink-2` falls under 4.5:1. |
| `--am-ink-soft` | `rgba(58, 35, 64, 0.22)` | Dashed rules, ghost borders, the wardrobe shelf's divider. |
| `--am-on-accent` | `#3A2340` | Text and glyphs on gold / lilac / coral / mint. **Plum, not white.** |
| `--am-on-night` | `#FFF6E6` | Text and glyphs on `--am-night` and on `--am-ink`. |
| `--am-shout` | `#FFFFFF` | The fill of `.ink-text` — the shouted single words painted over the arena, which carry their own `--am-ink` outline. |

### 2.3 Accents

Each accent is a triple: **face** (gradient top), **foot** (gradient bottom),
**plate** (the offset depth block under it). All of them carry
`--am-on-accent` text and an `--am-ink` border.

| Role | Token set | Face | Foot | Plate | Used for |
| --- | --- | --- | --- | --- | --- |
| Primary action | `--am-gold` / `-foot` / `-plate` | `#FFD76A` | `#F0B846` | `#B9812C` | The one button that moves the story on. Already the map's "done" node and "here" chapter tab, on the canvas. |
| Secondary action | `--am-lilac` / `-foot` / `-plate` | `#C9B0FF` | `#A98CF0` | `#6F55C9` | The other button in a pair; "this is happening now" (live CAST). `-plate` is already `MapScene`'s open-chapter colour. |
| Danger / leave | `--am-coral` / `-foot` / `-plate` | `#FFB3A3` | `#F08C78` | `#A8503E` | Close, leave the duel, dismiss. A blush coral, never `#ff3e3e`. |
| Success / confirm | `--am-mint` / `-foot` / `-plate` | `#9BE8C4` | `#6FCFA4` | `#2F8A63` | Ready, claimed, restored. |
| Reward (money) | `--am-reward` / `-foot` / `-plate` | `#FFC93F` | `#EF9A1F` | `#A9660F` | The rewarded-video button. **Reserved and unused today** — no `type="warning"` call site exists — kept defined so the one button that earns money can never drift. |
| Disabled | `--am-disabled` face + `--am-ink-3` label | `#E4DACB` | flat | none | A flat, plateless, un-gradiented paper face. Disabled is shown by *losing the material*, never by `opacity: .5` + `grayscale(1)` (which drops the current label to ~2.5:1). |

### 2.4 The magic / decoration ramp

Six hues taken verbatim from `FReward`'s confetti, so the ornament and the
reward beat are one set. **Decoration only — never a text background.**

```
--am-magic-1: #FF9ECF   blossom
--am-magic-2: #C7A6FF   lilac
--am-magic-3: #9FD8FF   sky
--am-magic-4: #9FF0D0   mint
--am-magic-5: #FFD36B   butter
--am-magic-6: #FFB36B   peach
--am-rainbow: linear-gradient(90deg, #FF9ECF, #FFD36B, #9FF0D0, #9FD8FF, #C7A6FF)
```

### 2.5 Dark context — chrome that must sit on the drained duel

The drained sector is a story mechanic and is **not** touched. The chrome over
it uses exactly two materials, and both read against a grey drained scene *and*
a fully restored colourful one:

- **Paper plate** (`--am-paper` + `--am-ink` border) for everything the player
  presses. Cream against a desaturated mid-grey scene is the highest-contrast
  object on screen, which is the point: the chrome pops, the drained world
  recedes, and the restored world later reads as *more* colourful than its own
  UI rather than competing with it.
- **Night plate** (`--am-night`) for the two gauges only — the HP trough and an
  empty rune slot. A gauge reads dark-to-bright; a cream HP bar would force its
  fill darker than its plate and invert the game's whole read.

`.ink-text` (shouted words over the arena) keeps its `-webkit-text-stroke`
technique and changes only its ink: `#FFFFFF` fill with a `#3A2340` outline is a
14.05:1 glyph edge, legible over any backdrop the game can produce.

### 2.6 Measured contrast — every pairing the UI actually uses

WCAG 2.1: normal text 4.5:1, large text (≥ 24 px, or ≥ 18.66 px bold) and
graphics 3:1. sRGB relative luminance.

| Foreground | Background | Ratio | Where | Verdict |
| --- | --- | --- | --- | --- |
| `--am-ink` `#3A2340` | `--am-paper` `#FDF6E7` | **13.06:1** | Modal body, HUD glyphs, dialogue text | AA ✓ |
| `--am-ink` | `--am-paper-raised` `#FFFDF6` | **13.81:1** | Spellbook rows, leaderboard rows | AA ✓ |
| `--am-ink` | `--am-parchment` `#F5E7C0` | **11.43:1** | Spellbook title and combo names | AA ✓ |
| `--am-ink` | `--am-paper-sunken` `#ECDCB8` | **10.37:1** | Select list options, zebra rows | AA ✓ |
| `--am-ink` | `--am-disabled` `#E4DACB` | **10.16:1** | (label uses `--am-ink-3`, below) | AA ✓ |
| `--am-ink-2` `#6B4F6E` | `--am-paper` | **6.57:1** | Captions, "of N", table headers | AA ✓ |
| `--am-ink-2` | `--am-parchment` | **5.75:1** | Book sub-labels | AA ✓ |
| `--am-ink-2` | `--am-paper-sunken` | **5.22:1** | Unknown-combo "? ? ?" | AA ✓ |
| `--am-ink-2` | `--am-paper-raised` | **6.95:1** | Leaderboard flair column | AA ✓ |
| `--am-ink-2` | `--am-gold` `#FFD76A` | **5.11:1** | `RankBadge`'s "of N" tail on the FLAT gold pill. Measured for set B. **Only on the flat face** — on `--am-gold-foot` the same ink is 3.92:1, so a label on the gold GRADIENT (leaderboard "you" row, footer) takes `--am-ink` instead | AA ✓ |
| `--am-ink-3` `#5F4667` | `--am-disabled` `#E4DACB` | **5.94:1** | Disabled button label | AA ✓ |
| `--am-ink-3` | `#CFC3DE` locked tab | **4.89:1** | Locked chapter numeral | AA ✓ |
| `--am-on-accent` `#3A2340` | `--am-gold` `#FFD76A` | **10.16:1** | Primary label, gradient top | AA ✓ |
| `--am-on-accent` | `--am-gold-foot` `#F0B846` | **7.80:1** | Primary label, gradient foot | AA ✓ |
| `--am-on-accent` | `--am-lilac` `#C9B0FF` | **7.45:1** | Secondary label, top | AA ✓ |
| `--am-on-accent` | `--am-lilac-foot` `#A98CF0` | **5.15:1** | Secondary label, foot | AA ✓ |
| `--am-on-accent` | `--am-coral` `#FFB3A3` | **8.18:1** | Close glyph / leave label | AA ✓ |
| `--am-on-accent` | `--am-coral-foot` `#F08C78` | **5.84:1** | same, foot | AA ✓ |
| `--am-on-accent` | `--am-mint` `#9BE8C4` | **9.86:1** | Ready / confirm | AA ✓ |
| `--am-on-accent` | `--am-mint-foot` `#6FCFA4` | **7.45:1** | same, foot | AA ✓ |
| `--am-on-accent` | `--am-reward` `#FFC93F` | **9.15:1** | Rewarded button (reserved) | AA ✓ |
| `--am-on-accent` | `--am-reward-foot` `#EF9A1F` | **6.23:1** | same, foot | AA ✓ |
| `--am-on-night` `#FFF6E6` | `--am-night` `#4A3566` | **9.83:1** | HP name, loss-card body | AA ✓ |
| `--am-on-night` | `--am-ink` `#3A2340` | **13.10:1** | Text on an ink plate | AA ✓ |
| `--am-gold` `#FFD76A` | `--am-night` | **7.62:1** | Loss-card title; Aurora HP fill | AA ✓ |
| `#C9B6FF` | `--am-night` | **5.83:1** | Foe HP fill, lavender hint | AA ✓ |
| `--am-shout` `#FFFFFF` | `--am-ink` outline | **14.05:1** | `.ink-text` glyph edge, over ANY backdrop | AA ✓ |
| `--am-on-night` | `#6F55C9` open chapter tab | **5.13:1** | Chapter rail numerals | AA ✓ |
| `--am-lilac-plate` `#6F55C9` | `--am-paper` | **5.11:1** | The Parents-tab privacy link (underlined) | AA ✓ |
| `--am-coral-plate` `#A8503E` | `--am-paper` | **5.03:1** | Leaderboard "couldn't reach it" state | AA ✓ |
| `--am-on-accent` `#3A2340` | `#C9B6FF` lavender fill | **7.78:1** | Any label on the foe-HP lavender | AA ✓ |
| `--am-paper` | `--am-frame` `#5A3A22` | **9.46:1** | Page against the book board | ✓ |
| `--am-paper` | `--am-surround` `#9E7CBE` | **4.08:1** | Page against the cloth — **graphic only** | ✓ (≥ 3:1) |
| `--am-parchment` | `--am-surround-top` `#7B5EA8` | **4.26:1** | same | ✓ |
| `--am-parchment` | `--am-surround-bottom` `#CBA6D6` | **1.83:1** | Page against dawn light at the very bottom of the gradient | **Graphic only.** The page carries a `3px --am-ink` edge (§3.4); that edge is what separates it. |
| `--am-ink-3` `#5F4667` | `--am-paper` `#FDF6E7` | **7.63:1** | The idle CAST caption and the muted ♪ on a paper HUD chip (`DuelHud`) | AA ✓ |
| `--am-gold` `#FFD76A` | `--am-night-deep` `#3B2A54` | **9.23:1** | Aurora's HP fill against the trough it is actually cut into (§3.13 puts the trough at `--am-night-deep`, not `--am-night`) | AA ✓ |
| `#C9B6FF` | `--am-night-deep` `#3B2A54` | **7.06:1** | Foe HP fill, and the rune slot's forming ring, against the same trough | AA ✓ |
| `--am-coral-foot` `#F08C78` | `--am-night-deep` `#3B2A54` | **5.30:1** | The HP ghost — the chunk of damage draining away | ✓ (graphic) |
| Rune colour stroke | its own 18 % wash over `--am-night-deep` | **2.92:1 worst of 12** (Earth `#b08050`; Fire 3.28, ten of twelve ≥ 3.68) | `RuneSlot`'s filled slot. Measured over `--am-night` first, where Earth fell to 2.49 and Fire to 2.79 — which is why the slot's well is `--am-night-deep`. The glyph also carries its `GLYPH_INK` outline and the slot is never the only place a queued rune is shown, so the two sub-3:1 cases are accepted rather than lightened. | ✓ (graphic, noted) |

| `--am-lilac-plate` `#6F55C9` | `#FFFAF0` TurnSideways card | **5.29:1** | The rotate arrow — graphic, was gold at 1.33:1 | ✓ |
| `--am-on-accent` `#3A2340` | `--am-gold` `#FFD76A` | **10.16:1** | `DuelResult`'s retry caption — was inheriting `.ink-text` white at 1.38:1 | AA ✓ |

**Corrected 2026-09-21, measured:** the two page-on-cloth rows above are
`#FDF6E7` on `#9E7CBE` = **3.21:1** (not 4.08) and `#F5E7C0` on `#CBA6D6` =
**1.71:1** (not 1.83). Both remain graphic-only and both are still governed by
the rule below — the page's `3px --am-ink` edge is what separates it, not its
face. Every one of the other 31 pairs in this table verifies to the stated
figure exactly.

**Two pairings sit below 4.5 and both are graphic-only.** The rule for
implementers: **nothing with a glyph or a letter in it may sit directly on
`--am-surround*`.** A caption that must float over the cloth gets a
`--am-paper` chip under it first.

**Colours now forbidden anywhere in `src/` and `index.html`:** `#000000` and
every near-black (`#0f1a30`, `#0a0713`, `#0a1425`, `#0c1626`, `#07060f`,
`#181130`, `#151d31`, `#1a1230`), the `#1a2b4b` / `#2a4372` / `#34538d` navy
family, `#ffcd00` / `#f7a000`, and `#ff3e3e`. A grep for those in review is a
failing check.

---

## §3 Materials

Copy-pasteable recipes. Each one is a **class in `theme.sass`** or a literal
block to paste into a component's scoped Sass. Where a recipe replaces an
existing one, the old is shown so the diff is unambiguous.

Everything here is cheap by construction: solid fills, one two-stop linear
gradient, one offset solid depth block, one 2–5 px border. **No new
`backdrop-filter`** (the single existing one in `FModal`/`FReward` stays), no
stacked box-shadows, no per-frame filters, no PNGs.

### 3.1 The button

The universal depth recipe: a solid offset **plate** behind a gradient **body**
with an ink border and a 45 %-height white **shine**. That geometry is already
right in `FButton` and is kept verbatim — only the materials change.

**Before** (`FButton.vue`, `.f-button__body` + `.f-button__text`):

```sass
border: 2px solid #0f1a30
background-image: linear-gradient(to bottom, #ffcd00, #f7a000)
// .f-button__text
color: #fff
font-weight: 900
text-transform: uppercase
text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000
// .f-button__shadow
background-color: #1a2b4b
```

**After:**

```sass
// ─── .am-btn — the one button material ─────────────────────────────────────
// Consumers set --am-btn-face / -foot / -plate from §2.3; gold is the default.
.am-btn
  --am-btn-face: var(--am-gold)
  --am-btn-foot: var(--am-gold-foot)
  --am-btn-plate: var(--am-gold-plate)

.am-btn__plate            // the depth block (FButton's .f-button__shadow)
  position: absolute
  inset: 0
  transform: translateY(3px)
  border-radius: var(--fbtn-radius)
  background-color: var(--am-btn-plate)

.am-btn__body             // FButton's .f-button__body
  border: 3px solid var(--am-ink)
  border-radius: var(--fbtn-radius)
  background-image: linear-gradient(to bottom, var(--am-btn-face), var(--am-btn-foot))
  overflow: hidden

.am-btn__shine            // FButton's .f-button__shine — unchanged geometry
  position: absolute
  inset-inline: 0
  top: 0
  height: 45%
  background-color: rgba(255, 255, 255, 0.34)
  border-radius: var(--fbtn-radius) var(--fbtn-radius) 0 0
  pointer-events: none

.am-btn__label            // FButton's .f-button__text
  color: var(--am-on-accent)
  font-weight: 800
  text-transform: none            // §4: the uppercase habit is dead
  font-style: normal
  letter-spacing: 0
  line-height: 1.3
  padding: 2px                    // room inside overflow:hidden for the lift
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45)   // ONE soft white lift
```

**States.** Border width, plate offset and metrics never change between states —
only the surface does, so the button does not move under the finger.

```sass
.am-btn:hover:not(.is-disabled)
  filter: saturate(1.06) brightness(1.04)      // was brightness(1.08)

.am-btn:active:not(.is-disabled)
  transform: translateY(3px) scale(0.985)      // presses INTO its own plate
  .am-btn__plate
    transform: translateY(0)

.am-btn.is-disabled
  cursor: not-allowed
  filter: none                                  // NOT grayscale(1)
  opacity: 1                                    // NOT 0.5
  .am-btn__plate
    display: none
  .am-btn__body
    background-image: none
    background-color: var(--am-disabled)
    border-color: var(--am-ink-soft)
  .am-btn__shine
    display: none
  .am-btn__label
    color: var(--am-ink-3)
    text-shadow: none

.am-btn:focus-visible
  outline: 3px solid var(--am-ink)
  outline-offset: 3px
```

**`variant="brawl"` is deleted.** The `skewX(-10deg)` + italic + negative
tracking is the single most esports-reading rule in the codebase. Keep the prop
in the type for source compatibility and make it a no-op, or remove it and its
one dead call path. Nothing in `src/` passes it.

### 3.2 The depth plate (standalone)

Anything that needs to sit "above the page" but is not a button:

```sass
.am-plate
  position: relative
  background: var(--am-paper)
  border: 3px solid var(--am-ink)
  border-radius: clamp(12px, 3.2vw, 20px)
  box-shadow: 0 4px 0 rgba(58, 35, 64, 0.28)   // ONE shadow, plum, never black
```

For a plate that must read as pressed into the page (a trough, a select list):

```sass
.am-plate--sunken
  background: var(--am-paper-sunken)
  border: 3px solid var(--am-ink)
  box-shadow: inset 0 3px 0 rgba(58, 35, 64, 0.14)
```

### 3.3 `.duel-plate` — the highest-leverage class in the codebase

`src/assets/css/duel.sass` defines it, and it draws the near-black rounded-square
HUD buttons on **map, wipe, unbox, wardrobe, dialogue, intro, versus, spellbook
close, duel HUD, duel result**. Retheming its two variables flips most of the
dark chrome in one edit.

**Before:**

```sass
:root
  --duel-ink:   #0a0713
  --duel-plate: #181130
  --duel-plate-live: #3b2a63

.duel-plate
  background: var(--duel-plate)
  border: var(--lw, 5px) solid var(--duel-ink)
  border-radius: 16px
```

**After** — the variables are kept (34 call sites reference them) and redefined
as aliases onto the theme, so no template changes:

```sass
:root
  // Aliases onto theme.sass. NOT new colours — one source of truth.
  --duel-ink:        var(--am-ink)          // #3A2340, the style's own line colour
  --duel-plate:      var(--am-paper)        // #FDF6E7 cream, was #181130
  --duel-plate-live: var(--am-gold)         // #FFD76A, was #3b2a63
  --duel-gold:       var(--am-gold)
  --duel-purple:     var(--am-lilac)
  --duel-red:        var(--am-coral)
  --duel-disabled:   var(--am-ink-3)        // was #7a6f95 (white-ish on dark)
  --duel-lavender:   #C9B6FF
  --duel-green:      var(--am-mint-foot)

.duel-plate
  background: var(--duel-plate)
  border: var(--lw, 4px) solid var(--duel-ink)   // 5px -> 4px: plum at 5px is heavy
  border-radius: 16px
  color: var(--am-ink)                            // NEW: the default ink on a paper plate
  box-shadow: 0 3px 0 rgba(58, 35, 64, 0.26)      // the page-lift, one shadow
```

**The one knock-on every implementer must handle:** anything that used to sit
*on* `.duel-plate` assumed white-on-dark. On a cream plate it must become
`--am-ink`. That is exactly three families of call site, all listed in §7:
glyph `color`, `.ink-text` labels (which must gain `.ink-none` and a plum
colour), and the `filter: drop-shadow(2px 2px 0 var(--duel-ink))` on glyphs —
which becomes `drop-shadow(0 1px 0 rgba(255,255,255,0.5))` or is removed, since
a plum glyph on cream needs no outline.

A **night** variant for the two gauges:

```sass
.duel-plate.is-night
  background: var(--am-night)
  color: var(--am-on-night)
```

### 3.4 The panel / frame

`FModal`'s three-layer frame (shadow, frame, content) stays; the materials
change and it gains the book's board.

**Before** (`FModal.vue`):

```sass
.f-modal__backdrop  background-color: rgba(0,0,0,0.7); backdrop-filter: blur(4px)
.f-modal__frame-shadow background-color: #0c1626
.f-modal__frame     border: 5px solid #0f1a30; background-color: #1a2b4b
.f-modal__content   color: #fff
```

**After:**

```sass
.f-modal__backdrop
  background-color: var(--am-scrim)          // plum, not black
  backdrop-filter: blur(4px)                 // the ONE existing blur — kept

.f-modal__frame-shadow
  background-color: var(--am-frame)          // the book board under the page
  transform: translateY(8px)                 // unchanged

.f-modal__frame
  border: 5px solid var(--am-ink)
  border-radius: clamp(0.9rem, 4.4vw, 2rem)  // unchanged
  background-color: var(--am-paper)

.f-modal__content
  color: var(--am-ink)
  text-align: center                          // unchanged
```

For a panel that should read as a *book page* rather than a card (the
spellbook), the frame is `--am-frame` with a `--am-parchment` page inside — the
recipe `SpellBook.vue` already uses; only `#4b2f1c → var(--am-frame)`,
`#f2e3c0 → var(--am-parchment)`, `var(--duel-ink) → var(--am-ink)`.

### 3.5 The title ribbon

**Before** (`FModal.vue` `.f-modal__ribbon-*`): gold gradient, `4px #0f1a30`
border, white 900 uppercase `0.05em` tracked text on the five-way black shadow.

**After** — a paper banner with a horn-tip end cap (§5.1), gold reserved for
buttons so the title does not shout louder than the CTA:

```sass
.f-modal__ribbon-shadow
  background-color: var(--am-frame)
  transform: translateY(4px)                 // unchanged

.f-modal__ribbon-body
  min-height: 2.25rem                        // unchanged
  padding: clamp(0.3rem, 1.4vw, 0.6rem) clamp(1.1rem, 6vw, 2.75rem)   // unchanged
  border: 4px solid var(--am-ink)
  border-radius: clamp(0.6rem, 2.6vw, 1rem)  // unchanged
  background-image: linear-gradient(to bottom, var(--am-paper-raised), var(--am-parchment))

.f-modal__ribbon-text
  color: var(--am-ink)
  font-weight: 800
  text-transform: none
  letter-spacing: 0
  font-style: normal
  text-shadow: none                          // 13:1 on paper needs no shadow
  font-size: clamp(0.95rem, 4.4vw, 1.85rem)  // unchanged
  line-height: 1.15                          // unchanged
```

### 3.6 The tab (`FTabs`)

**Before:** `#2a4372` inactive body with `#8fa7d1` text, `4px #0f1a30` border,
gold gradient when active, white italic uppercase `0.05em` label,
`2px 2px 0 #000`.

**After** — the tab is a paper index tab; the active one is gold:

```sass
.f-tabs__shadow
  background-color: var(--am-frame)

.f-tabs__body
  border-inline: 4px solid var(--am-ink)
  border-top: 4px solid var(--am-ink)
  border-radius: clamp(0.5rem, 2.4vw, 1rem) clamp(0.5rem, 2.4vw, 1rem) 0 0
  background-color: var(--am-paper-sunken)
  color: var(--am-ink-2)

  .f-tabs__tab:hover &
    background-color: var(--am-paper)

  .f-tabs__tab.is-active &
    background-image: linear-gradient(to bottom, var(--am-gold), var(--am-gold-foot))
    color: var(--am-on-accent)
    box-shadow: inset 0 4px 0 rgba(255, 255, 255, 0.4)   // unchanged

.f-tabs__label
  font-weight: 800
  font-style: normal          // was italic
  text-transform: none        // was uppercase
  letter-spacing: 0           // was 0.05em
  text-shadow: none           // was 2px 2px 0 #000
```

Inactive label on `--am-paper-sunken` = **5.22:1** ✓; active on gold = 10.16:1 ✓.

### 3.7 The select (`FSelect`)

The trigger reuses **§3.1** verbatim (gold face, plum label, the same
plate/body/shine). The list becomes paper, not navy:

```sass
// trigger label + external label
.f-select__value, .label-text, .f-select__option
  color: var(--am-ink)
  font-weight: 700
  text-transform: none
  font-style: normal
  letter-spacing: 0
  text-shadow: none

.label-text                                  // the caption ABOVE the control
  color: var(--am-ink-2)                     // sits on --am-paper: 6.57:1

.f-select__caret
  color: var(--am-ink)
  filter: none                               // was drop-shadow(2px 2px 0 #000)

// the dropdown panel (replaces border-[#0f1a30] / bg-[#1a2b4b])
.f-select__menu
  border: 3px solid var(--am-ink)
  border-radius: 1rem
  background-color: var(--am-paper)
  box-shadow: 0 6px 0 rgba(58, 35, 64, 0.26)

.f-select__item
  border-radius: 0.75rem
  color: var(--am-ink)
  &:hover
    background-color: var(--am-paper-sunken)
  &.is-selected
    background-color: var(--am-lilac)        // 7.45:1 with --am-ink

// scrollbar
.custom-scrollbar
  &::-webkit-scrollbar-track
    background: var(--am-paper-sunken)
  &::-webkit-scrollbar-thumb
    background: var(--am-lilac-foot)
    border: 3px solid var(--am-ink)
```

The Tailwind utility classes currently inline in the pug
(`bg-[#1a2b4b]`, `border-[#0f1a30]`, `bg-[#50aaff]`, `hover:bg-[#2266ff]`,
`text-white`, `uppercase`, `tracking-wide`) are **all deleted** and replaced by
the `.f-select__menu` / `.f-select__item` classes above.

### 3.8 The slider (`FSlider`)

```sass
// track — the well cut into the page
.f-slider__track
  border: 3px solid var(--am-ink)
  background: var(--am-paper-sunken)         // was #0a1425
  box-shadow: inset 0 2px 0 rgba(58, 35, 64, 0.14)

// fill — the prop defaults change, no markup change
colorFrom: '#FFD76A'   // was '#ffcd00'
colorTo:   '#F0B846'   // was '#f7a000'
trackColor:'#ECDCB8'   // was '#1a2b4b'

// thumb — lilac, so "the part you drag" is never the same colour as the fill
.thumb-shadow   background: var(--am-lilac-plate)   // was #102e7a
.thumb-body     background: var(--am-lilac); border: 3px solid var(--am-ink)
.thumb-grip     background: rgba(58, 35, 64, 0.45)  // was white/50

.slider-label
  color: var(--am-ink-2)
  font-weight: 700
  font-style: normal      // was italic
  text-transform: none    // was uppercase
  letter-spacing: 0       // was tracking-wider
  text-shadow: none
```

### 3.9 The badge / pill

```sass
.am-badge
  display: inline-flex
  align-items: center
  gap: 0.3em
  min-height: 1.25rem
  padding: 0.12em 0.55em
  border: 2px solid var(--am-ink)
  border-radius: 999px
  background: var(--am-gold)
  color: var(--am-on-accent)
  font-weight: 800
  line-height: 1
  box-shadow: 0 2px 0 rgba(58, 35, 64, 0.3)

.am-badge--count   background: var(--am-coral)    // "3 new"
.am-badge--good    background: var(--am-mint)
.am-badge--quiet   background: var(--am-paper-sunken); color: var(--am-ink-2)
```

`RankBadge` becomes exactly `.am-badge` — and its `MapScene` `:deep()` override
(which already repaints it gold-on-plum for the page) becomes **redundant and
must be deleted**, because the base now *is* that.

### 3.10 The HUD button

The corner chips on map / wipe / unbox / wardrobe / dialogue / intro / versus /
duel. They are `.duel-plate` (§3.3) plus geometry:

```sass
.am-hud-btn
  position: relative
  width: 56px
  height: 56px
  min-width: 44px
  min-height: 44px
  display: flex
  align-items: center
  justify-content: center
  border-radius: 16px
  // material from .duel-plate: --am-paper face, 4px --am-ink border,
  // 0 3px 0 rgba(58,35,64,0.26) lift
  color: var(--am-ink)
  transition: transform 0.08s ease-out

  &:active
    transform: translateY(2px) scale(0.95)

  &:focus-visible
    outline: 3px solid var(--am-ink)
    outline-offset: 3px

  .glyph
    width: 30px
    height: 30px
    filter: none                     // was drop-shadow(2px 2px 0 var(--duel-ink))
```

A HUD chip that is *live* (the spellbook with something new, the live CAST)
swaps face to `--am-gold` and keeps plum ink — 10.16:1.

### 3.11 The close button

**Before** (`FModal.vue`): `#ff3e3e` body, `#6b1212` plate, `2px #0f1a30`
border, white X. A red X is the single most adult-app mark on a children's
screen.

**After** — a soft coral paper chip with a plum X:

```sass
.f-modal__close-shadow
  background-color: var(--am-coral-plate)    // #A8503E
  transform: translateY(3px)                 // unchanged

.f-modal__close-body
  border: 3px solid var(--am-ink)
  border-radius: clamp(0.4rem, 1.8vw, 0.65rem)
  background-image: linear-gradient(to bottom, var(--am-coral), var(--am-coral-foot))
  color: var(--am-on-accent)                 // plum X — 8.18:1

.f-modal__close-icon
  width: 45%                                 // unchanged
  height: 45%
```

Geometry, `translate: 28% -34%`, the `:active` nudge and the clamp metrics are
**unchanged**.

### 3.12 The dialogue bubble

`DialogueBubbles.vue` is already right. Three token swaps, no structural change:

```sass
.leaf
  background: var(--am-paper)                // was #fff8ec  (same family)
  border: 4px solid var(--am-ink)            // was #3A2340  (literal -> token)
  box-shadow: 0 8px 0 rgba(58, 35, 64, 0.32) // was rgba(20,10,30,0.32)
  color: var(--am-ink)

.dim
  background: linear-gradient(to top, var(--am-scrim-soft), transparent 46%)
                                              // was rgba(26,16,44,0.5)
```

The one real fix is `.skip`, which uses `background: var(--duel-plate)` and a
white glyph — it inherits §3.3/§3.10 and its `color: #fff` becomes
`var(--am-ink)`.

The map's `.umbra-say` bubble and `.bloom-toast` use the same recipe and are
already correct; only their literals become tokens.

### 3.13 The HP bar

The one place the night plate stays. Keeps its plate geometry, `--lw`, the ghost
lag, and the direct-DOM width writes from `useDuelHud`.

**Before:** `.hp-bar` `background: #1a1230` under `.duel-plate`'s `#181130`
face and `#0a0713` border; name is `.ink-text` (white + near-black outline).

**After:**

```sass
.hp-bar
  --lw: 4px
  background: var(--am-night-deep)           // #3B2A54 — the unfilled trough
  border-color: var(--am-ink)                // from .duel-plate
  border-radius: 999px                       // unchanged
  box-shadow: none                           // no lift on a gauge

.hp-ghost
  background: var(--am-coral-foot)           // #F08C78, was #ff4d63

// fill colours stay where they are, passed from DuelHud as props:
//   Aurora  #FFD76A  -> 7.62:1 on --am-night-deep
//   Foe     #C9B6FF  -> 5.83:1   (was #c08cff; nudged up for the ratio)

.hp-name
  // stays .ink-text: white fill, --am-ink outline, 14.05:1 at the glyph edge
  font-size: var(--hp-font, 27px)            // unchanged
```

`DuelHud.vue` passes `color="#c08cff"` for the foe bar — change to `#C9B6FF`.

### 3.14 The board row (leaderboard)

```sass
.board-row
  border: 2px solid transparent              // unchanged geometry
  border-radius: clamp(0.35rem, 1.8vw, 0.6rem)
  background-color: var(--am-paper-raised)   // was rgba(0,0,0,0.22)
  &:nth-child(even)
    background-color: var(--am-paper-sunken) // was rgba(0,0,0,0.08)
  &.is-you
    border-color: var(--am-ink)
    background-image: linear-gradient(to bottom, var(--am-gold), var(--am-gold-foot))

.board__col        color: var(--am-ink-2);  text-transform: none; letter-spacing: 0
.board-row__rank   color: var(--am-ink);    text-shadow: none
.board-row__name-text color: var(--am-ink)
.board-row__you    color: var(--am-ink);    text-transform: none   // sits on gold
.board-row__score  color: var(--am-ink);    text-shadow: none
.board-row__flair  color: var(--am-ink-2)
.board__state      color: var(--am-ink-2)
.board__state.is-failed color: var(--am-coral-plate)   // #A8503E on paper = 5.03:1
.board__footer     border: 2px solid var(--am-ink); background-color: var(--am-gold)
.board__footer-rank color: var(--am-on-accent); text-transform: none; text-shadow: none
```

### 3.15 The scrim

One value, everywhere a dim exists (`FModal`, `FReward`, `SpellBook`,
`DuelResult`, `FinaleCard`, `VersusSetup`, `GameScene.versus-turn`,
`DialogueBubbles`):

```sass
background: var(--am-scrim)        // rgba(58, 35, 64, 0.62)
```

Nine current values (`rgba(0,0,0,0.7)`, `rgba(6,4,12,0.77)`,
`rgba(20,12,40,0.62)`, `rgba(26,16,44,0.62)`, `rgba(40,20,60,0.55)`,
`rgba(24,14,40,0.28)`, `rgba(24,14,40,0.6)`, `rgba(24,17,48,0.55)`,
`rgba(26,16,44,0.5)`) collapse to `--am-scrim` or `--am-scrim-soft`.

### 3.16 The surround, the letterbox and the splash

These are, by area, most of what the owner is calling dark. Six places, one
family. **Canvas backdrop constants are in scope** — they are surround colour,
not drawing logic.

| Where | Before | After |
| --- | --- | --- |
| `src/game/map/map.ts` `drawBackdrop` ~L538-547 | `addColorStop(0,'#2b2048')` `addColorStop(1,'#503a74')` | `addColorStop(0,'#7B5EA8')` `addColorStop(1,'#CBA6D6')` |
| `src/game/restore/wipe.ts` `drawBackdrop` ~L1376-1385 | same two stops | same two stops, same values |
| `src/game/story/intro.ts` ~L695-696 | `g.fillStyle = '#2b2048'` | `g.fillStyle = '#7B5EA8'` |
| `src/views/AppScene.vue` ~L429 (fallback fill) | `g.fillStyle = '#2b2048'` | `g.fillStyle = '#9E7CBE'` |
| `src/views/AppScene.vue` ~L705 `.app-scene` | `background: #07060f` | `background: var(--am-surround)` |
| `src/assets/css/index.sass` `html, body` | `background-color: #07060f` | `background-color: #9E7CBE` (literal — this rule can load before `theme.sass`; see §8) |
| `index.html` L~36 `theme-color` | `#07060f` | `#9E7CBE` |
| `index.html` L~50 `body` | `background-color: #07060f` | `#9E7CBE` |
| `index.html` L~61 splash radial | `radial-gradient(circle at 50% 42%, #231a3f 0%, #07060f 70%)` | `radial-gradient(circle at 50% 42%, #A98BCE 0%, #7B5EA8 70%)` |
| `index.html` L~78-79 splash title | `color:#ffd76a; -webkit-text-stroke:0.28em #0a0713` | `color:#FFF6E6; -webkit-text-stroke:0.28em #3A2340` |
| `FLogoProgress.vue` `.splash` | `radial-gradient(… #231a3f 0%, #07060f 70%)` | the same new radial — **must match `index.html` byte for byte**, they hand over |
| `FLogoProgress.vue` `.splash-title` | `color: #ffd76a` | `color: #FFF6E6` (`.ink-text` already supplies the `--am-ink` stroke) |
| `FLogoProgress.vue` `.splash-bar` | `border: 4px solid #0a0713; background:#181130` | `border: 4px solid var(--am-ink); background: var(--am-night-deep)` |
| `FLogoProgress.vue` `.splash-fill` | `linear-gradient(90deg,#ff5a2b,#ffd76a,#8ff0ff,#59b6ff,#c08cff)` | `var(--am-rainbow)` |
| `FLogoProgress.vue` `.splash-hint` | `color: #cfc4ff` | `color: #FFF6E6` (9.8:1 on the splash edge) |

The splash flips from "dark void" to "lamp on the cover", which is the first
0.8 s of the game and the single strongest first impression in the build.

### 3.17 The extension-armour block (`components.sass`)

Load-bearing and currently wrong for a light UI.

```sass
// BEFORE
:root
  color-scheme: dark only
// index.html
<meta name="color-scheme" content="dark only">

// AFTER
:root
  color-scheme: only light
// index.html
<meta name="color-scheme" content="only light">
```

`only light` is what opts a light page out of Chrome-Android's Auto Dark
Theme — leaving `dark only` on a cream UI tells the browser the page is already
dark and lets form controls, scrollbars and the `input[type=range]` render in a
dark scheme against cream. The `forced-color-adjust: none !important` rules and
the `--native-dark-*` neutralisers **stay exactly as they are**; they are the
defence against dark-mode browser extensions and that defence matters *more*
now, not less. Three obsolete blocks go: `.custom-red-bg` (`#ff3e3e`),
`.pulse-yellow-fixed` / `@keyframes yellow-pulse-protected` in `index.sass`
(`#ffcd00`/`#f7a000` — no consumer), and the `border-yellow-500` /
`bg-slate-800/50` re-assertions under `html[native-dark-active] .game-ui-immune`
(no consumer).

---

## §4 Type

### 4.1 The family — no webfont, and that is a decision, not a default

**Keep the system stack.** `fonts.sass` stays empty of `@font-face`. The two
existing stacks in `duel.sass` (`.ink-text`, `.story-text`) are correct and are
promoted to variables so they stop being duplicated:

```sass
--am-font: Arial, 'Helvetica Neue', Helvetica, Roboto, 'PingFang SC',
  'Hiragino Sans', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Apple SD Gothic Neo',
  'Malgun Gothic', 'Noto Sans Thai', 'Leelawadee UI', 'Noto Sans Devanagari',
  'Nirmala UI', 'Segoe UI', 'Geeza Pro', 'Noto Sans Arabic', sans-serif
```

Why no display face, in one line: the game ships 21 locales including Arabic,
CJK, Thai and Devanagari, so a Latin-only face would need a fallback stack per
script *anyway* and would tofu or reflow on the four scripts that can least
afford it — and the one place a Latin-only face would be safe (the brand
wordmark on the pre-JS splash) is on the critical path before any JS runs,
where a font request buys a FOUT on the first frame the player ever sees. **The
storybook feel is carried by the plum outline, the paper, the case and the
ornament instead.** If a display face is ever revisited it must be budgeted as
the brief demands: file, subset, kB, and a fallback per script.

### 4.2 Weights

| Role | Weight | Notes |
| --- | --- | --- |
| Shouted word (`.ink-text`) | 900 | unchanged — it is the jam build's identity and it carries an outline |
| Display / title / ribbon | 800 | was 900; system 900 faux-bolds badly on Android and at 13:1 on paper it is not needed |
| Button + tab label | 800 | |
| Row / list / table | 700 | |
| Body (`.story-text`, Parents tab) | 600 | unchanged |
| Caption / secondary | 600 | |

### 4.3 The outline / shadow treatment

`3px 3px 0 #000, -1px -1px 0 #000, ×4` is deleted from **every** call site.
Replacements, exactly three:

1. **Text on paper** (`--am-ink` at 11–14:1): **no shadow at all.**
   `text-shadow: none`. A shadow there is noise on a page.
2. **Text on a pastel accent face** (button label, tab label, badge): **one soft
   white lift** — `text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45)`. It reads as
   the paper catching light, costs one shadow, and never darkens the glyph.
3. **Text over the arena / a picture** (`.ink-text`): keep
   `-webkit-text-stroke: 0.28em var(--ink, var(--am-ink)); paint-order: stroke fill`
   and change the ink from `#0a0713` to `#3A2340`. This is the only outline that
   survives, it is the one the canvas itself draws, and the art style requires
   it to be plum.

`.text-shadow`, `.text-shadow-light` and `.game-text` in `components.sass` are
redefined in place (so no call site breaks) as:

```sass
.text-shadow, .game-text
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45)
.text-shadow-light
  text-shadow: 0 1px 0 rgba(58, 35, 64, 0.22)
```

### 4.4 Case and tracking — the italic/uppercase habit is dead

**Stated explicitly, as the brief asks: italic, `text-transform: uppercase` and
`letter-spacing` are dropped globally from UI text.** Italic + uppercase +
tracked-out is precisely the esports tell; it is also the thing that forces the
`:lang()` armour in `duel.sass`.

- `font-style: italic` → **removed** from `FSelect` label, `FSlider` label,
  `FTabs` label, `FButton.is-brawl`.
- `text-transform: uppercase` → **removed** from `FButton__text`, `FSelect`
  value/option/label, `FModal` ribbon, `FTabs` label, `LeaderboardModal`
  `.board__col` / `.board-row__you` / `.board__footer-rank`, `RankBadge__of`.
  Labels are **sentence case**: "Save & close", "Sound effects", "For parents",
  "Leaderboard". *No i18n keys change* — the strings are already authored in
  sentence case in the locale files and were being shouted by CSS.
- `letter-spacing` → **0 everywhere**. The three `0.05em`/`tracking-wide`/
  `tracking-wider` uses go.

**Consequence for the locale armour — flag it here so nobody reinstates it.**
`duel.sass` currently has:

```sass
:lang(ar) *, :lang(ja) *, :lang(zh) *, :lang(ko) *, :lang(th) *, :lang(hi) *
  font-style: normal !important
  letter-spacing: 0 !important
```

Once §4.4 lands this rule matches nothing and should be **deleted**, not left as
a dead guard that hides a future regression. The other `:lang()` rules **stay**
and are not touched:

- `:lang(ar) .ink-text { unicode-bidi: plaintext }` — keep.
- `:lang(ar) .story-text { unicode-bidi: plaintext }` — keep.
- `:lang(ar) .ink-text { -webkit-text-stroke-width: 0.18em }` and its
  `.ink-none` counter-rule — keep, and keep them **in that order**; the plum ink
  does not change the cursive-join problem the thinner stroke solves.
- The per-script font stacks — keep, now via `--am-font`.

### 4.5 Per-script exceptions

| Script | Rule |
| --- | --- |
| Arabic (`ar`) | `unicode-bidi: plaintext` on `.ink-text` / `.story-text`; `-webkit-text-stroke-width: 0.18em`; never re-apply a stroke onto `.ink-none`. |
| CJK (`ja` `zh` `ko`) | No tracking, no italic — now global, so no rule needed. Line-height floor 1.4 for `.story-text` (already 1.3 — raise it; Han at 1.3 clips in a two-line bubble). |
| Thai (`th`), Devanagari (`hi`) | `line-height` ≥ 1.35 wherever a box has a `max-height` in `em` (`DuelResult.title`, `.retry-label` already use 1.3 / `2.8em` — keep, they were tuned for exactly this). |
| All | `v-fit` (`src/use/vFit.ts`) is unchanged and remains the overflow answer. Type sizes are `clamp()` and are unchanged. |

---

## §5 Decoration — the unicorn language

Inline SVG and CSS only. Zero network cost, zero new PNGs, themeable by token,
identical in 21 locales. Each ornament has **one** permitted home.

### 5.1 Horn tip (`am-horn`)

A little spiral horn that caps a title ribbon or marks the game's own voice.
24×24 viewBox, `fill: currentColor`, `stroke: var(--am-ink)`, `stroke-width: 1.6`.

```html
<svg class="am-orn am-orn--horn" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 1.6c1.8 3.6 3.3 8 4 12.6-1.1 1.6-2.5 2.4-4 2.4s-2.9-.8-4-2.4c.7-4.6 2.2-9 4-12.6Z"
        fill="var(--am-gold)" stroke="var(--am-ink)" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M9.4 8.4h5.2M10 11.4h4M10.7 14.2h2.6"
        fill="none" stroke="var(--am-ink)" stroke-width="1.4" stroke-linecap="round"/>
</svg>
```

**Allowed:** one, on the left end of the `FModal` title ribbon, rotated −22°.
Nowhere else.

### 5.2 Four-point spark (`am-spark`)

Already exists twice in the codebase as a `clip-path` polygon (`duel.sass`
`.book-new::after`, `SpellBook` `.spark`). Promote to a token and a class:

```sass
--am-spark-clip: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)

.am-spark
  width: 18px
  height: 18px
  background: var(--am-magic-5)
  clip-path: var(--am-spark-clip)
```

**Allowed:** the "new" cue on the spellbook button and on a fresh combo row (both
already exist — this only tokenises them), and the reward reveal. **Never** more
than one visible per plate.

### 5.3 Five-point soft star (`am-star`)

Matches the map's node star, which the canvas already draws.

```html
<svg class="am-orn am-orn--star" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 2.6c.3 0 .5.2.6.4l2.1 5 5.4.5c.6 0 .8.7.4 1.1l-4.1 3.5 1.2 5.3c.1.6-.5 1-1 .7L12 16.3l-4.6 2.8c-.5.3-1.1-.1-1-.7l1.2-5.3-4.1-3.5c-.4-.4-.2-1.1.4-1.1l5.4-.5 2.1-5c.1-.2.3-.4.6-.4Z"
        fill="var(--am-gold)" stroke="var(--am-ink)" stroke-width="1.5" stroke-linejoin="round"/>
</svg>
```

**Allowed:** chapter-progress marks (already), the finale card, the reward
ribbon. Not in a list row.

### 5.4 Heart and hoof bullets

```html
<!-- heart -->
<path d="M12 20.6C5.4 16.1 3 12.7 3 9.5A4.6 4.6 0 0 1 12 7.2 4.6 4.6 0 0 1 21 9.5c0 3.2-2.4 6.6-9 11.1Z"
      fill="var(--am-magic-1)" stroke="var(--am-ink)" stroke-width="1.5" stroke-linejoin="round"/>
<!-- hoof (a ring, so it reads as a print, not a blob) -->
<path d="M12 3.2c4.3 0 7.4 3.3 7.4 7.6 0 4.6-3.2 8.3-7.4 10-4.2-1.7-7.4-5.4-7.4-10 0-4.3 3.1-7.6 7.4-7.6Zm0 3.4c-2.5 0-4.2 1.9-4.2 4.4 0 2.3 1.6 4.4 4.2 5.7 2.6-1.3 4.2-3.4 4.2-5.7 0-2.5-1.7-4.4-4.2-4.4Z"
      fill="var(--am-magic-2)" stroke="var(--am-ink)" stroke-width="1.3" stroke-linejoin="round"/>
```

**Allowed:** the "For parents" paragraph bullets (hoof), and the "this is your
row" marker on the leaderboard (heart). One shape per list, never mixed.

### 5.5 Rainbow rule (`am-rule`)

The cheapest piece of magic in the set, and the one that does the most work.

```sass
.am-rule
  height: 3px
  border-radius: 999px
  background: var(--am-rainbow)
  opacity: 0.9
```

**Allowed:** under the `FModal` tab row / ribbon, under the spellbook's
reference strip, under a section heading in the Parents tab. Replaces every
`hr.border-slate-600` and the leaderboard head's
`border-bottom: 2px solid rgba(255,255,255,0.12)`.

### 5.6 Mane-swirl corner flourish (`am-swirl`)

```html
<svg class="am-orn am-orn--swirl" viewBox="0 0 64 64" aria-hidden="true">
  <path d="M2 30c10-2 18-8 22-18 2 9-1 17-8 22 9 1 17-3 22-11 1 11-5 20-15 24"
        fill="none" stroke="var(--am-ink-soft)" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**Allowed:** exactly one, in the top-left of the `FModal` frame at 12 % opacity,
`pointer-events: none`. It is watermark, not ornament.

### 5.7 Scalloped page edge (`am-scallop`)

For the bottom of the modal frame, so the panel reads as torn paper rather than
a card. `clip-path` only — cheaper than a mask and composited once.

```sass
.am-scallop::after
  content: ''
  position: absolute
  inset-inline: 0
  bottom: -9px
  height: 10px
  background: var(--am-paper)
  clip-path: polygon(0 0, 100% 0, 96% 100%, 88% 0, 80% 100%, 72% 0, 64% 100%, 56% 0, 48% 100%, 40% 0, 32% 100%, 24% 0, 16% 100%, 8% 0, 0 100%)
```

**Allowed:** the `FModal` frame bottom and the reward ribbon. Nowhere a
scrollbar can reach it.

### 5.8 The restraint rule

**Two marks per screen, maximum, and they must be in different regions.** One
ornament may be *structural* (the rainbow rule, the horn on the ribbon) and one
*incidental* (a spark, a star). A list row gets no ornament except the existing
"new" spark; a button gets none at all — its glyph is its ornament. Nothing is
added that carries meaning the copy does not already carry, so no ornament ever
needs an i18n key or an `aria-label`; every one of them is
`aria-hidden="true"`. **If a screen already has a painted illustration on it
(intro, unbox, dialogue portrait), it gets zero ornaments.** The illustration is
the decoration.

---

## §6 Motion

Everything already animated keeps its timing where it was tuned to a game beat
(the 1.11 s CAST glow is a sine the canvas also runs; the 1.3 s popup life is a
stage measurement). What changes is the *vocabulary for new UI motion*.

| Token | Value | Used for |
| --- | --- | --- |
| `--am-dur-press` | `90ms` | button / tab / chip press (already the value) |
| `--am-dur-ui` | `180ms` | hover, colour change, caret rotate |
| `--am-dur-enter` | `380ms` | a panel arriving (already `FModal`'s) |
| `--am-dur-leave` | `180ms` | a panel leaving (already `FModal`'s) |
| `--am-dur-reward` | `600ms` | a gift landing |
| `--am-ease-out` | `cubic-bezier(0.2, 0.8, 0.3, 1)` | anything leaving or settling |
| `--am-ease-pop` | `cubic-bezier(0.2, 1.4, 0.4, 1)` | anything arriving — the game's existing overshoot, used in 6 places |
| `--am-ease-page` | `cubic-bezier(0.18, 0.89, 0.32, 1.28)` | `FModal`'s existing enter curve, kept |

**What animates:**

- **Open** — scale `0.9 → 1`, translateY `24px → 0`, opacity `0 → 1`, over
  `--am-dur-enter` with `--am-ease-page`. Unchanged from `FModal`.
- **Press** — `translateY(3px) scale(0.985)` over `--am-dur-press`, and the depth
  plate slides *up* to meet the body so the button visibly sinks into its own
  shadow. This is the one genuinely new motion and it costs a transform.
- **Reward** — `FReward`'s ray burst, glow breathe and confetti are unchanged;
  only the confetti hues become `--am-magic-*` (they already are these values).
- **Live CAST** — `duel-glow` 1.11 s unchanged, with the ring colour now
  `--am-gold` on a `--am-gold` face: change the ring to `--am-ink` at 4 px so it
  still reads. (A gold ring around a gold button is invisible.)

**Reduced motion.** `src/use/useAccessibility.ts` exposes `reducedMotion`
(a ref, defaulting to `prefers-reduced-motion`) and the CSS media query is used
in 5 components. Both paths must be honoured for anything new:

```sass
@media (prefers-reduced-motion: reduce)
  .am-btn, .am-orn, .am-spark
    animation: none !important
    transition-duration: 1ms !important
```

and, for state driven in Vue, gate on `reducedMotion.value` exactly as
`FReward` does with its `.still` class. **Rule: an ambient loop (breathing,
twinkling, bobbing, drifting) stops; a one-shot arrival (press, open, reward
pop) keeps its transform but may shorten.** That is the existing contract in
`useAccessibility.ts`'s header and this design does not change it.

---

## §7 Per-component mapping table

Ordered by the inventory. **Work split for three parallel implementers** — the
three sets are disjoint by file:

- **A — foundation and shell:** §8 token file, `index.sass`, `components.sass`,
  `duel.sass`, `fonts.sass`, `index.html`, `FLogoProgress`, `AppScene`,
  and the three canvas surround constants (`map.ts`, `wipe.ts`, `intro.ts`).
- **B — atoms and modals:** `FButton`, `FTabs`, `FSelect`, `FSlider`, `FReward`,
  `RankBadge`, `SaveStatusBanner`, `AdsBlockedModal`, `VConsoleHideButton`,
  `FModal`, `OptionsModal`, `LeaderboardModal`.
- **C — game surfaces:** everything in `components/duel/`, `components/story/`,
  `components/icons/`, and `views/` except `AppScene`.

A must land first (or in the same commit) because B and C reference its tokens.

| File | What is wrong now | What it becomes | §3 material(s) | Risk / gotcha |
| --- | --- | --- | --- | --- |
| `src/assets/css/theme.sass` | *does not exist* | The whole token set, §8 verbatim | — | Must be the **first** `@use` in `index.sass`, and `:root` only — no element selectors. |
| `src/assets/css/index.sass` | `html, body { background-color: #07060f }`; dead `.pulse-yellow-fixed` + `@keyframes yellow-pulse-protected` (`#ffcd00`/`#f7a000`) | `background-color: #9E7CBE` (literal, not a var — this rule can paint before custom properties resolve on a cold cache); delete both pulse blocks | §3.16 | `@use './theme'` goes **above** `./fonts`. Sass `@use` order does not affect specificity but it does affect variable availability if anyone later adds Sass vars. |
| `src/assets/css/components.sass` | `color-scheme: dark only`; `.text-shadow` / `.game-text` / `.text-shadow-light` are the black 5-way ring; `.custom-red-bg` `#ff3e3e`; `border-yellow-500` / `bg-slate-800/50` re-assertions | `color-scheme: only light`; the three shadow classes redefined per §4.3; `.custom-red-bg` deleted; the dead re-assertions deleted | §3.17, §4.3 | **Do not touch** `forced-color-adjust: none !important` or the `--native-dark-*` neutralisers — they are the dark-extension armour and matter more on a light UI. Test with a dark-mode extension before merging. |
| `src/assets/css/duel.sass` | `--duel-ink #0a0713`, `--duel-plate #181130`, `--duel-plate-live #3b2a63`, `--duel-disabled #7a6f95`; `.duel-plate` has no `color`; the `:lang(ar,ja,zh,ko,th,hi) *` italic/tracking killer | All `--duel-*` become aliases onto `--am-*` (§3.3); `.duel-plate` gains `color: var(--am-ink)` and a plum lift; the italic/tracking `:lang()` block **deleted** (§4.4); font stacks pull `--am-font` | §3.3, §4.4 | The `:lang(ar)` stroke-width pair must keep its **order** (`.ink-text` rule then the `.ink-none` counter-rule) or the Arabic spellbook title blots again — that bug is recorded in the file's own comment. |
| `src/assets/css/fonts.sass` | Nothing wrong; comment says a display face "may" come later | Add `--am-font` stack here (or in `theme.sass`) and amend the comment to record the §4.1 decision: **no webfont, decided** | §4.1 | None. Do not add an `@font-face`. |
| `index.html` | `theme-color #07060f`; `color-scheme dark only`; body `#07060f`; splash radial `#231a3f → #07060f`; title `#ffd76a` on a `0.28em #0a0713` stroke | Per §3.16 + §3.17 | §3.16, §3.17 | The splash block is **inlined and pre-JS** — it cannot use custom properties. Hardcode the hexes and keep `FLogoProgress` byte-identical, or the handover flickers. |
| `atoms/FButton.vue` | `#0f1a30` border, `#ffcd00→#f7a000` face, `#1a2b4b` plate, white 900 uppercase label on the 5-way black shadow, glyph `drop-shadow(2px 2px 0 rgba(0,0,0,.85))`, `is-brawl` skew+italic, disabled `opacity .5 + grayscale(1)` | §3.1 exactly. `theme` map re-pointed at `--am-*` triples. `is-brawl` neutered. | §3.1 | **Change materials only.** Every `clamp()` in `sizeVars`, the `--fbtn-*` names, `emphasis` multiplying inside the clamp, the 44/36 px floors, `v-fit` and the `padding: 3px` overflow room stay untouched. Only 3 live call sites (all `OptionsModal`), so the blast radius is small. |
| `atoms/FHudButton.vue` | Full navy/gold template chip | **Dead code — no importer.** Do not restyle. | — | Deletion candidate, §9. |
| `atoms/FHudBadge.vue` | `#ef4444` / `#102e7a` / `#f7a000` tones | **Dead code — no importer.** Do not restyle. | — | Deletion candidate, §9. |
| `atoms/FTabs.vue` | `#2a4372` body, `#8fa7d1` label, `#0f1a30` borders, gold-gradient active, italic uppercase tracked `2px 2px 0 #000` | §3.6 | §3.6 | Only consumer is `FModal`. Keep the horizontal-scroll row and the `min-width: 3.25rem` / `min-height: 2.1rem` floors — they exist for a 4-tab 320 px phone. |
| `atoms/FSelect.vue` | Navy dropdown, gold trigger, white uppercase tracked text with the black ring, `#50aaff`/`#2266ff` items, `#0a1425` scrollbar track, caret `drop-shadow(2px 2px 0 #000)` | §3.7 | §3.1, §3.7 | The inline Tailwind arbitrary-value classes in the pug carry the colours — they must be **removed**, not overridden, or the scoped Sass loses on specificity order. Keep `min-height: 2.75rem` and the click-outside handler. |
| `atoms/FSlider.vue` | `#0a1425` track, `#0f1a30` borders, `#ffcd00→#f7a000` fill, `#50aaff` thumb on `#102e7a`, italic uppercase tracked label | §3.8 | §3.8 | The `--fsl-thumb` clamp drives row height, track height **and** the thumb's left offset. Do not touch it. Colour props have defaults — change the defaults, not the call sites. |
| `atoms/FReward.vue` | Almost right already: cream ribbon, plum ink, pastel confetti. Wrong: `background: rgba(26,16,44,0.62)` scrim, `#fff4e6` ribbon literal, `box-shadow: 0 6px 0 rgba(20,10,30,0.35)` | `--am-scrim`, `--am-paper`, `0 6px 0 rgba(58,35,64,0.35)`; confetti hues become `--am-magic-*` (same values) | §3.15, §3.9 | It already honours `reducedMotion` via `.still` — keep that. Its `backdrop-filter: blur(6px)` is one of the two existing blurs and stays; **do not add a third**. |
| `atoms/RankBadge.vue` | Built for a dark HUD: `rgba(255,217,60,.1)` fill, `rgba(255,217,60,.45)` border, white numeral on `2px 2px 0 #000`, `--am-ink-2`-less `#b9cbe8` tail | Becomes `.am-badge` (§3.9): gold face, plum ink, plum border, no shadow | §3.9 | **`MapScene`'s `:deep(.rank-badge)` override must be deleted in the same PR** — it exists only because the base was dark, and leaving it in gives a double-gold plate with a stale `rgba(20,10,30,.3)` shadow. |
| `atoms/SaveStatusBanner.vue` | Tailwind `bg-emerald-700/95` and `bg-amber-700/95` cards with white text — a different app's toast | Paper toast: `--am-paper` face, `3px --am-ink` border, `0 4px 0 rgba(58,35,64,.28)`, `--am-ink` text; the state colour moves to a 6 px left bar (`--am-mint-foot` / `--am-gold-foot`) | §3.2, §3.9 | Strings are already i18n'd; **do not add copy**. The two emoji (🎉 / ☁️) render differently per-OS — replace with §5.3 star and the `cloud` glyph from the set if one exists, otherwise leave them. |
| `atoms/AdsBlockedModal.vue` | `bg-black/70` backdrop, `from-slate-700 to-slate-900` card, `border-slate-500`, `bg-amber-500` button, `text-amber-300` host | `--am-scrim` backdrop; `--am-paper` card with `4px --am-ink` and `0 6px 0 rgba(58,35,64,.28)`; `--am-ink` body, `--am-ink-2` fine print, host in `--am-ink` bold; the button is §3.1 gold | §3.1, §3.2, §3.15 | Keeps `z-[150]` — it must stay above `FReward` (z-100) and `FModal` (z-110) and below the splash. Do not reorder z. |
| `atoms/FLogoProgress.vue` | Dark radial splash, `#0a0713` bar border on `#181130`, `#cfc4ff` hint | §3.16 | §3.16 | **Must match `index.html`'s inline splash exactly** — same radial, same title size/colour/stroke — or the handover at `staticSplash.classList.add('hidden')` visibly jumps. Portal "loading finished" signals are untouched. |
| `atoms/VConsoleHideButton.vue` | `bg-rose-600` pill | Dev-only, ships behind the 50-tap chord. **Leave it.** Deliberately ugly so it is never mistaken for game UI. | — | Out of scope by intent, not oversight. |
| `atoms/FPerfMeter.vue` | Dev overlay | **Leave it.** | — | Dev-only. |
| `molecules/FModal.vue` | `rgba(0,0,0,.7)` backdrop, `#0c1626` frame shadow, `5px #0f1a30` frame on `#1a2b4b`, `#1a2b4b` ribbon shadow, gold ribbon with white uppercase tracked text on the black ring, `#ff3e3e` close on `#6b1212` | §3.4 frame, §3.5 ribbon, §3.11 close; `am-rule` (§5.5) under the header; one `am-swirl` watermark (§5.6); `am-scallop` on the frame bottom (§5.7) | §3.4, §3.5, §3.11, §5.5–5.7 | **The measured header-overlap system is untouchable.** `HEADER_DIP_RATIO`, the `ResizeObserver`, `--fmodal-header-overlap` and the `@media (max-height: 520px)` block all stay. The scallop is on `::after` of the frame — check it does not intercept the content scroll (`pointer-events: none`). |
| `organisms/OptionsModal.vue` | `span { text-shadow: 2px 2px 0 #000 }` on every label; `.parents` white on nothing; `a { color: #ffd76a }`; `.leave-confirm` on `rgba(24,17,48,.6)` with `#ffd76a` title; `hr.border-slate-600` | Labels lose the shadow; `.parents` text `--am-ink` with `--am-ink-2` fine print; link `--am-lilac-plate` underlined (5.1:1 on paper); `.leave-confirm` becomes a `--am-paper-sunken` plate with `--am-ink` title; `hr` becomes `.am-rule` | §3.2, §3.7, §3.8, §5.5 | The `twoColumns` computed and the per-dropdown `z-[20]/[12]/[8]/[1]` stack exist because an open list must cover the rows below it — **do not restructure the layout**. This is the screen the owner called the worst offender; it should be the acceptance demo. |
| `organisms/LeaderboardModal.vue` | `rgba(0,0,0,.22)` rows, `#9fb2d0` head, `#ffd93c` rank, `#8fd6ff` score, `#b9cbe8` flair, `#ffcd00` "you" on a `#3a4a24→#2a3a18` olive gradient, `1px 1px 0 #000` | §3.14 | §3.14, §3.9, §5.4 | The `$cols` grid template, `v-fit` on the head row and the **single un-split footer sentence** are all load-bearing (word order in ja/ko/tr/kk). Change colours only. The heart bullet (§5.4) may mark the "you" row — one per board. |
| `duel/DuelHud.vue` | `.cast-btn`/`.icon-btn` on `var(--duel-plate)` = near-black; label `#fff` live / `#7a6f95` idle; `.gear` `drop-shadow(0 0 0 …) drop-shadow(2px 2px 0 var(--duel-ink))`; foe bar `color="#c08cff"`; hint `#cfc4ff` | Buttons inherit §3.3 paper automatically. Label: live `--am-ink` on the gold `--duel-plate-live`, idle `--am-ink-3` on paper. `.gear` filter removed, `color: var(--am-ink)`. Foe bar `#C9B6FF`. The over-arena hints (`drawARune`, intro beats, the ×N weakness) **stay `.ink-text` white-on-plum** — they sit on the scene, not on a plate | §3.3, §3.10, §3.13 | **The biggest single-file risk.** The inline `:style="{ color: … }"` bindings are the labels; they must flip together with the plate or the CAST button reads as white-on-cream. The stage-coordinate `box()` geometry, the portrait `--pu` scale and every number in the template are **unchanged**. The `.cast-glow` ring must become `--am-ink` 4 px (gold on gold is invisible). |
| `duel/DuelResult.vue` | `.dim rgba(20,12,40,.62)`; `.panel #221a3e`; `.retry` on `--duel-plate-live`; `.map` on `--duel-plate`; title `#c9b6ff` | `.dim` → `--am-scrim`. The card **stays night** (`--am-night`) — it is the sleepy beat and cream would fight the "Zzz" — with `--am-gold` title (7.62:1) and `--am-on-night` body. Retry becomes a §3.1 gold button, Map a §3.10 paper chip | §3.1, §3.10, §3.15 | The `max-height: 2.8em` / `line-height: 1.3` boxes and `v-fit` exist because "Zzz… ¿lo intentamos otra vez?" is twice the English. Do not touch the boxes. Dream-Dust motes keep their lavender. |
| `duel/HpBar.vue` | `background: #1a1230` inside a `#181130`/`#0a0713` plate; ghost `#ff4d63` | §3.13 | §3.13 | `useDuelHud.syncHud` writes `.hp-fill` / `.hp-ghost` widths **directly to the DOM every frame**. Do not add transitions to those two elements and do not rename the classes. |
| `duel/RuneSlot.vue` | Empty slot `rgba(24,17,48,0.8)`; filled slot is the rune colour at `2e` alpha over the near-black plate | Empty slot `--am-night` at 0.85; filled stays `<rune>2e` but now composites over `--am-night` — verify each of the 12 reads. Border from §3.3 (plum). | §3.3 | The slot plate also carries `--lw: 4px` and `border-radius: 25%`; the forming ring is written per-frame by `useDuelHud` (`registerHot('formRing')`). Do not restructure. The 12 rune tints were chosen against a dark plate — a **visual check of all 12** is required, this is the one place a token swap can quietly lose a colour. |
| `duel/RuneGlyph.vue` | `GLYPH_INK = '#0a0713'` from `game/duel/glyph.ts` — a black outline, against the art style | Leave the component; see §9 for the one-constant change | — | The constant is shared with the canvas stroke renderer, so it is a §9 follow-up, not a UI edit. |
| `duel/RuneTrace.vue` | Locked ghost stroke `#6f5f86`; lock chip `#a99dc0` / `#3A2340` | `#6f5f86` → `--am-ink-soft` over the parchment; the lock chip is already plum-inked and stays | §3.2 | It renders on the spellbook's parchment, so the ghost must be *darker* than the page, not lighter. Check at 44 px. |
| `duel/SpellBook.vue` | Already the good language. Wrong only: `.dim rgba(6,4,12,.77)`; cover `#4b2f1c`; page `#f2e3c0`; borders `var(--duel-ink)`; close button on `.duel-plate` with `color:#fff` | `--am-scrim`; `--am-frame`; `--am-parchment`; `--am-ink`; close becomes a §3.11 coral chip with a plum X. Add `.am-rule` under the reference strip | §3.4, §3.11, §5.5 | This file is the **reference implementation** — the other two implementers should look at it before starting. Its `.rune.next` gold ring and `@media (prefers-reduced-motion)` guard stay. |
| `duel/DuelPopups.vue` | Nothing structural; the popup colours come from `useDuelHud` | Leave unless a popup colour is a forbidden hex; audit `useDuelHud`'s pop palette | — | Popups are per-frame; adding a filter or shadow here costs frame time. Leave the CSS alone. |
| `story/DialogueBubbles.vue` | Right, except `.dim rgba(26,16,44,.5)` and `.skip` on `var(--duel-plate)` with `color:#fff` | §3.12 | §3.12, §3.10 | `.story-text` wrapping and `overflow-wrap: anywhere` are locale armour. Raise `.story-text` `line-height` to 1.4 for CJK (§4.5). |
| `story/FinaleCard.vue` | Already pastel: `#ffe0ea→#fff4c8→#d8f6e8` card, `#3A2340` ink. Wrong: `.finale rgba(40,20,60,.55)` | `--am-scrim`; the card gradient becomes `--am-magic-1 → --am-magic-5 → --am-magic-4` at 18 % over `--am-paper` so it stays ≥ 11:1 under the plum title | §3.15, §5.3 | Confetti already `#3A2340`-outlined. Keep the `prefers-reduced-motion` block. |
| `story/RuneGift.vue` | Already right: `#fff8ec` plate, `5px #3A2340`, cream ribbon text | Literals → tokens only | §3.2 | It is inside `FReward`; check the plate still reads against the new ray burst. |
| `story/SceneCorner.vue` | `.icon` is `.duel-plate` with `color: #fff` and `drop-shadow(2px 2px 0 var(--duel-ink))` | §3.10 — `color: var(--am-ink)`, filter removed | §3.10 | Two-line change. This is the button stuck on the wardrobe and unbox screens in the screenshots. |
| `story/TurnSideways.vue` | Already right: `#fffaf0` on `0 0 0 4px #3A2340` | Literals → tokens | §3.2 | None. |
| `story/Picto.vue` | Nothing | Leave | — | — |
| `icons/GameIcon.vue` | Nothing — **paths are approved and frozen** | Leave the component entirely. Only its *container* and `currentColor` change, at the call sites | — | **Do not edit `iconPaths.ts`.** The `nonzero` winding and the single concatenated `d` are load-bearing. |
| `icons/ArtIcon.vue` | Nothing | Leave | — | Painted overrides are off by default in builds; the fallback glyph is what ships. |
| `views/AppScene.vue` | `.app-scene background: #07060f`; canvas fallback `g.fillStyle = '#2b2048'` (~L429) | `var(--am-surround)` and `'#9E7CBE'` | §3.16 | The `.turning` opacity gate on `> *:not(canvas)` and `touch-action: none` on `.world` must not move. |
| `views/GameScene.vue` | `.versus-turn rgba(24,14,40,.6)`; `.versus-end p` already cream/plum | `--am-scrim-soft`; literals → tokens | §3.15, §3.12 | The `max-width: min(86vw, 660px)` on the banner is locale armour (kk is twice the English). |
| `views/MapScene.vue` | `.tab` locked `rgba(24,17,48,.55)` with `#7a6f95` text; `.icon` is `.duel-plate` near-black; `RankBadge` `:deep()` override; `.bloom-toast` / `.umbra-say` already right | Locked tab `#CFC3DE` face with `--am-ink-3` numeral and a `3px --am-ink` ring (4.89:1); `.tab.open` keeps `#6F55C9` + `--am-on-night` (5.13:1); `.tab.here` keeps `--am-gold` + `--am-ink` (10.16:1). `.icon` → §3.10. **Delete the `RankBadge` override.** | §3.10, §3.9 | The chapter rail is its own `nav.tabs .tab` — **not** `FTabs`, so implementer C owns it and B must not touch it. The rail's 44 px floor and the scroll behaviour stay. |
| `views/WipeScene.vue` | `.back-btn` on `.duel-plate` with `color:#fff`; `.continue-btn` on `--duel-plate-live` with a `0 0 0 4px --duel-gold` ring | §3.10 for back; continue becomes a §3.1 gold circle with a `4px --am-ink` ring (gold-on-gold would vanish) | §3.1, §3.10 | `.tool-chip`'s `stroke-dasharray` transition is a gauge — leave it. |
| `views/IntroScene.vue` | `.skip` on `.duel-plate` with `color:#fff`; `.play` on `--duel-plate-live` with a `0 0 0 5px --duel-gold` ring; title `#fff6d8` with `--ink: #3A2340` (already correct) | §3.10 skip; play becomes gold with a `5px --am-ink` ring; title unchanged | §3.1, §3.10 | Already has the `prefers-reduced-motion` guard for the bob and the pulse — keep it. |
| `views/UnboxScene.vue` | `.pot` `rgba(255,244,230,.92)` on `0 4px 0 #3A2340, 0 0 0 3px #3A2340` — already right | Literals → tokens | §3.2 | The pot's two stacked animations and the `:active`-beats-breathing rule are gameplay feel. Leave them. |
| `views/WardrobeScene.vue` | `.back-btn` on `.duel-plate` with `color:#fff`; shelf/items/swatches already right | §3.10 for the button; literals → tokens elsewhere | §3.10 | The `--tile` / `--gap` clamps and the three orientation breakpoints are the §3.13 layout spec. Do not touch. |
| `views/VersusSetup.vue` | `rgba(24,14,40,.28)` scrim; `.back-btn` on `.duel-plate`; `.ready` has **no rest background at all** (only `.on` is `#5ec26a`) | `--am-scrim-soft`; §3.10 back; `.ready` gets a real rest state — §3.1 lilac — and `.on` becomes `--am-mint-foot` with the existing `0 0 0 4px --am-ink` ring | §3.1, §3.10, §3.15 | A button with no rest background is currently invisible against a pale sector. Fixing it is a **legibility** fix, not a restyle. `.name` keeps `--am-gold` / `--am-lilac` for P1/P2 identity. |
| `views/DialogueScene.vue` | `.back-btn` on `.duel-plate` with `color:#fff` and the glyph drop-shadow | §3.10 | §3.10 | Three-line change. |
| `src/game/map/map.ts` ~538-547 | `#2b2048 → #503a74` surround gradient | `#7B5EA8 → #CBA6D6` | §3.16 | **Two literals only.** Do not touch `drawMarker` or anything else in the file. The gradient is cached on `bgKey` — changing the stops does not invalidate it, but the key is viewport-based so a resize re-creates it; safe. |
| `src/game/restore/wipe.ts` ~1376-1385 | same two stops | same two values | §3.16 | The twinkle band below it (`#fff4d6` at 0.18–0.40 α) will read weaker on a lighter surround — **drop its alpha to 0.10–0.22** or it disappears. |
| `src/game/story/intro.ts` ~695-696 | `g.fillStyle = '#2b2048'` | `'#7B5EA8'` | §3.16 | Same twinkle-alpha note as `wipe.ts`. |

---

## §8 The token file

### 8.1 `src/assets/css/theme.sass` — complete, ready to paste

> **CORRECTION, found at implementation time (2026-09-21).** The block below
> writes its per-token notes as trailing `// …` comments. **That does not work.**
> A CSS custom property's value is an arbitrary token stream, so Sass passes
> everything after the colon through verbatim — `//` does not start a comment
> there. Each commented token emitted an invalid value, became invalid at
> computed-value time and silently resolved to `initial`: transparent
> backgrounds and black text, **with no build error**. It only surfaced because
> an apostrophe in one comment ("the book's board") opened an unterminated
> string and failed the compile; the rest were failing quietly.
>
> **The shipped `src/assets/css/theme.sass` puts every comment on its own line**
> and is verified to emit 72 clean token values. Read the file, not this block,
> for the current formatting. The token names and values below are correct; only
> the comment placement is not. The same rule applies to any custom property
> written anywhere in the codebase.

```sass
// ─── theme.sass — the ONE place a colour is decided ─────────────────────────
//
// Auroras Magic's UI is made of three materials: cream paper, warm plum ink
// (#3A2340 — never black; `src/game/artStyle.ts` lead rule 2), and painted
// pastel colour. Everything below is one of those three or a shade of them.
//
// Rules for anyone editing this file:
//   1. A component NEVER writes a hex. It reads a token from here.
//   2. A token has ONE job. If you need a second job, add a second token.
//   3. Nothing here is black, near-black, navy, or #ff3e3e. Those are the
//      portal-template look this game is deliberately not.
//   4. Every text-on-surface pair in the shipped UI is measured in
//      ui-design-system.md §2.6. If you add a pair, measure it (AA 4.5:1;
//      3:1 for text ≥ 24px or ≥ 18.66px bold) and record it there.
//
// `:root` only. No element selectors, no classes — this file is data.

:root
  // ── Surfaces ────────────────────────────────────────────────────────────
  --am-surround:          #9E7CBE   // the cloth the book lies on (letterbox)
  --am-surround-top:      #7B5EA8   // canvas surround gradient, top
  --am-surround-bottom:   #CBA6D6   // canvas surround gradient, bottom
  --am-splash-in:         #A98BCE   // boot splash radial, centre
  --am-splash-out:        #7B5EA8   // boot splash radial, edge

  --am-paper:             #FDF6E7   // the default plate
  --am-parchment:         #F5E7C0   // the book page
  --am-paper-raised:      #FFFDF6   // a tile ON paper
  --am-paper-sunken:      #ECDCB8   // a well cut INTO paper
  --am-paper-edge:        #D8C49A   // hairline rule inside paper
  --am-frame:             #5A3A22   // the book's board / leather

  --am-night:             #4A3566   // the one dark plate: gauges, the loss card
  --am-night-deep:        #3B2A54   // a well inside --am-night

  --am-scrim:             rgba(58, 35, 64, 0.62)
  --am-scrim-soft:        rgba(58, 35, 64, 0.38)

  // ── Ink ─────────────────────────────────────────────────────────────────
  --am-ink:               #3A2340   // THE line colour. Borders + text on paper
  --am-ink-2:             #6B4F6E   // secondary text on paper
  --am-ink-3:             #5F4667   // text on a tinted light surface
  --am-ink-soft:          rgba(58, 35, 64, 0.22)
  --am-on-accent:         #3A2340   // text on gold/lilac/coral/mint — NOT white
  --am-on-night:          #FFF6E6   // text on --am-night / --am-ink
  --am-shout:             #FFFFFF   // .ink-text fill (carries its own outline)

  // ── Accents: face / foot / plate ────────────────────────────────────────
  --am-gold:              #FFD76A   // primary action; the map's "done" node
  --am-gold-foot:         #F0B846
  --am-gold-plate:        #B9812C

  --am-lilac:             #C9B0FF   // secondary action; "happening now"
  --am-lilac-foot:        #A98CF0
  --am-lilac-plate:       #6F55C9   // = MapScene's open-chapter colour

  --am-coral:             #FFB3A3   // close / leave / dismiss
  --am-coral-foot:        #F08C78
  --am-coral-plate:       #A8503E

  --am-mint:              #9BE8C4   // ready / confirm / restored
  --am-mint-foot:         #6FCFA4
  --am-mint-plate:        #2F8A63

  --am-reward:            #FFC93F   // the rewarded-video button. Reserved:
  --am-reward-foot:       #EF9A1F   // no call site today. Kept so the one
  --am-reward-plate:      #A9660F   // button that earns money never drifts.

  --am-disabled:          #E4DACB   // flat, plateless. Label: --am-ink-3

  // ── Magic / decoration ramp (= FReward's confetti) ──────────────────────
  --am-magic-1:           #FF9ECF   // blossom
  --am-magic-2:           #C7A6FF   // lilac
  --am-magic-3:           #9FD8FF   // sky
  --am-magic-4:           #9FF0D0   // mint
  --am-magic-5:           #FFD36B   // butter
  --am-magic-6:           #FFB36B   // peach
  --am-rainbow:           linear-gradient(90deg, #FF9ECF, #FFD36B, #9FF0D0, #9FD8FF, #C7A6FF)
  --am-spark-clip:        polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)

  // ── Type ────────────────────────────────────────────────────────────────
  // One stack for 21 locales. Named CJK / Thai / Devanagari / Arabic system
  // faces ahead of the generic, or a Latin-first stack tofus them.
  // No webfont, deliberately — ui-design-system.md §4.1.
  --am-font: Arial, 'Helvetica Neue', Helvetica, Roboto, 'PingFang SC', 'Hiragino Sans', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans Thai', 'Leelawadee UI', 'Noto Sans Devanagari', 'Nirmala UI', 'Segoe UI', 'Geeza Pro', 'Noto Sans Arabic', sans-serif

  --am-w-shout:           900
  --am-w-display:         800
  --am-w-label:           800
  --am-w-row:             700
  --am-w-body:            600

  // The three replacements for the old 3px 3px 0 #000 ring (§4.3)
  --am-lift-on-accent:    0 1px 0 rgba(255, 255, 255, 0.45)
  --am-lift-on-paper:     none
  --am-shadow-plate:      0 4px 0 rgba(58, 35, 64, 0.28)
  --am-shadow-chip:       0 3px 0 rgba(58, 35, 64, 0.26)

  // ── Motion ──────────────────────────────────────────────────────────────
  --am-dur-press:         90ms
  --am-dur-ui:            180ms
  --am-dur-enter:         380ms
  --am-dur-leave:         180ms
  --am-dur-reward:        600ms
  --am-ease-out:          cubic-bezier(0.2, 0.8, 0.3, 1)
  --am-ease-pop:          cubic-bezier(0.2, 1.4, 0.4, 1)
  --am-ease-page:         cubic-bezier(0.18, 0.89, 0.32, 1.28)

// A device that asks for less motion gets it from the tokens too, so a
// component that only reads --am-dur-* is compliant without a second rule.
@media (prefers-reduced-motion: reduce)
  :root
    --am-dur-press:       1ms
    --am-dur-ui:          1ms
    --am-dur-enter:       1ms
    --am-dur-leave:       1ms
    --am-dur-reward:      1ms
```

### 8.2 How it gets imported

`src/main.ts` currently does:

```ts
import '@/assets/css/tailwind.css'
import '@/assets/css/index.sass'
```

and `src/assets/css/index.sass` starts:

```sass
@use './fonts'
@use './components'
@use './duel'
```

**Change exactly one line** — add `theme` as the first `@use`:

```sass
@use './theme'      // <- NEW, must be first: fonts/components/duel read its vars
@use './fonts'
@use './components'
@use './duel'
```

`main.ts` is **not** changed. Tailwind's own layer loads before `index.sass`, so
`theme.sass`'s `:root` block wins over any Tailwind preflight default without
`!important`.

**The one thing custom properties cannot reach**, and therefore the two places
that must repeat the literals:

1. `index.html`'s inlined pre-JS splash (it paints before the stylesheet exists)
   — `#9E7CBE`, `#A98BCE`, `#7B5EA8`, `#FFF6E6`, `#3A2340` hardcoded.
2. `html, body { background-color: … }` in `index.sass` — keep the literal
   `#9E7CBE` so a cold cache never flashes the UA default white before the
   custom properties resolve.

Both are commented in place as "duplicated on purpose — keep in sync with
`theme.sass`".

---

## §9 Follow-ups I am NOT doing

1. **`GLYPH_INK = '#0a0713'`** — `src/game/duel/glyph.ts:70`, used at
   `glyph.ts:143` (canvas stroke) and by `RuneGlyph.vue` / `RuneTrace.vue`. It
   is a black rune outline, which `artStyle.ts` lead rule 2 forbids outright.
   One-constant change to `#3A2340`; out of scope because the same constant
   drives the per-frame canvas stroke and wants a visual A/B on all 12 runes.
   **Highest-value follow-up on this list.**
2. **`map.ts` node badges** — `drawMarker`, `src/game/map/map.ts:~857-864`:
   `fillStyle = st === 'done' ? '#ffd76a' : st === 'current' ? '#8f6cff' : '#a99dc0'`,
   `strokeStyle = '#3A2340'`. These are already on-palette and are what §2.3's
   accents were tokenised from — **no change needed**, recorded so nobody
   "fixes" them. The one nudge worth queueing: `'#a99dc0'` (locked) reads a
   little cold against the warmer page; `#BFAFD4` would match the new locked
   chapter tab.
3. **`wipe.ts` / `intro.ts` twinkle alpha** — `#fff4d6` at `0.18 + 0.22·sin`.
   On the lighter surround these fade out. Dropping to `0.10 + 0.12` restores
   them; it is a drawing-loop constant, so it needs an eyes-on check.
4. **`fx.ts`, `arena.ts`, `restore/*` mask compositing, sector kits** — the
   drained-world look, the duel VFX and every character/prop painter. Untouched
   by design; the memory note "never paint the duel VFX" stands.
5. **`FHudButton.vue` and `FHudBadge.vue` — delete.** No importer anywhere in
   `src/` (`artFolders.ts` only mentions the *name* in a comment). They are a
   second, competing button system in the exact template idiom this pass is
   removing. Deleting them is a ~330-line reduction and removes the risk that a
   future screen reaches for the wrong atom.
6. **`i18n` copy** — this design adds **no user-facing string**. Every label it
   touches already exists; the only change is that CSS stops shouting them. If
   an implementer finds they need a new label, stop and raise it: it needs
   English first and then all 21 locales.
7. **Painted-art slots worth queueing later** (`ArtIcon kind="ui"`,
   `FButton`'s `art` prop, `src/game/artSheet.ts`; overrides stay
   `VITE_ENABLE_ART_OVERRIDES=false` in builds). Only three are worth a
   painting, and each is a *single large surface*, never a small repeated one:

   | Slot | Why it earns a raster |
   | --- | --- |
   | `ui/modal-ribbon` | A painted cloth banner with a real horn finial would carry the whole modal. It appears on every modal, once, at a big size — the best ratio of area to file count in the game. |
   | `ui/splash-cover` | The boot splash is the first 0.8 s and currently a gradient. One painted book cover with the wordmark space left empty (no text in a picture) would be the strongest first impression available. Must be ≤ 40 kB and preloaded, or it defeats its own purpose. |
   | `ui/spellbook-cover` | The tome's leather board is a flat `#5A3A22` rectangle; a painted cover with corner bosses would sell "this is a real book". |

   **Not worth painting:** HUD button chips, close buttons, tabs, sliders,
   badges, the select. They are small, repeated, must recolour by state, and
   each one is a 404 risk in portal QA for a gain nobody would notice at 56 px.
   CSS and SVG are strictly better there.
8. **`VConsoleHideButton` and `FPerfMeter`** — dev-only, deliberately not
   themed.
9. **A design-token lint** (a CI grep for the forbidden hex list in §2.6)
   — worth adding, out of scope here.

---

## §10 Risks

1. **`color-scheme: dark only` → `only light` is the riskiest single line.**
   It changes how the UA paints native `input[type=range]`, scrollbars, the
   focus ring and form controls. `FSlider`'s native range is `opacity: 0` so it
   is safe, but `FSelect`'s custom scrollbar has a `-webkit-` track rule that
   only applies on WebKit/Blink — Firefox will use `scrollbar-color`, which is
   not set. **Add `scrollbar-color: var(--am-lilac-foot) var(--am-paper-sunken)`
   to the scroll containers.** Verify on Android Chrome with Auto Dark Theme
   forced on: that is the exact failure this line exists to prevent, and it is
   invisible on desktop.
2. **The dark-mode-extension armour in `components.sass` is now more load-bearing,
   not less.** A light cream UI is exactly what those extensions invert. The
   `forced-color-adjust: none !important` block and the `--native-dark-*`
   neutralisers must survive the edit untouched, and the build must be checked
   with one such extension active before it ships. The `.game-ui-immune` class
   currently re-asserts a `rgba(30,41,59,0.5)` slate — that value is now wrong
   and has no consumer; delete the block rather than retheme it.
3. **Drained-duel readability is the design's central bet.** Cream chrome over a
   desaturated grey sector is high contrast *by measurement*, but a mid-grey
   sector is closer to cream in luminance than the old near-black chrome was to
   anything. **Mandatory check: the CAST button and both HP bars, screenshotted
   over (a) a fully drained sector, (b) a half-restored one, and (c) a fully
   restored, brightly-coloured one.** If (c) fails, the answer is to thicken the
   plum border to 5 px, not to darken the plate.
3b. **MEASURED, 2026-09-21 — and the mirror of §10.3.** Sampling the baseline
    screenshots' real pixel luminance settles the drained-duel bet in the
    design's favour and finds one case this section missed:

    | scene | p10 | p50 | p90 | `--am-paper` plate vs scene |
    | --- | --- | --- | --- | --- |
    | duel (drained) | 0.002 | 0.036 | 0.107 | 18.73 / 11.33 / **6.21** : 1 |
    | wipe (drained) | 0.015 | 0.048 | 0.117 | 14.90 / 9.95 / **5.83** : 1 |
    | map (book page) | 0.025 | 0.444 | 0.879 | 13.06 / **1.98** / **1.05** : 1 |

    Cream over the drained duel is 6.2:1 at its worst — the bet holds, and the
    old near-black plate would have been 2.41:1 against a mid-grey scene, so
    the cream plate is the *more* legible object, not merely the prettier one.
    But **the map is not a dark scene** — it is a bright cream page, and a
    cream chip on it is 1.98:1 median, 1.05:1 over the lightest areas. On
    `MapScene`, `WipeScene` and `UnboxScene` the **plum border and the `0 3px 0`
    lift are what make the control read**, not its face. Keep the border at a
    full 4px there. If a chip still looks lost, thicken the ring to 5px or go to
    `--am-shadow-plate` — never darken or tint the face, which would make the
    map's chips a different control from the duel's.

4. **The `.duel-plate` flip is a 34-call-site change behind two variables.** The
   variables flip in one file; the *text and glyph colours sitting on them* do
   not. Any call site missed reads white-on-cream and is invisible. The grep
   that finds them all:
   `grep -rn "duel-plate" src --include=*.vue` then, in each hit's scoped Sass,
   `color: #fff` and `drop-shadow(2px 2px 0 var(--duel-ink))`. There are 11
   files. **Missing one is the single most likely shipped bug in this pass.**
5. **Locale overflow.** Dropping `text-transform: uppercase` makes most Latin
   labels *narrower* (lowercase is ~8 % narrower than caps at the same size) and
   dropping `letter-spacing: 0.05em` narrower again — so this pass should
   *relieve* overflow, not cause it. But `font-weight: 900 → 800` changes
   advance widths on some Android system faces, and `v-fit` measures at runtime,
   so the safe move is to **re-run `tools/locale-fit` across all 21 locales in
   both orientations after the change and diff the shot set**, not to reason
   about it. Watch de / ru / uk / kk / vi specifically, and the four-tab Options
   header at 320 px.
6. **The gold-on-gold invisibility trap, three times.** `DuelHud`'s
   `.cast-glow`, `WipeScene`'s `.continue-btn` and `IntroScene`'s `.play` all
   draw a `--duel-gold` ring around a plate that is *about to become gold*.
   Each must change to a `--am-ink` ring in the same commit as `--duel-plate-live`.
7. **The splash handover.** `index.html`'s inline splash and
   `FLogoProgress.vue` must stay byte-identical in radial stops, title size,
   colour and stroke. They are edited by the same implementer (A) precisely so
   they cannot drift. A mismatch is a visible flash on every cold load on every
   portal.
8. **`FButton`'s responsive machinery.** The `clamp()` metrics, `--fbtn-*`
   names, `emphasis` multiplying *inside* the clamp, the 44 px / 36 px floors,
   the `padding: 3px` that gives the caption's paint room inside
   `overflow: hidden`, and `v-fit`'s width bound each fixed a real shipped bug.
   The `padding: 3px` one is subtle: it was there to hold the *black* shadow,
   and the new lift is 1 px — it is tempting to remove it, and removing it
   re-clips Devanagari and Thai descenders. **Leave it.**
9. **`RuneSlot`'s 12 tints.** `rune-colour + '2e'` (18 % alpha) was chosen to
   read over `rgba(24,17,48,0.8)`. Over `--am-night` at 0.85 the lighter runes
   (`#8ff0ff`, `#ffd23a`, `#fff`-adjacent) will shift. This needs a look at all
   12 filled slots, not a spot check.
10. **Sass `@use` ordering.** `theme.sass` must be the first `@use` in
    `index.sass`. Sass does not care for custom properties (they are runtime),
    but if anyone later converts a token to a Sass variable the order becomes
    load-bearing, and the comment in §8.2 is there to make that safe in advance.
11. **Scope discipline.** Three implementers, disjoint file sets (§7), and the
    owner works in the same tree. The foundation set (A) must land first or B
    and C produce components referencing undefined custom properties — which
    fail *silently* to `initial`, i.e. transparent backgrounds and black text.
    There is no build error for a missing token. **A goes first, alone.**
12. **What this design does not fix.** The map screen is still mostly a grey
    page of drained sector thumbnails, because that is the mechanic. Warming the
    chrome around them will make the drained thumbnails look *more* grey by
    contrast. That is correct and intended — it is the game's promise — but it
    is the one place the owner may read the result as "still dark", and the
    honest answer is that restoring colour is the reward, not the default.
