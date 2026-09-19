import { reactive } from 'vue'

/**
 * The intro's DOM chrome state (story-spec §8.26): where the picture-book
 * page sits on screen, and which overlay is up. Written by
 * `game/story/intro.ts`, read by `views/IntroScene.vue`.
 */
export const introHud = reactive({
  /** The beat on screen, 0..4, or -1 before the intro starts. */
  beat: -1,
  /** The page, CSS px. */
  box: { x: 0, y: 0, w: 1, h: 1 },
  /** The game's name over the first beat. */
  title: false,
  /** The last beat's big Play button. */
  play: false,
  /** Where that button sits (its centre) and its size, CSS px. */
  playAt: { x: 0, y: 0, s: 96 },
  /** A phone held upright: a tall page with a panning camera. */
  portrait: false
})
