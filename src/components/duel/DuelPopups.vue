<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { hudPops, hudLayout } from '@/use/useDuelHud'
import { POP_LIFE, type Pop } from '@/game/duel/state'
import { spellName } from '@/use/useSpellName'
import GameIcon from '@/components/icons/GameIcon.vue'
import { guardedLeft, popHalfEm, textEm } from '@/game/duel/popGuard'

/**
 * The floating callouts — "NOT A RUNE", "-12", "WEAK! -20", the spell name,
 * "VICTORY". The sim queues them (`pop()`), the frame loop ages and retires
 * them, and this component only renders the list: the rise / shrink / fade is
 * one CSS animation, paused with the rest of the HUD while the game is.
 *
 * Landscape renders inside the scaled stage layer, so a callout sits at its
 * stage coordinates exactly as the jam build drew it (46 px type, rising 84
 * units). Portrait maps the stage point to the screen and keeps a legible
 * floor on the type — the stage is a quarter scale on a phone held upright.
 */
const props = defineProps<{ portrait: boolean }>()
const { t, te, locale } = useI18n()

const text = (p: Pop): string => {
  if (p.k === 'almostRune') {
    // A rune without a translated name yet falls back to the plain miss.
    const k = `rune.${String(p.p?.rune ?? '')}`
    // Shouted like every callout; the LOCALE upper-cases the name, so a
    // Turkish i and a caseless script both come out right.
    return te(k) ? t('duel.almostRune', { rune: t(k).toLocaleUpperCase(locale.value) }) : t('pop.notARune')
  }
  if (p.k === 'spell') {
    // Golden/signature spells carry their own name; every other combo is
    // named by the generator's grammar (§10.12).
    const n = Number(p.p?.n ?? 1)
    const form = String(p.p?.form ?? '')
    const m = /^k(\d)\.c(\d)$/.exec(form)
    const name = p.p?.spell
      ? t(`spell.${p.p.spell}`)
      : spellName(t, locale.value, { nameId: null, kind: m ? +m[1]! : 0, count: m ? +m[2]! : n, rune: Number(p.p?.rune ?? 0) })
    return n > 1 ? `${name}  ${t('pop.times', { n })}` : name
  }
  // A blow her strength blunted (§6.6a) is wordless: the shield drawn before
  // it says "resisted", the number is a plain hit's, and its ×0.55 (its own
  // span, `mul`) is the strength badge's own words.
  if (p.k === 'resistHit') return t('pop.hit', p.p ?? {})
  return t(`pop.${p.k}`, p.p ?? {})
}

const scale = computed(() => {
  const L = hudLayout.value
  return props.portrait ? Math.max(L.vs, 20 / 46) : 1
})

/**
 * WHOSE A DAMAGE NUMBER IS (story-spec §8.36). The playtest saw a "−7" pop at
 * the end of a duel and nobody could say who had taken it. A plain hit's
 * number now wears its VICTIM's side — warm coral over Aurora, lilac over the
 * foe, each the family of her own health bar — and drifts off her, outward,
 * the way the blow pushed her, so it can never be read as the other one's.
 * A WEAK hit keeps its mint (the counter-hit says so in its own colour, and
 * only ever lands on the foe) and drifts the same way. So does a RESISTED one
 * (§6.6a): a shield before the number, both in the warm resist colour.
 */
const side = (p: Pop): string =>
  (p.v === undefined ? '' : p.v ? 'on-foe' : 'on-aurora') + (p.k === 'resistHit' ? ' is-resist' : '')

/** The resisted callout's "×0.55", in its own span at 0.72 em. */
const mulText = (p: Pop): string => (p.k === 'resistHit' && p.p?.m ? t('pop.times', { n: p.p.m }) : '')

/** A callout's width in its own em: its text, and for a resisted one the
 *  shield before it and its smaller ×0.55 (`popGuard.ts`). */
const widthEm = (p: Pop): number =>
  p.k === 'resistHit' ? 0.9 + textEm(text(p)) + 0.22 + 0.72 * textEm(mulText(p)) : textEm(text(p))

const style = (p: Pop) => {
  const L = hudLayout.value
  const x = props.portrait ? L.vx + p.x * L.vs : p.x
  const y = props.portrait ? L.vy + p.y * L.vs : p.y
  return {
    // EVERY callout stays on the screen (`popGuard.ts`): on a phone held
    // upright the foe's "x2 COMBO" and her numbers ran off its right edge, and
    // a long spell name nearly off its left. The centre keeps half the
    // callout's width (at its 1.4× pop, plus a number's drift) clear of both.
    left: guardedLeft(x, popHalfEm(widthEm(p), p.v !== undefined)),
    top: `${y}px`,
    // A side's plain hit takes its colour from the stylesheet's tokens.
    ...(p.v !== undefined && (p.k === 'hit' || p.k === 'resistHit') ? {} : { color: p.c }),
    fontSize: `${46 * scale.value}px`,
    '--k': String(scale.value),
    // A callout that is re-rendered mid-flight (a locale switch, a resize)
    // resumes where it was instead of restarting.
    animationDelay: `${-p.a}s`,
    animationDuration: `${POP_LIFE}s`
  }
}
</script>

<template lang="pug">
  div.duel-pops(:class="{ fixed: portrait }" aria-live="polite")
    span.duel-pop.ink-text(v-for="p in hudPops" :key="p.id" :class="side(p)" :style="style(p)")
      GameIcon.pop-shield(v-if="p.k === 'resistHit'" name="shield")
      | {{ text(p) }}
      span.pop-mul(v-if="mulText(p)") {{ mulText(p) }}
</template>

<style scoped lang="sass">
.duel-pops
  position: absolute
  inset: 0
  pointer-events: none

.duel-pop
  position: absolute
  animation-name: duel-pop
  animation-timing-function: linear
  animation-fill-mode: both

// A damage number drifts OFF its victim: Aurora's to the left, the foe's to
// the right — `--dx` is the direction, `--k` the portrait scale.
.on-aurora, .on-foe
  animation-name: duel-pop-drift
.on-aurora
  --dx: -1
  color: var(--am-coral)
.on-foe
  --dx: 1
  color: var(--am-lilac)
// Resisted (§6.6a): her strength took the edge off. The number and the
// shield before it in the muted resist colour, the shield in the same plum
// line the shouted type wears.
.on-foe.is-resist
  color: var(--am-resist)
.is-resist
  display: inline-flex
  align-items: center
  gap: 0.08em
.pop-mul
  margin-left: 0.22em
  font-size: 0.72em
.pop-shield
  flex: none
  width: 0.82em
  height: 0.82em
  :deep(path)
    stroke: var(--am-ink)
    stroke-width: 4px
    stroke-linejoin: round
    paint-order: stroke fill

// `duel-pop`'s rise and shrink (duel.sass), plus the sideways drift.
@keyframes duel-pop-drift
  0%
    transform: translate(-50%, -50%) translate(0, 0) scale(1.4)
    opacity: 1
  72%
    opacity: 1
  100%
    transform: translate(-50%, -50%) translate(calc(var(--dx, 0) * 46px * var(--k, 1)), calc(-84px * var(--k, 1))) scale(1)
    opacity: 0
</style>
