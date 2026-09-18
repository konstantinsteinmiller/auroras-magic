# Game Design Document: Auroras Magic

## 1. Executive Summary
**Concept:** A cozy, gesture-based spellcasting game tailored for the 3-12 demographic and cozy gamers. Players draw shapes to cast spells in magical unicorn duels.
**The Twist:** Progression is driven by a tactile, zero-UI "Coloring Book" campaign. Defeating enemies allows players to manually scrub away the shadowy dust covering the realm of Prisma, revealing vibrant colors underneath through a highly satisfying, ASMR-style screen-wiping mechanic.
**Design Philosophy:** Zero UI clutter during gameplay. Tangible, in-world rewards. High tactile satisfaction.

## 2. Core Gameplay Loop
1. **Duel:** Enter a node on the campaign map and duel a shadow-clone by drawing rune shapes.
2. **Reward:** Upon victory, a physical wrapped gift drops onto the desaturated, dusty map.
3. **Unbox:** The player taps the gift, bursting it open to reveal a magical restoration tool (e.g., Stardust Brush, Magic Eraser, or a captured Sunbeam).
4. **Restore (The Cozy Wipe):** The player uses their finger to manually wipe away the grey, dusty overlay on that sector of the map. Scrubbing reveals the vibrant, living world underneath, accompanied by sparkling VFX and soothing audio feedback.

## 3. The "Coloring Book" Restoration Mechanic
To maximize retention and appeal to cozy gamers, the color restoration is explicitly manual, tactile, and sensory-rich. It serves as a cooldown activity after the high-action dueling phase.

* **Visuals:** Unrestored areas are not just greyscale; they are covered in a textured "shadow dust" that looks thick and slightly fuzzy. As the player's finger drags across the screen, the dust is erased with soft, cloudy particle effects, leaving behind bright, oversaturated, candy-colored landscapes.
* **Audio/Haptics:** Wiping triggers a soft, rhythmic sweeping sound (like a soft brush on canvas or sweeping sand), paired with gentle, continuous haptic feedback (on supported devices). A musical chime builds in pitch as the area approaches 100% completion.
* **Completion Threshold:** The game auto-completes the area with a celebratory "pop" once the player clears 85% of the dust, ensuring they never get frustrated hunting for tiny leftover pixels.
* **Permanence:** Once colored, map sectors become fully animated (e.g., windmills spin, waterfalls flow, little woodland creatures peek out), serving as a permanent visual trophy of the player's progress.

## 4. Campaign Structure: The Realm of Prisma
Aurora’s journey traces a winding, linear path through distinct biomes. The map is completely seamless, allowing players to scroll back and admire their completed coloring work.

* **Standard Nodes:** Basic duels against minor shadow creatures. Winning drops a small gift that allows the player to wipe away the dust on a small section of the path or a single landmark (like a bridge or a magical tree).
* **Boss Nodes (Every 5th Node):** A longer duel against a corrupted Guardian of Prisma. Winning drops a massive, ornate chest.
* **Boss Rewards:** Unlocking the chest grants a new **Advanced Rune** (expanding the spell matrix) and a large-scale restoration tool that lets the player scrub an entire biome clean.

## 5. The Spell Matrix: Advanced Runes
Runes are introduced slowly to prevent cognitive overload. Below is the advanced library unlocked via Boss Nodes.

| Element | Primitive Shape | Description | Trail VFX Color |
| :--- | :--- | :--- | :--- |
| **Light** | Circle (○) | A simple, continuous circle. | Glowing Gold |
| **Water** | Teardrop (▽) | A downward-pointing triangle. | Cyan / Seafoam |
| **Lightning** | Zig-Zag (Z) | Three sharp, connected lines. | Neon Yellow |
| **Crystal** | Diamond (◇) | A tilted square (rhombus). | Magenta / Pink |
| **Heart** | Heart (♡) | A standard heart shape. | Pastel Pink |
| **Cosmic** | Infinity (∞) | A continuous figure-eight. | Deep Purple / Sparkles |

*Note: The drawing recognition engine forgives sloppy lines to accommodate younger players. Shape detection prioritizes the general path of the stroke over geometric perfection.*

## 6. Art Style & Interface
* **Zero-UI Philosophy:** No sprawling talent trees, no inventory grids, and no "Claim Reward" buttons. Everything exists physically in the world space.
* **Palette Contrast:** The contrast between the "Umbra Dust" (charcoal, muted purples, flat greys) and the "Restored Prisma" (neon pinks, bright mints, warm golds) must be stark.
* **Characters:** Aurora and her opponents are drawn in a thick-lined, sticker-like vector style to stand out against the painted backgrounds.

