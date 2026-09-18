import { createRouter, createWebHashHistory, createMemoryHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'main', component: () => import('@/views/GameScene.vue') },
  // The art pipeline's two screens (the reference-sheet bench and the
  // painted-vs-drawn playground) mount here, DEV ONLY, when the painted-art
  // step re-instantiates them for this cast — see `art-style.md`.
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

// ─── History mode ───────────────────────────────────────────────────────────
//
// MEMORY history on the Playgama build, hash history everywhere else.
//
// That archive is also the YouTube Playables submission, and Playables serves
// the game from a URL whose shape is not ours — something like
// `e2e.playables.usercontent.goog/<id>/…`. A history mode that READS the
// address bar to decide the initial route is therefore reading someone else's
// URL: it can resolve to a route that does not exist and render nothing, with
// the SDK contract fully satisfied. That is not hypothetical — it is how a
// 2026-09 submission failed while every MUST and SHOULD in YouTube's own test
// suite passed, which is the worst possible failure shape because no automated
// check reports it.
//
// Memory history never touches the address bar at all: the initial route is
// always `/`, which is what this app wants anyway — nothing in `src/` calls
// `useRouter`, `useRoute` or `router.push`, and there is not a single
// `<RouterLink>`. The router exists to mount one component and to keep the
// dev-only benches reachable.
//
// Which is also why hash history is KEPT elsewhere: dev benches (the art
// pipeline's `/art-sheets` and `/playground`) are navigated to by typing a
// URL, and memory history would make them unreachable in dev. The other
// portals are shipping and working on hash history, so they are left alone —
// this is a fix for a measured Playables failure, not a blanket change.
const router = createRouter({
  history: import.meta.env.VITE_APP_PLAYGAMA === 'true'
    ? createMemoryHistory()
    : createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

export default router
