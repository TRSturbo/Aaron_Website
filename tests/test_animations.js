const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
    PACK_IDS,
    selectAnimationPack,
    resolveSceneMode,
    createPackRegistry,
    getSceneComplexity,
    shouldDrawScene,
    initializeAnimations,
} = require('../animations.js');

function createRecordingContext() {
    const paths = [];
    const transforms = [];
    const clearRects = [];
    let currentPath = null;

    return {
        paths,
        transforms,
        clearRects,
        clearRect(...values) {
            clearRects.push(values);
        },
        setTransform(...values) {
            transforms.push({ type: 'setTransform', values });
        },
        save() {
            transforms.push({ type: 'save' });
        },
        restore() {
            transforms.push({ type: 'restore' });
        },
        translate(x, y) {
            transforms.push({ type: 'translate', x, y });
        },
        rotate(angle) {
            transforms.push({ type: 'rotate', angle });
        },
        beginPath() {
            currentPath = { points: [], arcs: [] };
        },
        moveTo(x, y) {
            currentPath.points.push({ type: 'moveTo', x, y });
        },
        lineTo(x, y) {
            currentPath.points.push({ type: 'lineTo', x, y });
        },
        arc(x, y, radius, startAngle, endAngle) {
            currentPath.arcs.push({ x, y, radius, startAngle, endAngle });
        },
        stroke() {
            paths.push({ ...currentPath, operation: 'stroke' });
        },
        fill() {
            paths.push({ ...currentPath, operation: 'fill' });
        },
    };
}

class FakeEventTarget {
    constructor() {
        this.listeners = new Map();
    }

    addEventListener(type, handler, options = {}) {
        const listeners = this.listeners.get(type) || [];
        listeners.push({ handler, options });
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, handler) {
        const listeners = this.listeners.get(type) || [];
        this.listeners.set(type, listeners.filter(listener => listener.handler !== handler));
    }

    dispatch(type, event = {}) {
        const listeners = [...(this.listeners.get(type) || [])];
        listeners.forEach(listener => {
            listener.handler.call(this, { type, target: this, ...event });
            if (listener.options?.once) this.removeEventListener(type, listener.handler);
        });
    }

    listenerCount(type) {
        if (type) return (this.listeners.get(type) || []).length;
        return [...this.listeners.values()].reduce((total, listeners) => total + listeners.length, 0);
    }
}

class FakeMediaQuery extends FakeEventTarget {
    constructor(matches = false) {
        super();
        this.matches = matches;
    }

    setMatches(matches) {
        this.matches = matches;
        this.dispatch('change', { matches });
    }
}

