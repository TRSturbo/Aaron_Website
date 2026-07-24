# Randomized Animation Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy particles and circuit separators with one randomly selected visual pack whose interactive hero and ambient bottom companion always match.

**Architecture:** A focused `animations.js` module owns pack selection, canvas scenes, rendering, and lifecycle. The existing `script.js` retains portfolio content, navigation, and Tetris behavior. Two decorative canvas mounts share one selected pack key and one animation scheduler.

**Tech Stack:** Dependency-free HTML5 Canvas, CSS, browser Pointer/Visibility/Intersection/Resize APIs, Node built-in test runner, Python structural checks, GitHub Actions.

## Global Constraints

- The normal page load randomly selects exactly one of `flow`, `topology`, or `blueprint`; the top and bottom mounts must use the same key.
- Do not persist the selection across reloads or browsing sessions, and do not add a visitor-facing switcher.
- Fine-pointer desktop devices receive an interactive hero; coarse-pointer and narrow devices receive an ambient hero.
- Reduced-motion users receive a motionless rendered frame with no animation loop.
- Canvas effects are decorative, `aria-hidden`, and must never intercept scrolling or content interaction.
- Remove the fixed particle background and all three circuit separators.
- Add no third-party runtime dependencies or network-loaded animation assets.
- Keep portfolio copy, section order, native scrolling, navigation, and Tetris behavior unchanged.
- Keep Cloudflare cache-rule changes out of this repository feature.

---

## File map

- Create `animations.js`: pure selection helpers, pack registry, scene rendering, lifecycle controller, and browser initialization.
- Create `tests/test_animations.js`: deterministic Node tests for selection, scene-mode policy, and registry completeness.
- Modify `index.html`: remove legacy animation markup, add hero and companion canvases, load `animations.js` with `defer`.
- Modify `styles.css`: remove legacy particle/circuit CSS and style the two canvas placements.
- Modify `script.js`: remove particle creation and its resize/motion listeners only.
- Modify `tests/site_checks.py`: enforce the new mounts, script, pack/lifecycle contract, and absence of legacy markup.
- Modify `.github/workflows/quality.yml`: syntax-check and test `animations.js` in CI.

### Task 1: Define and test pack-selection policy

**Files:**
- Create: `animations.js`
- Create: `tests/test_animations.js`

**Interfaces:**
- Produces: `PACK_IDS: readonly string[]`
- Produces: `selectAnimationPack(search: string, random: () => number): string`
- Produces: `resolveSceneMode({ reducedMotion, coarsePointer, narrowViewport, interactive }): "static" | "ambient" | "interactive"`
- Consumes: URL search text and a random-number function.

- [ ] **Step 1: Write the failing Node tests**

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const {
    PACK_IDS,
    selectAnimationPack,
    resolveSceneMode,
} = require('../animations.js');

test('pack registry exposes the three approved identifiers', () => {
    assert.deepEqual(PACK_IDS, ['flow', 'topology', 'blueprint']);
});

test('recognized URL override selects a deterministic pack', () => {
    assert.equal(selectAnimationPack('?animation=topology', () => 0), 'topology');
});

test('invalid override falls back to randomized selection', () => {
    assert.equal(selectAnimationPack('?animation=unknown', () => 0.99), 'blueprint');
});

test('random values cover each pack boundary', () => {
    assert.equal(selectAnimationPack('', () => 0), 'flow');
    assert.equal(selectAnimationPack('', () => 0.34), 'topology');
    assert.equal(selectAnimationPack('', () => 0.999999), 'blueprint');
});

test('reduced motion always resolves to a static scene', () => {
    assert.equal(resolveSceneMode({ reducedMotion: true, coarsePointer: false, narrowViewport: false, interactive: true }), 'static');
});

test('coarse and narrow devices use an ambient hero', () => {
    assert.equal(resolveSceneMode({ reducedMotion: false, coarsePointer: true, narrowViewport: false, interactive: true }), 'ambient');
    assert.equal(resolveSceneMode({ reducedMotion: false, coarsePointer: false, narrowViewport: true, interactive: true }), 'ambient');
});

