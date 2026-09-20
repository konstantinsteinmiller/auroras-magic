#!/usr/bin/env node
// ─── Does the copy fit the chrome, in every language? ───────────────────────
//
// Tours every screen that carries text, in every locale the game ships, at
// three viewports, and reports the labels that do not fit their box. A German
// player saw "Zum Duell tippe|" with the last letters under the Map button and
// a loss title half a panel wider than the panel; both were invisible to every
// test we had, because a clipped word breaks no assertion.
//
//   node tools/locale-fit/audit.mjs                 # every locale, land+port
//   node tools/locale-fit/audit.mjs --locales de,ru --shots   # + screenshots
//
//   --locales a,b      locales to tour        (default: all of LANGUAGES)
//   --views land,port  land 915x412 / port 412x915 / desk 1280x720
//   --shots            write a PNG per scene under tools/locale-fit/shots/
//   --headed           watch it work
//   --times            print how long the probe takes per screen
//   --server URL       drive this dev server instead of starting one
//   --port N           port for a server this run starts itself
//
// ── What counts as "does not fit" ──
//
//   SPILL     the element's content is wider (or taller) than its own box and
//             that box does not scroll. This is the one that catches plates
//             and grid tracks: a fixed-width button whose label is too long
//             reports scrollWidth past clientWidth.
//   ESCAPES   a caption whose ink leaves the button it labels.
//   CLIPPED   an ancestor with hidden overflow cuts the ink off.
//   OFFSCREEN the ink runs off the viewport.
//   COVERED   something opaque is painted on top of the ink. A label that
//             spills out of an UNCLIPPED box is cut nowhere — the only thing
//             that gives it away is the control its tail vanishes under.
//
// A box that has to be able to hold the word is therefore expressed IN THE
// DOM (a width plus `overflow: hidden`), never only in the designer's head:
// that is what makes the first rule able to see it. `v-fit` then shrinks the
// word into that box, so the audit stays green in 21 languages.
//
// ── The traps, each of which cost a run ──
//
// THE DEV SERVER, not a build: the audit is about layout, and the built
// bundle's obfuscator pass changes nothing a box measures. But the port must
// be OURS — another game's dev server answers a GET happily, and you end up
// auditing someone else's app. The title is checked before anything is
// measured.
//
// SCROLLERS ARE NOT OVERFLOWS. `.f-tabs` scrolls sideways by design and the
// spellbook's list scrolls down by design; both report scrollWidth or
// scrollHeight past their client box on purpose. Anything whose computed
// overflow is `auto`/`scroll` on that axis is exempt.
//
// A SCENE THAT NEVER CAME UP measures nothing and passes. Every step asserts
// the marker element it expects before it audits, and a step that cannot be
// reached is reported as SKIPPED rather than quietly counted as clean. Every
// step is also BOUNDED: `page.evaluate` has no timeout of its own, so one
// wedged renderer used to hang a 40-minute sweep with nothing printed.
//
// WHAT IT DOES NOT VISIT: the rune ceremony (§8.30), the finale card and the
// ad-blocker explainer. All three set their copy as wrapping `story-text` in a
// box with a `max-width`, which is the shape that cannot overflow; the screens
// that broke are the ones that paint a fixed size into a fixed box.
//
// A MODAL IS MODAL. While a dialog is up it covers the scene on purpose, so
// the audit measures inside the dialog and nowhere else. Without that, every
// label in the game behind an open Options panel reports as hidden — 200 rows
// of noise around the two findings that matter.

import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..', '..')

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(`--${name}`)

const ALL_LOCALES = ['en', 'ar', 'zh', 'de', 'nl', 'es', 'fr', 'hi', 'id', 'it', 'ja', 'kk', 'ko', 'pl', 'pt', 'ru', 'th', 'tr', 'uk', 'uz', 'vi']
const LOCALES = (arg('locales', '') || ALL_LOCALES.join(',')).split(',').map((s) => s.trim()).filter(Boolean)
const VIEWS = {
  land: { width: 915, height: 412, dpr: 2, mobile: true },
  port: { width: 412, height: 915, dpr: 2, mobile: true },
  desk: { width: 1280, height: 720, dpr: 1, mobile: false }
}
const VIEW_IDS = (arg('views', 'land,port')).split(',').map((s) => s.trim()).filter((v) => VIEWS[v])
const SHOTS = flag('shots')
const HEADED = flag('headed')
const TIMES = flag('times')
const PORT = Number(arg('port', String(5250 + Math.floor(Math.random() * 400))))
const SHOT_DIR = resolve(HERE, 'shots')