function createAnimationEnvironment(options = {}) {
    const heroContext = options.heroContext === undefined ? createRecordingContext() : options.heroContext;
    const companionContext = options.companionContext === undefined
        ? createRecordingContext()
        : options.companionContext;
    const heroRegion = new FakeEventTarget();
    const intersectionObservers = [];
    const resizeObservers = [];

    function createCanvas(id, context, region = null) {
        return {
            id,
            dataset: {},
            width: 0,
            height: 0,
            bounds: { left: 0, top: 0, width: 320, height: 180 },
            getContext() {
                return context;
            },
            getBoundingClientRect() {
                return this.bounds;
            },
            closest() {
                return region;
            },
        };
    }

    const heroCanvas = createCanvas('heroAnimation', heroContext, heroRegion);
    const companionCanvas = createCanvas('companionAnimation', companionContext);
    const documentRef = new FakeEventTarget();
    documentRef.hidden = Boolean(options.hidden);
    documentRef.documentElement = { dataset: {} };
    documentRef.getElementById = id => ({
        heroAnimation: heroCanvas,
        companionAnimation: companionCanvas,
    })[id] || null;

    const queries = {
        '(prefers-reduced-motion: reduce)': new FakeMediaQuery(Boolean(options.reducedMotion)),
        '(pointer: coarse)': new FakeMediaQuery(Boolean(options.coarsePointer)),
        '(max-width: 768px)': new FakeMediaQuery(Boolean(options.narrowViewport)),
    };
    const windowRef = new FakeEventTarget();
    windowRef.document = documentRef;
    windowRef.location = { search: options.search || '?animation=flow' };
    windowRef.devicePixelRatio = options.devicePixelRatio || 1;
    windowRef.matchMedia = query => queries[query];
    windowRef.pendingFrames = new Map();
    windowRef.nextFrameId = 1;
    windowRef.requestAnimationFrame = callback => {
        const id = windowRef.nextFrameId;
        windowRef.nextFrameId += 1;
        windowRef.pendingFrames.set(id, callback);
        return id;
    };
    windowRef.cancelAnimationFrame = id => {
        windowRef.pendingFrames.delete(id);
    };
    windowRef.runAnimationFrame = (time = 16) => {
        const next = windowRef.pendingFrames.entries().next();
        if (next.done) return false;
        const [id, callback] = next.value;
        windowRef.pendingFrames.delete(id);
        callback(time);
        return true;
    };
    if (options.intersectionObserver !== false) {
        windowRef.IntersectionObserver = class {
            constructor(callback, observerOptions) {
                this.callback = callback;
                this.options = observerOptions;
                this.observed = [];
                this.disconnectCount = 0;
                intersectionObservers.push(this);
            }

            observe(target) {
                this.observed.push(target);
            }

            disconnect() {
                this.disconnectCount += 1;
                this.observed = [];
            }

            trigger(entries) {
                this.callback(entries);
            }
        };
    }
    if (options.resizeObserver !== false) {
        windowRef.ResizeObserver = class {
            constructor(callback) {
                this.callback = callback;
                this.observed = [];
                this.disconnectCount = 0;
                resizeObservers.push(this);
            }

            observe(target) {
                this.observed.push(target);
            }

            disconnect() {
                this.disconnectCount += 1;
                this.observed = [];
            }

            trigger() {
                this.callback([]);
            }
        };
    }

    return {
        documentRef,
        windowRef,
        heroCanvas,
        companionCanvas,
        heroRegion,
        heroContext,
        companionContext,
        queries,
        intersectionObservers,
        resizeObservers,
    };
}

function createDrawingScene(context, overrides = {}) {
    return {
        context,
        width: 320,
        height: 180,
        pointer: { x: 150, y: 40, active: false },
        mode: 'interactive',
        interactive: true,
        ...overrides,
    };
}

function getSignalArcs(context) {
    return context.paths
        .filter(path => path.operation === 'fill')
        .flatMap(path => path.arcs);
}

function getRoutedTraces(context) {
    return context.paths.filter(path =>
        path.operation === 'stroke'
        && path.points.filter(point => point.type === 'lineTo').length >= 2,
    );
}

function pointIsOnTrace(signal, trace) {
    for (let index = 1; index < trace.points.length; index += 1) {
        const start = trace.points[index - 1];
        const end = trace.points[index];
        const crossProduct = (signal.x - start.x) * (end.y - start.y)
            - (signal.y - start.y) * (end.x - start.x);
        const withinX = signal.x >= Math.min(start.x, end.x) - 0.001
            && signal.x <= Math.max(start.x, end.x) + 0.001;
        const withinY = signal.y >= Math.min(start.y, end.y) - 0.001
            && signal.y <= Math.max(start.y, end.y) + 0.001;
        if (Math.abs(crossProduct) < 0.001 && withinX && withinY) return true;
    }
    return false;
}

function signalsFollowRenderedFlowRoutes(context, signals) {
    const routePoints = context.paths
        .filter(path => path.operation === 'stroke')
        .flatMap(path => path.points);
    return signals.every(signal =>
        routePoints.some(point =>
            point.x === signal.x && Math.abs(point.y - signal.y) < 0.001,
        ),
    );
}

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

test('renderer registry supplies every selected pack', () => {
    const registry = createPackRegistry();
    assert.deepEqual(Object.keys(registry), PACK_IDS);
    PACK_IDS.forEach(id => assert.equal(typeof registry[id].draw, 'function'));
});

test('ambient hero reduces complexity while the noninteractive companion retains full detail', () => {
    const interactiveHero = getSceneComplexity({ interactive: true, mode: 'interactive' });
    const ambientHero = getSceneComplexity({ interactive: true, mode: 'ambient' });
    const ambientCompanion = getSceneComplexity({ interactive: false, mode: 'ambient' });

    assert.ok(ambientHero.flowLines < interactiveHero.flowLines);
    assert.ok(ambientHero.topologyNodes < interactiveHero.topologyNodes);
    assert.ok(ambientHero.blueprintLayers < interactiveHero.blueprintLayers);
    assert.deepEqual(ambientCompanion, interactiveHero);
});

