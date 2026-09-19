<script setup lang="ts">
/**
 * /#/playground — painted vs drawn, in motion (DEV ONLY; art-generation-
 * pipeline Phase 4). Everything here is drawn by the GAME'S OWN painters —
 * `paintSectorArt`/`sec.paint`, `drawGift`, `drawChest`, `drawBrush`,
 * `drawUnicorn` with the real keepsake hooks, `RuneGlyph` — so what is on
 * screen is what the game will show. The art layer flips live (session only,
 * nothing remembered), because a painting is only ever wrong RELATIVE to the
 * drawing it stands in for.
 *
 * Dev tooling, not player-facing: its copy is English on purpose.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { artOverridesEnabled, artProbeCount, onArtChanged, refreshArtOverrides, setArtOverrides } from '@/game/art'
import { SECTOR_SHEETS } from '@/game/artSheet'
import { sectorOf } from '@/game/map/sectors'
import { paintSectorArt, sectorPainted } from '@/game/map/sectorArt'
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { drawGift, drawBoxGift, drawChest, drawBrush, drawEraser, giftShake, chestRattle } from '@/game/restore/gift'
import { TENT_ART, tentShape } from '@/game/map/tent'
import { drawItem } from '@/game/artItem'
import { drawFlowerCrown, drawPetStar, drawStarBody } from '@/game/cosmetics/rig-cosmetics'
import { drawUnicorn, type PoseState } from '@/game/duel/chars'
import { RUNES } from '@/game/duel/config'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'

const art = ref(artOverridesEnabled())
const probes = ref(0)
const node = ref(0)
const pot = ref(0)
const thumb = ref(false)
const ribbon = ref(0)
const sectorCv = ref<HTMLCanvasElement | null>(null)
const itemsCv = ref<HTMLCanvasElement | null>(null)

const RIBBONS = ['#63e24a', '#59b6ff', '#8ff0ff', '#c28bff', '#b8c4dd', '#ff8fd0', '#ffb066', '#8ea0ff', '#ffd23a', '#ff6f9c']

const flip = (): void => {
  setArtOverrides(!art.value, false)
  art.value = artOverridesEnabled()
}
const refresh = (): void => refreshArtOverrides()

/* ── the sector: its static layer, baked like the game bakes it ── */
let baked: HTMLCanvasElement | null = null
let bakedKey = ''
const layer = (): HTMLCanvasElement => {
  const sec = sectorOf(node.value)
  const key = `${node.value}:${pot.value}:${thumb.value}:${art.value}:${sectorPainted(node.value, thumb.value)}`
  if (baked && key === bakedKey) return baked
  const cv = document.createElement('canvas')
  const w = thumb.value ? 384 : SEC_W
  const h = thumb.value ? 224 : SEC_H
  cv.width = w
  cv.height = h
  const g = cv.getContext('2d')!
  g.setTransform(w / SEC_W, 0, 0, h / SEC_H, 0, 0)
  const p = sec.pots[pot.value] ?? sec.pots[0]!
  if (!paintSectorArt(g, node.value, sec, p, thumb.value)) sec.paint(g, p)
  baked = cv
  bakedKey = key
  return cv
}
watch([node, pot, thumb], () => { bakedKey = '' })

const drawSector = (t: number): void => {
  const cv = sectorCv.value
  const g = cv?.getContext('2d')
  if (!cv || !g) return
  const sec = sectorOf(node.value)
  g.setTransform(cv.width / SEC_W, 0, 0, cv.height / SEC_H, 0, 0)
  g.drawImage(layer(), 0, 0, SEC_W, SEC_H)
  // Its props are live in the game, painted or not: the check is that they
  // still sit where the painting left room for them.
  sec.props(g, t, 1)
  const peek = 0.5 - 0.5 * Math.cos(t * 1.6)
  sec.tap?.draw(g, peek, t)
  sec.rescue?.draw(g, peek, t)
  g.setTransform(1, 0, 0, 1, 0, 0)
}