test('fine-pointer desktop hero remains interactive', () => {
    assert.equal(resolveSceneMode({ reducedMotion: false, coarsePointer: false, narrowViewport: false, interactive: true }), 'interactive');
    assert.equal(resolveSceneMode({ reducedMotion: false, coarsePointer: false, narrowViewport: false, interactive: false }), 'ambient');
});
```

- [ ] **Step 2: Run the test and verify the intended failure**

Run: `node --test tests/test_animations.js`

Expected: FAIL because `../animations.js` does not exist.

- [ ] **Step 3: Implement the minimal pure policy API**

```javascript
(function attachAnimationApi(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.PortfolioAnimations = api;
    }
})(typeof window !== 'undefined' ? window : undefined, () => {
    const PACK_IDS = Object.freeze(['flow', 'topology', 'blueprint']);

    function selectAnimationPack(search = '', random = Math.random) {
        const override = new URLSearchParams(search).get('animation');
        if (PACK_IDS.includes(override)) return override;

        const sample = Number(random());
        const normalized = Number.isFinite(sample)
            ? Math.min(Math.max(sample, 0), 0.999999)
            : 0;
        return PACK_IDS[Math.floor(normalized * PACK_IDS.length)];
    }

    function resolveSceneMode({ reducedMotion, coarsePointer, narrowViewport, interactive }) {
        if (reducedMotion) return 'static';
        if (!interactive || coarsePointer || narrowViewport) return 'ambient';
        return 'interactive';
    }

    return { PACK_IDS, selectAnimationPack, resolveSceneMode };
});
```

- [ ] **Step 4: Run the policy tests**

Run: `node --test tests/test_animations.js`

Expected: 7 tests pass, 0 fail.

- [ ] **Step 5: Commit the policy contract**

```powershell
git add -- animations.js tests/test_animations.js
git commit -m "Define animation pack selection policy"
```

### Task 2: Replace legacy animation markup and styling

**Files:**
- Modify: `tests/site_checks.py`
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `script.js`

**Interfaces:**
- Consumes: `animations.js` from Task 1.
- Produces: `#heroAnimation` and `#companionAnimation` canvas mounts.
- Produces: `.hero-animation` and `.animation-companion` layout rules.

- [ ] **Step 1: Add failing structural assertions after the existing local-script check**

```python
index_text = (ROOT / "index.html").read_text(encoding="utf-8")
animations = (ROOT / "animations.js").read_text(encoding="utf-8")

animation_scripts = [item for item in parser.scripts if item.get("src") == "animations.js"]
check(
    len(animation_scripts) == 1 and "defer" in animation_scripts[0],
    "animations.js must load once with defer",
    failures,
)
check(parser.ids.count("heroAnimation") == 1, "Hero animation canvas is required", failures)
check(parser.ids.count("companionAnimation") == 1, "Companion animation canvas is required", failures)
check('id="bgAnimation"' not in index_text, "Legacy particle mount must be removed", failures)
check("circuit-divider" not in index_text, "Legacy circuit dividers must be removed", failures)
check("function createParticles()" not in script, "Legacy particle generator must be removed", failures)
check(
    all(identifier in animations for identifier in ("flow", "topology", "blueprint")),
    "All approved animation packs must be registered",
    failures,
)
```

- [ ] **Step 2: Run structural checks and verify legacy-state failures**

Run: `python tests/site_checks.py`

Expected: FAIL for missing canvases/script and remaining particle/circuit markup.

- [ ] **Step 3: Replace markup with exactly two canvases**

Inside `#hero`, before `.hero-content`, add:

```html
<canvas class="hero-animation" id="heroAnimation" aria-hidden="true"></canvas>
```

Delete `#bgAnimation` and all three `.circuit-divider` blocks. Between `</section>` for Experience and `<section id="contact">`, add:

```html
<div class="animation-companion" aria-hidden="true">
    <canvas id="companionAnimation" aria-hidden="true"></canvas>
</div>
```

Immediately before the existing deferred `script.js` tag, add:

