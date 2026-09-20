#!/usr/bin/env node
// ─── Portal-signal proof, against the BUILT bundle ──────────────────────────
//
// Drives a HEADED Chrome on a private profile over CDP and asserts the three
// signals every portal grades — MUTE, PAUSE and the gameplay bracket — on the
// artefact QA actually runs. Companion to `perf-ab.mjs`, same shape.
//
//   pnpm build:gamepix        # or: npx vite build --mode gamepix --base=./
//   pnpm qa:portal
//
//   --platform <id>   gamepix | gamemonetize | crazy-web | none (default gamepix)
//   --dist <dir>      built output to serve                 (default ./dist)
//   --chrome <path>   Chrome executable
//   --sdk-delay <ms>  how long the stubbed SDK takes to report ready
//                                                            (default 1200)
//   --keep            leave the browser open for inspection
//   --headless        run Chrome headless (CI, or to keep it off the desktop)
//   --cg-prerelease   crazy-web: expect the pre-release single gameplayStart
//
// Exits non-zero on the first failed check, so CI can gate on it.
//
// THE STORY BUILD (story-spec §11.15). A fresh profile boots into the
// first-launch intro (§8.26) and then chapter 1's dialogue, not a duel: the
// battery checks the intro holds silent under the first-load ad, skips it the
// way a player would, and enters a duel through the QA hook `__gotoNode(0)`
// (dialogue skipped). After the shared mute/pause/menu checks
// it tours every scene of §11.2's table and asserts the bracket per scene
// (`__flow.live()`): live in the duel and the wipe only. Then happytime's
// placement (at the boss chest's unbox, never at a win) and the Twin Gift's
// 1.2 s hold threshold, where the portal has the SDK call to count.
//
// ── Why every part of this is the way it is ──
//
// THE BUILT BUNDLE, not the dev server. The dev server skips the obfuscator,
// the emitted platform-config files, and `vite-plugin-singlefile`. That last
// one is not academic: a literal control character in a source regex is
// harmless in every multi-file build and KILLS the single-file GamePix build
// outright, because HTML tokenisation rewrites U+0000 to U+FFFD inside the
// inlined <script> (see `tests/meta/noRawControlBytes.test.ts`). The dev server
// is green while the shipping artefact never boots.
//
// THE STUB IS INJECTED INTO THE HTML, not evaluated after load. Every check
// here is about what happens DURING boot — the portal reporting "muted" before
// the music element exists is the whole point — so an evaluate-after-load stub
// is too late, and an init-script would tie this to one driver.
//
// HEADED, PRIVATE PROFILE. The shared MCP Chrome profile is usually locked by
// another session; this never fights for it, and never leaves an invisible
// window playing audio with no way to close it.
//
// ── Four ways this check lies to you, all of which cost a run to find ──
//
// 1. INJECTING BEFORE `<meta charset>`. The browser sniffs the encoding from
//    the first 1024 bytes. A stub inserted ahead of the charset meta pushes it
//    out of that window, the whole bundle decodes as windows-1252, and the
//    first regex with a non-ASCII literal dies. That is the harness breaking
//    the app, and it looks exactly like a bug in the build. Inject AFTER it.
// 2. AN EMPTY SET IS SILENT. The score is a Web Audio synth with no media
//    elements, and the AudioContext only exists after the first gesture — so
//    "every audio element is paused" is vacuously true, and "no music played"
//    is true for a game that never makes a sound. Capture the context by
//    wrapping its constructor, count voices at `start()`, and always pair a
//    silence check with a control that proves sound DOES start.
// 3. NOTHING IS FOUGHT UNTIL A TOUCH. The duel boots with the foe held until
//    the first trusted gesture, so "the simulation stopped when I hid the tab"
//    passes because it never started. Always assert a CONTROL case first — the
//    duel advances while visible — and arm it with a real gesture.
// 4. HOSTNAME GATES. Platform builds refuse to render off their portal's
//    domain. Satisfy the gate with `--host-resolver-rules` rather than
//    weakening it: a build that skips its own gate is not the build QA runs.
// 5. AN SDK THAT IS READY INSTANTLY. This one shipped a QA rejection. A stub
//    that answers its handshake in 30 ms has no network in front of it, so it
//    wins every race against the game's own boot — and an ad placement that
//    SAMPLES readiness once, at boot, passes here and fires nothing on the
//    portal, where the SDK is a cross-origin script with an ad stack to load.
//    GameMonetize rejected survivalist for exactly that ("Ads should be shown
//    the first time after the game loads") while this harness was green.
//    `--sdk-delay` therefore defaults to a REALISTIC 1200 ms: slow enough that
//    a sampled-once placement loses, which is the whole point. Set it to 0 only
//    to demonstrate the difference.

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, extname, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback
}
const flag = name => argv.includes(`--${name}`)

