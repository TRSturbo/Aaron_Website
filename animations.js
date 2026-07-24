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