```html
<script src="animations.js" defer></script>
```

- [ ] **Step 4: Replace legacy CSS with the two placement rules**

Delete `.bg-animation`, `.particle`, `@keyframes float`, `.circuit-divider`, `.circuit-svg`, `.circuit-path`, `.circuit-node`, `.circuit-connection`, and their three keyframes. Add:

```css
.hero {
    isolation: isolate;
    overflow: hidden;
}

.hero-animation {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    opacity: 0.72;
}

.hero-content {
    position: relative;
    z-index: 1;
}

.animation-companion {
    width: 100%;
    height: clamp(150px, 18vw, 230px);
    position: relative;
    overflow: hidden;
    background: var(--bg-primary);
    pointer-events: none;
}

.animation-companion canvas {
    width: 100%;
    height: 100%;
    display: block;
    opacity: 0.62;
}
```

- [ ] **Step 5: Remove particle JavaScript without touching other initialization**

Delete `createParticles()`, its DOM-ready call, the reduced-motion change listener that calls it, and the debounced resize listener that calls it. Preserve `renderTimeline()`, section reveals, anchor scrolling, navigation, scroll indicator, and Tetris listeners.

- [ ] **Step 6: Run structural and existing regression tests**

Run:

```powershell
python tests/site_checks.py
python -m unittest discover -s tests -p "test_*.py"
node --check script.js
```

Expected: every command exits 0.

- [ ] **Step 7: Commit the mount migration**

```powershell
git add -- index.html styles.css script.js tests/site_checks.py
git commit -m "Replace legacy animation mounts"
```

### Task 3: Implement the paired canvas renderer and lifecycle

**Files:**
- Modify: `tests/test_animations.js`
- Modify: `tests/site_checks.py`
- Modify: `animations.js`

**Interfaces:**
- Produces: `createPackRegistry(): Record<string, { draw(scene, time): void }>`
- Produces: `initializeAnimations(documentRef: Document, windowRef: Window): { pack: string, scenes: object[], start: () => void } | null`
- Consumes: `#heroAnimation`, `#companionAnimation`, `selectAnimationPack`, and `resolveSceneMode`.

- [ ] **Step 1: Add failing registry tests**

```javascript
const { createPackRegistry } = require('../animations.js');

test('renderer registry supplies every selected pack', () => {
    const registry = createPackRegistry();
    assert.deepEqual(Object.keys(registry), PACK_IDS);
    PACK_IDS.forEach(id => assert.equal(typeof registry[id].draw, 'function'));
});
```

Add structural checks:

```python
for lifecycle_marker in (
    "requestAnimationFrame",
    "visibilitychange",
    "IntersectionObserver",
    "ResizeObserver",
    "prefers-reduced-motion: reduce",
    "pointermove",
):
    check(lifecycle_marker in animations, f"Animation lifecycle is missing {lifecycle_marker}", failures)
check("preventDefault" not in animations, "Animation code must not cancel native input", failures)
```

- [ ] **Step 2: Run tests and verify registry/lifecycle failures**

Run:

```powershell
node --test tests/test_animations.js
python tests/site_checks.py
```

Expected: FAIL because the registry and lifecycle implementation are absent.

- [ ] **Step 3: Add focused scene primitives**

Add these data contracts inside the factory in `animations.js`:

```javascript
function createScene(canvas, { pack, interactive, windowRef }) {
    return {
        canvas,
        context: canvas.getContext('2d'),
        pack,
        interactive,
        mode: 'ambient',
        width: 0,
        height: 0,
        pixelRatio: 1,
        visible: interactive,
        pointer: { x: 0, y: 0, active: false },
        nodes: createTopologyNodes(interactive ? 24 : 18),
        windowRef,
    };
}

function createTopologyNodes(count) {
    return Array.from({ length: count }, (_, index) => ({
        x: 0.08 + ((index * 47) % 89) / 100,
        y: 0.10 + ((index * 67) % 83) / 100,
        phase: index * 1.37,
        size: 1.6 + (index % 4) * 0.5,
    }));
}

function resizeScene(scene) {
    const bounds = scene.canvas.getBoundingClientRect();
    scene.pixelRatio = Math.min(scene.windowRef.devicePixelRatio || 1, 2);
    scene.width = Math.max(1, bounds.width);
    scene.height = Math.max(1, bounds.height);
    scene.canvas.width = Math.round(scene.width * scene.pixelRatio);
    scene.canvas.height = Math.round(scene.height * scene.pixelRatio);
    scene.context.setTransform(scene.pixelRatio, 0, 0, scene.pixelRatio, 0, 0);
}
```