/* ── the in-page probe ────────────────────────────────────────────────────
 *
 * Runs in the page, returns plain data. Kept as a string so it can be
 * installed once per context with `addInitScript`. */
const PROBE = () => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'CANVAS', 'SVG', 'PATH', 'G', 'CIRCLE', 'RECT', 'IMG', 'BR', 'HEAD', 'HTML', 'LINK', 'META'])
  const visible = (el, cs) => cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.02
  const ownText = (el) => {
    let s = ''
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.textContent
    return s.trim()
  }
  const path = (el) => {
    const bits = []
    for (let e = el; e && e !== document.body && bits.length < 4; e = e.parentElement) {
      const cls = (e.className && typeof e.className === 'string' ? e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
      bits.unshift(e.tagName.toLowerCase() + (cls ? `.${cls}` : ''))
    }
    return bits.join(' > ')
  }
  /** The ink itself, not the box: an inline box is exactly its glyphs. */
  const inkRect = (el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const r = range.getBoundingClientRect()
    range.detach?.()
    return r.width > 0 ? r : el.getBoundingClientRect()
  }

  window.__fitAudit = () => {
    const out = []
    const add = (o) => out.push(o)

    // Every check below is about where the ink lands, and `elementsFromPoint`
    // — the only honest answer to "is this word actually visible" — skips
    // anything with `pointer-events: none`. Half this HUD is exactly that, so
    // the property is suspended for the length of the measurement. It changes
    // no geometry: nothing reflows, nothing repaints differently.
    const pe = document.createElement('style')
    pe.textContent = '*{pointer-events:auto !important}'
    document.head.appendChild(pe)

    // A MODAL IS MODAL. While a dialog is up, the scene behind it is covered
    // on purpose — measuring it reports the whole HUD as hidden. Audit inside
    // the dialogs then, and only there.
    const dialogs = [...document.querySelectorAll('[aria-modal="true"], [role="dialog"], .reward')]
      .filter((d) => visible(d, getComputedStyle(d)))
    const scope = dialogs.length
      ? dialogs.flatMap((d) => [d, ...d.querySelectorAll('*')])
      : [...document.querySelectorAll('body *')]

    for (const el of scope) {
      if (SKIP.has(el.tagName)) continue
      const cs = getComputedStyle(el)
      if (!visible(el, cs)) continue
      const text = ownText(el)
      if (!text) continue
      const box = el.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) continue
      const ink = inkRect(el)
      const where = path(el)
      const what = text.slice(0, 42)

      // 1. THE WORD IS WIDER THAN ITS OWN BOX. A fixed-width plate, a grid
      //    track, a flex item that cannot grow: the text is either cut off
      //    (overflow hidden) or hanging out of the plate it belongs to.
      const scrollsX = cs.overflowX === 'auto' || cs.overflowX === 'scroll'
      const scrollsY = cs.overflowY === 'auto' || cs.overflowY === 'scroll'
      if (el.clientWidth > 0 && !scrollsX && el.scrollWidth - el.clientWidth > 1) {
        add({ kind: 'SPILL', axis: 'x', by: Math.round(el.scrollWidth - el.clientWidth), where, text: what })
      }
      // A line box is shorter than the face that fills it (Arial's ascent plus
      // descent is ~1.15 em), so a couple of px past a clipping box is the
      // font's overhang, not a cut word. An eighth of an em is well under one
      // line and still catches the real thing — `line-height: 1` on a caption
      // was shaving 7 px off the ink outline of every spell name.
      const slackY = Math.max(3, Number.parseFloat(cs.fontSize) * 0.12)
      if (el.clientHeight > 0 && !scrollsY && cs.overflowY === 'hidden' && el.scrollHeight - el.clientHeight > slackY) {
        add({ kind: 'SPILL', axis: 'y', by: Math.round(el.scrollHeight - el.clientHeight), where, text: what })
      }

      // 2. THE WORD LEAVES THE CONTROL IT LABELS. A caption belongs inside its
      //    button; a button is never ambiguous about where its edge is.
      const btn = el.closest('button')
      if (btn && btn !== el) {
        const b = btn.getBoundingClientRect()
        const over = Math.max(0, Math.round(Math.max(b.left - ink.left, ink.right - b.right)))
        if (over > 2) add({ kind: 'ESCAPES', by: over, where, onto: path(btn), text: what })
      }

      // 3. THE WORD IS CLIPPED BY AN ANCESTOR that hides its overflow.
      //
      //    A SCROLLER IS NOT A CLIP. The map's chapter ribbon scrolls when ten
      //    tabs do not fit a phone, so chapter 10 sitting past the right edge
      //    is the design working — reading it as a cut reported the whole strip
      //    as broken in every locale.
      let scrolled = false
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const acs = getComputedStyle(a)
        if (/auto|scroll/.test(acs.overflowX) || /auto|scroll/.test(acs.overflowY)) { scrolled = true; break }
        if (acs.overflowX !== 'hidden' && acs.overflowX !== 'clip') continue
        const ar = a.getBoundingClientRect()
        const cut = Math.max(0, Math.round(Math.max(ar.left - ink.left, ink.right - ar.right)))
        if (cut > 2) { add({ kind: 'CLIPPED', by: cut, where, onto: path(a), text: what }); break }
      }

      // 4. THE WORD RUNS OFF THE SCREEN.
      if (!scrolled && (ink.right > innerWidth + 2 || ink.left < -2)) {
        add({ kind: 'OFFSCREEN', by: Math.round(Math.max(ink.right - innerWidth, -ink.left)), where, text: what })
      }

      // 5. SOMETHING IS PAINTED ON TOP OF IT. A label that spills out of an
      //    unclipped box is not cut anywhere — the only thing that gives it
      //    away is the control its tail disappears under.
      if (ink.width >= 8) {
        const y = ink.top + ink.height / 2
        let covered = 0, by = null
        for (let i = 0; i < 12; i++) {
          const x = ink.left + 1 + (ink.width - 2) * (i / 11)
          if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) continue
          const stack = document.elementsFromPoint(x, y)
          const mine = stack.findIndex((e) => e === el || el.contains(e))
          if (mine < 0) continue
          // Only an opaque-ish box above it actually hides ink; an invisible
          // hit area (a dim layer is BELOW, so it never appears here) does not.
          const above = stack.slice(0, mine).find((e) => {
            if (e.contains(el)) return false
            const c = getComputedStyle(e)
            const m = /rgba?\(([^)]+)\)/.exec(c.backgroundColor)
            const alpha = m ? Number(m[1].split(',')[3] ?? 1) : 0
            if (alpha <= 0.3) return false
            // A modal IS meant to cover the scene under it. Anything that
            // covers the whole viewport is doing its job, not hiding a label.
            const er = e.getBoundingClientRect()
            if (er.width * er.height > innerWidth * innerHeight * 0.9) return false
            return true
          })
          if (above) { covered++; by = path(above) }
        }
        if (covered >= 2) add({ kind: 'COVERED', by: covered, where, onto: by, text: what })
      }
    }
    pe.remove()

    const seen = new Set()
    return out.filter((o) => {
      const k = `${o.kind}|${o.axis ?? ''}|${o.where}|${o.text}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }
}

/* ── dev server ─────────────────────────────────────────────────────────── */
//
// REUSE the project's dev server if one is already up, and only start one if
// not. Two vite servers for the same project share `node_modules/.vite`, and
// their dependency optimisers overwrite each other's cache: the second server
// answers the HTML and then hangs every module request, which reads exactly
// like a dead app and costs a run to diagnose. The owner usually has one
// running already — that one is the app, and it is never ours to stop.
const servesUs = async (url) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    return /<title>\s*Auroras Magic/i.test(await res.text())
  } catch {
    return false
  }
}

/** Ports that a vite process of THIS project is listening on. */
const runningServers = () => {
  if (process.platform !== 'win32') return []
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\"" +
      " | Where-Object { $_.CommandLine -like '*vite*' } | ForEach-Object {" +
      " Get-NetTCPConnection -State Listen -OwningProcess $_.ProcessId -ErrorAction SilentlyContinue" +
      " | Select-Object -ExpandProperty LocalPort }"], { encoding: 'utf8' })
    return [...new Set(out.split(/\s+/).map(Number).filter((n) => n > 0))]
  } catch {
    return []
  }
}

const startDev = async () => {
  const proc = spawn(process.execPath,
    [resolve(ROOT, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  // Vite paints its banner with ANSI colour, so `Local:` and the URL are not
  // adjacent in the raw stream — strip the escapes before matching.
  const strip = (d) => String(d).replace(/\[[0-9;]*m/g, '')
  proc.stdout.on('data', (d) => { log += strip(d) })
  proc.stderr.on('data', (d) => { log += strip(d) })
  const t0 = Date.now()
  while (Date.now() - t0 < 60000) {
    if (/Local:\s+http/.test(log)) return { base: `http://127.0.0.1:${PORT}`, proc }
    if (/EADDRINUSE|already in use/.test(log)) throw new Error(`port ${PORT} is taken:
${log}`)
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`vite did not start:
${log}`)
}

