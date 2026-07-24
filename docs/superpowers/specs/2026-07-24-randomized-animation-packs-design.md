# Randomized Animation Packs Design

## Goal

Replace the site's generic floating particles and repeated circuit separators with three cohesive visual packs. Each page load selects one pack at random and uses its interactive composition in the hero plus its matching noninteractive companion near the bottom of the page.

The result should feel distinctive, technically sophisticated, and coherent without competing with the portfolio content or degrading scrolling, accessibility, or performance.

In this design, the requested "static" companion means noninteractive rather than motionless: it may animate ambiently, while reduced-motion visitors receive a motionless rendered frame.

## Current structure

The site currently has one fixed particle layer and three circuit-style SVG separators. Those effects are visually independent and repeat the same motif throughout the page. The new design reduces this to two intentional animation moments:

1. An interactive hero background.
2. A matching ambient companion between Experience and Contact.

The existing particle layer, particle generator, and all three circuit separators will be removed.

## Considered approaches

1. **One randomized paired pack per page load (selected):** choose one pack during initialization and use it for both animation placements. This provides variety while keeping each visit visually coherent.
2. **Randomize the top and bottom independently:** produces more combinations, but breaks the visual relationship that makes the pack system meaningful.
3. **Blend multiple packs simultaneously:** maximizes novelty, but creates visual noise, increases rendering cost, and weakens the site's professional tone.

No pack-switching control or persistence will be added. Refreshing the page performs a fresh random selection, which may legitimately select the same pack again.

## Pack definitions

### Flow

- **Hero:** luminous streams curve across the hero and bend locally toward fine-pointer movement. Small signals travel through the reshaped routes.
- **Companion:** calmer streams move through predetermined paths without responding to input.
- **Meaning:** routing ambiguous work into reliable delivery.

### Topology

- **Hero:** nodes drift in small clusters; nearby nodes orient, brighten, and form temporary connections around fine-pointer movement.
- **Companion:** clusters slowly form, connect, and reorganize without input.
- **Meaning:** building teams, relationships, and reusable systems around shared outcomes.

### Blueprint

- **Hero:** layered technical planes and routed traces shift with subtle pointer-driven parallax.
- **Companion:** offset architectural layers drift slowly while signals travel along fixed traces.
- **Meaning:** platform architecture, systems thinking, and clarity across layers.

All three packs retain the site's dark background, cyan/blue palette, low-opacity depth, and restrained glow.

## Selection and rendering architecture

- Add a dedicated deferred `animations.js` file so animation rendering remains isolated from timeline, navigation, and Tetris behavior in `script.js`.
- Define a pack registry containing `flow`, `topology`, and `blueprint` renderers.
- Select one registry key once during page initialization with `Math.random()`.
- Store the selected key on `document.documentElement.dataset.animationPack` and both animation mounts for diagnostics and browser verification.
- Initialize two scenes with the same key: an interactive hero scene and a noninteractive companion scene.
- Support an unlinked `?animation=flow|topology|blueprint` URL override solely for deterministic development and visual verification. Invalid values fall back to normal random selection.
- Render decorative scenes on `<canvas>` elements marked `aria-hidden="true"`. Portfolio content must remain usable if canvas initialization fails.

Each scene owns its canvas, dimensions, animation state, pointer state, and cleanup callbacks. Scene lifecycle code must not modify global scrolling behavior or call `preventDefault()` on pointer or wheel events.

## Placement and layering

- Place the hero canvas inside `.hero`, behind `.hero-content` and above the base gradient.
- Keep hero text, portrait, navigation, and calls to action fully interactive and visually dominant.
- Place the companion canvas in a full-width decorative band between Experience and Contact.
- The companion is noninteractive and uses `pointer-events: none`.
- Remove the fixed background animation so effects do not follow the visitor through every content section.

## Responsive and accessibility behavior

- Fine-pointer desktop devices receive the interactive hero renderer.
- Coarse-pointer and narrow devices receive the matching ambient hero renderer with a reduced element count.
- `prefers-reduced-motion: reduce` renders one polished static frame for both placements and starts no animation loop.
- Canvas elements remain decorative and outside the accessibility tree.
- The site's semantic content, focus order, skip link, navigation, and native scrolling remain unchanged.
- Visual contrast must remain sufficient with any pack active; animation opacity is capped behind text.

## Performance and lifecycle

- Cap canvas pixel density at `2` and use a lower visual complexity on narrow screens.
- Use one `requestAnimationFrame` scheduler for both scenes rather than independent unbounded loops.
- Pause rendering when the document is hidden.
- Use `IntersectionObserver` to avoid rendering the bottom companion while it is off-screen.
- Resize canvases with `ResizeObserver`, with a window-resize fallback.
- Avoid third-party animation libraries and network-loaded assets.
- Keep allocations outside the per-frame rendering path wherever practical.

## Failure handling

- If canvas or a required browser API is unavailable, leave the existing dark gradient visible and continue loading the portfolio.
- If `IntersectionObserver` or `ResizeObserver` is unavailable, keep the scene active and use window resize events rather than failing initialization.
- Invalid animation overrides are ignored.
- Animation errors must not prevent timeline rendering, navigation, or Tetris initialization because the renderer is isolated in its own deferred script.

## Verification

- Extend dependency-free structural checks to require exactly two animation mounts, the deferred animation script, all three pack identifiers, and removal of the legacy particle/circuit markup.
- Run the new structural check in the failing legacy state before implementation.
- Run `node --check animations.js`, the existing site checks, the checker regression tests, and `git diff --check` after implementation.
- Browser-test Flow, Topology, and Blueprint deterministically with the URL override at desktop size.
- Verify pointer movement changes each hero scene without blocking links, selection, wheel scrolling, or anchor navigation.
- Verify the top and bottom mounts expose the same selected pack on ordinary randomized loads.
- Verify narrow/coarse-pointer behavior, reduced-motion static rendering, off-screen pausing, and absence of horizontal overflow.
- Visually compare the hero and companion of each pack for a clear family resemblance and adequate text readability.
- Run a Superpowers code-review subagent after local verification, address actionable findings, and rerun the complete verification suite before pushing.

## Out of scope

- Visitor-facing theme controls or animation selectors.
- Persisting a pack across reloads or browsing sessions.
- Combining multiple packs during one page load.
- Changing portfolio copy, section order, or the Tetris easter egg.
- Cloudflare cache-rule changes.
