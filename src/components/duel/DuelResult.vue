<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PH_WIN, RUNE_IDS, RANK_BONUS, rankPrice, SW, SH } from '@/game/duel/config'
import { hud, hudLayout } from '@/use/useDuelHud'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'
import GameIcon from '@/components/icons/GameIcon.vue'

/**
 * Result panel AND the whole shop, as in the jam build. There is no separate
 * screen and no level select: the ladder walks itself, and the one moment the
 * player has coins they did not have before is the moment a duel ends — so
 * that is where the ranks are bought. A plate lights up only when its rank is
 * affordable; anywhere else on the panel starts the next duel.
 *
 * Two additions over the jam build, both small: the wallet and each plate's
 * price are printed (the jam build left the player to infer them), and on ad
 * builds a rewarded button offers ×2 on a win's coins, or a consolation purse
 * after a loss so a player stuck on a rung can still buy a rank. It exists only
 * while an ad can actually be served (`rewardLive`).
 */
const props = defineProps<{
  rewardLive: boolean
  rewardClaimed: boolean
  /** Coins the rewarded button pays. */
  rewardCoins: number
  keyboard: boolean
  paused: boolean
}>()
const emit = defineEmits<{ restart: []; buy: [i: number]; reward: [] }>()
const { t } = useI18n()

const L = computed(() => hudLayout.value)
const won = computed(() => hud.phase === PH_WIN)
const showReward = computed(() => props.rewardLive || props.rewardClaimed)
const rewardLabel = computed(() => {
  if (props.rewardClaimed) return t('result.claimed')
  return won.value ? t('result.double') : t('result.bonus', { n: props.rewardCoins })
})

const plates = computed(() => [0, 1, 2, 3].map((i) => {
  const rank = hud.up[i] ?? 0
  const price = rankPrice(rank)
  return {
    i,
    ok: hud.coins >= price,
    bonus: Math.round(rank * RANK_BONUS * 100),
    price,
    label: t('result.buyRank', { rune: t(`rune.${RUNE_IDS[i]}`), price })
  }
}))

/* Geometry: the jam build's panel, grown downward when a reward row joins it. */
const G = computed(() => showReward.value
  ? { panelY: 186, panelH: 390, title: 246, plates: 290, price: 384, reward: 404, tap: 500 }
  : { panelY: 196, panelH: 306, title: 262, plates: 316, price: 408, reward: 0, tap: 452 })