test('only the hero or a visible companion is drawn', () => {
    assert.equal(shouldDrawScene({ interactive: true, visible: false }), true);
    assert.equal(shouldDrawScene({ interactive: false, visible: false }), false);
    assert.equal(shouldDrawScene({ interactive: false, visible: true }), true);
    assert.equal(shouldDrawScene({ interactive: true, visible: false }, false), false);
    assert.equal(shouldDrawScene({ interactive: false, visible: true }, false), false);
});

test('Flow signals travel on the same pointer-reshaped routes in hero and companion scenes', () => {
    const drawFlow = createPackRegistry().flow.draw;
    const baseContext = createRecordingContext();
    const influencedContext = createRecordingContext();
    const companionContext = createRecordingContext();
    const adjacentContext = createRecordingContext();
    const laterContext = createRecordingContext();

    drawFlow(createDrawingScene(baseContext), 1200);
    drawFlow(createDrawingScene(influencedContext, {
        pointer: { x: 150, y: 150, active: true },
    }), 1200);
    drawFlow(createDrawingScene(companionContext, {
        interactive: false,
        mode: 'ambient',
    }), 1200);
    drawFlow(createDrawingScene(adjacentContext), 1216);
    drawFlow(createDrawingScene(laterContext), 1600);

    const baseSignals = getSignalArcs(baseContext);
    const influencedSignals = getSignalArcs(influencedContext);
    const companionSignals = getSignalArcs(companionContext);
    const adjacentSignals = getSignalArcs(adjacentContext);
    const laterSignals = getSignalArcs(laterContext);
    assert.ok(baseSignals.length >= 2, 'hero renders multiple traveling signals');
    assert.equal(influencedSignals.length, baseSignals.length);
    assert.ok(companionSignals.length >= 1, 'companion retains calmer route signals');
    baseSignals.forEach((signal, index) => {
        assert.equal(influencedSignals[index].x, signal.x, 'pointer does not detach signal progress from its route');
    });
    assert.ok(
        influencedSignals.some((signal, index) => Math.abs(signal.y - baseSignals[index].y) > 1),
        'pointer reshaping moves the signal with its route',
    );
    adjacentSignals.forEach((signal, index) => {
        const movement = signal.x - baseSignals[index].x;
        assert.ok(movement > 0 && movement < 8, 'adjacent frames advance smoothly without an 8px jump');
    });
    assert.ok(
        laterSignals.some((signal, index) => signal.x !== baseSignals[index].x),
        'signal progress advances over time',
    );
    assert.ok(signalsFollowRenderedFlowRoutes(influencedContext, influencedSignals));
    assert.ok(signalsFollowRenderedFlowRoutes(companionContext, companionSignals));
    assert.ok(signalsFollowRenderedFlowRoutes(adjacentContext, adjacentSignals));
});

test('Blueprint draws explicit routed traces with signals fixed to those traces', () => {
    const context = createRecordingContext();
    const laterContext = createRecordingContext();
    createPackRegistry().blueprint.draw(createDrawingScene(context), 0);
    createPackRegistry().blueprint.draw(createDrawingScene(laterContext), 5000);

    const traces = getRoutedTraces(context);
    const signals = getSignalArcs(context);
    const laterTraces = getRoutedTraces(laterContext);
    const laterSignals = getSignalArcs(laterContext);
    assert.ok(traces.length >= 3, 'each full-detail layer contains a routed trace');
    assert.ok(signals.length >= 3, 'the polished time-zero frame includes trace signals');
    signals.forEach(signal => {
        assert.ok(
            traces.some(trace => pointIsOnTrace(signal, trace)),
            'each signal center is sampled from an explicit routed trace',
        );
    });
    assert.ok(
        laterSignals.some((signal, index) =>
            signal.x !== signals[index].x || signal.y !== signals[index].y,
        ),
        'trace signals advance over time',
    );
    laterSignals.forEach(signal => {
        assert.ok(laterTraces.some(trace => pointIsOnTrace(signal, trace)));
    });
});

