<script setup lang="ts">
/**
 * /#/art-sheets — the reference-sheet bench (DEV ONLY; art-generation-pipeline
 * Phase 1). Draws every drawable in `artSheet.ts` with the game's own
 * painters onto its lattice and writes, through the dev server's
 * `/__art/save-sheet`, into `art-sheets/`:
 *
 *   sector-<id>.png   one per sector, opaque, 1152 × 672
 *   story-intro-<n>.png  the intro's pages, opaque, 1152 × 672, WITH the cast
 *   item-<id>.png     one per item (and keepsake badge), magenta, its panels
 *                     side by side (+ item-<id>-key.png, the captions, for strips)
 *   rune-<name>.png   one per rune, magenta, the RuneGlyph box
 *   portrait-<who>.png  one per speaker, magenta, a panel per expression
 *   island-<n>-<chapter>.png  one per chapter, magenta, the duel's island
 *   sheet-index.json  every rect, target, crop and measured fit
 *   PROMPTS-*.md      the prompts, with the measured fits in their SIZE clauses
 *
 * `?only=stem,stem` exports just those references (the index and the prompt
 * documents are always rewritten whole). Dev tooling, not player-facing: its
 * copy is English on purpose.
 */
import { onMounted, ref } from 'vue'
import {
  SECTOR_SHEETS, STORY_SHEETS, SECTOR_REF, SECTOR_THUMB, ITEM_MAX_EDGE, ART_STYLE_ID, promptDocs,
  type Fit, type ItemSheet, type SectorSheet, type StorySheet
} from '@/game/artSheet'
import { ALL_ITEM_SHEETS, layoutOf, measureFit, renderItemSheet, renderKeySheet, renderSectorSheet, renderStorySheet } from '@/game/artDraw'

const busy = ref(false)
const status = ref('idle')
const only = ref<Set<string> | null>(null)
const sectorPreviews = ref<HTMLCanvasElement[]>([])
const storyPreviews = ref<HTMLCanvasElement[]>([])
const itemPreviews = ref<HTMLCanvasElement[]>([])

const save = async (name: string, body: { dataUrl?: string; text?: string }): Promise<void> => {
  const r = await fetch('/__art/save-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, ...body })
  })
  if (!r.ok) throw new Error(`${name}: ${r.status} ${await r.text()}`)
}

const sectorEntry = (s: SectorSheet) => ({
  id: s.file,
  kind: 'sector',
  title: `${s.chapter}-${(s.node % 5) + 1} ${s.title}`,
  files: { clean: `${s.file}.png` },
  bg: 'opaque',
  size: { w: SECTOR_REF.w, h: SECTOR_REF.h },
  cells: [{
    id: s.id, label: s.title, target: s.target, w: SECTOR_REF.w, h: SECTOR_REF.h,
    extra: [{ target: s.thumb, w: SECTOR_THUMB.w, h: SECTOR_THUMB.h }]
  }]
})

/** An intro page: opaque like a sector, painted WITH its characters. */
const storyEntry = (s: StorySheet) => ({
  id: s.file,
  kind: 'story',
  title: `Intro ${s.panel} ${s.title}`,
  files: { clean: `${s.file}.png` },
  bg: 'opaque',
  size: { w: SECTOR_REF.w, h: SECTOR_REF.h },
  cells: [{ id: s.id, label: s.title, target: s.target, w: SECTOR_REF.w, h: SECTOR_REF.h }]
})

const itemEntry = (s: ItemSheet, fit: Fit) => {
  const L = layoutOf(s)
  return {
    id: s.file,
    kind: s.kind === 'rune' || s.kind === 'portrait' || s.kind === 'island' ? s.kind : 'item',
    title: s.title,
    files: { clean: `${s.file}.png`, ...(s.frames > 1 ? { key: `${s.file}-key.png` } : {}) },
    bg: 'magenta',
    size: { w: L.w, h: L.h },
    frames: s.frames,
    panel: { w: L.panelW, h: L.panelH },
    crop: L.crop,
    anchor: s.anchor,
    maxEdge: ITEM_MAX_EDGE,
    fit,
    cells: [{ id: s.id, label: s.title, target: s.target, fit }]
  }
}

const wanted = (stem: string): boolean => !only.value || only.value.has(stem)

