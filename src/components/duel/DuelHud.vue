<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CTR, PH_DUEL, MAX_RUNES, RUNE_IDS, SPELLBOOK, SW, SH, elemMul } from '@/game/duel/config'
import { FOES } from '@/game/duel/foes'
import { S } from '@/game/duel/state'
import { hud, hudLayout } from '@/use/useDuelHud'
import { spellName } from '@/use/useSpellName'
import { bookHud } from '@/use/useBook'
import { flowHud } from '@/use/useFlow'
import HpBar from '@/components/duel/HpBar.vue'
import RuneSlot from '@/components/duel/RuneSlot.vue'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'
import DuelPopups from '@/components/duel/DuelPopups.vue'
import DuelGlimpse from '@/components/duel/DuelGlimpse.vue'
import DuelHelpNote from '@/components/duel/DuelHelpNote.vue'
import GameIcon from '@/components/icons/GameIcon.vue'
import { vFit } from '@/use/vFit'
import { STARTING_RUNES } from '@/game/campaign/tables'
import { GLYPH_INK_W } from '@/game/duel/glyph'
import { LESSON } from '@/game/duel/lesson'
import { reducedMotion } from '@/use/useAccessibility'
import DuelLightbox from '@/components/duel/DuelLightbox.vue'
import RuneChips from '@/components/duel/RuneChips.vue'
import LockedRuneHint from '@/components/duel/LockedRuneHint.vue'

/**
 * The duel's chrome, as the jam build laid it out.
 *
 * LANDSCAPE: one 1280x720 layer scaled by the same transform as the canvas
 * stage, so every plate sits at the jam build's own stage coordinates (the
 * numbers in the template are those coordinates). PORTRAIT: the same pieces
 * reflowed — HP bars and rune slots in a band above the stage, CAST in the
 * thumb arc below the drawing pad. See `game/duel/layout.ts`.
 *
 * Only the buttons take pointer events: a stroke may start anywhere else,
 * including on top of the HP bars and the slots, which are display-only.
 */
const props = defineProps<{
  muted: boolean
  /** Keyboard-and-mouse device: the empty CAST button names its key. */
  keyboard: boolean
  paused: boolean
}>()
const emit = defineEmits<{ cast: []; cast2: []; mute: []; options: []; book: [] }>()
const { t, locale } = useI18n()

const L = computed(() => hudLayout.value)
const portrait = computed(() => L.value.portrait)

const foeName = computed(() => t(`duelist.${FOES[hud.foe]?.slug ?? 'umbra'}`))
const auroraName = computed(() => t('duelist.aurora'))
/** The foe's own glow (`FoePalette` slot 8): the halo behind her HP bar's
 *  moon medallion, so a Guardian's bar carries her colour. */
const foeTint = computed(() => FOES[hud.foe]?.pal[8] ?? '')
/**
 * The rune this foe fears — shown only when the player HAS it. Chapter 1's
 * foes are Nature, whose counter (Moon) arrives in chapter 9: a hint naming a
 * rune the player cannot draw would teach nothing (§6.6).
 */
const weakTo = computed(() => {
  if (versus.value) return -1
  const fe = FOES[hud.foe]?.element ?? -1
  const c = fe >= 0 ? CTR[fe] ?? -1 : -1
  return c >= 0 && ((S.campaign.runesUnlocked | STARTING_RUNES) >> c) & 1 ? c : -1
})
const weakMul = computed(() => (weakTo.value >= 0 ? elemMul(weakTo.value, FOES[hud.foe]!.element) : 1))
const weakLabel = computed(() => weakTo.value >= 0
  ? t('hud.weakness', { rune: t(`rune.${RUNE_IDS[weakTo.value]}`), n: `x${weakMul.value}` })
  : '')

const duel = computed(() => hud.phase === PH_DUEL)
/** Local 2P versus (§3.12): two symmetric halves, each its own CAST. */
const versus = computed(() => flowHud.mode === 'versus')
const cast2Live = computed(() => duel.value && hud.equeue.length > 0)
const cast2Label = computed(() => (hud.ecast ? spellName(t, locale.value, hud.ecast) : props.keyboard ? t('versus.castKey2') : t('hud.cast')))
const showDrawHint2 = computed(() => duel.value && !hud.equeue.length)
/**
 * The first duel's lesson (`game/duel/lesson.ts`) holds the cast shut until
 * its beat D. The gate itself is in the sim (every cast path passes it); this
 * only SHOWS it: runes in hand, the plate dimmed with a small lock — "not
 * yet", never hidden.
 */
