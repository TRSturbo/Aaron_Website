(function attachAnimationApi(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.PortfolioAnimations = api;
        root.addEventListener(
            'DOMContentLoaded',
            () => api.initializeAnimations(root.document, root),
            { once: true },
        );
    }
})(typeof window !== 'undefined' ? window : undefined, () => {
    const PACK_IDS = Object.freeze(['flow', 'topology', 'blueprint']);
    const FLOW_SIGNAL_OFFSETS = Object.freeze([-2, 0, 2]);
    const BLUEPRINT_LAYERS = Object.freeze([
        Object.freeze({ depth: -42, angle: -8, parallax: 0.35, drift: 1.2, phase: 0.4, opacity: 0.12 }),
        Object.freeze({ depth: 0, angle: -4, parallax: 0.65, drift: 1.7, phase: 2.1, opacity: 0.21 }),
        Object.freeze({ depth: 42, angle: 0, parallax: 0.95, drift: 2.1, phase: 4.2, opacity: 0.30 }),
    ]);
    const BLUEPRINT_TRACES = Object.freeze([
        Object.freeze([
            Object.freeze({ x: -0.48, y: -0.18 }),
            Object.freeze({ x: -0.20, y: -0.18 }),
            Object.freeze({ x: -0.20, y: 0.06 }),
            Object.freeze({ x: 0.08, y: 0.06 }),
            Object.freeze({ x: 0.08, y: 0.20 }),
            Object.freeze({ x: 0.46, y: 0.20 }),
        ]),
        Object.freeze([
            Object.freeze({ x: -0.44, y: 0.16 }),
            Object.freeze({ x: -0.08, y: 0.16 }),
            Object.freeze({ x: -0.08, y: -0.08 }),
            Object.freeze({ x: 0.22, y: -0.08 }),
            Object.freeze({ x: 0.22, y: -0.20 }),
            Object.freeze({ x: 0.44, y: -0.20 }),
        ]),
    ]);

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

    function createTopologyNodes(count) {
        return Array.from({ length: count }, (_, index) => ({
            x: 0.08 + ((index * 47) % 89) / 100,
            y: 0.10 + ((index * 67) % 83) / 100,
            phase: index * 1.37,
            size: 1.6 + (index % 4) * 0.5,
        }));
    }

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

    function resizeScene(scene) {
        const bounds = scene.canvas.getBoundingClientRect();
        scene.pixelRatio = Math.min(scene.windowRef.devicePixelRatio || 1, 2);
        scene.width = Math.max(1, bounds.width);
        scene.height = Math.max(1, bounds.height);
        scene.canvas.width = Math.round(scene.width * scene.pixelRatio);
        scene.canvas.height = Math.round(scene.height * scene.pixelRatio);
        scene.context.setTransform(scene.pixelRatio, 0, 0, scene.pixelRatio, 0, 0);
    }

    function getSceneComplexity({ interactive = true, mode }) {
        if (!interactive || mode === 'interactive') {
            return { flowLines: 9, topologyNodes: 24, blueprintLayers: 3 };
        }
        return { flowLines: 4, topologyNodes: 12, blueprintLayers: 1 };
    }

    function shouldDrawScene(scene, documentVisible = true) {
        return documentVisible && (scene.interactive || scene.visible);
    }

    function getFlowY(scene, line, x, time) {
        const { height, pointer, mode } = scene;
        const { flowLines } = getSceneComplexity(scene);
        const linePosition = flowLines === 1 ? 4 : line * 8 / (flowLines - 1);
        const base = height * (0.2 + linePosition * 0.078);
        let y = base + Math.sin(x * 0.016 + time * 0.00032 + line * 0.72) * 10;
        y += Math.sin(x * 0.006 - time * 0.00017 + line) * 7;
        if (mode === 'interactive' && pointer.active) {
            const influence = Math.exp(-Math.pow(x - pointer.x, 2) / 15000);
            y += (pointer.y - y) * influence * 0.52;
        }
        return y;
    }

    function drawFlow(scene, time) {
        const { context, width, height } = scene;
        const { flowLines } = getSceneComplexity(scene);
        const primaryLine = flowLines === 9 ? 4 : Math.floor(flowLines / 2);
        context.clearRect(0, 0, width, height);
        for (let line = 0; line < flowLines; line += 1) {
            context.beginPath();
            for (let x = -10; x <= width + 10; x += 8) {
                const y = getFlowY(scene, line, x, time);
                x === -10 ? context.moveTo(x, y) : context.lineTo(x, y);
            }
            context.strokeStyle = `rgba(48, 203, 255, ${line === primaryLine ? 0.34 : 0.17})`;
            context.lineWidth = line === primaryLine ? 1.5 : 0.75;
            context.stroke();
        }
        const routePointCount = Math.floor((width + 20) / 8) + 1;
        const signalCount = scene.interactive ? FLOW_SIGNAL_OFFSETS.length : 2;
        for (let signal = 0; signal < signalCount; signal += 1) {
            const line = Math.max(0, Math.min(
                flowLines - 1,
                primaryLine + FLOW_SIGNAL_OFFSETS[signal],
            ));
            const routePoint = (Math.floor(time * 0.01) + signal * 13) % routePointCount;
            const x = -10 + routePoint * 8;
            const y = getFlowY(scene, line, x, time);
            context.fillStyle = signal === 1 ? '#d9faff' : 'rgba(108, 225, 255, 0.78)';
            context.beginPath();
            context.arc(x, y, signal === 1 ? 2.6 : 1.9, 0, Math.PI * 2);
            context.fill();
        }
    }

    function drawTopology(scene, time) {
        const { context, width, height, pointer, mode } = scene;
        const { topologyNodes } = getSceneComplexity(scene);
        context.clearRect(0, 0, width, height);
        const points = scene.nodes.slice(0, topologyNodes).map(node => {
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
        const { blueprintLayers } = getSceneComplexity(scene);
        context.clearRect(0, 0, width, height);
        const pointerX = mode === 'interactive' && pointer.active ? (pointer.x / width - 0.5) * 18 : 0;
        const pointerY = mode === 'interactive' && pointer.active ? (pointer.y / height - 0.5) * 12 : 0;
        const firstLayer = Math.floor((BLUEPRINT_LAYERS.length - blueprintLayers) / 2);
        const lastLayer = firstLayer + blueprintLayers;
        context.save();
        context.translate(width / 2, height * 0.55);
        for (let layerIndex = firstLayer; layerIndex < lastLayer; layerIndex += 1) {
            const layer = BLUEPRINT_LAYERS[layerIndex];
            const driftX = Math.sin(time * 0.00013 + layer.phase) * layer.drift;
            const driftY = Math.cos(time * 0.00011 + layer.phase) * layer.drift * 0.65;
            context.save();
            context.translate(
                layer.depth * 0.35 + pointerX * layer.parallax + driftX,
                layer.depth * -0.22 + pointerY * layer.parallax + driftY,
            );
            context.rotate(layer.angle * Math.PI / 180);
            context.strokeStyle = `rgba(55, 203, 255, ${layer.opacity})`;
            context.lineWidth = 0.75;
            for (let x = -width * 0.55; x <= width * 0.55; x += 30) {
                context.beginPath();
                context.moveTo(x, -height * 0.28);
                context.lineTo(x, height * 0.28);
                context.stroke();
            }
            for (let y = -height * 0.28; y <= height * 0.28; y += 30) {
                context.beginPath();
                context.moveTo(-width * 0.55, y);
                context.lineTo(width * 0.55, y);
                context.stroke();
            }
            for (let traceIndex = 0; traceIndex < BLUEPRINT_TRACES.length; traceIndex += 1) {
                const trace = BLUEPRINT_TRACES[traceIndex];
                context.beginPath();
                context.moveTo(trace[0].x * width, trace[0].y * height);
                for (let pointIndex = 1; pointIndex < trace.length; pointIndex += 1) {
                    context.lineTo(trace[pointIndex].x * width, trace[pointIndex].y * height);
                }
                context.strokeStyle = `rgba(84, 217, 255, ${layer.opacity + 0.14})`;
                context.lineWidth = 1.15;
                context.stroke();
            }
            const signalTrace = BLUEPRINT_TRACES[layerIndex % BLUEPRINT_TRACES.length];
            let traceLength = 0;
            for (let pointIndex = 1; pointIndex < signalTrace.length; pointIndex += 1) {
                traceLength += Math.hypot(
                    (signalTrace[pointIndex].x - signalTrace[pointIndex - 1].x) * width,
                    (signalTrace[pointIndex].y - signalTrace[pointIndex - 1].y) * height,
                );
            }
            let signalDistance = (time * 0.025 + layerIndex * traceLength * 0.29) % traceLength;
            let signalX = signalTrace[0].x * width;
            let signalY = signalTrace[0].y * height;
            for (let pointIndex = 1; pointIndex < signalTrace.length; pointIndex += 1) {
                const start = signalTrace[pointIndex - 1];
                const end = signalTrace[pointIndex];
                const segmentLength = Math.hypot(
                    (end.x - start.x) * width,
                    (end.y - start.y) * height,
                );
                if (signalDistance <= segmentLength) {
                    const progress = segmentLength === 0 ? 0 : signalDistance / segmentLength;
                    signalX = (start.x + (end.x - start.x) * progress) * width;
                    signalY = (start.y + (end.y - start.y) * progress) * height;
                    break;
                }
                signalDistance -= segmentLength;
            }
            context.fillStyle = '#d9faff';
            context.beginPath();
            context.arc(signalX, signalY, 2.4, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }
        context.restore();
    }

    function createPackRegistry() {
        return {
            flow: { draw: drawFlow },
            topology: { draw: drawTopology },
            blueprint: { draw: drawBlueprint },
        };
    }

    let activeController = null;

    function initializeAnimations(documentRef, windowRef) {
        if (activeController) activeController.destroy();

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
        if (!hero.context || !companion.context) return null;

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
        let destroyed = false;
        let intersectionObserver = null;
        let resizeObserver = null;
        const drawFrame = time => {
            if (destroyed) return;
            scenes.forEach(scene => {
                if (shouldDrawScene(scene, documentVisible)) registry[pack].draw(scene, scene.mode === 'static' ? 0 : time);
            });
            if (documentVisible && scenes.some(scene => scene.mode !== 'static')) {
                frameId = windowRef.requestAnimationFrame(drawFrame);
            }
        };

        const start = () => {
            if (destroyed) return;
            if (frameId) windowRef.cancelAnimationFrame(frameId);
            frameId = 0;
            scenes.forEach(scene => {
                if (shouldDrawScene(scene, documentVisible)) registry[pack].draw(scene, 0);
            });
            if (documentVisible && scenes.some(scene => scene.mode !== 'static')) {
                frameId = windowRef.requestAnimationFrame(drawFrame);
            }
        };

        function handleVisibilityChange() {
            documentVisible = !documentRef.hidden;
            if (documentVisible) start();
            else {
                if (frameId) windowRef.cancelAnimationFrame(frameId);
                frameId = 0;
            }
        }

        function updateModes() {
            if (destroyed) return;
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
        const deactivatePointer = () => {
            hero.pointer.active = false;
        };
        heroRegion.addEventListener('pointermove', updatePointer, { passive: true });
        heroRegion.addEventListener('pointerleave', deactivatePointer, { passive: true });
        documentRef.addEventListener('visibilitychange', handleVisibilityChange);

        if ('IntersectionObserver' in windowRef) {
            intersectionObserver = new windowRef.IntersectionObserver(entries => {
                if (destroyed) return;
                companion.visible = entries.some(entry => entry.isIntersecting);
                start();
            }, { rootMargin: '120px 0px' });
            intersectionObserver.observe(companionCanvas);
        } else {
            companion.visible = true;
        }

        const resizeAll = () => {
            if (destroyed) return;
            scenes.forEach(resizeScene);
            start();
        };
        if ('ResizeObserver' in windowRef) {
            resizeObserver = new windowRef.ResizeObserver(resizeAll);
            scenes.forEach(scene => resizeObserver.observe(scene.canvas));
        } else {
            windowRef.addEventListener('resize', resizeAll, { passive: true });
        }

        [reducedMotionQuery, coarsePointerQuery, narrowViewportQuery].forEach(query => {
            query.addEventListener('change', updateModes);
        });

        let controller = null;
        const destroy = () => {
            if (destroyed) return;
            destroyed = true;
            if (frameId) windowRef.cancelAnimationFrame(frameId);
            frameId = 0;
            intersectionObserver?.disconnect();
            resizeObserver?.disconnect();
            documentRef.removeEventListener('visibilitychange', handleVisibilityChange);
            heroRegion.removeEventListener('pointermove', updatePointer);
            heroRegion.removeEventListener('pointerleave', deactivatePointer);
            if (!resizeObserver) windowRef.removeEventListener('resize', resizeAll);
            [reducedMotionQuery, coarsePointerQuery, narrowViewportQuery].forEach(query => {
                query.removeEventListener('change', updateModes);
            });
            if (activeController === controller) activeController = null;
        };
        controller = { pack, scenes, start, destroy };
        activeController = controller;
        start();
        return controller;
    }

    return {
        PACK_IDS,
        selectAnimationPack,
        resolveSceneMode,
        createPackRegistry,
        getSceneComplexity,
        shouldDrawScene,
        initializeAnimations,
    };
});