const exportAll = async (): Promise<void> => {
  if (busy.value) return
  busy.value = true
  const t0 = performance.now()
  try {
    const sheets: unknown[] = []
    const fits: Record<string, Fit> = {}
    let n = 0
    for (const s of SECTOR_SHEETS) {
      if (wanted(s.file)) {
        status.value = `sector ${++n}: ${s.file}`
        await save(`${s.file}.png`, { dataUrl: renderSectorSheet(s).toDataURL('image/png') })
      }
      sheets.push(sectorEntry(s))
    }
    for (const s of STORY_SHEETS) {
      if (wanted(s.file)) {
        status.value = `page ${++n}: ${s.file}`
        await save(`${s.file}.png`, { dataUrl: renderStorySheet(s).toDataURL('image/png') })
      }
      sheets.push(storyEntry(s))
    }
    for (const s of ALL_ITEM_SHEETS) {
      const fit = measureFit(s)
      fits[s.file] = fit
      if (wanted(s.file)) {
        status.value = `sheet ${++n}: ${s.file}`
        await save(`${s.file}.png`, { dataUrl: renderItemSheet(s).toDataURL('image/png') })
        if (s.frames > 1) await save(`${s.file}-key.png`, { dataUrl: renderKeySheet(s).toDataURL('image/png') })
      }
      sheets.push(itemEntry(s, fit))
    }
    status.value = 'index and prompts'
    await save('sheet-index.json', {
      text: `${JSON.stringify({ version: 1, style: ART_STYLE_ID, sheets }, null, 2)}\n`
    })
    for (const [name, text] of Object.entries(promptDocs(fits))) await save(name, { text })
    status.value = `done: ${n} references, ${sheets.length} in the index, ${((performance.now() - t0) / 1000).toFixed(1)} s`
  } catch (e) {
    status.value = `FAILED: ${(e as Error).message}`
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  try {
    const q = window.location.hash.split('?')[1] ?? ''
    const raw = new URLSearchParams(q).get('only')
    if (raw) only.value = new Set(raw.split(',').map((x) => x.trim()).filter(Boolean))
  } catch { /* no filter */ }
  // Previews: every sector small, every item and rune at half size.
  sectorPreviews.value = SECTOR_SHEETS.map((s) => renderSectorSheet(s))
  storyPreviews.value = STORY_SHEETS.map((s) => renderStorySheet(s))
  itemPreviews.value = ALL_ITEM_SHEETS.map((s) => renderItemSheet(s))
})

const mount = (cv: HTMLCanvasElement) => (el: unknown): void => {
  if (el instanceof HTMLElement && !el.firstChild) el.appendChild(cv)
}
</script>

<template lang="pug">
  .art-sheets
    h1 Auroras Magic — Art sheets
    .bar
      button(:disabled="busy" @click="exportAll") Export all
      span.status {{ status }}
      span.hint(v-if="only") only: {{ [...only].join(', ') }}
    h2 Sectors ({{ SECTOR_SHEETS.length }}) — opaque, 1152 × 672, landmark neutral
    .grid.sectors
      figure(v-for="(s, i) in SECTOR_SHEETS" :key="s.file")
        .cv(:ref="sectorPreviews[i] ? mount(sectorPreviews[i]) : undefined")
        figcaption {{ s.chapter }}-{{ (s.node % 5) + 1 }} {{ s.title }} · {{ s.landmark }}
    h2 The intro's pages ({{ STORY_SHEETS.length }}) — opaque, 1152 × 672, painted from the character models
    .grid.sectors
      figure(v-for="(s, i) in STORY_SHEETS" :key="s.file")
        .cv(:ref="storyPreviews[i] ? mount(storyPreviews[i]) : undefined")
        figcaption Intro {{ s.panel }} {{ s.title }} · models: {{ s.also.join(', ') }}
    h2 Items, keepsakes, runes, portraits and islands ({{ ALL_ITEM_SHEETS.length }}) — magenta, box = {{ Math.round(0.72 * 100) }} % of a panel
    .grid.items
      figure(v-for="(s, i) in ALL_ITEM_SHEETS" :key="s.file" :class="{ wide: s.frames > 1 }")
        .cv(:ref="itemPreviews[i] ? mount(itemPreviews[i]) : undefined")
        figcaption {{ s.title }} · {{ s.frames }} panel{{ s.frames > 1 ? 's' : '' }} → {{ s.target }}
</template>

<style scoped lang="sass">
.art-sheets
  position: fixed
  inset: 0
  z-index: 10000
  overflow: auto
  padding: 16px
  background: #f4f0f7
  color: #3A2340
  font: 14px/1.4 system-ui, sans-serif
  user-select: text
h1
  margin: 0 0 8px
  font-size: 22px
h2
  margin: 20px 0 8px
  font-size: 16px
.bar
  position: sticky
  top: 0
  display: flex
  gap: 12px
  align-items: center
  padding: 8px 0
  background: #f4f0f7
  z-index: 1
  button
    padding: 6px 14px
    font-weight: 700
.grid
  display: grid
  gap: 12px
  &.sectors
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))
  &.items
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))
    .wide
      grid-column: span 2
figure
  margin: 0
  .cv :deep(canvas)
    width: 100%
    height: auto
    display: block
    border-radius: 6px
  figcaption
    font-size: 12px
    margin-top: 4px
</style>