test('Blueprint layer transforms have differential pointer parallax and time drift', () => {
    const drawBlueprint = createPackRegistry().blueprint.draw;
    const baseContext = createRecordingContext();
    const pointerContext = createRecordingContext();
    const driftContext = createRecordingContext();

    drawBlueprint(createDrawingScene(baseContext), 0);
    drawBlueprint(createDrawingScene(pointerContext, {
        pointer: { x: 280, y: 150, active: true },
    }), 0);
    drawBlueprint(createDrawingScene(driftContext), 5000);

    const layerTranslations = context => context.transforms
        .filter(transform => transform.type === 'translate')
        .slice(1, 4);
    const base = layerTranslations(baseContext);
    const pointer = layerTranslations(pointerContext);
    const drift = layerTranslations(driftContext);
    assert.equal(base.length, 3);
    assert.equal(pointer.length, 3);
    assert.equal(drift.length, 3);
    assert.equal(
        new Set(pointer.map((translation, index) =>
            `${(translation.x - base[index].x).toFixed(3)},${(translation.y - base[index].y).toFixed(3)}`,
        )).size,
        3,
        'each layer uses a distinct pointer parallax offset',
    );
    assert.equal(
        new Set(drift.map((translation, index) =>
            `${(translation.x - base[index].x).toFixed(3)},${(translation.y - base[index].y).toFixed(3)}`,
        )).size,
        3,
        'each layer uses a distinct time drift',
    );
    assert.ok(
        drift.some((translation, index) =>
            Math.abs(translation.x - base[index].x) > 0.1
            || Math.abs(translation.y - base[index].y) > 0.1,
        ),
    );
});

test('initializeAnimations shares pack data and maintains exactly one RAF across repeated starts', () => {
    const environment = createAnimationEnvironment({ search: '?animation=blueprint' });
    const controller = initializeAnimations(environment.documentRef, environment.windowRef);

    assert.equal(controller.pack, 'blueprint');
    assert.equal(environment.documentRef.documentElement.dataset.animationPack, 'blueprint');
    assert.equal(environment.heroCanvas.dataset.animationPack, 'blueprint');
    assert.equal(environment.companionCanvas.dataset.animationPack, 'blueprint');
    assert.equal(environment.heroCanvas.dataset.animationMode, 'interactive');
    assert.equal(environment.companionCanvas.dataset.animationMode, 'ambient');
    assert.equal(environment.windowRef.pendingFrames.size, 1);

    controller.start();
    controller.start();
    assert.equal(environment.windowRef.pendingFrames.size, 1);
    environment.windowRef.runAnimationFrame(100);
    assert.equal(environment.windowRef.pendingFrames.size, 1);
});

test('reduced motion renders a polished static frame without scheduling RAF', () => {
    const environment = createAnimationEnvironment({
        search: '?animation=blueprint',
        reducedMotion: true,
    });
    initializeAnimations(environment.documentRef, environment.windowRef);

    assert.equal(environment.heroCanvas.dataset.animationMode, 'static');
    assert.equal(environment.companionCanvas.dataset.animationMode, 'static');
    assert.ok(environment.heroContext.clearRects.length >= 1);
    assert.ok(getRoutedTraces(environment.heroContext).length >= 1);
    assert.ok(getSignalArcs(environment.heroContext).length >= 1);
    assert.equal(environment.windowRef.pendingFrames.size, 0);
});

test('visibility changes cancel drawing while hidden and resume one scheduler when restored', () => {
    const environment = createAnimationEnvironment();
    initializeAnimations(environment.documentRef, environment.windowRef);
    const initialHeroDraws = environment.heroContext.clearRects.length;

    environment.documentRef.hidden = true;
    environment.documentRef.dispatch('visibilitychange');
    assert.equal(environment.windowRef.pendingFrames.size, 0);
    environment.intersectionObservers[0].trigger([{ isIntersecting: true }]);
    assert.equal(environment.heroContext.clearRects.length, initialHeroDraws);
    assert.equal(environment.companionContext.clearRects.length, 0);

    environment.documentRef.hidden = false;
    environment.documentRef.dispatch('visibilitychange');
    assert.equal(environment.heroContext.clearRects.length, initialHeroDraws + 1);
    assert.equal(environment.companionContext.clearRects.length, 1);
    assert.equal(environment.windowRef.pendingFrames.size, 1);
});

