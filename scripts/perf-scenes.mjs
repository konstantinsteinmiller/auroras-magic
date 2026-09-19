#!/usr/bin/env node
// ─── Scenario baseline: every scene, throttled, on a BUILT bundle ───────────
//
// The S8 performance pass (story-spec §8.22, PERF-LEDGER.md), kept as a tool
// so the next release re-measures the same thing the same way.
//
//   npx vite build --base=./ --outDir=dist-perf
//   node scripts/perf-scenes.mjs dist-perf [cpuRate=4] [query=""] [profile=land]
//
//   profile   land  915×412 DPR 2 touch (the mid-range Android proxy)
//             port  412×915 DPR 2 touch
//             desk  1280×720 DPR 1
//   query     extra URL params, e.g. "art=on" for the painted-art census
//   env       DUEL_MS (default 60000), SCENE_MS (default 15000)
//
// The built bundle is served by a private static server that gzips text like
// every portal CDN does (an uncompressed server prices a download no player
// makes). Chrome runs HEADED on a private profile — headless skips the raster
// work being priced — with a CPU throttle and a Fast-3G link for the boot.
// The in-game probe (`?perfprobe=1`, `usePerfProbe`) reports work-per-frame
// and RAF-interval percentiles, long tasks and heap slope per scenario, and a
// canvas census counts every canvas the page ever creates:
//   boot       cold load to the splash clearing
//   duel       the 10-5 boss, both sides casting the late kit every 600 ms
//   map        a finished save on chapter 10's page, every prop alive
//   wipe       the 10-5 boss sector's restore, brushed continuously
//   versus     two players casting at once
//   wardrobe   Aurora in every keepsake
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from 'playwright-core'
const DIST = resolve(process.argv[2] ?? 'dist')
const RATE = Number(process.argv[3] ?? 4)
const QS = process.argv[4] ?? ''
// Profile: `land` 915×412 or `port` 412×915, both DPR 2 touch (the mid-range
// Android proxy), or `desk` 1280×720 DPR 1.
const PROFILE = process.argv[5] ?? 'land'
const VIEW = { land: { width: 915, height: 412, dpr: 2, mobile: true }, port: { width: 412, height: 915, dpr: 2, mobile: true }, desk: { width: 1280, height: 720, dpr: 1, mobile: false } }[PROFILE]
const DUEL_MS = Number(process.env.DUEL_MS ?? 60000)
const SCENE_MS = Number(process.env.SCENE_MS ?? 15000)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' }
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (p.endsWith('/')) p += 'index.html'
  const f = join(DIST, p)
  if (!existsSync(f) || !statSync(f).isFile()) { res.statusCode = 404; res.end(); return }
  res.setHeader('Content-Type', MIME[extname(f)] ?? 'application/octet-stream')
  // Every portal CDN serves text gzipped; an uncompressed test server would
  // price a download no player ever makes.
  const body = readFileSync(f)
  if (/\.(js|css|html|json|svg|webmanifest)$/.test(f) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
    res.setHeader('Content-Encoding', 'gzip')
    res.end(gzipSync(body, { level: 9 }))
  } else res.end(body)
})
const PORT = 5100 + Math.floor(Math.random() * 90)
await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
const URL = `http://127.0.0.1:${PORT}/?perfprobe=1${QS ? `&${QS}` : ''}`
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=30,30', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] })
const ctx = await browser.newContext({
  viewport: { width: VIEW.width, height: VIEW.height }, deviceScaleFactor: VIEW.dpr, hasTouch: VIEW.mobile, isMobile: VIEW.mobile,
  userAgent: VIEW.mobile ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' : undefined,
  locale: 'en-US'
})
await ctx.addInitScript(() => {
  window.__AM_QA__ = true
  // The canvas census (scoped-art-invalidation): every canvas ever created.
  window.__canvasCount = 0
  const make = Document.prototype.createElement
  Document.prototype.createElement = function (tag, ...rest) {
    if (String(tag).toLowerCase() === 'canvas') window.__canvasCount++
    return make.call(this, tag, ...rest)
  }
})
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 })
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE })
const t0 = Date.now()
await page.goto(URL)
if (!/Auroras Magic/.test(await page.title())) throw new Error('wrong app')
await page.waitForFunction(() => !!window.__flow && !!window.__campaign && document.getElementById('static-splash')?.classList.contains('hidden') !== false, null, { timeout: 90000 })
const boot = (Date.now() - t0) / 1000
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
await page.waitForTimeout(1500)
const rows = [`profile ${PROFILE} ${VIEW.width}×${VIEW.height} DPR ${VIEW.dpr}, CPU ×${RATE}${QS ? `, ${QS}` : ''}`, `boot (Fast 3G): ${boot.toFixed(1)} s to the splash clearing; canvases so far ${await page.evaluate(() => window.__canvasCount)}`]

