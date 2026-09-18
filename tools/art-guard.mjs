// The art pipeline's drivers (`art:prompts`, `art:status`, `art:models`,
// `art:export`) read a game's SHEET CATALOGUE — `src/game/artSheet.ts` plus the
// bench at `/#/art-sheets`. The migration from survivalist kept the pipeline's
// machinery (slicer, art desk, compressor, override layer) and dropped the
// survivalist catalogue; the Auroras Magic one is written in the painted-art
// step with the `art-generation-pipeline` skill, against `art-style.md`.
//
// Until then these commands stop here with that explanation instead of a
// module-not-found stack trace.
import { existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const requireArtCatalogue = (tool) => {
  if (existsSync(join(ROOT, 'src', 'game', 'artSheet.ts'))) return
  console.error(
    `\n  ${tool}: no art sheet catalogue yet (src/game/artSheet.ts).\n` +
    '  The painted-art step creates it for the Auroras Magic cast with the\n' +
    '  art-generation-pipeline skill — style contract: art-style.md.\n'
  )
  process.exit(1)
}