Implement `drawFlow`, `drawTopology`, and `drawBlueprint` as focused Canvas functions:

```javascript
function drawFlow(scene, time) {
    const { context, width, height, pointer, mode } = scene;
    context.clearRect(0, 0, width, height);
    const interactive = mode === 'interactive' && pointer.active;
    for (let line = 0; line < 9; line += 1) {
        context.beginPath();
        for (let x = -10; x <= width + 10; x += 8) {
            const base = height * (0.2 + line * 0.078);
            let y = base + Math.sin(x * 0.016 + time * 0.00032 + line * 0.72) * 10;
            y += Math.sin(x * 0.006 - time * 0.00017 + line) * 7;
            if (interactive) {
                const influence = Math.exp(-Math.pow(x - pointer.x, 2) / 15000);
                y += (pointer.y - y) * influence * 0.52;
            }
            x === -10 ? context.moveTo(x, y) : context.lineTo(x, y);
        }
        context.strokeStyle = `rgba(48, 203, 255, ${line === 4 ? 0.34 : 0.17})`;
        context.lineWidth = line === 4 ? 1.5 : 0.75;
        context.stroke();
    }
}

function drawTopology(scene, time) {
    const { context, width, height, pointer, mode } = scene;
    context.clearRect(0, 0, width, height);
    const points = scene.nodes.map(node => {
        let x = node.x * width + Math.sin(time * 0.00022 + node.phase) * 9;
        let y = node.y * height + Math.cos(time * 0.00018 + node.phase) * 7;
        let heat = 0;
        if (mode === 'interactive' && pointer.active) {
            const distance = Math.hypot(pointer.x - x, pointer.y - y);
            heat = Math.max(0, 1 - distance / 125);
            x += (pointer.x - x) * heat * 0.13;
            y += (pointer.y - y) * heat * 0.13;
        }
        return { x, y, heat, size: node.size };
    });
    points.forEach((point, index) => {
        points.slice(index + 1).forEach(other => {
            const distance = Math.hypot(point.x - other.x, point.y - other.y);
            if (distance >= 110) return;
            context.beginPath();
            context.moveTo(point.x, point.y);
            context.lineTo(other.x, other.y);
            context.strokeStyle = `rgba(62, 207, 255, ${(1 - distance / 110) * (0.14 + point.heat + other.heat)})`;
            context.stroke();
        });
        context.beginPath();
        context.arc(point.x, point.y, point.size + point.heat * 2, 0, Math.PI * 2);
        context.fillStyle = point.heat > 0.15 ? '#d5f8ff' : 'rgba(76, 216, 255, 0.72)';
        context.fill();
    });
}

function drawBlueprint(scene, time) {
    const { context, width, height, pointer, mode } = scene;
    context.clearRect(0, 0, width, height);
    const offsetX = mode === 'interactive' && pointer.active ? (pointer.x / width - 0.5) * 18 : 0;
    const offsetY = mode === 'interactive' && pointer.active ? (pointer.y / height - 0.5) * 12 : 0;
    context.save();
    context.translate(width / 2 + offsetX, height * 0.55 + offsetY);
    [-42, 0, 42].forEach((depth, layer) => {
        context.save();
        context.translate(depth * 0.35, depth * -0.22);
        context.rotate((-8 + layer * 4) * Math.PI / 180);
        context.strokeStyle = `rgba(55, 203, 255, ${0.12 + layer * 0.09})`;
        for (let x = -width * 0.55; x <= width * 0.55; x += 30) {
            context.beginPath(); context.moveTo(x, -height * 0.28); context.lineTo(x, height * 0.28); context.stroke();
        }
        for (let y = -height * 0.28; y <= height * 0.28; y += 30) {
            context.beginPath(); context.moveTo(-width * 0.55, y); context.lineTo(width * 0.55, y); context.stroke();
        }
        context.restore();
    });
    const signalX = ((time * 0.06) % (width * 1.1)) - width * 0.55;
    context.fillStyle = '#d9faff';
    context.beginPath(); context.arc(signalX, 0, 3, 0, Math.PI * 2); context.fill();
    context.restore();
}
```