/** The server this run will drive: a given one, a running one, or a new one. */
const resolveServer = async () => {
  const given = arg('server', '')
  if (given) {
    if (!await servesUs(given)) throw new Error(`${given} does not serve Auroras Magic`)
    return { base: given.replace(/\/$/, ''), proc: null }
  }
  for (const port of runningServers()) {
    const url = `http://localhost:${port}/`
    if (await servesUs(url)) {
      process.stderr.write(`· reusing the dev server on :${port}
`)
      return { base: `http://localhost:${port}`, proc: null }
    }
  }
  return startDev()
}

/** Reject rather than wait forever — see the note in the step loop. */
const withTimeout = (promise, ms, what) => Promise.race([
  promise,
  new Promise((_, rej) => setTimeout(() => rej(new Error(what)), ms))
])

/* ── the tour ───────────────────────────────────────────────────────────── */
//
// Every step: reach the screen, prove it is up, audit it. `need` is the
// selector that proves it; a step that never gets there is SKIPPED, never
// silently clean.
const STEPS = [
  {
    id: 'intro',
    need: '.intro-scene .skip',
    go: async (p) => { await p.evaluate(() => window.__intro?.step(3)) }
  },
  {
    id: 'intro-play',
    need: '.intro-scene .play',
    // The PLAY button is raised by the intro's own clock in its LAST beat, and
    // running that clock past the end leaves the intro altogether — so the
    // clock is nudged half a second at a time and stopped the moment the
    // button is there.
    go: async (p) => {
      for (let i = 0; i < 60; i++) {
        if (await p.locator('.intro-scene .play').count()) break
        await p.evaluate(() => window.__intro?.step(0.5))
        await p.waitForTimeout(40)
      }
    }
  },
  {
    id: 'dialogue',
    need: '.dialogue-scene',
    go: async (p) => {
      await p.evaluate(async () => {
        await window.__intro?.pass()
        window.__flow.goto('dialogue', 0)
      })
    }
  },
  {
    id: 'duel',
    need: '.duel-hud',
    go: async (p) => {
      await p.evaluate(() => window.__gotoNode(0))
      await p.waitForFunction(() => window.__flow.state().scene === 'duel' && !window.__flow.fading(), null, { timeout: 15000 })
      // A loaded CAST button, so the live caption (a spell's name) is measured
      // rather than the idle one.
      await p.evaluate(() => { window.__S.queue = [0, 5] })
    }
  },
  {
    id: 'duel-loss',
    need: '.duel-result .retry',
    go: async (p) => {
      await p.evaluate(() => { window.__S.hp = 0 })
    }
  },
  {
    id: 'options',
    need: '.f-modal',
    // Back in a live duel first: the LEAVE DUEL row only exists there, and it
    // is the longest sentence the modal ever has to hold.
    go: async (p) => {
      await p.evaluate(() => window.__gotoNode(0))
      await p.waitForFunction(() => window.__flow.state().scene === 'duel' && !window.__flow.fading(), null, { timeout: 15000 })
      await p.evaluate(() => window.__flow.openOverlay('options'))
    }
  },
  {
    id: 'options-parents',
    need: '.parents',
    go: async (p) => {
      const tabs = p.locator('.f-tabs__tab')
      const n = await tabs.count()
      if (n > 1) await tabs.nth(n - 1).click({ timeout: 4000 }).catch(() => {})
    }
  },
  {
    id: 'options-leave',
    need: '.leave-confirm',
    go: async (p) => {
      const tabs = p.locator('.f-tabs__tab')
      if (await tabs.count()) await tabs.first().click({ timeout: 4000 }).catch(() => {})
      // "Leave the duel" is the last plain button on the general tab.
      const btns = p.locator('.f-modal__content button.f-button')
      const n = await btns.count()
      if (n) await btns.nth(n - 1).click({ timeout: 4000 }).catch(() => {})
    }
  },
  {
    id: 'spellbook',
    need: '.spellbook .tome',
    go: async (p) => {
      await p.evaluate(() => {
        window.__flow.closeOverlay()
        const c = window.__campaign.state()
        c.runesUnlocked = 0xfff
        window.__flow.openOverlay('spellbook')
      })
    }
  },
  {
    id: 'map',
    need: '.map-scene',
    go: async (p) => {
      await p.evaluate(() => {
        window.__flow.closeOverlay()
        const c = window.__campaign.state()
        c.furthestNode = 30
        c.versusUnlocked = true
        window.__S.wins = 31
        window.__flow.goto('map', 29)
      })
    }
  },
  {
    id: 'leaderboard',
    need: '.f-modal',
    go: async (p) => {
      const b = p.locator('.map-scene .corner button').nth(2)
      if (await b.count()) await b.click({ timeout: 4000 }).catch(() => {})
    }
  },
  {
    id: 'wardrobe',
    need: '.wardrobe-scene',
    go: async (p) => {
      // The board is a `v-model` on the app root with no QA hook: close it the
      // way a player does, or it rides along over every later screen.
      const x = p.locator('.f-modal__close')
      if (await x.count()) await x.first().click({ timeout: 4000 }).catch(() => {})
      await p.evaluate(() => {
        const c = window.__campaign.state()
        c.giftsOwned = 0x3ff
        window.__flow.goto('wardrobe', 29)
      })
    }
  },
  {
    id: 'unbox',
    need: '.unbox-scene',
    go: async (p) => {
      await p.evaluate(() => window.__toInvite(3))
    }
  },
  {
    id: 'wipe',
    need: '.wipe-scene',
    go: async (p) => {
      await p.evaluate(() => window.__toWipe(3))
      await p.waitForTimeout(600)
    }
  },
  {
    id: 'versus',
    need: '.versus-setup',
    go: async (p) => {
      await p.evaluate(() => {
        window.__flow.goto('map', 29)
        window.__versus.open()
      })
    }
  },
  {
    id: 'versus-duel',
    need: '.duel-hud',
    go: async (p) => {
      await p.evaluate(() => window.__versus.start())
      await p.waitForFunction(() => window.__flow.state().scene === 'duel', null, { timeout: 15000 }).catch(() => {})
      await p.evaluate(() => { window.__S.queue = [0, 5]; window.__S.equeue = [1, 4] })
    }
  }
]