const PLATFORM = arg('platform', 'gamepix')
const ROOT = resolve(arg('dist', 'dist'))
const CHROME = arg('chrome', process.env.CHROME_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe')
const KEEP = flag('keep')
const HEADLESS = flag('headless')
// CrazyGames PRE-release builds send exactly one gameplayStart (on the first
// touch) and nothing else; the full release drives the whole bracket.
const CG_PRERELEASE = flag('cg-prerelease')
// How long the stubbed SDK waits before reporting ready. NOT a detail: see
// note 5 above — an instantly-ready stub hides every readiness race, which is
// the class of bug that got the GameMonetize build rejected. Keep it well past
// the moment the game's own route chunk mounts.
const SDK_DELAY_MS = Number(arg('sdk-delay', '1200'))
const PORT = 8300 + Math.floor(Math.random() * 500)
const CDP_PORT = 9500 + Math.floor(Math.random() * 400)
const PROFILE = mkdtempSync(join(tmpdir(), 'portal-qa-'))

// ─── The shared probe ───────────────────────────────────────────────────────
//
// Platform-independent. Installs the counters and the levers every check below
// pulls; the per-platform SDK stub is appended to it.
const PROBE = `
var qa = window.__qa = { playCalls: [], sdkCalls: [], console: [], muted: true, sdkDelayMs: ${SDK_DELAY_MS} };

// A harness-only shim, and the only one here. Serving on a mapped hostname over
// plain http means the page is NOT a secure context, so \`crypto.randomUUID\` is
// undefined and the player-id code throws during boot. Real portals serve the
// iframe over https, where it exists — so this removes an artefact of the test
// rig rather than papering over a shipping bug. Guarded, so a secure context
// keeps the real implementation.
if (window.crypto && typeof window.crypto.randomUUID !== 'function') {
  window.crypto.randomUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
    });
  };
}

// The scene installs its QA hooks (window.__S etc.) when this flag exists
// before boot. Set here, and nowhere a player could reach.
window.__AM_QA__ = true;

// Auroras Magic's audio is a SYNTH on one shared AudioContext - no media
// elements at all. So the probe captures the context by wrapping its
// constructor, and counts every voice the synth schedules by wrapping
// start() on the scheduled-source base class (oscillators AND the noise
// buffer). A muted or paused game schedules NONE: V() refuses to build a
// voice while the context is held suspended.
qa.ctxs = [];
qa.voices = 0;
var RealAC = window.AudioContext || window.webkitAudioContext;
if (RealAC) {
  var WrappedAC = function (opts) { var c = new RealAC(opts); qa.ctxs.push(c); return c; };
  WrappedAC.prototype = RealAC.prototype;
  window.AudioContext = WrappedAC;
  window.webkitAudioContext = WrappedAC;
}
var realStart = AudioScheduledSourceNode.prototype.start;
AudioScheduledSourceNode.prototype.start = function () {
  qa.voices++;
  return realStart.apply(this, arguments);
};

['info', 'warn', 'error'].forEach(function (level) {
  var orig = console[level];
  console[level] = function () {
    try { qa.console.push(level + ': ' + Array.prototype.slice.call(arguments).join(' ')); } catch (e) {}
    return orig.apply(console, arguments);
  };
});

// The tab switch. The app reads document.visibilityState AND listens for the
// event, so both have to move together.
var hidden = false;
Object.defineProperty(document, 'visibilityState', { get: function () { return hidden ? 'hidden' : 'visible'; } });
Object.defineProperty(document, 'hidden', { get: function () { return hidden; } });
qa.setHidden = function (v) {
  hidden = !!v;
  document.dispatchEvent(new Event('visibilitychange'));
  return hidden;
};

// The duel clock: seconds of duel actually FOUGHT. It only advances once a
// player has armed the duel with a real gesture and while nothing pauses the
// game - the observable for "is the loop actually running?".
qa.progress = function () {
  var S = window.__S;
  return S ? S.dur.toFixed(3) : null;
};
// Every synth voice scheduled so far - the score and the cues alike.
qa.musicPlays = function () { return qa.voices; };
// Silent = no context yet, or every context held out of 'running'.
qa.audioState = function () {
  return {
    count: qa.ctxs.length,
    allPaused: qa.ctxs.every(function (c) { return c.state !== 'running'; })
  };
};
`

// ─── Per-platform SDK stubs ─────────────────────────────────────────────────
//
// `host` must satisfy the build's own hostname gate (`resolveCapabilities`).
// `mute(on)` drives the portal's mute the way the portal chrome would.
// Adding a platform is one entry; only the arms with a stub can run the audio
// checks, and `none` deliberately has none.
const PLATFORMS = {
  gamepix: {
    host: 'local.gamepix.com',
    label: 'GamePix v3',
    // Proof that `dist/` really holds THIS platform's build. A string only that
    // build can contain — here the SDK URL the plugin injects.
    fingerprint: 'integration.gamepix.com',
    stub: `
var store = {};
var sdk = {
  // Read by the plugin's initial-audio-state probe. MUTED at boot, which is
  // the flow QA runs: mute the portal chrome, then reload.
  isMuted: function () { return qa.muted; },
  // Delayed like GameMonetize's handshake (--sdk-delay), so a placement that
  // samples readiness once at boot cannot pass here and fire nothing live.
  init: function () {
    log('init');
    return new Promise(function (r) { setTimeout(r, qa.sdkDelayMs); });
  },
  customLoading: function (v) { log('customLoading:' + v); },
  gameLoading: function (p) { log('gameLoading:' + p); },
  gameLoaded: function (cb) { log('gameLoaded'); if (cb) setTimeout(cb, 0); },
  updateScore: function (s) { log('updateScore:' + s); },
  updateLevel: function (l) { log('updateLevel:' + l); },
  happyMoment: function () { log('happyMoment'); },
  lang: function () { return 'en'; },
  localStorage: {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  // A no-fill: resolves instantly and opens nothing, so the first-load
  // interstitial runs its real code path without an overlay in the way. That
  // is also the path that used to leave the game silent for the whole opening.
  interstitialAd: function () { log('interstitialAd'); return Promise.resolve({ success: false }); },
  rewardAd: function () { log('rewardAd'); return Promise.resolve({ success: false }); }
};

// Locked, so the real CDN script cannot replace it if it ever loads. The
// plugin only assigns to sdk.pause / .resume / .soundOn / .soundOff / .on,
// which are properties OF this object, not the binding itself.
Object.defineProperty(window, 'GamePix', { value: sdk, writable: false, configurable: false });

qa.portalMute = function (on) {
  qa.muted = !!on;
  var fn = on ? (sdk.soundOff || (sdk.on && sdk.on.soundOff))
              : (sdk.soundOn || (sdk.on && sdk.on.soundOn));
  if (typeof fn === 'function') fn();
  return typeof fn === 'function';
};
`
  },
  gamemonetize: {
    host: 'local.gamemonetize.com',
    label: 'GameMonetize HTML5',
    // The SDK URL the plugin injects — present only in a GameMonetize build.
    fingerprint: 'api.gamemonetize.com',
    // GameMonetize has NO mute API (`qa.portalMute` is deliberately absent, so
    // the mute checks skip rather than pass vacuously). Its only portal signal
    // is the ad bracket: SDK_GAME_PAUSE when the ad layer opens,
    // SDK_GAME_START when it closes. That bracket IS what this stub drives.
    stub: `
// Keep the real SDK off the wire: the plugin skips its own injection when a
// script with this id is already in the document.
var placeholder = document.createElement('script');
placeholder.id = 'gamemonetize-sdk';
document.head.appendChild(placeholder);

// The plugin assigns window.SDK_OPTIONS (with its onEvent fan-out) and THEN
// waits for SDK_READY, so intercept the assignment and answer it.
var opts = null;
Object.defineProperty(window, 'SDK_OPTIONS', {
  configurable: false,
  get: function () { return opts; },
  set: function (v) {
    opts = v;
    log('SDK_OPTIONS');
    // Delayed on purpose (--sdk-delay). The real handshake is a cross-origin
    // script load plus ad-stack init; a stub that answers immediately makes
    // any placement that samples readiness at boot pass here and do nothing
    // on the portal.
    setTimeout(function () { qa.gmEmit('SDK_READY'); }, qa.sdkDelayMs);
  }
});
qa.gmEmit = function (name) {
  if (!opts || typeof opts.onEvent !== 'function') return false;
  opts.onEvent({ name: name });
  return true;
};

// How long a stubbed ad stays OPEN. Deliberately longer than the 6 s
// \"the ad never opened\" cap useAds applies to a request that reports no
// impression: an ad that is still playing at second 8 is exactly the case that
// used to hand the game back — music under the ad, reward denied, result screen
// revealed on top of a live interstitial.
qa.adMs = 12000;
qa.ads = [];
qa.adAudit = null;
// True for as long as the stubbed ad is on screen. The shared checks below
// wait this out — sampling the world DURING a 12 s ad reports a frozen run and
// silent audio for every condition, which is the \"no control case\" trap.
qa.adOpen = false;
var runAd = function (kind) {
  qa.ads.push(kind);
  setTimeout(function () {
    qa.adOpen = true;
    qa.adAudit = {
      kind: kind,
      // Had the run started when the ad opened? The HUD element exists from
      // mount, so its PRESENCE proves nothing — the rail's progress is the
      // observable, and the first-play interstitial must land before it moves.
      progressAtOpen: qa.progress(),
      musicAtOpen: qa.musicPlays(),
      voicesAtOpen: qa.voices,
      // The count above is CUMULATIVE play() calls, which cannot tell "the
      // music started at boot and the ad hard-stopped it" from "the music is
      // audible under the ad". With a post-splash placement the first is
      // normal and the second is the graded failure, so sample the elements
      // themselves as well.
      audioAtOpen: qa.audioState(),
      // C30 (§11.7): the very first dialogue bubble must wait for this ad.
      bubbleAtOpen: !!document.querySelector('.dialogue .leaf'),
      // …and so must the intro that comes before it (§8.26): on its first
      // frame, its clock not started, not one whinny.
      introAtOpen: window.__intro ? window.__intro.state() : null,
      introPastCap: null,
      musicPastCap: null,
      audioPastCap: null,
      railPastCap: null
    };
    qa.gmEmit('SDK_GAME_PAUSE');
    // Sample PAST the 6 s cap but before the ad closes.
    setTimeout(function () {
      qa.adAudit.musicPastCap = qa.musicPlays();
      qa.adAudit.voicesPastCap = qa.voices;
      qa.adAudit.audioPastCap = qa.audioState();
      qa.adAudit.railPastCap = qa.progress();
      qa.adAudit.introPastCap = window.__intro ? window.__intro.state() : null;
    }, 8000);
    setTimeout(function () {
      qa.adOpen = false;
      qa.gmEmit('ALL_ADS_COMPLETED');
      qa.gmEmit('SDK_GAME_START');
    }, qa.adMs);
  }, 400);
};

var sdk = {
  showAd: function (type) {
    log('showAd:' + (type || 'interstitial'));
    runAd(type || 'interstitial');
    return Promise.resolve();
  },
  showBanner: function () { log('showBanner'); runAd('interstitial'); },
  preloadAd: function (t) { log('preloadAd:' + t); return Promise.resolve(); }
};
Object.defineProperty(window, 'sdk', { value: sdk, writable: false, configurable: false });
`
  },
  'crazy-web': {
    host: 'local.crazygames.com',
    label: 'CrazyGames SDK v3',
    // The CG SDK tag only survives in the CrazyGames build.
    fingerprint: 'sdk.crazygames.com',
    // The gameplay bracket is what CrazyGames grades (gameplayStart whenever
    // play starts or resumes, gameplayStop on every pause, modal and result
    // screen) — so this stub LOGS it and the CG block below asserts its order.
    stub: `
var store = {};
var sdk = {
  environment: 'crazygames',
  init: function () {
    log('init');
    return new Promise(function (r) { setTimeout(r, qa.sdkDelayMs); });
  },
  game: {
    settings: { muteAudio: false },
    isMuted: function () { return false; },
    loadingStart: function () { log('loadingStart'); },
    loadingStop: function () { log('loadingStop'); },
    gameplayStart: function () { log('gameplayStart'); },
    gameplayStop: function () { log('gameplayStop'); },
    happytime: function () { log('happytime'); },
    addSettingsChangeListener: function (fn) { qa.cgSettings = fn; }
  },
  user: {
    getUser: function () { return Promise.resolve(null); },
    getSystemInfo: function () { return Promise.resolve({ locale: 'en-US' }); }
  },
  data: {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  ad: {
    hasAdblock: function () { return Promise.resolve(false); },
    // A no-fill, answered through the error callback like the real SDK.
    requestAd: function (type, cb) {
      log('requestAd:' + type);
      setTimeout(function () { if (cb && cb.adError) cb.adError('no fill'); }, 50);
    }
  }
};
// Locked, so the real CDN script cannot replace it if it ever loads.
Object.defineProperty(window, 'CrazyGames', { value: { SDK: sdk }, writable: false, configurable: false });
`
  },
  none: {
    host: '127.0.0.1',
    label: 'no SDK (plain web build)',
    fingerprint: null,
    stub: '' // pause + menu checks only; there is no portal to mute.
  }
}

const plat = PLATFORMS[PLATFORM]
if (!plat) {
  console.error(`unknown platform "${PLATFORM}" — have: ${Object.keys(PLATFORMS).join(', ')}`)
  process.exit(2)
}

const STUB = `<script>\n(function(){\nvar log=function(n){window.__qa.sdkCalls.push(n)};\n${PROBE}\n${plat.stub}\n})();\n</script>`

// ─── Serve the built output ─────────────────────────────────────────────────
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.map': 'application/json',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
}

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error(`no index.html in ${ROOT} — build first (e.g. pnpm build:${PLATFORM})`)
  process.exit(2)
}
const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8')
// AFTER the charset meta. See trap 1 in the header — this one line is the
// difference between testing the app and testing a mojibake of it.
const CHARSET = /<meta[^>]+charset[^>]*>/i
if (!CHARSET.test(indexHtml)) {
  console.error('built index.html has no charset meta — refusing to inject blind')
  process.exit(2)
}
const patched = indexHtml.replace(CHARSET, m => m + STUB)

