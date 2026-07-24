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

    function shouldDrawScene(scene) {
        return scene.interactive || scene.visible;
    }

    function drawFlow(scene, time) {
        const { context, width, height, pointer, mode } = scene;
        const { flowLines } = getSceneComplexity(scene);
        const primaryLine = flowLines === 9 ? 4 : Math.floor(flowLines / 2);
        context.clearRect(0, 0, width, height);
        const interactive = mode === 'interactive' && pointer.active;
        for (let line = 0; line < flowLines; line += 1) {
            context.beginPath();
            for (let x = -10; x <= width + 10; x += 8) {
                const linePosition = flowLines === 1 ? 4 : line * 8 / (flowLines - 1);
                const base = height * (0.2 + linePosition * 0.078);
                let y = base + Math.sin(x * 0.016 + time * 0.00032 + line * 0.72) * 10;
                y += Math.sin(x * 0.006 - time * 0.00017 + line) * 7;
                if (interactive) {
                    const influence = Math.exp(-Math.pow(x - pointer.x, 2) / 15000);
                    y += (pointer.y - y) * influence * 0.52;
                }
                x === -10 ? context.moveTo(x, y) : context.lineTo(x, y);
            }
            context.strokeStyle = `rgba(48, 203, 255, ${line === primaryLine ? 0.34 : 0.17})`;
            context.lineWidth = line === primaryLine ? 1.5 : 0.75;
            context.stroke();
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
        const offsetX = mode === 'interactive' && pointer.active ? (pointer.x / width - 0.5) * 18 : 0;
        const offsetY = mode === 'interactive' && pointer.active ? (pointer.y / height - 0.5) * 12 : 0;
        context.save();
        context.translate(width / 2 + offsetX, height * 0.55 + offsetY);
        [-42, 0, 42].slice((3 - blueprintLayers) / 2, (3 + blueprintLayers) / 2).forEach((depth, layer) => {
            context.save();
            context.translate(depth * 0.35, depth * -0.22);
            context.rotate((-8 + layer * 4) * Math.PI / 180);
            context.strokeStyle = `rgba(55, 203, 255, ${0.12 + layer * 0.09})`;
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
            context.restore();
        });
        const signalX = ((time * 0.06) % (width * 1.1)) - width * 0.55;
        context.fillStyle = '#d9faff';
        context.beginPath();
        context.arc(signalX, 0, 3, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

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
        const drawFrame = time => {
            scenes.forEach(scene => {
                if (shouldDrawScene(scene)) registry[pack].draw(scene, scene.mode === 'static' ? 0 : time);
            });
            if (documentVisible && scenes.some(scene => scene.mode !== 'static')) {
                frameId = windowRef.requestAnimationFrame(drawFrame);
            }
        };

        const start = () => {
            windowRef.cancelAnimationFrame(frameId);
            frameId = 0;
            scenes.forEach(scene => {
                if (shouldDrawScene(scene)) registry[pack].draw(scene, 0);
            });
            if (documentVisible && scenes.some(scene => scene.mode !== 'static')) {
                frameId = windowRef.requestAnimationFrame(drawFrame);
            }
        };

        documentRef.addEventListener('visibilitychange', () => {
            documentVisible = !documentRef.hidden;
            if (documentVisible) start();
            else {
                windowRef.cancelAnimationFrame(frameId);
                frameId = 0;
            }
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
