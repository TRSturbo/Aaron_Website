const test = require('node:test');
const assert = require('node:assert/strict');
const {
    PACK_IDS,
    selectAnimationPack,
    resolveSceneMode,
    createPackRegistry,
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

test('renderer registry supplies every selected pack', () => {
    const registry = createPackRegistry();
    assert.deepEqual(Object.keys(registry), PACK_IDS);
    PACK_IDS.forEach(id => assert.equal(typeof registry[id].draw, 'function'));
});
