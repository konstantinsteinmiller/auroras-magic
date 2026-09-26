#!/usr/bin/env node
// ─── Interleaved A/B/A/B performance runner ─────────────────────────────────
//
// Drives a HEADED Chrome on a private profile over CDP, loads the same page
// twice under two different variant flags, and reports whether the change won.
// Procedure and past results: `PERF-LEDGER.md`.
//
// ── Two things here are not incidental ──
//
// HEADED, with a visible attached canvas. A headless run of this project's
// particle benchmark reported 25.4 ms and 3.98 ms for the SAME untouched arm on
// consecutive runs: a canvas that is never composited lets the browser skip the
// raster work you are trying to price, and `getImageData` does not reliably
// force it. Headless is fine for correctness, never for paint cost.
//
// PRIVATE PROFILE. The shared MCP Chrome profile is usually locked by another
// session; this spawns its own so it never fights for it, and never has to
// close a browser that belongs to someone's open work.
//
// ── Usage ──
//
//   pnpm dev                                   # in another terminal
//   pnpm perf:ab --a "perf=smoke-legacy" --b ""
//
//   --base <url>      page under test   (default the dev server's game route)
//   --a / --b <qs>    query fragment appended to each arm; `--b ""` means "the
//                     shipping path, no flags". A is conventionally the
//                     BASELINE so a negative delta reads as an improvement.
//   --reps <n>        repetitions of each arm, interleaved      (default 6)
//   --throttle <n>    CPU throttling rate; 4 ≈ a mid-range 2021 Android (4)
//   --frames <n>      frames recorded per run                   (default 600)
//   --metric <k>      workP95 | workP50 | intervalP50 | intervalP95 (workP95)
//   --chrome <path>   Chrome executable
//   --drive <name>    scenario to play while recording: `none` (default, the
//                     scene the page happens to boot into) or `duel`
//   --mobile 1        915x412 DPR 2 touch, the mid-range Android proxy
//   --view WxH@dpr    a specific phone instead, touch + Android UA
//                     (e.g. 914x411@1.75, the moto e(7i) power)
//   --gpu sw          software raster and compositing (`--disable-gpu`). A
//                     low-end Android canvas is fill-bound; on a desktop GPU
//                     the fill is free and a pixel change measures as nothing.
//                     With the canvas drawn on the CPU, its raster lands in
//                     the frame INTERVAL (not in work-per-frame, which ends
//                     before the raster runs) — use `--metric intervalP95`.
//   --quiet <pct>     hold each rep until the box is below this CPU load (55)
//
// The page must publish `window.__perf` and set `window.__perfDone`; both come
// free from `installPerfProbe` in `src/use/usePerfProbe.ts`.
//
// ── Why `--drive duel` exists ──
//
// Without it this runner records whatever the page boots into, which for a
// fresh profile is a splash and then a story beat: a scene with almost no
// draw work in it. Every duel-side experiment then A/B's the SAME idle screen
// under two flags and reports a confident null. The driver loads a finished
// save, walks into the finale duel, resets the probe once the fight is up so
// the boot is not in the sample, and casts a fresh pair of runes every 600 ms
// for the whole recording — the worst realistic moment the skill asks for.

import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback
}