- [ ] **Step 4: Add the registry and one shared scheduler**

```javascript
function createPackRegistry() {
    return {
        flow: { draw: drawFlow },
        topology: { draw: drawTopology },
        blueprint: { draw: drawBlueprint },
    };
}

function initializeAnimations(documentRef, windowRef) {
    const heroCanvas = documentRef.getElementById('heroAnimation');
    const companionCanvas = documentRef.getElementById('companionAnimation');
    const heroRegion = heroCanvas?.closest('.hero');
    if (!heroCanvas || !companionCanvas || !heroRegion || !heroCanvas.getContext || !companionCanvas.getContext) return null;

    const pack = selectAnimationPack(windowRef.location.search, Math.random);
    const reducedMotionQuery = windowRef.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointerQuery = windowRef.matchMedia('(pointer: coarse)');
    const narrowViewportQuery = windowRef.matchMedia('(max-width: 768px)');
    const registry = createPackRegistry();
    const hero = createScene(heroCanvas, { pack, interactive: true, windowRef });
    const companion = createScene(companionCanvas, { pack, interactive: false, windowRef });
    const scenes = [hero, companion];

    documentRef.documentElement.dataset.animationPack = pack;
    scenes.forEach(scene => {
        scene.canvas.dataset.animationPack = pack;
        scene.mode = resolveSceneMode({
            reducedMotion: reducedMotionQuery.matches,
            coarsePointer: coarsePointerQuery.matches,
            narrowViewport: narrowViewportQuery.matches,
            interactive: scene.interactive,
        });
        scene.canvas.dataset.animationMode = scene.mode;
        resizeScene(scene);
    });

    let frameId = 0;
    let documentVisible = !documentRef.hidden;
    const drawFrame = time => {
        scenes.forEach(scene => {
            if (scene.visible || scene.interactive) registry[pack].draw(scene, scene.mode === 'static' ? 0 : time);
        });
        if (documentVisible && scenes.some(scene => scene.mode !== 'static')) {
            frameId = windowRef.requestAnimationFrame(drawFrame);
        }
    };

    const start = () => {
        windowRef.cancelAnimationFrame(frameId);
        scenes.forEach(scene => registry[pack].draw(scene, 0));
        if (documentVisible && scenes.some(scene => scene.mode !== 'static')) frameId = windowRef.requestAnimationFrame(drawFrame);
    };

    documentRef.addEventListener('visibilitychange', () => {
        documentVisible = !documentRef.hidden;
        documentVisible ? start() : windowRef.cancelAnimationFrame(frameId);
    });

    function updateModes() {
        scenes.forEach(scene => {
            scene.mode = resolveSceneMode({
                reducedMotion: reducedMotionQuery.matches,
                coarsePointer: coarsePointerQuery.matches,
                narrowViewport: narrowViewportQuery.matches,
                interactive: scene.interactive,
            });
            scene.canvas.dataset.animationMode = scene.mode;
        });
        start();
    }

    const updatePointer = event => {
        const bounds = heroCanvas.getBoundingClientRect();
        hero.pointer.x = event.clientX - bounds.left;
        hero.pointer.y = event.clientY - bounds.top;
        hero.pointer.active = true;
    };
    heroRegion.addEventListener('pointermove', updatePointer, { passive: true });
    heroRegion.addEventListener('pointerleave', () => { hero.pointer.active = false; }, { passive: true });

    if ('IntersectionObserver' in windowRef) {
        const observer = new windowRef.IntersectionObserver(entries => {
            companion.visible = entries.some(entry => entry.isIntersecting);
            start();
        }, { rootMargin: '120px 0px' });
        observer.observe(companionCanvas);
    } else {
        companion.visible = true;
    }

    const resizeAll = () => {
        scenes.forEach(resizeScene);
        start();
    };
    if ('ResizeObserver' in windowRef) {
        const resizeObserver = new windowRef.ResizeObserver(resizeAll);
        scenes.forEach(scene => resizeObserver.observe(scene.canvas));
    } else {
        windowRef.addEventListener('resize', resizeAll, { passive: true });
    }

    [reducedMotionQuery, coarsePointerQuery, narrowViewportQuery].forEach(query => {
        query.addEventListener('change', updateModes);
    });

    start();
    return { pack, scenes, start };
}
```

