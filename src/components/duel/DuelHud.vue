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
import GameIcon from '@/components/icons/GameIcon.vue'

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
/**
 * The rune this foe fears — shown only when the player HAS it. Chapter 1's
 * foes are Nature, whose counter (Moon) arrives in chapter 9: a hint naming a
 * rune the player cannot draw would teach nothing (§6.6).
 */
const weakTo = computed(() => {
  if (versus.value) return -1
  const fe = FOES[hud.foe]?.element ?? -1
  const c = fe >= 0 ? CTR[fe] ?? -1 : -1
  return c >= 0 && ((S.campaign.runesUnlocked | 0b1111) >> c) & 1 ? c : -1
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
const castLive = computed(() => duel.value && hud.queue.length > 0)
const castLabel = computed(() => {
  if (hud.cast) return spellName(t, locale.value, hud.cast)
  return props.keyboard ? t('hud.castKey') : t('hud.cast')
})
const showDrawHint = computed(() => duel.value && !hud.intro && !hud.queue.length)
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
</script>

<template lang="pug">
  div.duel-hud(:class="{ 'duel-paused': paused }")
    //- ═════════════════════════════ LANDSCAPE ═════════════════════════════
    div.stage-layer(v-if="!portrait" :style="stageStyle")
      div.abs(:style="box(23.5, 19.5, 371, 51)")
        HpBar(side="left" :name="auroraName" color="#ffd76a" :label="auroraName")
      div.abs(:style="box(885.5, 19.5, 371, 51)")
        HpBar(side="right" :name="foeName" color="#c08cff" :label="foeName")

      //- What this foe fears: the rune to draw, beside the multiplier it pays.
      template(v-if="weakTo >= 0")
        div.abs.weak(:style="box(1180 - 22, 162 - 22, 44, 44)" role="img" :aria-label="weakLabel")
          RuneGlyph(:rune="weakTo")
        span.abs.ink-text.weak(:style="[at(1202, 162, 21, 'left'), { color: '#7dffa8' }]" aria-hidden="true") {{ t('pop.times', { n: weakMul }) }}

      div.abs(:aria-label="t('hud.yourRunes')" role="list")
        div.abs(v-for="i in slots" :key="'p' + i" role="listitem" :style="box(30 + i * 64, 80, 60, 60)")
          RuneSlot(:rune="hud.queue[i]")
      div.abs(:aria-label="t('hud.foeRunes')" role="list")
        div.abs(v-for="i in slots" :key="'e' + i" role="listitem" :style="box(1190 - i * 64, 80, 60, 60)")
          RuneSlot(:rune="hud.equeue[i]" :forming="hud.eSlot === i" :form-rune="hud.eRune")

      span.abs.ink-text.breathe(v-if="showDrawHint && !versus" :style="[at(640, 142, 30), { color: '#cfc4ff' }]") {{ t('hud.drawARune') }}
      //- Local versus: each half invites its own player.
      template(v-if="versus")
        span.abs.ink-text.breathe(v-if="showDrawHint" :style="[at(320, 200, 28), { color: '#ffe7a6' }]") {{ t('hud.drawARune') }}
        span.abs.ink-text.breathe(v-if="showDrawHint2" :style="[at(960, 200, 28), { color: '#e0ccff' }]") {{ t('hud.drawARune') }}

      //- Onboarding: three beats, none of which block play. The ghost trace of
      //- beat 0 is drawn on the canvas; these are its captions.
      span.abs.ink-text(v-if="introBeat === 0" :style="[at(640, 138, 36), { color: '#ffd76a' }]") {{ t('intro.draw') }}
      span.abs.ink-text(v-else-if="introBeat === 1" :style="[at(640, 138, 34), { color: '#ffd76a' }]") {{ t('intro.stored') }}
      template(v-else-if="introBeat === 2")
        span.abs.ink-text(:style="[at(640, 490, 36), { color: '#ffd76a' }]") {{ t('intro.cast') }}
        svg.abs.intro-arrow(:style="box(600, 514, 80, 78)" viewBox="600 514 80 78" aria-hidden="true")
          path(d="M640 524 L640 582 M640 582 L620.9 564.4 M640 582 L659.1 564.4" fill="none" stroke="#ffd76a" stroke-width="9" stroke-linecap="round")

      template(v-if="!versus")
        button.abs.duel-plate.cast-btn(
          :style="box(467.5, 593.5, 345, 85)"
          :class="{ live: castLive }"
          :aria-label="castLive ? castLabel : t('hud.castAria')"
          @click="emit('cast')"
        )
          span.cast-glow(v-if="castLive")
          span.ink-text.cast-label(:style="{ fontSize: '34px', color: castLive ? '#fff' : '#7a6f95' }") {{ castLabel }}

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
          span.ink-text(:style="{ fontSize: '40px', color: muted ? '#7a6f95' : '#fff' }") ♪

      //- ── local 2P versus: a CAST each, the shared buttons between them ──
      template(v-else)
        button.abs.duel-plate.cast-btn(
          :style="box(30, 593.5, 330, 85)"
          :class="{ live: castLive }"
          :aria-label="t('versus.player1') + ': ' + (castLive ? castLabel : t('hud.castAria'))"
          @click="emit('cast')"
        )
          span.cast-glow(v-if="castLive")
          span.ink-text.cast-label(:style="{ fontSize: '32px', color: castLive ? '#fff' : '#7a6f95' }") {{ castLabel }}
        button.abs.duel-plate.cast-btn.p2(
          :style="box(920, 593.5, 330, 85)"
          :class="{ live: cast2Live }"
          :aria-label="t('versus.player2') + ': ' + (cast2Live ? cast2Label : t('hud.castAria'))"
          @click="emit('cast2')"
        )
          span.cast-glow(v-if="cast2Live")
          span.ink-text.cast-label(:style="{ fontSize: '32px', color: cast2Live ? '#fff' : '#7a6f95' }") {{ cast2Label }}
        button.abs.duel-plate.icon-btn(:style="box(503, 599.5, 95, 79)" :aria-label="t('options.title')" @click="emit('options')")
          GameIcon.gear(name="settings")
        button.abs.duel-plate.icon-btn(:style="box(682, 599.5, 95, 79)" :aria-label="t('hud.sound')" :aria-pressed="muted" @click="emit('mute')")
          span.ink-text(:style="{ fontSize: '40px', color: muted ? '#7a6f95' : '#fff' }") ♪

      DuelPopups(:portrait="false")

    //- ═════════════════════════════ PORTRAIT ══════════════════════════════
    template(v-else-if="!versus")
      div.port-top(:style="topStyle")
        div.port-row.bars
          div.port-bar
            HpBar(side="left" :name="auroraName" color="#ffd76a" :label="auroraName")
          div.port-bar
            HpBar(side="right" :name="foeName" color="#c08cff" :label="foeName")
        div.port-row.slots
          div.port-slots(role="list" :aria-label="t('hud.yourRunes')")
            div.port-slot(v-for="i in slots" :key="'p' + i" role="listitem")
              RuneSlot(:rune="hud.queue[i]")
          div.port-weak(v-if="weakTo >= 0" role="img" :aria-label="weakLabel")
            RuneGlyph.port-weak-glyph(:rune="weakTo")
            span.ink-text(style="color: #7dffa8" aria-hidden="true") {{ t('pop.times', { n: weakMul }) }}
          div.port-slots.rev(role="list" :aria-label="t('hud.foeRunes')")
            div.port-slot(v-for="i in slots" :key="'e' + i" role="listitem")
              RuneSlot(:rune="hud.equeue[i]" :forming="hud.eSlot === i" :form-rune="hud.eRune")

      span.fixed-caption.ink-text.breathe(v-if="showDrawHint" :style="[zoneCaption, { color: '#cfc4ff', fontSize: zoneFont + 'px' }]") {{ t('hud.drawARune') }}
      span.fixed-caption.ink-text(v-if="introBeat === 0" :style="[zoneCaption, { color: '#ffd76a', fontSize: zoneFont + 'px' }]") {{ t('intro.draw') }}
      span.fixed-caption.ink-text(v-else-if="introBeat === 1" :style="[zoneCaption, { color: '#ffd76a', fontSize: zoneFont + 'px' }]") {{ t('intro.stored') }}
      span.fixed-caption.ink-text(v-else-if="introBeat === 2" :style="[zoneBottomCaption, { color: '#ffd76a', fontSize: zoneFont + 'px' }]") {{ t('intro.cast') }}

      div.port-bottom(:style="bottomStyle")
        button.duel-plate.icon-btn.port-icon(:aria-label="t('options.title')" @click="emit('options')")
          GameIcon.gear.small(name="settings")
        div.port-cast-wrap
          svg.port-arrow(v-if="introBeat === 2" viewBox="-20 -34 40 34" aria-hidden="true")
            path(d="M0 -30 L0 -4 M0 -4 L-12 -15 M0 -4 L12 -15" fill="none" stroke="#ffd76a" stroke-width="6" stroke-linecap="round")
          button.duel-plate.cast-btn.port-cast(
            :class="{ live: castLive }"
            :aria-label="castLive ? castLabel : t('hud.castAria')"
            @click="emit('cast')"
          )
            span.cast-glow(v-if="castLive")
            span.ink-text.cast-label(:style="{ color: castLive ? '#fff' : '#7a6f95' }") {{ castLabel }}
        button.duel-plate.icon-btn.port-icon(v-if="SPELLBOOK" :class="{ 'book-new': bookHud.hasNew }" :aria-label="t('hud.spellbook')" @click="emit('book')")
          GameIcon.gear.small(name="book")
        button.duel-plate.icon-btn.port-icon(:aria-label="t('hud.sound')" :aria-pressed="muted" @click="emit('mute')")
          span.ink-text(:style="{ fontSize: '26px', color: muted ? '#7a6f95' : '#fff' }") ♪

      DuelPopups(:portrait="true")
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
    outline: 3px solid var(--duel-gold)
    outline-offset: 3px

.cast-btn
  display: flex
  align-items: center
  justify-content: center
  background: var(--duel-plate)
  border-radius: 18px
  &.live
    background: var(--duel-plate-live)

// The pulsing gold ring around a loaded CAST button.
.cast-glow
  position: absolute
  inset: -9.5px
  border: 4px solid var(--duel-gold)
  border-radius: 24px
  animation: duel-glow 1.11s ease-in-out infinite
  pointer-events: none

.cast-label
  position: relative
  padding: 0 0.3em
  max-width: 100%
  overflow: hidden
  text-overflow: ellipsis

.gear
  width: 44px
  height: 44px
  filter: drop-shadow(0 0 0 var(--duel-ink)) drop-shadow(2px 2px 0 var(--duel-ink))
  &.small
    width: 28px
    height: 28px

.icon-btn
  display: flex
  align-items: center
  justify-content: center
  color: #fff
  background: var(--duel-plate)

.breathe
  --from: 0.34
  --to: 0.5
  animation: duel-breathe 2s ease-in-out infinite

.weak
  --from: 0.55
  --to: 0.8
  animation: duel-breathe 1.67s ease-in-out infinite

.intro-arrow
  overflow: visible
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

.port-row.bars
  height: calc(30px * var(--pu))
  --hp-font: calc(15px * var(--pu))
  .port-bar
    flex: 1 1 0
    height: 100%
    min-width: 0
  :deep(.hp-bar)
    --lw: 3px

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
  animation: duel-breathe 1.11s ease-in-out infinite
  --from: 0.55
  --to: 1
</style>