/* ── the items, each doing what it does in the game ── */
const POSE: PoseState = { form: 0.2 }
const drawItems = (t: number): void => {
  const cv = itemsCv.value
  const g = cv?.getContext('2d')
  if (!cv || !g) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = '#cfe8c8'
  g.fillRect(0, 0, cv.width, cv.height)
  g.fillStyle = '#b2d6a8'
  g.fillRect(0, 300, cv.width, cv.height - 300)
  const rb = RIBBONS[ribbon.value]!
  // Untie / open cycles: 1.6 s shaking, 0.6 s opening, 0.8 s open.
  const cyc = t % 3
  const u = cyc < 1.6 ? 0 : Math.min(1, (cyc - 1.6) / 0.6)
  drawGift(g, 110, 300, 130, { rot: u ? 0 : giftShake(t), untie: u, squash: 1 + u * 0.05, ribbon: rb, ribbonShade: rb })
  drawBoxGift(g, 270, 300, 130, { rot: u ? 0 : giftShake(t + 0.4), untie: u, squash: 1, ribbon: rb, ribbonShade: rb })
  drawChest(g, 460, 300, 130, { rot: u ? 0 : chestRattle(t), open: u, gleam: u ? 1 : 0.35 + 0.65 * Math.max(0, Math.sin(t * 5)) }, rb)
  // The brush paints a figure of eight, turned along its heading.
  const bx = 690 + Math.sin(t * 1.4) * 70
  const by = 170 + Math.sin(t * 2.8) * 40
  const ang = Math.atan2(Math.cos(t * 2.8) * 2.8 * 40, Math.cos(t * 1.4) * 1.4 * 70)
  drawBrush(g, bx, by, 110, ang, t)
  drawEraser(g, 870, 230 + Math.sin(t * 6) * 6, 110, Math.sin(t * 3) * 0.4)
  // The tent, as the map draws it.
  g.save()
  g.translate(1030, 300)
  // 150 px: one px per tent unit, so the drawing needs no scale.
  if (!drawItem(g, TENT_ART, 150)) tentShape(g, Math.sin(t * 3) * 4)
  g.restore()
  // The pet star's three faces, and the crown alone at 3x.
  g.save()
  g.translate(1180, 120)
  const face = Math.floor(t / 1.2) % 3
  drawStarBody(g, 40, face === 1, face === 2)
  g.restore()
  g.save()
  g.translate(1180, 290)
  g.scale(3, 3)
  g.translate(0, 19)
  drawFlowerCrown(g)
  g.restore()
  // Aurora in both keepsakes, as the wardrobe draws her.
  g.save()
  g.translate(1400, 300)
  g.scale(1.2, 1.2)
  POSE.form = 0.15 + 0.1 * Math.sin(t * 1.4)
  POSE.afterHead = drawFlowerCrown
  POSE.afterRig = (rg, a) => { rg.save(); drawPetStar(rg, a); rg.restore() }
  drawUnicorn(g, 0, 0, -1, POSE, t)
  g.restore()
}

let raf = 0
const t0 = performance.now()
const frame = (): void => {
  const t = (performance.now() - t0) / 1000
  drawSector(t)
  drawItems(t)
  probes.value = artProbeCount()
  raf = requestAnimationFrame(frame)
}
let off: (() => void) | null = null
onMounted(() => {
  off = onArtChanged(() => { bakedKey = '' })
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  off?.()
})
</script>

<template lang="pug">
  .playground
    h1 Auroras Magic — Playground
    .bar
      button(@click="flip") Art: {{ art ? 'PAINTED' : 'DRAWN' }}
      button(@click="refresh") Re-probe files
      span {{ probes }} probes
      label
        | Sector
        select(v-model.number="node")
          option(v-for="s in SECTOR_SHEETS" :key="s.node" :value="s.node") {{ s.chapter }}-{{ (s.node % 5) + 1 }} {{ s.title }}
      label
        | Pot
        select(v-model.number="pot")
          option(v-for="i in 3" :key="i" :value="i - 1") {{ i }}
      label
        input(type="checkbox" v-model="thumb")
        | map thumb
      label
        | Ribbon
        select(v-model.number="ribbon")
          option(v-for="(c, i) in RIBBONS" :key="c" :value="i") chapter {{ i + 1 }}
    canvas.sector(ref="sectorCv" width="1152" height="672")
    canvas.items(ref="itemsCv" width="1560" height="400")
    .runes
      .rune(v-for="(r, k) in RUNES" :key="k")
        RuneGlyph(:rune="k" :size="72")
</template>

<style scoped lang="sass">
.playground
  position: fixed
  inset: 0
  z-index: 10000
  overflow: auto
  padding: 16px
  background: #f4f0f7
  color: #3A2340
  font: 14px/1.4 system-ui, sans-serif
h1
  margin: 0 0 8px
  font-size: 22px
.bar
  display: flex
  flex-wrap: wrap
  gap: 12px
  align-items: center
  margin-bottom: 12px
  button
    padding: 6px 14px
    font-weight: 700
  label
    display: flex
    gap: 6px
    align-items: center
canvas
  display: block
  max-width: 100%
  height: auto
  border-radius: 8px
  margin-bottom: 12px
.runes
  display: flex
  flex-wrap: wrap
  gap: 12px
  .rune
    background: #2b1f3a
    border-radius: 10px
    padding: 6px
</style>