const castLocked = computed(() => introBeat.value >= 0 && introBeat.value < LESSON.CAST)
/** …and then invites the cast: a gold bump and a swelling ring, replayed on
 *  every stroke she makes instead (`hud.invite`), until the first cast. */
const castInviting = computed(() => introBeat.value === LESSON.CAST)
const castLive = computed(() => duel.value && hud.queue.length > 0 && !castLocked.value)
/** Beat C: the lightbox, with her filled slots glowing inside its spotlight. */
const lit = computed(() => introBeat.value === LESSON.LIGHTBOX)
const litSlot = (i: number): boolean => lit.value && i < hud.queue.length
/** Her known runes along the pad, for her first few duels (`lesson.chipsDue`). */
const chips = computed(() => (duel.value && !versus.value ? hud.chips : 0))
/** A stroke matched a rune she has not earned yet: its card is up. */
const lockedUp = computed(() => duel.value && !versus.value && hud.locked > 0 && hud.lockedRune >= 0)
const castLabel = computed(() => {
  if (hud.cast) return spellName(t, locale.value, hud.cast)
  // On a keyboard device the two key glyphs beside the label say WHICH keys,
  // so the label is just the verb — otherwise the button reads "[Space] Cast"
  // with a space bar drawn next to it, saying it twice.
  return t('hud.cast')
})
/**
 * Aurora's after-two-losses note (retention item 8). It stands WHERE the
 * "draw a rune!" nudge stands and suppresses it, because two messages in one
 * place is no message: hers says the same thing and shows the shape as well.
 */
const help = computed(() => (duel.value && !hud.intro && !versus.value ? hud.help : 0))
const showDrawHint = computed(() => duel.value && !hud.intro && !hud.queue.length && !help.value && !lockedUp.value)
/** The perfect-rune twinkle (retention item 7), for the slot that earned it. */
const sparkleOf = (i: number): number => (hud.perfectSlot === i ? hud.perfect : 0)
// Onboarding teaches one player; a versus match never shows it.
const introBeat = computed(() => (duel.value && hud.intro && !hud.book && !versus.value ? hud.introStep : -1))

const slots = Array.from({ length: MAX_RUNES }, (_, i) => i)

/* ── stage-unit helpers (landscape) ──
   The jam build stroked every plate outline CENTRED on its path, so a plate's
   visible box is its path grown by half the line width on each side. The
   boxes below are those visible boxes (e.g. the 366x46 HP plate with a 5-unit
   outline is 371x51 at x-2.5, y-2.5). */