// Is `dist/` actually the build we were asked to test?
//
// Every build writes to the same `dist/`, so a stale one — or one another
// terminal produced a minute ago — answers happily and you spend the run
// diagnosing the wrong bundle. That is the same failure as testing against a
// stale dev server on a port you assumed was yours, and it has already happened
// once here: `dist/` held a Poki build while this was reporting on GamePix.
if (plat.fingerprint) {
  const inline = indexHtml.includes(plat.fingerprint)
  const inChunks = !inline && existsSync(join(ROOT, 'assets'))
    && readdirSync(join(ROOT, 'assets')).some(f =>
      f.endsWith('.js') && readFileSync(join(ROOT, 'assets', f), 'utf8').includes(plat.fingerprint))
  if (!inline && !inChunks) {
    console.error(
      `${ROOT} does not look like a ${PLATFORM} build `
      + `(no "${plat.fingerprint}" in it).\nRebuild: pnpm build:${PLATFORM}`
    )
    process.exit(2)
  }
}

const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (p === '/' || p === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(patched)
    return
  }
  const file = join(ROOT, p.replace(/^\/+/, ''))
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404); res.end('not found'); return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise(r => server.listen(PORT, '0.0.0.0', r))

// ─── Chrome + CDP ───────────────────────────────────────────────────────────
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  // The tab must keep running at full speed while we PRETEND it is hidden, or
  // Chrome's own background throttling produces the result we are trying to
  // attribute to the game's pause gate.
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--autoplay-policy=no-user-gesture-required',
  // Satisfy the build's hostname gate instead of switching it off.
  `--host-resolver-rules=MAP ${plat.host} 127.0.0.1`,
  '--window-size=520,900',
  ...(HEADLESS ? ['--headless=new'] : []),
  'about:blank'
], { stdio: 'ignore' })

