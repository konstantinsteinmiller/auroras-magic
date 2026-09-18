/** Tiny shared helpers. Everything here stays one-liner sized. */

export const TAU = Math.PI * 2
export const PI = Math.PI
export const rnd = Math.random
export const min = Math.min
export const max = Math.max
export const abs = Math.abs
export const sin = Math.sin
export const cos = Math.cos
export const atan2 = Math.atan2
export const hypot = Math.hypot
export const sqrt = Math.sqrt
export const floor = Math.floor

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
/** Frame-rate independent approach. */
export const damp = (a: number, b: number, k: number, dt: number): number => lerp(a, b, 1 - Math.exp(-k * dt))
export const rand = (a: number, b: number): number => a + rnd() * (b - a)
export const pick = <T>(a: readonly T[]): T => a[(rnd() * a.length) | 0] as T
export const sign = (v: number): number => (v < 0 ? -1 : 1)
/** Smoothstep 0..1. */
export const ease = (t: number): number => t * t * (3 - 2 * t)

/** Deterministic PRNG, for anything that must rebuild identically. */
export const seeded = (s: number) => (): number => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