const CHROME = arg('chrome', process.env.CHROME_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe')
const BASE = arg('base', 'http://127.0.0.1:5173/?perfprobe=1')
const A_QS = arg('a', '')
const B_QS = arg('b', '')
const REPS = Number(arg('reps', 6))
const THROTTLE = Number(arg('throttle', 4))
const FRAMES = Number(arg('frames', 600))
const METRIC = arg('metric', 'workP95')
const PORT = Number(arg('port', 9400 + Math.floor(Math.random() * 400)))
const PROFILE = arg('profile', mkdtempSync(join(tmpdir(), 'perf-ab-')))
const DRIVE = arg('drive', 'none')
const MOBILE = arg('mobile', '0') === '1'
const QUIET = Number(arg('quiet', 55))
const GPU = arg('gpu', 'hw')
const VIEW = (() => {
  const m = /^(\d+)x(\d+)@([\d.]+)$/.exec(arg('view', ''))
  return m ? { width: +m[1], height: +m[2], deviceScaleFactor: +m[3] } : null
})()

/* ─── Contention gate ───────────────────────────────────────────────────────
 *
 * Ported from `perf-builds.mjs`, which learned it the expensive way: this
 * machine hosts other agent sessions, and one of them starting a test run
 * mid-experiment collapsed every rep after it — in BOTH arms, which reads as
 * a result and is an artefact. Interleaving protects against slow drift, not
 * against a neighbour who starts compiling halfway through rep 3.
 *
 * So a rep does not start until the box is quiet, and each rep also carries
 * the load it ran at, so a rep that went ahead anyway can be thrown out after
 * the fact rather than believed.
 */
const cpuLoad = () => {
  try {
    return Number(execFileSync('powershell', ['-NoProfile', '-Command',
      '(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average'],
      { encoding: 'utf8' }).trim())
  } catch { return 0 }
}
const waitQuiet = async (maxPct = QUIET, maxWaitMs = 12 * 60 * 1000) => {
  if (maxPct >= 100) return 0
  const until = Date.now() + maxWaitMs
  let calm = 0
  while (Date.now() < until) {
    const l = cpuLoad()
    if (l <= maxPct) { if (++calm >= 2) return l } else { calm = 0; console.log(`  … waiting for a quiet machine (cpu ${l}%)`) }
    await sleep(4000)
  }
  console.log('  ! gave up waiting for a quiet machine — treat this run as suspect')
  return -1
}

const withQs = (base, qs) => {
  const u = new URL(base)
  u.searchParams.set('perfprobe', '1')
  u.searchParams.set('perfframes', String(FRAMES))
  for (const pair of qs.split('&').filter(Boolean)) {
    const [k, v = ''] = pair.split('=')
    u.searchParams.set(k, v)
  }
  return u.toString()
}

const ARMS = [
  ['A_base', withQs(BASE, A_QS), A_QS],
  ['B_test', withQs(BASE, B_QS), B_QS]
]

const CHROME_ARGS = [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  // Without these the browser quietly throttles a window it thinks is idle or
  // occluded, and a rep that happened to be behind another window reads as a
  // regression that has nothing to do with the code.
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  VIEW ? `--window-size=${VIEW.width + 30},${VIEW.height + 90}` : MOBILE ? '--window-size=940,500' : '--window-size=520,1000',
  ...(GPU === 'sw' ? ['--disable-gpu'] : []),
  'about:blank'
]
const chrome = spawn(CHROME, CHROME_ARGS, { stdio: 'ignore' })

const api = `http://127.0.0.1:${PORT}/json`

/** Bring a dead browser back on the same debugging port. */
let browser = chrome
const relaunch = async () => {
  try { browser.kill() } catch { /* already gone */ }
  await sleep(1500)
  browser = spawn(CHROME, CHROME_ARGS, { stdio: 'ignore' })
  await waitForChrome()
}

const waitForChrome = async () => {
  for (let i = 0; i < 160; i++) {
    try {
      const r = await fetch(`${api}/version`)
      if (r.ok) return r.json()
    } catch { /* not up yet */ }
    await sleep(250)
  }
  throw new Error('Chrome did not expose a debugging port')
}

let msgId = 0
const connect = wsUrl => {
  const ws = new WebSocket(wsUrl)
  const pending = new Map()
  const ready = new Promise((res, rej) => {
    ws.onopen = () => res()
    ws.onerror = e => rej(new Error(`ws error ${e?.message ?? ''}`))
  })
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data)
    const p = m.id && pending.get(m.id)
    if (!p) return
    pending.delete(m.id)
    m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result)
  }
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++msgId
    pending.set(id, { res, rej })
    ws.send(JSON.stringify({ id, method, params }))
  })
  return { ws, ready, send }
}

/* ─── the duel driver ──────────────────────────────────────────────────────
 *
 * Runs in the page. Every step is idempotent and polls rather than assuming,
 * because under a 4x throttle a scene change takes longer than any fixed wait
 * anyone would have guessed. The QA hooks it uses (`__campaign`, `__flow`,
 * `__gotoNode`, `__S`, `__cast`) are the ones `AppScene.vue` exposes on a dev
 * server, a debug build, or when `__AM_QA__` was set before boot.
 */