After creating both scenes, return `null` before installing listeners if either context is unavailable:

```javascript
if (!hero.context || !companion.context) return null;
```

Do not add any `preventDefault()` call.

Replace the browser branch of the UMD wrapper with:

```javascript
if (root) {
    root.PortfolioAnimations = api;
    root.addEventListener(
        'DOMContentLoaded',
        () => api.initializeAnimations(root.document, root),
        { once: true },
    );
}
```

Replace the factory's Task 1 return statement with:

```javascript
return {
    PACK_IDS,
    selectAnimationPack,
    resolveSceneMode,
    createPackRegistry,
    initializeAnimations,
};
```

- [ ] **Step 5: Run animation and structural tests**

Run:

```powershell
node --test tests/test_animations.js
python tests/site_checks.py
node --check animations.js
```

Expected: all tests pass and both syntax checks exit 0.

- [ ] **Step 6: Commit the renderer**

```powershell
git add -- animations.js tests/test_animations.js tests/site_checks.py
git commit -m "Add paired canvas animation packs"
```

### Task 4: Add animation verification to CI and run the complete suite

**Files:**
- Modify: `.github/workflows/quality.yml`

**Interfaces:**
- Consumes: Node tests and `animations.js` from Tasks 1–3.
- Produces: CI enforcement for animation syntax and behavior.

- [ ] **Step 1: Extend the JavaScript CI step**

Replace the final workflow step with:

```yaml
      - name: Check JavaScript syntax
        run: |
          node --check script.js
          node --check animations.js

      - name: Run animation regression tests
        run: node --test tests/test_animations.js
```

- [ ] **Step 2: Run the same complete suite locally**

Run:

```powershell
python tests/site_checks.py
python -m unittest discover -s tests -p "test_*.py"
node --test tests/test_animations.js
node --check script.js
node --check animations.js
git diff --check
```

Expected: every command exits 0, Python reports 2 tests, and Node reports all animation tests passing.

- [ ] **Step 3: Commit CI coverage**

```powershell
git add -- .github/workflows/quality.yml
git commit -m "Validate animation packs in CI"
```

### Task 5: Browser-verify every pack and interaction boundary

**Files:**
- Modify as required by observed defects: `animations.js`, `styles.css`, `index.html`, tests covering each fix.

**Interfaces:**
- Consumes: complete feature implementation.
- Produces: evidence that all modes render and preserve site behavior.

- [ ] **Step 1: Start the local static server**

Run: `python -m http.server 4173 --bind 127.0.0.1`

Expected: `http://127.0.0.1:4173/` returns 200.

- [ ] **Step 2: Verify all three desktop packs deterministically**

Open each URL in the browser:

```text
http://127.0.0.1:4173/?animation=flow
http://127.0.0.1:4173/?animation=topology
http://127.0.0.1:4173/?animation=blueprint
```

For each pack, verify:

- `document.documentElement.dataset.animationPack` matches the override.
- Both canvas `data-animation-pack` values match the root.
- Hero mode is `interactive`; companion mode is `ambient`.
- Pointer movement changes hero pixels without covering links or preventing clicks.
- Mouse-wheel scrolling, anchor links, and scrollbar dragging still work.
- Companion visually matches the hero family near Contact.

- [ ] **Step 3: Verify random selection and layout**