const record = async (name, drive, ms = SCENE_MS) => {
  await page.evaluate(() => window.__perfProbe.reset())
  const end = Date.now() + ms
  while (Date.now() < end) { await drive(); await page.waitForTimeout(100) }
  const s = await page.evaluate(() => window.__perfProbe.summary())
  const canvases = await page.evaluate(() => window.__canvasCount ?? null)
  rows.push(`${name.padEnd(9)} frames ${String(s.frames).padStart(4)}  work p50 ${s.workP50.toFixed(2)} p95 ${s.workP95.toFixed(2)} p99 ${s.workP99.toFixed(2)} ms  interval p50 ${s.intervalP50.toFixed(1)} p95 ${s.intervalP95.toFixed(1)} ms  long tasks ${s.longTasks}  heap ${s.heapSlope} B/frame${canvases !== null ? `  canvases ${canvases}` : ''}`)
}
const full = () => page.evaluate(() => {
  const c = window.__campaign.state()
  c.furthestNode = 48
  c.sectorsDone = btoa(String.fromCharCode(255, 255, 255, 255, 255, 255, 1))
  c.runesUnlocked = 0xfff
  c.signaturesUnlocked = 3
  c.versusUnlocked = true
  c.finaleSeen = false
  window.__S.wins = 60
})
await full()

// ── duel: the finale boss, both sides casting ──
await page.evaluate(() => window.__gotoNode(49))
await page.waitForFunction(() => window.__flow.state().scene === 'duel' && !window.__flow.fading(), null, { timeout: 20000 })
await page.waitForTimeout(3000)
let tick = 0
await record('duel', async () => {
  if (tick++ % 6) return
  await page.evaluate((k) => {
    const S = window.__S
    S.hp = S.hpMax; S.ehp = S.ehpMax
    const kits = [[0, 5], [11, 4], [6, 2], [3, 8], [10, 7], [9, 1]]
    S.queue = [...kits[k % kits.length]]
    window.__cast()
  }, tick)
}, DUEL_MS)
await page.evaluate(() => window.__flow.leave())
await page.waitForTimeout(1500)

// ── map: chapter 10's page, everything restored and alive ──
await page.evaluate(() => { window.__campaign.state().furthestNode = 49; window.__flow.goto('map', 48) })
await page.waitForTimeout(2500)
await record('map', async () => {})

// ── wipe: the boss sector, brushed continuously ──
await page.evaluate(() => window.__wipe.reset(49))
await page.evaluate(() => window.__toWipe(49))
await page.waitForTimeout(1500)
let row = 0
await record('wipe', async () => {
  await page.evaluate((r) => {
    const w = innerWidth, h = innerHeight
    const y = h * (0.2 + ((r * 37) % 60) / 100)
    const pts = []
    for (let x = w * 0.1; x < w * 0.9; x += 14) pts.push(x, y + Math.sin(x / 40) * 20)
    window.__wipe.stroke(pts)
  }, row++)
})
await page.evaluate(() => window.__finishWipe())
await page.waitForTimeout(4000)

// ── versus: both players casting ──
await page.evaluate(() => { window.__flow.goto('map', 49) })
await page.waitForTimeout(800)
await page.evaluate(() => { window.__versus.open() })
await page.waitForFunction(() => window.__flow.state().scene === 'versusSetup' && !window.__flow.fading(), null, { timeout: 10000 })
await page.evaluate(() => window.__versus.start())
await page.waitForFunction(() => window.__flow.state().scene === 'duel' && !window.__flow.fading(), null, { timeout: 10000 }).catch(() => {})
await page.waitForTimeout(3500)
tick = 0
await record('versus', async () => {
  if (tick++ % 6) return
  await page.evaluate((k) => {
    const S = window.__S
    S.hp = S.hpMax; S.ehp = S.ehpMax
    S.queue = [k % 12, (k + 5) % 12]
    S.equeue = [(k + 3) % 12, (k + 7) % 12]
    window.__cast()
    window.__castSide?.(true)
  }, tick)
})
await page.evaluate(() => window.__flow.leave())
await page.waitForTimeout(1500)

// ── wardrobe: every keepsake on ──
await page.evaluate(() => {
  const c = window.__campaign.state()
  c.giftsOwned = 0x3ff
  c.giftsEquipped = [0, 1, 2, 8, 3, 5, 6]
  window.__flow.goto('wardrobe', 49)
})
await page.waitForTimeout(2500)
await record('wardrobe', async () => {})

console.log(rows.join('\n'))
console.log(errs.length ? `ERRORS ${[...new Set(errs)].join(' | ')}` : 'no page errors')
await browser.close()
server.close()