const api = `http://127.0.0.1:${CDP_PORT}/json`
const waitForChrome = async () => {
  for (let i = 0; i < 160; i++) {
    try { const r = await fetch(`${api}/version`); if (r.ok) return r.json() } catch { /* not up */ }
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

const results = []
const check = (name, pass, detail) => {
  results.push({ name, pass })
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const version = await waitForChrome()
const target = await (await fetch(`${api}/new?about:blank`, { method: 'PUT' })).json()
const { ws, ready, send } = connect(target.webSocketDebuggerUrl)
await ready

const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(`${r.exceptionDetails.text} :: ${expr}`)
  return r.result.value
}

/** Tap the drawing pad with a REAL (trusted) input event — the gesture that
 *  arms the duel and lets the browser start the AudioContext. See trap 3. */
const tap = async () => {
  const box = JSON.parse(await ev(`(() => {
    const c = document.querySelector('canvas'); if (!c) return 'null';
    const r = c.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height * 0.72 });
  })()`))
  const at = (type) => send('Input.dispatchMouseEvent', {
    type, x: box.x, y: box.y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1
  })
  await at('mousePressed')
  await sleep(40)
  await at('mouseReleased')
  await sleep(150)
}

/** A real (trusted) press-and-release at a viewport point. */
const pressAt = async (x, y) => {
  const at = (type) => send('Input.dispatchMouseEvent', {
    type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1
  })
  await at('mousePressed')
  await at('mouseReleased')
  await sleep(60)
}

try {
  console.log(`browser   ${version.Browser}`)
  console.log(`platform  ${PLATFORM} (${plat.label})`)
  console.log(`serving   ${ROOT} on http://${plat.host}:${PORT}\n`)

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: `http://${plat.host}:${PORT}/` })

  // The port is ours, not a stale server from another game answering happily.
  for (let i = 0; i < 60 && !(await ev('document.title')); i++) await sleep(250)
  const title = await ev('document.title')
  check('serving THIS game (title check)', !!title, `title="${title}"`)

  let booted = false
  for (let i = 0; i < 160; i++) {
    if (await ev('!!document.querySelector("canvas.world, canvas.duel-canvas") && !!window.__S && !!window.__flow')) { booted = true; break }
    await sleep(250)
  }
  check('game booted (a fresh save opens on the story)', booted,
    booted ? `scene=${await ev('window.__campaignPhase ? window.__campaignPhase() : "?"')}` : '')
  if (booted) check('a fresh save opens on the intro (§8.26)', await ev('window.__campaignPhase()') === 'intro')
  if (!booted) {
    console.log('  body    : ' + await ev('document.body.innerText.slice(0,300)'))
    console.log('  hooks   : ' + await ev('JSON.stringify({ S: typeof window.__S, cheat: (function(){ try { return localStorage.getItem("cheat") } catch (e) { return String(e) } })(), canvas: !!document.querySelector("canvas.duel-canvas"), globals: Object.keys(window).filter(function (k) { return k.indexOf("__") === 0 }), lsIsNative: (function(){ try { return Object.prototype.toString.call(window.localStorage) } catch (e) { return String(e) } })(), keys: (function(){ try { var o=[]; for (var i=0;i<localStorage.length;i++) o.push(localStorage.key(i)); return o } catch (e) { return String(e) } })() })'))
    console.log('  console : ' + await ev('JSON.stringify(window.__qa.console.slice(-15))'))
    throw new Error('never reached gameplay')
  }
  // ── Wait for the game to actually be PLAYABLE ───────────────────────────
  //
  // The HUD is in the DOM from mount, so the check above fires while the splash
  // is still up and, on the networks that require one, before the first-play
  // interstitial has even been requested. Everything below reads a world that
  // both of those deliberately freeze and silence — which passes every pause
  // check without testing anything, and fails the control case that exists to
  // catch precisely that (a first GameMonetize run reported `0% -> 0%` on every
  // line while the ad it was measuring through still had four seconds to run).
  //
  // `#static-splash` ships inside index.html, so it is present from the first
  // byte and its REMOVAL is a real edge — no "waiting on an absence" race.
  const splashUp = () => ev('!!document.getElementById("static-splash")')
  for (let i = 0; i < 240 && await splashUp(); i++) await sleep(250)
  check('splash cleared — the loader finished', !(await splashUp()))
  // The first-play ad is dispatched right after the splash goes; give it a
  // moment to be requested, then wait out however long it plays.
  await sleep(2000)
  for (let i = 0; i < 160 && await ev('!!window.__qa.adOpen'); i++) await sleep(500)

  console.log(`  sdk calls: ${await ev('JSON.stringify(window.__qa.sdkCalls)')}`)
  console.log(`  audio log: ${await ev('JSON.stringify(window.__qa.console.filter(l => /audio|sound|mute|pause/i.test(l)))')}\n`)

  // Into chapter 1's first duel, the dialogue skipped — the scene the shared
  // battery below measures. Not armed yet: that takes a real touch.
  const phase = () => ev('window.__campaignPhase()')
  const waitScene = async (sc, ms = 8000) => {
    for (let i = 0; i < ms / 100; i++) {
      if (await phase() === sc && !(await ev('window.__flow.fading()'))) return true
      await sleep(100)
    }
    return false
  }
  // The intro plays once the loader and any first-load ad are done; a player
  // who skips it lands on chapter 1's dialogue, and it counts as seen.
  const intro = JSON.parse(await ev('JSON.stringify(window.__intro ? window.__intro.state() : null)'))
  if (intro?.running) {
    await sleep(600)
    const later = JSON.parse(await ev('JSON.stringify(window.__intro.state())'))
    check('the intro is playing once the ad and the splash are gone', !later.held && later.t > intro.t,
      `t ${intro.t.toFixed(2)} -> ${later.t.toFixed(2)}, held ${later.held}`)
    await ev('(() => { const b = document.querySelector(".intro-scene .skip"); b && b.click() })()')
    check('Skip leaves the intro for chapter 1\'s dialogue', await waitScene('dialogue'))
    check('the intro counts as seen', await ev('window.__campaign.state().introSeen') === true)
  }
  await ev('window.__gotoNode(0)')
  check('entered chapter 1\'s first duel', await waitScene('duel'))

  // ── GameMonetize: the ad bracket, which is its only portal signal ───────
  //
  // The first-play interstitial is moderation-mandated on this network, so it
  // is a release gate in its own right — and it is the placement that proves
  // the ad-open (impression) plumbing, because the stubbed ad outlives the 6 s
  // cap `useAds` applies to an ad nobody reported opening.
  if (PLATFORM === 'gamemonetize') {
    const audit = JSON.parse(await ev('JSON.stringify(window.__qa.adAudit)'))
    check('SDK init handshake (SDK_OPTIONS → SDK_READY)',
      (await ev('JSON.stringify(window.__qa.sdkCalls)')).includes('SDK_OPTIONS'))
    check('first-play interstitial was requested', !!audit,
      `ads=${await ev('JSON.stringify(window.__qa.ads)')}`)
    if (audit) {
      check('the ad opened BEFORE the duel started',
        audit.progressAtOpen === null || parseFloat(audit.progressAtOpen) === 0,
        `duel clock at open = ${audit.progressAtOpen}`)
      check('no dialogue bubble under the first-load ad (C30)', audit.bubbleAtOpen === false)
      check('the intro holds on its first frame under the first-load ad (C30)',
        !audit.introAtOpen?.running || (audit.introAtOpen.held && audit.introAtOpen.t === 0 && audit.introPastCap?.t === 0),
        `at open ${JSON.stringify(audit.introAtOpen)}, past the cap ${JSON.stringify(audit.introPastCap)}`)
      // SILENT: not one synth voice was scheduled while the ad was open, and
      // any context that exists is held out of 'running'. The control that
      // stops this passing vacuously is the music check after the ad closes.
      check('no sound underneath the ad',
        audit.voicesAtOpen === audit.voicesPastCap && (audit.audioAtOpen.count === 0 || audit.audioAtOpen.allPaused),
        `voices ${audit.voicesAtOpen} -> ${audit.voicesPastCap}, audio at open = ${JSON.stringify(audit.audioAtOpen)}`)
      // The one that regressed on survivalist: with no impression reported,
      // the wait was released at 6 s and the game played under an ad that had
      // four seconds left to run.
      check('still silent PAST the 6 s cap (ad ran 12 s)',
        audit.audioPastCap.count === 0 || audit.audioPastCap.allPaused,
        `audio at 8 s = ${JSON.stringify(audit.audioPastCap)}`)
    }
    // Polled, not sampled. The ad's resume event does not start the music —
    // it releases `boot()`, which then starts the stage, waits a tick, sizes
    // the canvas and only then plays the track. That is about half a second,
    // and reading the counter the instant the ad closes catches it maybe half
    // the time: two runs of this check failed with `music play()=0` on a build
    // whose music was demonstrably fine a second later.
    // The score can only sound after a gesture (browser autoplay policy).
    await tap()
    let musicAfter = 0
    for (let i = 0; i < 20 && musicAfter === 0; i++) {
      musicAfter = await ev('window.__qa.musicPlays()')
      if (musicAfter === 0) await sleep(250)
    }
    check('music starts once the ad closes', musicAfter > 0, `synth voices=${musicAfter}`)

    // ── The hidden QA chord: 30 taps in a row on the foe's HP bar ──────────
    //
    // Checked on the BUILT bundle because the chord ships in every build: QA
    // runs the artefact players get. It bypasses the pacing (the first-load ad
    // above just seeded a 121 s gap), so this is also the proof that a tester
    // does not have to wait that gap out. The stubbed ad is shortened, since
    // its audio was already audited above.
    await ev('window.__qa.adMs = 3000')
    const adsBefore = await ev('window.__qa.ads.length')
    const bar = JSON.parse(await ev(`(() => {
      const e = document.querySelector('.hp-bar.right'); if (!e) return 'null';
      const r = e.getBoundingClientRect();
      return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
    })()`))
    if (!bar) {
      check('foe HP bar is on screen for the QA chord', false)
    } else {
      for (let i = 0; i < 29; i++) await pressAt(bar.x, bar.y)
      await sleep(600)
      check('29 taps on the foe HP bar → no ad yet', await ev('window.__qa.ads.length') === adsBefore)
      const voicesBefore = await ev('window.__qa.musicPlays()')
      await pressAt(bar.x, bar.y)
      let chordAds = adsBefore
      for (let i = 0; i < 20 && chordAds === adsBefore; i++) {
        await sleep(150)
        chordAds = await ev('window.__qa.ads.length')
      }
      check('30th tap in a row → interstitial requested (QA chord)', chordAds === adsBefore + 1,
        `ads=${await ev('JSON.stringify(window.__qa.ads)')}`)
      // Wait for it to open, then close.
      for (let i = 0; i < 20 && !(await ev('!!window.__qa.adOpen')); i++) await sleep(150)
      const musicDuring = await ev('window.__musicOn()')
      const voicesDuring = await ev('window.__qa.musicPlays()')
      await sleep(1000)
      check('silent under the chord ad', !musicDuring && await ev('window.__qa.musicPlays()') === voicesDuring,
        `score on=${musicDuring}, voices ${voicesDuring} → ${await ev('window.__qa.musicPlays()')}`)
      for (let i = 0; i < 60 && await ev('!!window.__qa.adOpen'); i++) await sleep(150)
      // It interrupted a live duel, so it owes the MUSIC a restart. Read the
      // score's own state: the foe's spell sounds would move a voice count on
      // their own, with the music dead.
      let musicAfter = false
      for (let i = 0; i < 20 && !musicAfter; i++) {
        await sleep(250)
        musicAfter = await ev('window.__musicOn()')
      }
      check('music comes back after the chord ad', musicAfter === true, `before the chord: voices=${voicesBefore}`)
    }
  }

  // ── CrazyGames: the gameplay bracket, in order ──────────────────────────
  if (PLATFORM === 'crazy-web' && CG_PRERELEASE) {
    const calls = async () => JSON.parse(await ev('JSON.stringify(window.__qa.sdkCalls)'))
    let c = await calls()
    check('NO gameplayStart before the player touches the game', !c.includes('gameplayStart'), c.join(','))
    await tap()
    await sleep(400)
    c = await calls()
    check('exactly ONE gameplayStart once the player is in', c.filter((x) => x === 'gameplayStart').length === 1, c.join(','))
  } else if (PLATFORM === 'crazy-web') {
    const calls = async () => JSON.parse(await ev('JSON.stringify(window.__qa.sdkCalls)'))
    const last = (list, a, b) => list.lastIndexOf(a) > list.lastIndexOf(b)
    let c = await calls()
    check('loadingStart … loadingStop around the boot', c.indexOf('loadingStart') >= 0 && c.indexOf('loadingStop') > c.indexOf('loadingStart'), c.join(','))
    check('NO gameplayStart before the player touches the game', !c.includes('gameplayStart'), c.join(','))
    await tap()
    await sleep(400)
    c = await calls()
    check('gameplayStart on the first touch', last(c, 'gameplayStart', 'gameplayStop'), c.slice(-4).join(','))
    await ev(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /option/i.test(x.getAttribute('aria-label') || '')); b && b.click(); })()`)
    await sleep(500)
    c = await calls()
    check('gameplayStop while the Options modal is open', last(c, 'gameplayStop', 'gameplayStart'), c.slice(-4).join(','))
    // Closed through the app, not by its button's text: the locale varies.
    await ev('window.__flow.closeOverlay()')
    await sleep(700)
    c = await calls()
    check('gameplayStart again when it closes', last(c, 'gameplayStart', 'gameplayStop'), c.slice(-4).join(','))
    await ev('window.__qa.setHidden(true)')
    await sleep(400)
    c = await calls()
    check('gameplayStop on tab away', last(c, 'gameplayStop', 'gameplayStart'), c.slice(-4).join(','))
    await ev('window.__qa.setHidden(false)')
    await sleep(600)
    c = await calls()
    check('gameplayStart on return', last(c, 'gameplayStart', 'gameplayStop'), c.slice(-4).join(','))
    // Win the duel through the sim: the play closes at once, and the story
    // moves on to the map with the gift waiting — no result panel (S2).
    await ev('(() => { const S = window.__S; S.ehp = 0; })()')
    await sleep(1200)
    c = await calls()
    check('gameplayStop when a duel is won', last(c, 'gameplayStop', 'gameplayStart'), c.slice(-4).join(','))
    check('no happytime at a standard win (§11.6: it belongs to the chest)', !c.includes('happytime'), c.slice(-5).join(','))
    check('the win leads to the map, the gift waiting', await waitScene('map', 12000), `scene=${await phase()}`)
    // Leave the scene as the shared checks below expect it: a live duel.
    await ev('window.__gotoNode(1)')
    await waitScene('duel')
    await sleep(400)
    c = await calls()
    check('gameplayStart when the next duel begins', last(c, 'gameplayStart', 'gameplayStop'), c.slice(-4).join(','))
  }

  // ── Mute, on the flow QA runs: already muted at boot, then reload ────────
  //
  // Only for portals that HAVE a mute API. GameMonetize has none, so the arm
  // ships no `portalMute` and these are skipped out loud rather than passing
  // against a lever that does not exist.
  const canMute = await ev("typeof window.__qa.portalMute === 'function'")
  if (!canMute) console.log(`  (skipped: ${plat.label} exposes no mute signal)\n`)
  if (canMute) {
    // A real gesture first: without one the browser would never let the synth
    // sound, and "silent while muted" would prove nothing.
    await tap()
    await sleep(2500) // give the music every chance to start
    const muted = await ev('window.__qa.musicPlays()')
    check('portal muted at boot → ZERO sound after a tap', muted === 0,
      `synth voices=${muted}, audio=${await ev('JSON.stringify(window.__qa.audioState())')}`)

    // The second leg is not optional: without it, a game that simply never
    // plays music passes the check above.
    check('soundOn callback registered on the SDK', await ev('window.__qa.portalMute(false)') === true)
    await sleep(1500)
    const after = await ev('window.__qa.musicPlays()')
    check('portal unmute → music DOES start', after > 0, `synth voices=${after}`)
  }

  // ── Pause: the control case FIRST, or the rest means nothing ─────────────
  await tap()
  await sleep(800)
  const before = await ev('window.__qa.progress()')
  await sleep(1200)
  const moving = await ev('window.__qa.progress()')
  check('control: the duel advances while visible', moving !== before, `${before} → ${moving}`)

  await ev('window.__qa.setHidden(true)')
  await sleep(300)
  const hiddenStart = await ev('window.__qa.progress()')
  await sleep(1800)
  const hiddenEnd = await ev('window.__qa.progress()')
  check('tab away → simulation FROZEN', hiddenStart === hiddenEnd, `${hiddenStart} → ${hiddenEnd}`)

  const hiddenAudio = JSON.parse(await ev('JSON.stringify(window.__qa.audioState())'))
  check('tab away → audio suspended', hiddenAudio.count > 0 && hiddenAudio.allPaused,
    JSON.stringify(hiddenAudio))

  await ev('window.__qa.setHidden(false)')
  await sleep(1500)
  const back = await ev('window.__qa.progress()')
  check('return to tab → simulation RESUMES', back !== hiddenEnd, `${hiddenEnd} → ${back}`)

  // ── Menu entry ───────────────────────────────────────────────────────────
  const opened = await ev(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => /option|setting/i.test(x.getAttribute('aria-label') || ''));
    if (!b) return 'no-button';
    b.click(); return 'clicked';
  })()`)
  await sleep(700)
  const menuStart = await ev('window.__qa.progress()')
  await sleep(1600)
  const menuEnd = await ev('window.__qa.progress()')
  check('menu open → simulation FROZEN', opened === 'clicked' && menuStart === menuEnd,
    `${opened}; ${menuStart} → ${menuEnd}`)

  const menuAudio = JSON.parse(await ev('JSON.stringify(window.__qa.audioState())'))
  check('menu open → audio suspended', menuAudio.count > 0 && menuAudio.allPaused,
    JSON.stringify(menuAudio))
  // Close it again (through the app: its buttons' text depends on the locale).
  await ev('window.__flow.closeOverlay()')
  await sleep(600)
  check('Options closed again', !(await ev('!!window.__flow.state().overlay')))

  // ── The bracket, per scene (§11.2, §12.2.3) ─────────────────────────────
  //
  // Read off the app's own reconciler (`__flow.live()`), so every platform
  // gets the proof, not only the one whose stub logs the bracket.
  const live = () => ev('window.__flow.live()')
  const scene = async (label, want) => {
    const got = await live()
    check(`bracket ${want ? 'LIVE' : 'off'} — ${label}`, got === want, `scene=${await phase()}`)
  }
  await ev('window.__gotoNode(1)')
  await waitScene('duel')
  await sleep(300)
  await scene('in a duel, armed', true)
  await ev('window.__flow.goto("map", 1)')
  await sleep(300)
  await scene('on the map', false)
  await ev('window.__flow.goto("dialogue", 2)')
  await sleep(300)
  await scene('in a dialogue', false)
  await ev('window.__flow.goto("wardrobe")')
  await sleep(300)
  await scene('in the wardrobe', false)
  await ev('window.__flow.goto("map", 1)')
  await sleep(300)
  await ev('window.__toInvite(1)')
  await scene('at the gift (unbox)', false)
  check('reached the wipe through the gift', await ev('window.__toWipe(1)') === true)
  await scene('in the wipe', true)
  check('the wipe reached its reveal', await ev('window.__finishWipe()') === true)
  await scene('admiring the restored sector', false)
  await waitScene('map', 12000)

  // ── happytime: at the boss chest's UNBOX, never at a win (§11.6) ────────
  const happyName = PLATFORM === 'crazy-web' ? 'happytime' : PLATFORM === 'gamepix' ? 'happyMoment' : null
  if (happyName && !CG_PRERELEASE) {
    const happy = async () => JSON.parse(await ev('JSON.stringify(window.__qa.sdkCalls)')).filter((x) => x === happyName).length
    const base = await happy()
    for (const n of [2, 3]) {
      await ev(`window.__gotoNode(${n})`)
      await waitScene('duel')
      await ev('(() => { window.__S.ehp = 0 })()')
      await waitScene('map', 12000)
      await ev(`window.__toWipe(${n}).then(() => window.__finishWipe())`)
      await waitScene('map', 12000)
    }
    check(`no ${happyName} across standard wins and wipes`, await happy() === base, `calls=${await happy() - base}`)
    await ev('window.__gotoNode(4)')
    await waitScene('duel')
    await ev('(() => { window.__S.ehp = 0 })()')
    // The boss's thank-you plays in the arena; skip through it.
    for (let i = 0; i < 60 && (await phase()) === 'duel'; i++) {
      await ev(`(() => { const d = document.querySelector('.dialogue'); d && d.click() })()`)
      await sleep(300)
    }
    await waitScene('map', 12000)
    check(`no ${happyName} at the boss WIN`, await happy() === base, `calls=${await happy() - base}`)
    await ev('window.__toWipe(4)')
    check(`exactly one ${happyName} at the boss chest's unbox`, await happy() === base + 1, `calls=${await happy() - base}`)
    await ev('window.__finishWipe()')
    await sleep(500)
    check(`and not again when that sector's wipe completes`, await happy() === base + 1, `calls=${await happy() - base}`)
  }

  // ── The Twin Gift's hold threshold (§11.5) ───────────────────────────────
  const rewardName = PLATFORM === 'gamepix' ? 'rewardAd' : PLATFORM === 'crazy-web' ? 'requestAd:rewarded' : null
  if (rewardName && !CG_PRERELEASE) {
    await ev('window.__flow.goto("map", 3)')
    await sleep(300)
    await ev('window.__twin.offer(3)')
    await sleep(300)
    const shown = await ev('!!document.querySelector(".map-scene .twin")')
    if (!shown) {
      console.log('  (skipped: no rewarded ad ready on this stub, so the Twin Gift is not offered — by design)')
    } else {
      const rewards = async () => JSON.parse(await ev('JSON.stringify(window.__qa.sdkCalls)')).filter((x) => x === rewardName).length
      const r0 = await rewards()
      await ev('window.__holdTwinGift(1199)')
      await sleep(800)
      check('a 1199 ms hold pays nothing', await rewards() === r0, `calls=${await rewards() - r0}`)
      await ev('window.__holdTwinGift(1200)')
      await sleep(1200)
      check('a 1200 ms hold plays exactly one rewarded ad', await rewards() === r0 + 1, `calls=${await rewards() - r0}`)
    }
  }
} finally {
  const failed = results.filter(r => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) console.log('FAILED: ' + failed.map(f => f.name).join('; '))
  if (!KEEP) {
    ws.close()
    await fetch(`${api}/close/${target.id}`).catch(() => {})
    chrome.kill()
    server.close()
    process.exit(failed.length ? 1 : 0)
  } else {
    console.log(`\n--keep: browser left open on http://${plat.host}:${PORT} (ctrl-c to stop)`)
  }
}
