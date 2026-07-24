# Portfolio Maintenance Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore immediate wheel scrolling and repair the verified mobile-game and canvas-accessibility defects while preserving intentional anchor animation.

**Architecture:** Keep the site dependency-free. Guard the regressions in the existing Python structural suite, scope animated scrolling to deliberate navigation clicks in `script.js`, and use responsive CSS to keep the mobile game controls and board in one viewport.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Python standard-library tests, GitHub Actions.

## Global Constraints

- Preserve the dark visual system and cyan/blue accents.
- Do not intercept the skip link.
- Respect `prefers-reduced-motion: reduce`.
- Keep the Tetris easter egg available on desktop and touch devices.
- Do not change Cloudflare configuration in this repository commit.

---

### Task 1: Restore native wheel scrolling

**Files:**
- Modify: `tests/site_checks.py`
- Modify: `styles.css:32-34`
- Modify: `script.js:175-250`

**Interfaces:**
- Consumes: `.nav-link` and `.cta-button` in-page links and the existing `reducedMotionQuery` media query.
- Produces: `setupAnchorScrolling()`, called once during `DOMContentLoaded`.

- [ ] **Step 1: Write the failing regression check**

Read `styles.css` and `script.js` in `tests/site_checks.py`, then add checks equivalent to:

```python
check(
    not re.search(r"(?ms)^html\\s*\\{[^}]*scroll-behavior\\s*:\\s*smooth", styles),
    "Global smooth scrolling delays or blocks wheel input",
    failures,
)
check(
    "function setupAnchorScrolling()" in script
    and "setupAnchorScrolling();" in script
    and "scrollIntoView" in script,
    "Intentional in-page links must retain scoped smooth scrolling",
    failures,
)
```

- [ ] **Step 2: Run the structural check and verify RED**

Run: `python tests/site_checks.py`

Expected: failure messages for global smooth scrolling and missing scoped anchor scrolling.

- [ ] **Step 3: Implement scoped anchor scrolling**

Remove the global `html { scroll-behavior: smooth; }` rule. Add `setupAnchorScrolling()` that listens only to `.nav-link` and `.cta-button`, validates same-page hash targets, calls:

```javascript
target.scrollIntoView({
    behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
    block: 'start'
});
```

and updates the URL hash with `history.pushState`. Invoke it during `DOMContentLoaded` before navigation tracking.

- [ ] **Step 4: Run the structural check and verify GREEN**

Run: `python tests/site_checks.py`

Expected: all site checks pass.

### Task 2: Correct canvas accessibility semantics

**Files:**
- Modify: `tests/site_checks.py`
- Modify: `index.html:320-322`

**Interfaces:**
- Consumes: the existing `#tetrisBoard` canvas.
- Produces: an image-role canvas with a truthful accessible name and fallback.

- [ ] **Step 1: Write the failing canvas checks**

Extend `SiteParser` to capture canvas attributes and canvas fallback text. Assert that the one `#tetrisBoard` canvas has `role="img"`, a non-empty `aria-label`, and fallback text that does not contain `does not support`.

- [ ] **Step 2: Run the structural check and verify RED**

Run: `python tests/site_checks.py`

Expected: failures for the missing image role and misleading fallback.

- [ ] **Step 3: Implement the accessible canvas**

Use:

```html
<canvas
    class="tetris-board"
    id="tetrisBoard"
    width="300"
    height="600"
    role="img"
    aria-label="Interactive Tetris game board"
>
    Interactive Tetris game board. Use the labeled controls to move and rotate pieces.
</canvas>
```

- [ ] **Step 4: Run the structural check and verify GREEN**

Run: `python tests/site_checks.py`

Expected: all site checks pass.

### Task 3: Keep touch controls and board in one viewport

**Files:**
- Modify: `styles.css:865-1024`

**Interfaces:**
- Consumes: `.tetris-container`, `.tetris-board`, `.tetris-info`, `.info-panel:last-child`, and `.tetris-touch-controls`.
- Produces: a compact narrow/coarse-pointer layout with no horizontal scroll.

- [ ] **Step 1: Re-run the failing geometry case**

At 320x700, open Tetris and record the board and touch-control rectangles.

Expected before implementation: board approximately `top=186, bottom=690`; controls approximately `top=1019`, outside the modal viewport.

- [ ] **Step 2: Implement the compact mobile layout**

Change the container to `overflow-x: hidden; overflow-y: auto`. In the existing narrow/coarse-pointer media query, compact header spacing, set the board to a viewport-relative height with proportional width, hide `.info-panel:last-child`, retain the three-column score row, and keep touch controls directly below it. Use a board height capped at `min(42svh, 360px)` with a shorter-screen override if the 320x700 geometry still exceeds the modal viewport.

- [ ] **Step 3: Verify the geometry GREEN**

At 320x700, confirm the complete board and touch controls are visible together, the modal has no horizontal overflow, and every touch target remains at least 44px tall.

- [ ] **Step 4: Verify desktop preservation**

At 1280x720, confirm the existing two-column board/information layout remains intact and keyboard controls still work.

### Task 4: Full verification and publication

**Files:**
- Modify only if verification exposes a defect in the approved scope.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: a verified commit pushed to `agent/improve-portfolio` and updating PR #1.

- [ ] **Step 1: Run automated verification**

Run:

```powershell
python tests/site_checks.py
& 'C:\Users\trstu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check script.js
git diff --check
```

Expected: all commands exit 0 with no warnings or failures.

- [ ] **Step 2: Run browser verification**

Verify wheel scrolling, scoped anchor animation, direct hash navigation, reduced-motion behavior, desktop/mobile layout, modal focus trapping, Escape close, and console logs at 1280x720, 390x844, and 320x700.

- [ ] **Step 3: Commit the implementation**

Stage only `index.html`, `styles.css`, `script.js`, `tests/site_checks.py`, and this plan. Commit with `Fix scrolling and mobile game usability`.

- [ ] **Step 4: Push and check CI**

Push `agent/improve-portfolio`, then confirm PR #1's `validate` check succeeds.
