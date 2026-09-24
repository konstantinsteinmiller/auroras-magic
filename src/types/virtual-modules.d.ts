// Ambient declarations for Vite virtual modules.
//
// This file must stay free of top-level `import` / `export`. With one, it
// becomes a module and `declare module 'x'` inside it is read as AUGMENTATION
// of an existing module rather than a declaration of a new one — so the id
// still fails to resolve, which is why these do not live in `env.d.ts`.

declare module 'virtual:painted-art' {
  /**
   * Every painting on disk when this bundle was built, as
   * `images/<folder>/<id>` (no extension). `art.ts` requests nothing outside
   * it, so a sheet registered before it is painted never 404s. `null` under
   * the dev server and in tests: probe everything, as before.
   *
   * See `paintedArtPlugin` in `vite.config.ts`.
   */
  const painted: readonly string[] | null
  export default painted
}

declare module 'virtual:leaderboard-snapshot' {
  /**
   * The leaderboard as it stood when this bundle was built.
   *
   * Baked only into builds that may not fetch a board at runtime (Poki forbids
   * every external runtime request; Yandex rejects third-party storage URLs at
   * moderation). `null` on every build that has a live endpoint.
   *
   * See `leaderboardSnapshotPlugin` in `vite.config.ts` for how it is produced
   * and `scripts/leaderboard-snapshot.mjs` for why it carries a histogram
   * alongside the published rows.
   */
  const snapshot: {
    updatedAt: number
    total: number
    entries: { rank: number; name: string; score: number; flair: number }[]
    /** `[score, howManyPlayersHaveIt]`, ordered score DESC. */
    dist: [number, number][]
  } | null
  export default snapshot
}
