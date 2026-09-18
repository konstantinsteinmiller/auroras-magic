/**
 * bitset.ts — the ONE bit-packing encoding every enumerable set in
 * `S.campaign` uses (story-spec §4.5.1): sectors done, the in-progress
 * sector's coverage cells, dialogues seen, combos seen, blooms, paint picks.
 *
 * A set is a base64 string of `ceil(bits / 8)` bytes, bit `i` living in byte
 * `i >> 3` at position `i & 7`. Base64 because the save blob is JSON: a raw
 * byte string would be escaped into `\uXXXX` sequences six times its size.
 *
 * Every reader is TOLERANT: a missing, truncated or non-base64 string reads as
 * "bit not set" rather than throwing, because these strings come out of a
 * save blob a player (or a portal's cloud) may have mangled. Writers re-encode
 * at the length the index needs, so a short string grows instead of losing
 * the write.
 */

const bytesFor = (bits: number): number => Math.max(0, Math.ceil(bits / 8))

/** Decode to bytes, or an empty array for anything that is not base64. */
const decode = (b64: string): Uint8Array => {
  if (typeof b64 !== 'string' || !b64) return new Uint8Array(0)
  try {
    const s = atob(b64)
    const out = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
    return out
  } catch {
    return new Uint8Array(0)
  }
}

const encode = (bytes: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s)
}

/** Grow `bytes` to at least `n` bytes (zero-filled), never shrink it. */
const atLeast = (bytes: Uint8Array, n: number): Uint8Array => {
  if (bytes.length >= n) return bytes
  const out = new Uint8Array(n)
  out.set(bytes)
  return out
}

/** A set of `bits` members, all unset. */
export const emptyBitset = (bits: number): string => encode(new Uint8Array(bytesFor(bits)))

export const hasBit = (b64: string, i: number): boolean => {
  if (!(i >= 0)) return false
  const b = decode(b64)
  const byte = i >> 3
  return byte < b.length && ((b[byte]! >> (i & 7)) & 1) === 1
}

export const setBit = (b64: string, i: number, on = true): string => {
  if (!(i >= 0)) return b64
  const b = atLeast(decode(b64), (i >> 3) + 1)
  if (on) b[i >> 3]! |= 1 << (i & 7)
  else b[i >> 3]! &= ~(1 << (i & 7))
  return encode(b)
}

/** Population count, for telemetry and progress read-outs. */
export const countBits = (b64: string): number => {
  let n = 0
  for (const v of decode(b64)) {
    let x = v
    while (x) {
      n += x & 1
      x >>= 1
    }
  }
  return n
}

/** Pack a boolean per index into a bitset of exactly `bits` members. */
export const packBits = (bits: number, isSet: (i: number) => boolean): string => {
  const b = new Uint8Array(bytesFor(bits))
  for (let i = 0; i < bits; i++) if (isSet(i)) b[i >> 3]! |= 1 << (i & 7)
  return encode(b)
}

/** Unpack into `out` (length = member count). Missing bytes read as unset. */
export const unpackBits = (b64: string, out: Uint8Array): Uint8Array => {
  const b = decode(b64)
  for (let i = 0; i < out.length; i++) {
    const byte = i >> 3
    out[i] = byte < b.length ? (b[byte]! >> (i & 7)) & 1 : 0
  }
  return out
}

/**
 * `paintPicks`' own 2-bit-per-sector pair (R-13). `hasBit`/`setBit` address
 * one bit, so a four-valued field gets its own accessor rather than two
 * `setBit` calls that could leave a half-written value behind.
 * 0 = not picked yet, 1..3 = pot index + 1.
 */
export const getPaintPick = (b64: string, sector: number): 0 | 1 | 2 | 3 => {
  if (!(sector >= 0)) return 0
  const b = decode(b64)
  const bit = sector * 2
  const byte = bit >> 3
  if (byte >= b.length) return 0
  return ((b[byte]! >> (bit & 7)) & 3) as 0 | 1 | 2 | 3
}

export const setPaintPick = (b64: string, sector: number, v: 0 | 1 | 2 | 3): string => {
  if (!(sector >= 0)) return b64
  const bit = sector * 2
  const b = atLeast(decode(b64), (bit >> 3) + 1)
  // Two bits at an even offset never straddle a byte boundary.
  b[bit >> 3] = (b[bit >> 3]! & ~(3 << (bit & 7))) | ((v & 3) << (bit & 7))
  return encode(b)
}