const box = (x: number, y: number, w: number, h: number) => ({
  left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`
})
const at = (x: number, y: number, size: number) => ({
  left: `${x}px`, top: `${y}px`, fontSize: `${size}px`, transform: 'translate(-50%, -50%)'
})
const stageStyle = computed(() => ({
  width: `${SW}px`,
  height: `${SH}px`,
  transform: `translate(${L.value.vx}px, ${L.value.vy}px) scale(${L.value.vs})`
}))

const onBackdrop = (): void => {
  if (hud.tapReady) emit('restart')
}
</script>

<template lang="pug">
  div.duel-result(:class="{ 'duel-paused': paused }" @click="onBackdrop")
    div.dim
    //- ═════════ LANDSCAPE: the jam build's stage coordinates ═════════
    div.stage-layer(v-if="!L.portrait" :style="stageStyle")
      div.abs.duel-plate.panel(:style="box(336, G.panelY - 4, 608, G.panelH + 8)")
      span.abs.ink-text(:style="[at(640, G.title, 52), { color: won ? '#ffd76a' : '#ff8092' }]") {{ won ? t('result.victory') : t('result.defeated') }}
      div.abs.wallet(:style="box(806, G.panelY + 14, 120, 32)" :aria-label="t('result.coins', { n: hud.coins })")
        GameIcon.coin(name="coin")
        span.ink-text {{ hud.coins }}
      template(v-for="p in plates" :key="p.i")
        button.abs.duel-plate.shop(
          :style="box(385.5 + p.i * 130, G.plates - 2.5, 119, 83)"
          :class="{ ok: p.ok }"
          :aria-label="p.label"
          :aria-disabled="!p.ok"
          @click.stop="emit('buy', p.i)"
        )
          span.shop-glyph(:style="{ opacity: p.ok ? 1 : 0.4 }")
            RuneGlyph(:rune="p.i")
          span.ink-text.ink-none.shop-bonus(:style="{ color: p.ok ? '#fff' : '#7a6f95' }") {{ t('result.rankBonus', { n: p.bonus }) }}
        span.abs.price(:style="at(445 + p.i * 130, G.price, 18)" :class="{ ok: p.ok }" aria-hidden="true")
          GameIcon.coin.tiny(name="coin")
          span {{ t('result.price', { n: p.price }) }}
      button.abs.duel-plate.reward(
        v-if="showReward"
        :style="box(467.5, G.reward - 2.5, 345, 63)"
        :class="{ claimed: rewardClaimed }"
        :disabled="rewardClaimed"
        :aria-label="t('result.watchAd', { reward: rewardLabel })"
        @click.stop="emit('reward')"
      )
        GameIcon.video(v-if="!rewardClaimed" name="video")
        span.ink-text(style="font-size: 30px") {{ rewardLabel }}
      button.abs.tap(
        v-if="hud.tapReady"
        :style="at(640, G.tap, 26)"
        @click.stop="emit('restart')"
      )
        span.ink-text {{ t('result.tapToDuel') }}

    //- ═════════ PORTRAIT: the same content in a centred card ═════════
    div.port-card.duel-plate(v-else @click.stop="onBackdrop")
      span.ink-text.port-title(:style="{ color: won ? '#ffd76a' : '#ff8092' }") {{ won ? t('result.victory') : t('result.defeated') }}
      div.wallet.port-wallet(:aria-label="t('result.coins', { n: hud.coins })")
        GameIcon.coin(name="coin")
        span.ink-text {{ hud.coins }}
      div.port-shop
        div.port-plate(v-for="p in plates" :key="p.i")
          button.duel-plate.shop(:class="{ ok: p.ok }" :aria-label="p.label" :aria-disabled="!p.ok" @click.stop="emit('buy', p.i)")
            span.shop-glyph(:style="{ opacity: p.ok ? 1 : 0.4 }")
              RuneGlyph(:rune="p.i")
            span.ink-text.ink-none.shop-bonus(:style="{ color: p.ok ? '#fff' : '#7a6f95' }") {{ t('result.rankBonus', { n: p.bonus }) }}
          span.price(:class="{ ok: p.ok }" aria-hidden="true")
            GameIcon.coin.tiny(name="coin")
            span {{ t('result.price', { n: p.price }) }}
      button.duel-plate.reward.port-reward(
        v-if="showReward"
        :class="{ claimed: rewardClaimed }"
        :disabled="rewardClaimed"
        :aria-label="t('result.watchAd', { reward: rewardLabel })"
        @click.stop="emit('reward')"
      )
        GameIcon.video(v-if="!rewardClaimed" name="video")
        span.ink-text {{ rewardLabel }}
      button.tap.port-tap(v-if="hud.tapReady" @click.stop="emit('restart')")
        span.ink-text {{ t('result.tapToDuel') }}
</template>

<style scoped lang="sass">
.duel-result
  position: absolute
  inset: 0
  pointer-events: auto
  overflow: hidden

.dim
  position: absolute
  inset: 0
  background: rgba(6, 4, 12, 0.77)

.stage-layer
  position: absolute
  left: 0
  top: 0
  transform-origin: 0 0

.abs
  position: absolute

.panel
  --lw: 8px
  background: #1a1230
  border-radius: 32px

button
  cursor: pointer
  padding: 0
  margin: 0
  font: inherit
  color: inherit
  background: none
  border: none
  -webkit-tap-highlight-color: transparent
  transition: transform 0.08s ease-out
  &:active:not(:disabled)
    transform: scale(0.96)
  &:focus-visible
    outline: 3px solid var(--duel-gold)
    outline-offset: 3px

.shop
  --lw: 5px
  display: flex
  align-items: center
  justify-content: space-between
  padding: 0 8px 0 6px
  background: var(--duel-plate)
  border: 5px solid var(--duel-ink)
  border-radius: 16px
  &.ok
    background: var(--duel-plate-live)

.shop-glyph
  width: 47px
  height: 47px
  flex: 0 0 auto

.shop-bonus
  font-size: 21px
  flex: 1 1 auto
  text-align: center

.price
  display: inline-flex
  align-items: center
  gap: 3px
  font-family: system-ui, sans-serif
  font-weight: 800
  color: var(--duel-disabled)
  white-space: nowrap
  &.ok
    color: var(--duel-gold)

.wallet
  display: flex
  align-items: center
  justify-content: flex-end
  gap: 6px
  font-size: 24px
  color: #fff

.coin
  width: 26px
  height: 26px
  color: var(--duel-gold)
  &.tiny
    width: 0.95em
    height: 0.95em

.video
  width: 30px
  height: 30px
  color: #fff
  flex: 0 0 auto

.reward
  display: flex
  align-items: center
  justify-content: center
  gap: 10px
  background: #2a7a3f
  border: 5px solid var(--duel-ink)
  border-radius: 16px
  color: #fff
  &.claimed
    background: var(--duel-plate)
    cursor: default
    opacity: 0.8

.tap
  animation: duel-breathe 1.43s ease-in-out infinite
  --from: 0.5
  --to: 1
  color: #fff

// ── portrait card ──
.port-card
  --lw: 6px
  position: absolute
  left: 50%
  top: 50%
  transform: translate(-50%, -50%)
  width: min(92vw, 420px)
  display: flex
  flex-direction: column
  align-items: center
  gap: 14px
  padding: 20px 14px 18px
  background: #1a1230
  border-radius: 26px

.port-title
  font-size: clamp(30px, 10vw, 44px)

.port-wallet
  margin-top: -6px
  font-size: 18px
  justify-content: center

.port-shop
  display: grid
  grid-template-columns: repeat(2, 1fr)
  gap: 10px 12px
  width: 100%

.port-plate
  display: flex
  flex-direction: column
  align-items: center
  gap: 4px
  .shop
    width: 100%
    height: 58px
  .price
    font-size: 15px

.port-reward
  width: 100%
  height: 54px
  font-size: clamp(18px, 5.6vw, 24px)

.port-tap
  font-size: 22px
  margin-top: 4px
</style>