Reload the unmodified root URL multiple times and confirm the selected key always belongs to `PACK_IDS` and both canvases match. Check 1280x720 and a narrow phone viewport; assert `document.documentElement.scrollWidth === window.innerWidth`.

- [ ] **Step 4: Verify accessibility and lifecycle**

Use browser emulation to confirm:

- `prefers-reduced-motion: reduce` yields `data-animation-mode="static"` on both canvases and stable pixels across time.
- A coarse pointer or width at/below 768px yields an ambient hero.
- Scrolling the companion off-screen stops its draw work while the visible hero remains functional.
- Hiding and restoring the page restarts rendering without duplicate animation loops.

- [ ] **Step 5: Fix observed defects test-first and rerun all checks**

For every browser defect, add the smallest failing structural or Node regression first, observe it fail, then implement the repair. Rerun the complete Task 4 command set and repeat the affected browser check.

- [ ] **Step 6: Commit verified browser fixes, if any**

```powershell
git add -- animations.js styles.css index.html tests/site_checks.py tests/test_animations.js
git commit -m "Polish randomized animation packs"
```

Skip this commit only if browser verification required no file changes.

### Task 6: Run the requested Superpowers review and address findings

**Files:**
- Modify only files implicated by actionable review findings.

**Interfaces:**
- Consumes: browser-verified feature branch.
- Produces: independent review findings, fixes, and final verification evidence.

- [ ] **Step 1: Invoke `superpowers:requesting-code-review` and spawn a review subagent**

Give the subagent the approved spec, implementation plan, base commit `6dae493`, current feature head, and explicit permission to review new and pre-existing animation integration code. Request severity-ranked findings with file/line evidence and verification commands.

- [ ] **Step 2: Verify review findings before changing code**

Invoke `superpowers:receiving-code-review`. Reproduce each actionable issue; reject findings that are not technically valid with concrete evidence.

- [ ] **Step 3: Fix accepted findings with regression tests**

For each accepted defect, add a failing test, run it, implement the smallest fix, and rerun the focused test.

- [ ] **Step 4: Run final verification**

Run:

```powershell
python tests/site_checks.py
python -m unittest discover -s tests -p "test_*.py"
node --test tests/test_animations.js
node --check script.js
node --check animations.js
git diff --check
git status -sb
```

Then repeat one deterministic browser check for each pack and one physical-style wheel scroll on the final files.

- [ ] **Step 5: Commit review fixes**

```powershell
git add -- animations.js index.html styles.css script.js tests/site_checks.py tests/test_animations.js .github/workflows/quality.yml
git commit -m "Address animation pack review findings"
```

Skip this commit only if the review has no actionable findings.

### Task 7: Push and open the pull request

**Files:**
- No additional source changes expected.

**Interfaces:**
- Consumes: clean, fully verified `agent/randomized-animation-packs` branch.
- Produces: remote feature branch and draft pull request targeting `main`.

- [ ] **Step 1: Confirm final scope and branch state**

Run:

```powershell
git status -sb
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
```

Expected: clean working tree and only animation-pack/spec/plan commits.

- [ ] **Step 2: Push the feature branch**

Run: `git push -u origin agent/randomized-animation-packs`

Expected: remote branch updated successfully.

- [ ] **Step 3: Open a draft PR targeting `main`**

Title: `Add randomized paired animation packs`

PR body must include:

```markdown
## Summary
- replace floating particles and repeated circuit separators with three paired animation packs
- randomly select one coherent hero/companion pack per page load
- preserve reduced-motion, coarse-pointer, native scrolling, and no-dependency behavior

## Validation
- Python structural and helper tests
- Node animation regression and syntax tests
- deterministic browser pass for Flow, Topology, and Blueprint
- responsive, reduced-motion, pointer, anchor, and physical-style wheel verification
- independent Superpowers code review with actionable findings addressed
```

- [ ] **Step 4: Confirm PR URL and CI state**

Report the branch, commits, PR URL, exact verification commands, code-review result, and any checks still running. Do not claim remote CI passed until its completed result is observed.
