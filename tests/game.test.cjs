const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
for (const file of ['game-data.js', 'storage.js', 'game.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context, { filename: file });
const { MindMapData: data, MindMapStorage: storage, MindMapRules: rules } = context;
const clone = value => JSON.parse(JSON.stringify(value));
const select = (state, slot, image) => rules.chooseImage(rules.openSlot(state, slot), image).state;
function completedState() {
  let state = storage.createInitialState();
  for (const group of data.groups) {
    const answers = group.options.filter(option => option.isCorrect);
    group.slots.forEach((slot, i) => { state = select(state, slot, answers[i].id); });
  }
  return state;
}

test('configuration defines seven slots, twelve unique local images, and the required answer counts', () => {
  assert.equal(data.slotIds.length, 7);
  const options = data.groups.flatMap(group => group.options);
  assert.equal(options.length, 12);
  assert.equal(new Set(options.map(option => option.id)).size, 12);
  for (const group of data.groups) {
    assert.equal(group.options.length, 3);
    assert.equal(group.options.filter(option => option.isCorrect).length, group.slots.length);
    for (const image of group.options) assert.ok(fs.existsSync(path.join(root, image.src.split('?')[0])), image.src);
  }
});
test('initial state is valid and every empty slot is freely selectable', () => {
  const initial = storage.createInitialState();
  assert.ok(storage.validateState(initial));
  for (const id of data.slotIds) {
    const open = rules.openSlot(initial, id);
    assert.equal(open.activeSlot, id);
    assert.equal(rules.getAvailableOptions(open, id).length, 3);
    assert.ok(storage.validateState(open));
  }
});
test('the supplied picture set and branch labels match the requested correct and wrong answers', () => {
  assert.equal(data.title, 'Cô giáo của con');
  assert.deepEqual(clone(data.branches.map(group => group.title)), ['Hoạt động của cô', 'Thái độ của cô', 'Tình cảm của bé']);
  const expected = {
    central: { ttd: true, tt1s: false, tt2s: false },
    action: { hdcc1d: true, hdcc2d: true, hdccs: false },
    attitude: { tdcc1d: true, tdcc2d: true, tdccs: false },
    emotion: { tcct1d: true, tcct2d: true, tccts: false }
  };
  for (const group of data.groups) {
    assert.deepEqual(Object.fromEntries(group.options.map(option => [option.id, option.isCorrect])), expected[group.id]);
    for (const option of group.options) assert.equal(path.extname(option.src.split('?')[0]), ['tt1s', 'tt2s'].includes(option.id) ? '.png' : '.jpg');
  }
});
for (const group of data.groups) {
  test(`${group.id}: a wrong answer leaves the state, options and open modal unchanged`, () => {
    const state = rules.openSlot(storage.createInitialState(), group.slots.at(-1));
    const before = JSON.stringify(state);
    const wrong = group.options.find(option => !option.isCorrect);
    const result = rules.chooseImage(state, wrong.id);
    assert.equal(result.changed, false);
    assert.equal(JSON.stringify(result.state), before);
    assert.equal(result.state.modal, 'selection');
    assert.equal(rules.getAvailableOptions(result.state, state.activeSlot).length, 3);
  });
}
for (const group of data.branches) {
  for (const reverseSlots of [false, true]) {
    for (const reverseImages of [false, true]) {
      test(`${group.id}: slots ${reverseSlots ? 'right-first' : 'left-first'}, images ${reverseImages ? 'reversed' : 'normal'}`, () => {
        let state = storage.createInitialState();
        const slots = [...group.slots];
        const images = group.options.filter(option => option.isCorrect);
        if (reverseSlots) slots.reverse();
        if (reverseImages) images.reverse();
        state = select(state, slots[0], images[0].id);
        assert.equal(state.progress, 1);
        assert.equal(state.slots.central.completed, false);
        assert.equal(state.modal, null);
        assert.equal(rules.openSlot(state, slots[0]), state);
        assert.equal(rules.getAvailableOptions(state, slots[0]).length, 0);
        const available = rules.getAvailableOptions(state, slots[1]);
        assert.equal(available.length, 2);
        assert.ok(!available.some(option => option.id === images[0].id));
        const open = rules.openSlot(state, slots[1]);
        assert.equal(rules.chooseImage(open, images[0].id).changed, false);
        assert.equal(rules.chooseImage(open, 'ttd').changed, false);
        state = rules.chooseImage(open, images[1].id).state;
        assert.equal(state.progress, 2);
        assert.ok(storage.validateState(state));
        for (const other of data.branches.filter(branch => branch !== group)) assert.equal(rules.getAvailableOptions(state, other.slots[0]).length, 3);
      });
    }
  }
}
test('completion happens on the seventh selection and can be dismissed without reopening', () => {
  const state = completedState();
  assert.equal(state.progress, 7);
  assert.equal(state.completed, true);
  assert.equal(state.modal, 'completion');
  assert.ok(storage.validateState(state));
  const closed = rules.closeModal(state);
  assert.equal(closed.modal, null);
  assert.equal(closed.completed, true);
  assert.ok(storage.validateState(closed));
  assert.equal(rules.chooseImage(state, 'ttd').changed, false);
});
test('invalid slot and image IDs cannot mutate state', () => {
  const state = storage.createInitialState();
  assert.equal(rules.openSlot(state, 'unknown'), state);
  assert.equal(rules.openSlot(state, '__proto__'), state);
  assert.equal(rules.chooseImage(state, 'ttd').state, state);
  const opened = rules.openSlot(state, 'central');
  assert.equal(rules.chooseImage(opened, 'unknown').state, opened);
});
test('persistence restores selections, filtered options and the active modal', () => {
  const memory = new Map();
  const store = storage.createStore(() => ({ getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }));
  let state = select(storage.createInitialState(), 'emotion-2', 'tcct2d');
  state = rules.openSlot(state, 'emotion-1');
  assert.ok(store.save(state));
  const restored = store.load();
  assert.equal(restored.available, true);
  assert.deepEqual(clone(restored.state), clone(state));
  assert.equal(rules.getAvailableOptions(restored.state, 'emotion-1').length, 2);
  assert.ok(!rules.getAvailableOptions(restored.state, 'emotion-1').some(option => option.id === 'tcct2d'));
  const reset = store.reset();
  assert.equal(reset.saved, true);
  assert.equal(store.load().state.progress, 0);
});
test('a dismissed completion remains dismissed after storage restore', () => {
  let raw;
  const store = storage.createStore(() => ({ getItem: () => raw, setItem: (key, value) => { raw = value; } }));
  store.save(rules.closeModal(completedState()));
  assert.equal(store.load().state.completed, true);
  assert.equal(store.load().state.modal, null);
});
const mutations = {
  'unsupported version': state => { state.version = 2; },
  'missing content version from the placeholder set': state => { delete state.contentVersion; },
  'outdated content version': state => { state.contentVersion = 1; },
  'missing slot': state => { delete state.slots['emotion-1']; },
  'extra slot': state => { state.slots.extra = { imageId: null, completed: false }; },
  'unknown image': state => { state.slots.central = { imageId: 'unknown', completed: true }; },
  'wrong image': state => { state.slots.central = { imageId: 'tt1s', completed: true }; },
  'foreign image': state => { state.slots['action-1'] = { imageId: 'ttd', completed: true }; },
  'duplicate image': state => { state.slots['emotion-1'] = { imageId: 'tcct1d', completed: true }; state.slots['emotion-2'] = { imageId: 'tcct1d', completed: true }; state.progress = 2; },
  'mismatched completion': state => { state.slots.central.completed = true; },
  'mismatched progress': state => { state.progress = 2; },
  'premature completion flag': state => { state.completed = true; },
  'invalid modal': state => { state.modal = 'reset'; },
  'missing active slot': state => { state.modal = 'selection'; },
  'unknown active slot': state => { state.modal = 'selection'; state.activeSlot = 'unknown'; },
  'active slot without modal': state => { state.activeSlot = 'central'; },
  'premature completion modal': state => { state.modal = 'completion'; },
  'non-object slots': state => { state.slots = []; }
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`reject and safely recover corrupted storage: ${name}`, () => {
    const state = clone(storage.createInitialState()); mutate(state);
    assert.equal(storage.validateState(state), false);
    const store = storage.createStore(() => ({ getItem: () => JSON.stringify(state) }));
    assert.equal(store.load().state.progress, 0);
    assert.ok(storage.validateState(store.load().state));
  });
}
test('an active modal pointing to a completed slot is rejected', () => {
  const state = select(storage.createInitialState(), 'central', 'ttd');
  state.activeSlot = 'central'; state.modal = 'selection';
  assert.equal(storage.validateState(state), false);
});
test('broken JSON recovers, while unavailable storage reports failure without throwing', () => {
  const corrupt = storage.createStore(() => ({ getItem: () => '{bad-json' }));
  assert.equal(corrupt.load().state.progress, 0);
  assert.equal(corrupt.load().available, true);
  const blocked = storage.createStore(() => { throw new Error('Access denied'); });
  assert.equal(blocked.load().available, false);
  assert.equal(blocked.save(storage.createInitialState()), false);
  assert.equal(blocked.reset().state.progress, 0);
  const quota = storage.createStore(() => ({ getItem: () => null, setItem: () => { throw new Error('Quota exceeded'); } }));
  assert.equal(quota.load().available, true);
  assert.equal(quota.save(storage.createInitialState()), false);
});