## 7. Technical Scope & Performance
* **Dust Overlay Implementation:** Achieved using a masked texture layer over the colored map. The player's touch input modifies the alpha channel of the mask texture in real-time, effectively "erasing" the top layer.
* **Brush Optimization:** To maintain 60 FPS on lower-end mobile devices, the wiping mask resolution will be scaled down relative to the screen resolution, applying a slight blur to the brush edges to hide aliasing.

Auroras Magic: Campaign Architecture
The campaign unfolds across a whimsical, hand-drawn overworld map designed like a colorful pop-up book. To drive D1 retention and maximize average playtime for a younger audience, progression is paced so that each node offers a short, narrative-driven dialogue (2-3 speech bubbles) before a battle. Rewards are tangible, non-intrusive cosmetic gifts that bypass complex UI currencies entirely.

10-Stage Progression & Retention Expansions
Chapter & Story Arc	New Rune Shape	Tactical Progression	Unlocked Gift (Retention)
1. Whispering Woods: A magical blight is putting the forest to sleep. Rescue the sprites.	Leaf (V)	Adds nature magic for Poison DOTs and minor healing over time.	Flower Crown cosmetic for Aurora.
2. Bubble Bay: Sea unicorns lost their singing voices to Umbra's dark tide.	Circle (O)	Water magic creates stationary bubbles that trap incoming enemy projectiles.	Seashell necklace accessory.
3. Cloud Kingdom: An eternal storm grounds the baby pegasi.	Spiral (e)	Lightning magic introduces fast, unblockable piercing strikes.	Fluffy pegasus wings.
4. Crystal Caves: The glowing crystals of the under-realm have shattered.	Diamond (♢)	Crystal magic creates reflective shields that bounce spells back at Umbra.	Sparkly hoof-trail VFX.
5. Mirror Mountains: Umbra stole the magic mirrors, creating confusing illusions.	Zigzag (Z)	Illusion magic spawns a temporary decoy unicorn to absorb exactly one hit.	"Play as Umbra" alternate skin.
6. Rainbow Ridge: The world's colors are draining; restore the prismatic bridge.	Arch (∩)	The Rainbow rune acts as a wildcard, completing any missing element in a combo.	Custom color-picker for Aurora's mane.
7. Sunken Sands: Time is frozen in the desert; the sandfalls stand still.	Hourglass (X)	Time magic passively slows Umbra's rune-drawing speed by 30% when cast.	Pastel UI theme unlock (replaces gold/white).
8. Twilight Tundra: The auroras in the sky are trapped in dark ice blocks.	Cross (+)	Frost magic temporarily freezes the enemy's stored runes, forcing a discard.	Cozy winter scarf accessory.
9. Starlight Summit: The night sky has gone dark; reignite the fallen stars.	Crescent (C)	Moon magic introduces lifesteal, draining HP from Umbra to heal Aurora.	A cute pet star that floats beside the player.
10. Friendship Festival: Umbra is just lonely; defeat her shadows to invite her to the party.	Heart (♡)	Love magic serves as the ultimate combo finisher with massive damage and healing.	Unlocks Local 2-Player Versus Mode.
    Retention Systems & UI Integration
    The Wardrobe Kiosk: Instead of cluttering the battle UI with inventory slots, unlocked gifts (scarves, crowns, pets) are equipped via a simple wardrobe tent strictly located on the campaign map.

Pacing the Spells: By introducing a new rune every few stages, the combination matrix expands exponentially without overwhelming the player. The Spellbook flashes a subtle notification dot when a new blank combination is ready to be discovered, tapping into completionist loops.

Loss Aversion for Kids: If a player loses a duel, Umbra doesn't gloat; she falls asleep. The player is awarded "Dream Dust," a hidden pity timer mechanic that slightly slows Umbra's casting on the retry, ensuring frustration doesn't cause session drops.

Which gesture recognition algorithm are you currently using to handle the precision required for this expanded library of rune shapes?

---

## Standard requirements (new-web-game-playbook, Phase 1)

> In GENERAL for all work: Do your work on a high-fidelity basis, don't do
> just good enough. Make the interactions feel good, add vfx juice where
> applicable (optimize to not overload the CPU/GPU). Don't take shortcuts.
> After planning, write the plan into `game-implementation-plan.md` to
> continue from if a session ends unexpectedly.
> The game starts right into the first scene, no main menu.
> Fully responsive: all mobile orientations, min portrait 320×658px, tablet
> and desktop up to fullscreen. No fixed px where avoidable — use %, vw/vh.
> Respect safe-area insets. Images are not selectable/draggable like normal
> web content but must allow drag and click events for game logic.
> Optimize for web-game standards: fast jump into gameplay (hot-path
> loading), delay uncritical assets until after first paint.
> Save ALL state variables in one object named `auroras_magic_state`.

The buildable specification derived from this document, including where and
why it departs from it, is `story-spec.md` (see its §0.4 and §13).