const box = (x: number, y: number, w: number, h: number) => ({
  left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`
})
/** A text run centred on (x, y), jam-build style. */
const at = (x: number, y: number, size: number, align: 'center' | 'left' | 'right' = 'center') => ({
  left: `${x}px`,
  top: `${y}px`,
  fontSize: `${size}px`,
  transform: `translate(${align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0'}, -50%)`
})
const stageStyle = computed(() => ({
  width: `${SW}px`,
  height: `${SH}px`,
  transform: `translate(${L.value.vx}px, ${L.value.vy}px) scale(${L.value.vs})`
}))

/* ── portrait sizing ── */
const pu = computed(() => {
  const band = L.value.topBand - L.value.insets.top - 12
  return Math.max(1, Math.min(1.6, band / 72))
})
const topStyle = computed(() => ({
  top: `${L.value.insets.top + 6}px`,
  // 14 px of side margin: the foe's forming ring reaches past its slot.
  left: `${L.value.insets.left + 14}px`,
  right: `${L.value.insets.right + 14}px`,
  '--pu': String(pu.value)
}))
const bottomStyle = computed(() => {
  const inner = L.value.bottomBar - L.value.insets.bottom - 16
  return {
    bottom: `${L.value.insets.bottom + 8}px`,
    left: `${L.value.insets.left + 10}px`,
    right: `${L.value.insets.right + 10}px`,
    height: `${Math.min(76, Math.max(52, inner))}px`
  }
})
/** Captions sit just inside the top of the drawing pad in portrait. */
const zoneCaption = computed(() => {
  const z = L.value.zonePx
  return { left: `${z.x + z.w / 2}px`, top: `${z.y + Math.min(34, z.h * 0.14)}px` }
})
/** Beat 2 ("now cast it") sits at the bottom of the pad, over the arrow. */
const zoneBottomCaption = computed(() => {
  const z = L.value.zonePx
  return { left: `${z.x + z.w / 2}px`, top: `${z.y + z.h - Math.min(34, z.h * 0.14)}px` }
})
const zoneFont = computed(() => Math.round(Math.max(18, Math.min(30, L.value.w * 0.062))))
/**
 * Beat 0's second line names the shape, for the players the ghost finger
 * alone does not reach. It sits just under the ghost triangle — the one
 * `drawIntroTrace` draws at 0.26 of the pad's short side, whose flat bottom
 * edge is half a radius below centre and inked `GLYPH_INK_W` thick — and
 * never below the pad. `z` and `font` share one unit: stage units in
 * landscape, CSS px in portrait.
 */
const underTriangle = (z: { x: number; y: number; w: number; h: number }, font: number, reach = 0.5): number => {
  const R = 0.26 * Math.min(z.w, z.h)
  const under = z.y + z.h / 2 + (reach + GLYPH_INK_W / 2) * R + 6 + font / 2
  return Math.min(under, z.y + z.h - font * 0.6)
}
const TRI_FONT = 28
const triFont = computed(() => Math.round(zoneFont.value * 0.8))
const triCaption = computed(() => {
  const z = L.value.zonePx
  return { left: `${z.x + z.w / 2}px`, top: `${underTriangle(z, triFont.value)}px`, width: `${z.w - 24}px` }
})
/**
 * Beat B's line sits under the ghost SQUARE the same way: the square is drawn
 * at 1.06 R with its corners on the diagonals (`glyph.ts`), so its flat bottom
 * edge is 0.75 R below centre, not the triangle's 0.5 R.
 */
const SQUARE_REACH = 0.75
const squareCaption = computed(() => {
  const z = L.value.zonePx
  return { left: `${z.x + z.w / 2}px`, top: `${underTriangle(z, triFont.value, SQUARE_REACH)}px`, width: `${z.w - 24}px` }
})
/**
 * Portrait: the note sits across the top of the drawing pad, where the nudge
 * it replaces was. `--hn` is the card's own unit — the pad's width over the
 * 540 stage units the landscape card gets — capped so it never eats more than
 * a fifth of the pad's height on a squat screen.
 */
const helpStyle = computed(() => {
  const z = L.value.zonePx
  const hn = Math.min(z.w / 540, (z.h * 0.3) / 80)
  return {
    left: `${z.x + z.w / 2}px`,
    top: `${z.y + 6}px`,
    width: `${540 * hn}px`,
    height: `${80 * hn}px`,
    '--hn': `${hn}px`
  }
})
</script>

<template lang="pug">
  div.duel-hud(:class="{ 'duel-paused': paused, 'am-still': reducedMotion }")
    //- ═════════════════════════════ LANDSCAPE ═════════════════════════════
    div.stage-layer(v-if="!portrait" :style="stageStyle")
      //- The HP bars: each box is the bar's RAIL (40 units); its name plate
      //- rises to y 4 and its medallion hangs to y 78, clear of the slots.
      div.abs.hp-land(:style="box(16, 30, 390, 40)")
        HpBar(side="left" :name="auroraName" :label="auroraName" :low="hud.low")
      div.abs.hp-land(:style="box(874, 30, 390, 40)")
        HpBar(side="right" :name="foeName" :label="foeName" :low="hud.elow" :tint="foeTint")

      //- What this foe fears: the rune to draw, beside the multiplier it pays.
      template(v-if="weakTo >= 0")
        div.abs.weak(:style="box(1180 - 22, 162 - 22, 44, 44)" role="img" :aria-label="weakLabel")
          RuneGlyph(:rune="weakTo")
        span.abs.ink-text.weak(:style="[at(1202, 162, 21, 'left'), { color: 'var(--am-mint)' }]" aria-hidden="true") {{ t('pop.times', { n: weakMul }) }}

      div.abs(:aria-label="t('hud.yourRunes')" role="list")
        div.abs(v-for="i in slots" :key="'p' + i" role="listitem" data-my-slot :class="{ 'lesson-lit': litSlot(i) }" :style="box(30 + i * 64, 80, 60, 60)")
          RuneSlot(:rune="hud.queue[i]" :sparkle="sparkleOf(i)")
      div.abs(:aria-label="t('hud.foeRunes')" role="list")
        div.abs(v-for="i in slots" :key="'e' + i" role="listitem" :style="box(1190 - i * 64, 80, 60, 60)")
          RuneSlot(:rune="hud.equeue[i]" :forming="hud.eSlot === i" :form-rune="hud.eRune" :warn="hud.eTell")

      //- Aurora's help, on the stage's own coordinates: centred above the
      //- drawing box, clear of both slot rows (which end at x 222 / 1000).
      div.abs.help-slot(v-if="help" :key="help" :style="box(370, 106, 540, 80)")
        DuelHelpNote

      span.abs.ink-text.prompt(v-if="showDrawHint && !versus" :style="[at(640, 142, 30), { color: 'var(--am-gold)' }]") {{ t('hud.drawARune') }}
      //- Local versus: each half invites its own player.
      template(v-if="versus")
        span.abs.ink-text.breathe(v-if="showDrawHint" :style="[at(320, 200, 28), { color: 'var(--am-gold)' }]") {{ t('hud.drawARune') }}
        span.abs.ink-text.breathe(v-if="showDrawHint2" :style="[at(960, 200, 28), { color: 'var(--am-lilac)' }]") {{ t('hud.drawARune') }}

      //- Onboarding: three beats, none of which block play. The ghost trace of
      //- beat 0 is drawn on the canvas; these are its captions.
      template(v-if="introBeat === 0")
        span.abs.ink-text(v-if="!hud.nudge" :style="[at(640, 138, 36), { color: 'var(--am-gold)' }]") {{ t('intro.draw') }}
        span.abs.ink-text.tri-hint(v-fit="TRI_FONT" :style="[at(640, underTriangle(L.zone, TRI_FONT), TRI_FONT), { width: L.zone.w + 'px', color: 'var(--am-gold)' }]") {{ t('intro.triangle') }}
      span.abs.ink-text(v-else-if="introBeat === 1" :style="[at(640, 138, 34), { color: 'var(--am-gold)' }]") {{ t('intro.stored') }}
      //- Beat B: the square, taught like the triangle — and why two.
      template(v-else-if="introBeat === LESSON.SQUARE")
        span.abs.ink-text(v-if="!hud.nudge" :style="[at(640, 138, 36), { color: 'var(--am-gold)' }]") {{ t('intro.square') }}
        span.abs.ink-text.tri-hint(v-fit="TRI_FONT" :style="[at(640, underTriangle(L.zone, TRI_FONT, SQUARE_REACH), TRI_FONT), { width: L.zone.w + 'px', color: 'var(--am-gold)' }]") {{ t('intro.twoRunes') }}
      template(v-else-if="introBeat === LESSON.CAST")
        span.abs.ink-text(:style="[at(640, 490, 36), { color: 'var(--am-gold)' }]") {{ t('intro.cast') }}
        svg.abs.intro-arrow(:style="box(600, 514, 80, 78)" viewBox="600 514 80 78" aria-hidden="true")
          path(d="M640 524 L640 582 M640 582 L620.9 564.4 M640 582 L659.1 564.4" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round")

      template(v-if="!versus")
        button.abs.duel-plate.cast-btn(
          :style="box(467.5, 593.5, 345, 85)"
          :class="{ live: castLive, locked: castLocked && hud.queue.length > 0, invite: castInviting }"
          :aria-label="castLive ? castLabel : t('hud.castAria')"
          :aria-disabled="castLocked ? 'true' : undefined"
          @click="emit('cast')"
        )
          span.cast-glow(v-if="castLive")
          span.cast-invite(v-if="castInviting" :key="hud.invite")
          GameIcon.cast-lock(v-if="castLocked && hud.queue.length > 0" name="lock")
          span.cast-keys(v-if="keyboard" aria-hidden="true")
            svg.key.bar(viewBox="0 0 34 18")
              rect(x="1.5" y="1.5" width="31" height="15" rx="4" fill="none" stroke="currentColor" stroke-width="2.4")
              path(d="M8 7.5 L8 11.5 M26 7.5 L26 11.5 M8 11.5 L26 11.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round")
            svg.key.mouse(viewBox="0 0 20 28")
              rect(x="1.5" y="1.5" width="17" height="25" rx="8.5" fill="none" stroke="currentColor" stroke-width="2.4")
              path(d="M10 2.5 L10 12 L17.6 12 L17.6 10 A7.6 7.6 0 0 0 10 2.5 Z" fill="currentColor" stroke="none")
          span.ink-text.ink-none.cast-label(v-fit="34" :style="{ color: castLive ? 'var(--am-ink)' : 'var(--am-ink-3)' }") {{ castLabel }}

        button.abs.duel-plate.icon-btn(:style="box(39.5, 599.5, 95, 79)" :aria-label="t('options.title')" @click="emit('options')")
          GameIcon.gear(name="settings")
        button.abs.duel-plate.icon-btn(
          v-if="SPELLBOOK"
          :class="{ 'book-new': bookHud.hasNew }"
          :style="box(1053.5, 607.5, 73, 67)"
          :aria-label="t('hud.spellbook')"
          @click="emit('book')"
        )
          GameIcon.gear(name="book")
        button.abs.duel-plate.icon-btn(:style="box(1145.5, 599.5, 95, 79)" :aria-label="t('hud.sound')" :aria-pressed="muted" @click="emit('mute')")
          span.ink-text.ink-none(:style="{ fontSize: '40px', color: muted ? 'var(--am-ink-3)' : 'var(--am-ink)' }") ♪

      //- ── local 2P versus: a CAST each, the shared buttons between them ──
      template(v-else)
        button.abs.duel-plate.cast-btn(
          :style="box(30, 593.5, 330, 85)"
          :class="{ live: castLive }"
          :aria-label="t('versus.player1') + ': ' + (castLive ? castLabel : t('hud.castAria'))"
          @click="emit('cast')"
        )
          span.cast-glow(v-if="castLive")
          span.ink-text.ink-none.cast-label(v-fit="32" :style="{ color: castLive ? 'var(--am-ink)' : 'var(--am-ink-3)' }") {{ castLabel }}
        button.abs.duel-plate.cast-btn.p2(
          :style="box(920, 593.5, 330, 85)"
          :class="{ live: cast2Live }"
          :aria-label="t('versus.player2') + ': ' + (cast2Live ? cast2Label : t('hud.castAria'))"
          @click="emit('cast2')"
        )
          span.cast-glow(v-if="cast2Live")
          span.ink-text.ink-none.cast-label(v-fit="32" :style="{ color: cast2Live ? 'var(--am-ink)' : 'var(--am-ink-3)' }") {{ cast2Label }}
        button.abs.duel-plate.icon-btn(:style="box(503, 599.5, 95, 79)" :aria-label="t('options.title')" @click="emit('options')")
          GameIcon.gear(name="settings")
        button.abs.duel-plate.icon-btn(:style="box(682, 599.5, 95, 79)" :aria-label="t('hud.sound')" :aria-pressed="muted" @click="emit('mute')")
          span.ink-text.ink-none(:style="{ fontSize: '40px', color: muted ? 'var(--am-ink-3)' : 'var(--am-ink)' }") ♪

      DuelGlimpse(:portrait="false")
      DuelPopups(:portrait="false")
      RuneChips(v-if="chips" :mask="chips" :portrait="false")
      LockedRuneHint(v-if="lockedUp" :portrait="false")

    //- ═════════════════════════════ PORTRAIT ══════════════════════════════
    template(v-else-if="!versus")
      div.port-top(:style="topStyle")
        div.port-row.bars
          div.port-bar
            HpBar(side="left" :name="auroraName" :label="auroraName" :low="hud.low")
          div.port-bar
            HpBar(side="right" :name="foeName" :label="foeName" :low="hud.elow" :tint="foeTint")
        div.port-row.slots
          div.port-slots(role="list" :aria-label="t('hud.yourRunes')")
            div.port-slot(v-for="i in slots" :key="'p' + i" role="listitem" data-my-slot :class="{ 'lesson-lit': litSlot(i) }")
              RuneSlot(:rune="hud.queue[i]" :sparkle="sparkleOf(i)")
          div.port-weak(v-if="weakTo >= 0" role="img" :aria-label="weakLabel")
            RuneGlyph.port-weak-glyph(:rune="weakTo")
            span.ink-text(style="color: var(--am-mint)" aria-hidden="true") {{ t('pop.times', { n: weakMul }) }}
          div.port-slots.rev(role="list" :aria-label="t('hud.foeRunes')")
            div.port-slot(v-for="i in slots" :key="'e' + i" role="listitem")
              RuneSlot(:rune="hud.equeue[i]" :forming="hud.eSlot === i" :form-rune="hud.eRune" :warn="hud.eTell")

      div.port-help(v-if="help" :key="help" :style="helpStyle")
        DuelHelpNote

      span.fixed-caption.ink-text.prompt(v-if="showDrawHint" :style="[zoneCaption, { color: 'var(--am-gold)', fontSize: zoneFont + 'px' }]") {{ t('hud.drawARune') }}
      template(v-if="introBeat === 0")
        span.fixed-caption.ink-text(v-if="!hud.nudge" :style="[zoneCaption, { color: 'var(--am-gold)', fontSize: zoneFont + 'px' }]") {{ t('intro.draw') }}
        span.fixed-caption.ink-text.tri-hint(v-fit="triFont" :style="[triCaption, { color: 'var(--am-gold)' }]") {{ t('intro.triangle') }}
      span.fixed-caption.ink-text(v-else-if="introBeat === 1" :style="[zoneCaption, { color: 'var(--am-gold)', fontSize: zoneFont + 'px' }]") {{ t('intro.stored') }}
      template(v-else-if="introBeat === LESSON.SQUARE")
        span.fixed-caption.ink-text(v-if="!hud.nudge" :style="[zoneCaption, { color: 'var(--am-gold)', fontSize: zoneFont + 'px' }]") {{ t('intro.square') }}
        span.fixed-caption.ink-text.tri-hint(v-fit="triFont" :style="[squareCaption, { color: 'var(--am-gold)' }]") {{ t('intro.twoRunes') }}
      span.fixed-caption.ink-text(v-else-if="introBeat === LESSON.CAST" :style="[zoneBottomCaption, { color: 'var(--am-gold)', fontSize: zoneFont + 'px' }]") {{ t('intro.cast') }}
      RuneChips(v-if="chips" :mask="chips" :portrait="true")

      div.port-bottom(:style="bottomStyle")
        button.duel-plate.icon-btn.port-icon(:aria-label="t('options.title')" @click="emit('options')")
          GameIcon.gear.small(name="settings")
        div.port-cast-wrap
          svg.port-arrow(v-if="introBeat === LESSON.CAST" viewBox="-20 -34 40 34" aria-hidden="true")
            path(d="M0 -30 L0 -4 M0 -4 L-12 -15 M0 -4 L12 -15" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round")
          button.duel-plate.cast-btn.port-cast(
            :class="{ live: castLive, locked: castLocked && hud.queue.length > 0, invite: castInviting }"
            :aria-label="castLive ? castLabel : t('hud.castAria')"
            :aria-disabled="castLocked ? 'true' : undefined"
            @click="emit('cast')"
          )
            span.cast-glow(v-if="castLive")
            span.cast-invite(v-if="castInviting" :key="hud.invite")
            GameIcon.cast-lock.small(v-if="castLocked && hud.queue.length > 0" name="lock")
            span.ink-text.ink-none.cast-label(v-fit :style="{ color: castLive ? 'var(--am-ink)' : 'var(--am-ink-3)' }") {{ castLabel }}
        button.duel-plate.icon-btn.port-icon(v-if="SPELLBOOK" :class="{ 'book-new': bookHud.hasNew }" :aria-label="t('hud.spellbook')" @click="emit('book')")
          GameIcon.gear.small(name="book")
        button.duel-plate.icon-btn.port-icon(:aria-label="t('hud.sound')" :aria-pressed="muted" @click="emit('mute')")
          span.ink-text.ink-none(:style="{ fontSize: '26px', color: muted ? 'var(--am-ink-3)' : 'var(--am-ink)' }") ♪

      DuelGlimpse(:portrait="true")
      DuelPopups(:portrait="true")
      LockedRuneHint(v-if="lockedUp" :portrait="true")

    //- The lesson's beat C, over everything the duel shows: last, so it paints
    //- on top of both layouts. It cuts its own spotlight round the slots.
    DuelLightbox(v-if="lit && !versus")
</template>

<style scoped lang="sass">
.duel-hud
  position: absolute
  inset: 0
  pointer-events: none
  overflow: hidden

.stage-layer
  position: absolute
  left: 0
  top: 0
  transform-origin: 0 0

.abs
  position: absolute

button
  pointer-events: auto
  cursor: pointer
  padding: 0
  margin: 0
  font: inherit
  color: inherit
  -webkit-tap-highlight-color: transparent
  transition: transform 0.08s ease-out, filter 0.12s
  &:active
    transform: scale(0.96)
  &:focus-visible
    outline: 3px solid var(--am-ink)
    outline-offset: 3px

.cast-btn
  display: flex
  align-items: center
  justify-content: center
  // The key glyphs sit IN the row beside the label, not over it. Absolutely
  // positioned at `left: 5%` they were outside the centred label's reckoning,
  // so a long spell name — "Windstoss" — simply grew underneath them.
  gap: 9px
  background: var(--duel-plate)
  border-radius: 18px
  &.live
    background: var(--duel-plate-live)

// The pulsing ring around a loaded CAST button. It used to be gold — but the
// live plate is gold now (`--duel-plate-live`), and gold on gold is nothing at
// all (§10.6), so the ring is the plum line the rest of the chrome is drawn in.
.cast-glow
  position: absolute
  inset: -9.5px
  border: 4px solid var(--am-ink)
  border-radius: 24px
  animation: duel-glow 1.11s ease-in-out infinite
  pointer-events: none

// The lesson's "not yet" (`game/duel/lesson.ts`): runes in hand and the cast
// held shut until beat D. Dimmed, never hidden, and a small lock says why.
.cast-btn.locked
  opacity: 0.55
  cursor: default
  &:active
    transform: none

.cast-lock
  flex: 0 0 auto
  width: 30px
  height: 30px
  color: var(--am-ink-3)
  &.small
    width: 22px
    height: 22px

// …and then the invitation: one gold bump of the plate, and a gold ring that
// swells out of it — replayed (it is keyed) on every stroke she makes instead.
.cast-btn.invite
  animation: cast-bump 0.6s var(--am-ease-pop) both

.cast-invite
  position: absolute
  inset: -6px
  border: 5px solid var(--am-gold)
  border-radius: 24px
  pointer-events: none
  animation: cast-ring 1.1s ease-out 3 both

@keyframes cast-bump
  0%
    transform: scale(1)
  40%
    transform: scale(1.09)
  100%
    transform: scale(1)

@keyframes cast-ring
  0%
    opacity: 0.95
    transform: scale(1)
  100%
    opacity: 0
    transform: scale(1.22)

// Beat C: her filled slots glow gold inside the lightbox's spotlight.
.lesson-lit
  z-index: 1
  filter: drop-shadow(0 0 7px var(--am-gold))
  animation: lesson-lit 0.9s ease-in-out infinite alternate

@keyframes lesson-lit
  from
    transform: scale(1)
  to
    transform: scale(1.1)

// Reduced motion: the same highlight, held still.
.am-still .lesson-lit, .am-still .cast-btn.invite
  animation: none
.am-still .cast-invite
  animation: none
  opacity: 0.9

// The two key hints on the empty CAST button: a space bar and a mouse with its
// RIGHT button filled. Drawn in the label's own ink so they dim with it when
// there is nothing to cast, and hidden from the reader — the button's
// aria-label already names the key.
.cast-keys
  flex: 0 0 auto
  display: flex
  align-items: center
  gap: 5px
  color: var(--am-ink-3)
  pointer-events: none
  .key
    display: block
  .bar
    width: 30px
    height: 16px
  .mouse
    width: 15px
    height: 21px
.cast-btn.live .cast-keys
  color: var(--am-ink-2)

.cast-label
  position: relative
  padding: 0 0.3em
  min-width: 0
  overflow: hidden
  text-overflow: ellipsis
  // `.ink-text` sets `line-height: 1`, which makes the line box exactly the
  // font size — and `overflow: hidden` was shaving the top and bottom off
  // every caption (7 px of outline at 34 px, back when the caption still wore
  // one). The caption is `.ink-none` on a paper/gold plate now, but Thai and
  // Devanagari still sit well outside a 1.0 line box, so the room stays.
  line-height: 1.32

.gear
  width: 44px
  height: 44px
  &.small
    width: 28px
    height: 28px

.icon-btn
  display: flex
  align-items: center
  justify-content: center
  color: var(--am-ink)
  background: var(--duel-plate)

.breathe
  --from: 0.34
  --to: 0.5
  animation: duel-breathe 2s ease-in-out infinite

// The idle "DRAW A RUNE" (playtest 2026-09-24: at 34–50 % white it read as a
// faint grey, lost on the storm sky and on the portrait pad). Now the lesson's
// own treatment — gold in the plum outline — and it breathes near full
// strength instead of near half.
//
// …ON A SOFT PLUM CLOUD. The sky brightens toward mid-grey as she wins, and
// the portrait pad IS mid-grey (measured L 0.11–0.22): against that no fill
// and no outline reaches 4.5:1 — gold scored 2.8–3.7 there. The blurred scrim
// behind the words darkens only their own patch of sky, so the gold reads at
// ≥ 4.5:1 on every backdrop the duel has (see the measurement in the lesson
// report), and on the dark storm band it is invisible.
.prompt
  --from: 0.88
  --to: 1
  animation: duel-breathe 2s ease-in-out infinite
  &::before
    content: ''
    position: absolute
    inset: -0.3em -0.7em
    z-index: -1
    border-radius: 999px
    background: var(--am-scrim)
    filter: blur(7px)

.weak
  --from: 0.55
  --to: 0.8
  animation: duel-breathe 1.67s ease-in-out infinite

.intro-arrow
  overflow: visible
  color: var(--am-gold)
  animation: duel-breathe 1.11s ease-in-out infinite
  --from: 0.55
  --to: 1

// ── portrait ──
.port-top
  position: absolute
  display: flex
  flex-direction: column
  gap: calc(6px * var(--pu))

.port-row
  display: flex
  align-items: center
  gap: 8px

// The bar's box is its RAIL, sat on the row's floor: its name plate rises
// 0.62 rails above that — at most 5 px into the band's top margin — and its
// medallion hangs 0.2 rails below, into the gap over the slots.
.port-row.bars
  height: calc(30px * var(--pu))
  --hp-r: calc((30px * var(--pu) + 5px) / 1.62)
  .port-bar
    position: relative
    flex: 1 1 0
    height: 100%
    min-width: 0
  :deep(.hp-bar)
    position: absolute
    left: 0
    right: 0
    bottom: 0
    height: var(--hp-r)

// Landscape has the room for a larger name.
.hp-land
  --hp-r: 40px
  --hp-plate: 0.78
  --hp-font: 0.55

.port-row.slots
  height: calc(36px * var(--pu))
  justify-content: space-between

.port-slots
  display: flex
  gap: calc(4px * var(--pu))
  height: 100%
  &.rev
    flex-direction: row-reverse

.port-slot
  width: calc(36px * var(--pu))
  height: 100%
  :deep(.slot-plate)
    --lw: 3px

.port-weak
  display: flex
  align-items: center
  gap: 2px
  font-size: calc(14px * var(--pu))
  animation: duel-breathe 1.67s ease-in-out infinite
  --from: 0.55
  --to: 0.8

.port-weak-glyph
  width: calc(28px * var(--pu))
  height: calc(28px * var(--pu))

.fixed-caption
  position: absolute
  transform: translate(-50%, -50%)

// "Draw a triangle" gets the drawing box's width and `v-fit` shrinks it into
// that: the long locales ("НАРИСУЙТЕ ТРЕУГОЛЬНИК") otherwise run over both
// duelists' heads. The padding is room for the ink outline, which `overflow`
// would clip.
.tri-hint
  overflow: hidden
  text-align: center
  padding: 0.2em

// Landscape: the card lives in the stage layer, so one stage unit IS its unit.
.help-slot
  --hn: 1px

.port-help
  position: absolute
  transform: translateX(-50%)

.port-bottom
  position: absolute
  display: flex
  align-items: center
  gap: 10px

.port-icon
  --lw: 3px
  flex: 0 0 auto
  width: 48px
  height: 48px
  border-radius: 14px

.port-cast-wrap
  position: relative
  flex: 1 1 auto
  height: 100%
  display: flex
  justify-content: center
  min-width: 0

.port-cast
  --lw: 4px
  position: relative
  width: 100%
  max-width: 380px
  height: 100%
  .cast-label
    font-size: clamp(16px, 5.4vw, 26px)
  .cast-glow
    inset: -8px

.port-arrow
  position: absolute
  left: 50%
  bottom: calc(100% + 6px)
  width: 34px
  height: 30px
  transform: translateX(-50%)
  overflow: visible
  color: var(--am-gold)
  animation: duel-breathe 1.11s ease-in-out infinite
  --from: 0.55
  --to: 1
</style>