/* ── one locale × one viewport ──────────────────────────────────────────── */
const tour = async (browser, base, locale, viewId, findings) => {
  const v = VIEWS[viewId]
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.dpr,
    hasTouch: v.mobile,
    isMobile: v.mobile,
    locale,
    userAgent: v.mobile ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' : undefined
  })
  await ctx.addInitScript(PROBE)
  await ctx.addInitScript(([code]) => {
    window.__AM_QA__ = true
    try {
      localStorage.setItem('auroras_magic_state', JSON.stringify({ am_user_language: code }))
    } catch { /* private mode: the context locale still steers it */ }
  }, [locale])
  const page = await ctx.newPage()
  // Vite's first request of a run optimises the dependency graph, which on a
  // cold cache is well past Playwright's 30 s default.
  page.setDefaultNavigationTimeout(120000)
  page.setDefaultTimeout(20000)
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
  const title = await page.title()
  if (!/Auroras Magic/i.test(title)) throw new Error(`${base} is not ours — it served "${title}"`)
  await page.waitForFunction(() => !!window.__flow && !!window.__campaign, null, { timeout: 60000 })
  // A trusted gesture arms the session; without it some scenes hold.
  await page.mouse.click(v.width / 2, v.height - 10).catch(() => {})
  await page.waitForTimeout(400)

  for (const step of STEPS) {
    try {
      // BOUNDED, always. `page.evaluate` has no timeout of its own, so a
      // renderer that stops answering — a scene mid-navigation, a hook that
      // never settles — hangs the whole sweep with no output at all. A step
      // that cannot finish in half a minute is a step that did not happen.
      await withTimeout(step.go(page), 30000, `${step.id} took too long`)
    } catch (e) {
      findings.push({ locale, view: viewId, step: step.id, kind: 'SKIPPED', text: String(e.message).slice(0, 80) })
      continue
    }
    let up = true
    try {
      await page.waitForSelector(step.need, { timeout: 8000, state: 'visible' })
    } catch {
      up = false
    }
    if (!up) {
      findings.push({ locale, view: viewId, step: step.id, kind: 'SKIPPED', text: `never showed ${step.need}` })
      continue
    }
    await page.waitForTimeout(450)
    const t0 = Date.now()
    let rows = []
    try {
      rows = await withTimeout(page.evaluate(() => window.__fitAudit()), 30000, 'the probe did not answer')
    } catch (e) {
      findings.push({ locale, view: viewId, step: step.id, kind: 'SKIPPED', text: String(e.message).slice(0, 80) })
      continue
    }
    for (const r of rows) findings.push({ locale, view: viewId, step: step.id, ...r })
    if (TIMES) process.stderr.write(`    ${step.id.padEnd(16)} probe ${Date.now() - t0} ms
`)
    if (SHOTS) {
      mkdirSync(SHOT_DIR, { recursive: true })
      await page.screenshot({ path: resolve(SHOT_DIR, `${locale}-${viewId}-${step.id}.png`) })
    }
  }
  await ctx.close()
}