const DUEL_SETUP = `(async () => {
  const wait = async (fn, ms) => {
    const end = Date.now() + ms
    while (Date.now() < end) { if (fn()) return true; await new Promise(r => setTimeout(r, 120)) }
    return false
  }
  if (!await wait(() => window.__flow && window.__campaign && window.__S && window.__gotoNode, 90000)) return 'no hooks'
  const c = window.__campaign.state()
  c.furthestNode = 48
  c.sectorsDone = btoa(String.fromCharCode(255, 255, 255, 255, 255, 255, 1))
  c.runesUnlocked = 0xfff
  c.signaturesUnlocked = 3
  c.versusUnlocked = true
  c.finaleSeen = false
  // Every keepsake ON. The rig cosmetics (the Pet Star's twinkle trail, the
  // soft glows) draw only when they are worn, and a scenario that leaves them
  // in the drawer prices a duellist nobody who has finished the game plays.
  c.giftsOwned = 0x3ff
  c.giftsEquipped = [0, 1, 2, 8, 3, 5, 6]
  window.__S.wins = 60
  window.__gotoNode(49)
  // Every duel opens with its five-second VS preview now; this measures the
  // DUEL, so the preview hands over at once.
  window.__preview?.finish()
  if (!await wait(() => window.__flow.state().scene === 'duel' && !window.__flow.fading(), 60000)) return 'no duel'
  // Arm it the way a player would, or the foe holds her first rune forever.
  window.__arm?.()
  // A FIXED settle, the same in both arms, and long enough for the adaptive
  // quality controller to finish climbing (its dwell is 3 s, plus the
  // smoothers). Without it an arm that ends at tier 2 spends a third of its
  // recording at tier 1 and the measured cost of the tier is diluted by
  // however fast the machine happened to boot.
  await new Promise(r => setTimeout(r, 14000))
  // The boot, the fade and the first bake are not what this experiment is
  // about. Everything recorded from here is a frame of the fight.
  window.__perfProbe.reset()
  window.__abTick = 0
  window.__abTierAtStart = window.__S.q
  // Sample the tier while the arm records. An arm whose number is a blend of
  // two tiers is not a measurement of either, so the run has to say so.
  window.__abFlips = 0
  window.__abTierMin = window.__S.q
  let last = window.__S.q
  window.__abWatch = setInterval(() => {
    const q = window.__S.q
    if (q !== last) { window.__abFlips++; last = q }
    if (q < window.__abTierMin) window.__abTierMin = q
  }, 100)
  window.__abCast = setInterval(() => {
    try {
      const S = window.__S
      S.hp = S.hpMax; S.ehp = S.ehpMax
      const kits = [[0, 5], [11, 4], [6, 2], [3, 8], [10, 7], [9, 1]]
      S.queue = [...kits[(window.__abTick++) % kits.length]]
      window.__cast()
    } catch { /* a frame between scenes */ }
  }, 600)
  return 'ok'
})()`

const runOnce = async url => {
  const t = await (await fetch(`${api}/new?about:blank`, { method: 'PUT' })).json()
  const { ws, ready, send } = connect(t.webSocketDebuggerUrl)
  await ready
  try {
    await send('Page.enable')
    await send('Runtime.enable')
    await send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
    if (MOBILE || VIEW) {
      await send('Emulation.setDeviceMetricsOverride',
        { ...(VIEW ?? { width: 915, height: 412, deviceScaleFactor: 2 }), mobile: true })
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await send('Emulation.setUserAgentOverride', { userAgent:
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' })
    }
    // Announce the harness BEFORE the document exists: the QA hooks are
    // installed at boot, so a flag set after navigation is set too late.
    await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__AM_QA__ = true' })
    await send('Page.navigate', { url })
    // A stale server from another project answers this port just as happily.
    if (!(await waitTitle(send))) throw new Error(`the page at ${url} is not Auroras Magic`)
    if (DRIVE === 'duel') {
      const r = await send('Runtime.evaluate',
        { expression: DUEL_SETUP, awaitPromise: true, returnByValue: true })
      if (r?.result?.value !== 'ok') throw new Error(`driver failed: ${r?.result?.value ?? '?'}`)
    }
    for (let i = 0; i < 1200; i++) {
      await sleep(500)
      const r = await send('Runtime.evaluate', {
        expression: 'window.__perfDone ? JSON.stringify({ ...window.__perf, tier: window.__S?.q ?? null, tier0: window.__abTierAtStart ?? null, tierMin: window.__abTierMin ?? null, flips: window.__abFlips ?? 0, mix: +(window.__S?.qx ?? 0).toFixed(2), scene: window.__flow?.state().scene ?? null, canvas: (c => c ? c.width + "x" + c.height : "?")(document.querySelector("canvas")) }) : ""',
        returnByValue: true
      })
      if (r?.result?.value) return JSON.parse(r.result.value)
    }
    throw new Error(`run did not finish: ${url}`)
  } finally {
    await send('Runtime.evaluate', { expression: 'clearInterval(window.__abCast); clearInterval(window.__abWatch)' }).catch(() => {})
    ws.close()
    await fetch(`${api}/close/${t.id}`).catch(() => {})
  }
}

/** Refuse to measure somebody else's app. A server left running by another
 *  project serves this port without complaint and the numbers look fine. */
const waitTitle = async send => {
  for (let i = 0; i < 240; i++) {
    const r = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true })
    if (/Auroras Magic/i.test(r?.result?.value ?? '')) return true
    await sleep(250)
  }
  return false
}