test('media query changes update scene modes and scheduling', () => {
    const environment = createAnimationEnvironment();
    initializeAnimations(environment.documentRef, environment.windowRef);

    environment.queries['(prefers-reduced-motion: reduce)'].setMatches(true);
    assert.equal(environment.heroCanvas.dataset.animationMode, 'static');
    assert.equal(environment.companionCanvas.dataset.animationMode, 'static');
    assert.equal(environment.windowRef.pendingFrames.size, 0);

    environment.queries['(prefers-reduced-motion: reduce)'].matches = false;
    environment.queries['(pointer: coarse)'].setMatches(true);
    assert.equal(environment.heroCanvas.dataset.animationMode, 'ambient');
    assert.equal(environment.companionCanvas.dataset.animationMode, 'ambient');
    assert.equal(environment.windowRef.pendingFrames.size, 1);

    environment.queries['(pointer: coarse)'].matches = false;
    environment.queries['(max-width: 768px)'].setMatches(false);
    assert.equal(environment.heroCanvas.dataset.animationMode, 'interactive');
    assert.equal(environment.windowRef.pendingFrames.size, 1);
});

test('companion intersection gates animated and reduced-motion draws', () => {
    const animated = createAnimationEnvironment();
    initializeAnimations(animated.documentRef, animated.windowRef);
    animated.windowRef.runAnimationFrame(20);
    assert.equal(animated.companionContext.clearRects.length, 0);

    animated.intersectionObservers[0].trigger([{ isIntersecting: true }]);
    assert.equal(animated.companionContext.clearRects.length, 1);
    animated.intersectionObservers[0].trigger([{ isIntersecting: false }]);
    animated.windowRef.runAnimationFrame(40);
    assert.equal(animated.companionContext.clearRects.length, 1);

    const reduced = createAnimationEnvironment({ reducedMotion: true });
    initializeAnimations(reduced.documentRef, reduced.windowRef);
    assert.equal(reduced.companionContext.clearRects.length, 0);
    reduced.intersectionObservers[0].trigger([{ isIntersecting: true }]);
    assert.equal(reduced.companionContext.clearRects.length, 1);
    assert.equal(reduced.windowRef.pendingFrames.size, 0);
});

test('ResizeObserver resizes both canvases and redraws through one scheduler', () => {
    const environment = createAnimationEnvironment({ devicePixelRatio: 3 });
    initializeAnimations(environment.documentRef, environment.windowRef);
    assert.equal(environment.resizeObservers.length, 1);
    assert.deepEqual(environment.resizeObservers[0].observed, [
        environment.heroCanvas,
        environment.companionCanvas,
    ]);

    environment.heroCanvas.bounds.width = 410;
    environment.companionCanvas.bounds.height = 205;
    environment.resizeObservers[0].trigger();
    assert.equal(environment.heroCanvas.width, 820);
    assert.equal(environment.companionCanvas.height, 410);
    assert.equal(environment.windowRef.pendingFrames.size, 1);
});

test('window resize fallback remains functional when ResizeObserver is unavailable', () => {
    const environment = createAnimationEnvironment({ resizeObserver: false });
    initializeAnimations(environment.documentRef, environment.windowRef);
    assert.equal(environment.windowRef.listenerCount('resize'), 1);

    environment.heroCanvas.bounds.width = 400;
    environment.windowRef.dispatch('resize');
    assert.equal(environment.heroCanvas.width, 400);
    assert.equal(environment.windowRef.pendingFrames.size, 1);
});

test('null canvas contexts abort before adding lifecycle listeners or observers', () => {
    const environment = createAnimationEnvironment({ heroContext: null });
    const controller = initializeAnimations(environment.documentRef, environment.windowRef);

    assert.equal(controller, null);
    assert.equal(environment.documentRef.listenerCount(), 0);
    assert.equal(environment.heroRegion.listenerCount(), 0);
    assert.equal(environment.windowRef.listenerCount(), 0);
    Object.values(environment.queries).forEach(query => assert.equal(query.listenerCount(), 0));
    assert.equal(environment.intersectionObservers.length, 0);
    assert.equal(environment.resizeObservers.length, 0);
    assert.equal(environment.windowRef.pendingFrames.size, 0);
});