/* ── run ────────────────────────────────────────────────────────────────── */
const { base, proc: dev } = await resolveServer()
const browser = await chromium.launch({ channel: 'chrome', headless: !HEADED })
const findings = []
try {
  for (const locale of LOCALES) {
    for (const viewId of VIEW_IDS) {
      process.stderr.write(`· ${locale} ${viewId}\n`)
      try {
        await tour(browser, base, locale, viewId, findings)
      } catch (e) {
        findings.push({ locale, view: viewId, step: '-', kind: 'ERROR', text: String(e.message).slice(0, 120) })
      }
    }
  }
} finally {
  await browser.close()
  // Only ever stop a server this run started, and stop it synchronously and by
  // tree: an async kill can outlive this process and leave the port held.
  if (dev) {
    if (process.platform === 'win32') {
      try { execFileSync('taskkill', ['/pid', String(dev.pid), '/f', '/t'], { stdio: 'ignore' }) } catch { /* already gone */ }
    }
    dev.kill()
  }
}

const bad = findings.filter((f) => f.kind !== 'SKIPPED')
const byStep = new Map()
for (const f of bad) {
  const k = `${f.step}|${f.kind}|${f.axis ?? ''}|${f.where ?? ''}|${(f.text ?? '').slice(0, 30)}`
  const e = byStep.get(k) ?? { ...f, locales: new Set(), views: new Set(), worst: 0 }
  e.locales.add(f.locale)
  e.views.add(f.view)
  e.worst = Math.max(e.worst, f.by ?? 0)
  byStep.set(k, e)
}
const rows = [...byStep.values()].sort((a, b) => b.locales.size - a.locales.size || b.worst - a.worst)
console.log(`\n${rows.length} distinct problems over ${LOCALES.length} locales × ${VIEW_IDS.join('/')}\n`)
for (const r of rows) {
  const by = r.worst ? ` by ${r.worst}${r.kind === 'COVERED' ? '/12 samples' : 'px'}` : ''
  console.log(`${(r.kind + (r.axis ? `-${r.axis}` : '')).padEnd(10)} ${r.step.padEnd(15)} ${[...r.views].join('/')}  ${[...r.locales].sort().join(',')}`)
  console.log(`         ${r.where}${r.onto ? `  ⟶ over ${r.onto}` : ''}${by}`)
  console.log(`         "${r.text}"`)
}
const skipped = findings.filter((f) => f.kind === 'SKIPPED')
if (skipped.length) {
  const per = new Map()
  for (const s of skipped) per.set(s.step, (per.get(s.step) ?? 0) + 1)
  console.log(`\nnot reached: ${[...per].map(([k, n]) => `${k}×${n}`).join(', ')}`)
}
writeFileSync(resolve(HERE, 'findings.json'), JSON.stringify(findings, null, 1))
console.log(`\nraw → tools/locale-fit/findings.json`)
process.exit(rows.length ? 1 : 0)