const median = a => {
  const s = [...a].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** The flags an arm's query string asked for, so a typo can be caught. */
const wanted = qs => qs.split('&')
  .filter(p => p.startsWith('perf='))
  .flatMap(p => p.slice(5).split(','))
  .filter(Boolean)

const version = await waitForChrome()
console.log(`browser    ${version.Browser}`)
console.log(`base       ${BASE}`)
console.log(`arms       A "${A_QS || '(none)'}"   B "${B_QS || '(none)'}"`)
console.log(`throttle   ${THROTTLE}x    frames/rep ${FRAMES}    reps ${REPS}    gpu ${GPU}${VIEW ? `    view ${VIEW.width}x${VIEW.height}@${VIEW.deviceScaleFactor}` : ''}`)
console.log(`metric     ${METRIC}\n`)

const runs = { A_base: [], B_test: [] }
for (let rep = 0; rep < REPS; rep++) {
  // Flip the order on odd reps. Thermal drift, CPU boost and background load
  // all trend one way across a session, and a fixed A-then-B order hands that
  // drift to whichever arm runs first as a free win.
  const order = rep % 2 === 0 ? ARMS : [...ARMS].reverse()
  for (const [name, url, qs] of order) {
    const load = await waitQuiet()
    // Chrome does occasionally fall over mid-session on a loaded machine, and
    // a crashed browser in rep 3 must not throw away reps 1 and 2. One retry,
    // on a freshly launched browser, and the rep is simply redone.
    let r
    try {
      r = await runOnce(url)
    } catch (e) {
      console.log(`  ! rep failed (${e.message}); relaunching the browser`)
      await relaunch()
      r = await runOnce(url)
    }
    r.load = load
    // An unrecognised flag is silently false, which yields a clean, confident,
    // completely worthless A-versus-A result. Refuse to produce one.
    for (const f of wanted(qs)) {
      if (!r.variants?.includes(f)) {
        throw new Error(`arm ${name} asked for "${f}" but the page reported [${r.variants ?? ''}]`)
      }
    }
    runs[name].push(r)
    console.log(`rep ${String(rep + 1).padStart(2)} ${name}  ` +
      `workP50=${r.workP50.toFixed(3)}  workP95=${r.workP95.toFixed(3)}  workP99=${r.workP99.toFixed(3)}  ` +
      `intervalP50=${r.intervalP50.toFixed(2)}  intervalP95=${r.intervalP95.toFixed(2)}  longTasks=${r.longTasks}  canvas=${r.canvas}  ` +
      `heap=${(r.heapSlope / 1024).toFixed(1)}KB/f` +
      (r.tier === null || r.tier === undefined ? '' : `  q=${r.tier0}→${r.tier} (min ${r.tierMin}, ${r.flips} flips) qx=${r.mix} [${r.scene}]`) +
      `  cpu=${r.load}%`)
  }
}

const pick = r => r[METRIC]
const A = runs.A_base.map(pick)
const B = runs.B_test.map(pick)
const mA = median(A)
const mB = median(B)
const delta = (mB - mA) / mA * 100
const improve = -delta

// Paired, not unpaired. Each rep runs both arms back to back, so the question
// is whether B beat A rep for rep — not whether the gap clears one arm's spread
// across the session, which drift inflates for both arms equally.
const wins = A.filter((a, i) => B[i] < a).length
const disjoint = Math.max(...B) < Math.min(...A)

console.log('')
console.log(`median-of-rep ${METRIC}   A ${mA.toFixed(3)} ms  ->  B ${mB.toFixed(3)} ms   (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%)`)
console.log(`paired wins for B        ${wins}/${A.length} reps`)
console.log(`ranges                   A [${Math.min(...A).toFixed(3)}, ${Math.max(...A).toFixed(3)}]  ` +
  `B [${Math.min(...B).toFixed(3)}, ${Math.max(...B).toFixed(3)}]  ${disjoint ? 'DISJOINT' : 'overlapping'}`)

// Secondary metrics that can veto a win outright.
const iA = median(runs.A_base.map(r => r.intervalP95))
const iB = median(runs.B_test.map(r => r.intervalP95))
const hA = median(runs.A_base.map(r => r.heapSlope))
const hB = median(runs.B_test.map(r => r.heapSlope))
console.log(`RAF interval p95         A ${iA.toFixed(2)} ms -> B ${iB.toFixed(2)} ms`)
console.log(`heap slope               A ${(hA / 1024).toFixed(1)} KB/f -> B ${(hB / 1024).toFixed(1)} KB/f`)
console.log('')

if (iB > iA * 1.05) {
  console.log('VERDICT: NOT a win — RAF interval regressed >5%. CPU time was traded for GPU time.')
} else if (wins === A.length && disjoint && improve >= 5) {
  console.log('VERDICT: keep — won every rep, ranges do not overlap')
} else if (improve >= 5 && wins / A.length >= 0.8) {
  console.log('VERDICT: keep')
} else if (improve >= 3) {
  console.log('VERDICT: marginal — keep only if it also removes complexity')
} else if (improve > -3) {
  console.log('VERDICT: revert to the simpler code, and log the null result')
} else {
  console.log('VERDICT: regression — revert')
}
console.log('\nRecord this run in PERF-LEDGER.md, then delete the losing branch and its flag.')

browser.kill()
process.exit(0)