test('browser UMD contract exposes the API and initializes once on DOMContentLoaded', () => {
    const environment = createAnimationEnvironment({ search: '?animation=topology' });
    const source = fs.readFileSync(path.join(__dirname, '..', 'animations.js'), 'utf8');
    const browserContext = vm.createContext({
        window: environment.windowRef,
        URLSearchParams,
        Math,
    });

    vm.runInContext(source, browserContext, { filename: 'animations.js' });
    assert.equal(typeof environment.windowRef.PortfolioAnimations.initializeAnimations, 'function');
    assert.equal(environment.windowRef.listenerCount('DOMContentLoaded'), 1);
    environment.windowRef.dispatch('DOMContentLoaded');
    assert.equal(environment.windowRef.listenerCount('DOMContentLoaded'), 0);
    assert.equal(environment.documentRef.documentElement.dataset.animationPack, 'topology');
    assert.equal(environment.windowRef.pendingFrames.size, 1);
});

test('destroy removes all lifecycle work and is idempotent', () => {
    const environment = createAnimationEnvironment();
    const controller = initializeAnimations(environment.documentRef, environment.windowRef);
    const heroDraws = environment.heroContext.clearRects.length;

    assert.equal(typeof controller.destroy, 'function');
    assert.equal(environment.documentRef.listenerCount('visibilitychange'), 1);
    assert.equal(environment.heroRegion.listenerCount('pointermove'), 1);
    assert.equal(environment.heroRegion.listenerCount('pointerleave'), 1);
    Object.values(environment.queries).forEach(query => assert.equal(query.listenerCount('change'), 1));
    assert.equal(environment.windowRef.pendingFrames.size, 1);

    controller.destroy();
    assert.equal(environment.windowRef.pendingFrames.size, 0);
    assert.equal(environment.documentRef.listenerCount(), 0);
    assert.equal(environment.heroRegion.listenerCount(), 0);
    Object.values(environment.queries).forEach(query => assert.equal(query.listenerCount(), 0));
    assert.equal(environment.intersectionObservers[0].disconnectCount, 1);
    assert.equal(environment.resizeObservers[0].disconnectCount, 1);

    controller.start();
    environment.documentRef.dispatch('visibilitychange');
    environment.heroRegion.dispatch('pointermove', { clientX: 20, clientY: 30 });
    environment.queries['(prefers-reduced-motion: reduce)'].setMatches(true);
    assert.equal(environment.heroContext.clearRects.length, heroDraws);
    assert.equal(environment.windowRef.pendingFrames.size, 0);

    controller.destroy();
    assert.equal(environment.intersectionObservers[0].disconnectCount, 1);
    assert.equal(environment.resizeObservers[0].disconnectCount, 1);
});

test('destroy removes the window resize fallback listener', () => {
    const environment = createAnimationEnvironment({ resizeObserver: false });
    const controller = initializeAnimations(environment.documentRef, environment.windowRef);
    assert.equal(environment.windowRef.listenerCount('resize'), 1);

    controller.destroy();
    assert.equal(environment.windowRef.listenerCount('resize'), 0);
});

test('reinitializing destroys the previous controller before starting its replacement', () => {
    const first = createAnimationEnvironment({ search: '?animation=flow' });
    const firstController = initializeAnimations(first.documentRef, first.windowRef);
    const second = createAnimationEnvironment({ search: '?animation=topology' });
    const secondController = initializeAnimations(second.documentRef, second.windowRef);

    assert.notEqual(secondController, firstController);
    assert.equal(first.windowRef.pendingFrames.size, 0);
    assert.equal(first.documentRef.listenerCount(), 0);
    assert.equal(first.heroRegion.listenerCount(), 0);
    Object.values(first.queries).forEach(query => assert.equal(query.listenerCount(), 0));
    assert.equal(first.intersectionObservers[0].disconnectCount, 1);
    assert.equal(first.resizeObservers[0].disconnectCount, 1);
    assert.equal(second.windowRef.pendingFrames.size, 1);
    assert.equal(second.documentRef.listenerCount('visibilitychange'), 1);

    secondController.destroy();
});
