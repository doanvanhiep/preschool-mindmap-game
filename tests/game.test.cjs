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
const titleQuestionState = () => rules.showTitleQuestion(storage.createInitialState());
const titledState = () => rules.revealPoemTitle(titleQuestionState());
const authorQuestionState = () => rules.showAuthorQuestion(titledState());
const readyState = () => rules.revealAuthor(authorQuestionState());
function stateBeforeGroup(target) {
  let state = readyState();
  for (const group of data.groups) {
    if (group === target) break;
    const answers = group.options.filter(option => option.isCorrect);
    group.slots.forEach((slot, i) => { state = select(state, slot, answers[i].id); });
  }
  return state;
}
function completedState() {
  let state = readyState();
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
test('the two questions must be revealed in order before the central slot unlocks', () => {
  const initial = storage.createInitialState();
  assert.ok(storage.validateState(initial));
  assert.equal(initial.titleQuestionVisible, false);
  assert.equal(initial.authorQuestionVisible, false);
  assert.equal(rules.revealPoemTitle(initial), initial);
  assert.equal(rules.revealAuthor(initial), initial);
  assert.equal(rules.showAuthorQuestion(initial), initial);
  const question = rules.showTitleQuestion(initial);
  assert.equal(question.introStep, 0);
  assert.equal(question.titleQuestionVisible, true);
  assert.equal(rules.showTitleQuestion(question), question);
  const titled = rules.revealPoemTitle(question);
  assert.equal(titled.introStep, 1);
  assert.equal(titled.authorQuestionVisible, false);
  assert.equal(rules.revealPoemTitle(titled), titled);
  assert.equal(rules.revealAuthor(titled), titled);
  const authorQuestion = rules.showAuthorQuestion(titled);
  assert.equal(authorQuestion.introStep, 1);
  assert.equal(authorQuestion.authorQuestionVisible, true);
  assert.equal(rules.showAuthorQuestion(authorQuestion), authorQuestion);
  for (const state of [initial, question, titled, authorQuestion]) {
    assert.ok(storage.validateState(state));
    for (const id of data.slotIds) {
      assert.equal(rules.openSlot(state, id), state);
      assert.equal(rules.getAvailableOptions(state, id).length, 0);
    }
  }
  const ready = rules.revealAuthor(authorQuestion);
  assert.equal(ready.introStep, 2);
  assert.equal(rules.revealAuthor(ready), ready);
  assert.equal(rules.openSlot(ready, 'central').activeSlot, 'central');
  assert.equal(rules.getAvailableOptions(ready, 'central').length, 3);
  for (const group of data.branches) for (const id of group.slots) assert.equal(rules.openSlot(ready, id), ready);
});

test('a group unlocks only after every slot of the previous group is complete', () => {
  let state = readyState();
  for (const group of data.groups) {
    const answers = group.options.filter(option => option.isCorrect);
    for (const [i, slot] of group.slots.entries()) {
      for (const id of data.slotIds) {
        const available = group.slots.includes(id) && !state.slots[id].completed;
        assert.equal(data.isSlotAvailable(state, id), available, id);
        if (!available) assert.equal(rules.openSlot(state, id), state);
      }
      state = select(state, slot, answers[i].id);
      assert.ok(storage.validateState(state));
    }
  }
  assert.equal(state.progress, 7);
  assert.equal(data.activeGroup(state), undefined);
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
    const state = rules.openSlot(stateBeforeGroup(group), group.slots.at(-1));
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
        let state = stateBeforeGroup(group);
        const previousProgress = state.progress;
        const slots = [...group.slots];
        const images = group.options.filter(option => option.isCorrect);
        if (reverseSlots) slots.reverse();
        if (reverseImages) images.reverse();
        state = select(state, slots[0], images[0].id);
        assert.equal(state.progress, previousProgress + 1);
        assert.equal(state.slots.central.completed, true);
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
        assert.equal(state.progress, previousProgress + 2);
        assert.ok(storage.validateState(state));
        const next = data.groups[data.groups.indexOf(group) + 1];
        if (next) assert.equal(rules.getAvailableOptions(state, next.slots[0]).length, 3);
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
  const state = readyState();
  assert.equal(rules.openSlot(state, 'unknown'), state);
  assert.equal(rules.openSlot(state, '__proto__'), state);
  assert.equal(rules.chooseImage(state, 'ttd').state, state);
  const opened = rules.openSlot(state, 'central');
  assert.equal(rules.chooseImage(opened, 'unknown').state, opened);
});
test('persistence restores selections, filtered options and the active modal', () => {
  const memory = new Map();
  const store = storage.createStore(() => ({ getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }));
  let state = select(stateBeforeGroup(data.branches[2]), 'emotion-2', 'tcct2d');
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
  assert.equal(store.load().state.introStep, 0);
});

test('every hint, question and answer survives reload and reset returns to the first hint', () => {
  let raw;
  const store = storage.createStore(() => ({ getItem: () => raw ?? null, setItem: (key, value) => { raw = value; } }));
  for (const state of [storage.createInitialState(), titleQuestionState(), titledState(), authorQuestionState(), readyState()]) {
    assert.ok(store.save(state));
    assert.deepEqual(clone(store.load().state), clone(state));
  }
  const reset = store.reset().state;
  assert.equal(reset.introStep, 0);
  assert.equal(reset.titleQuestionVisible, false);
  assert.equal(reset.authorQuestionVisible, false);
});

test('legacy progress keeps existing pictures and locks a later branch until earlier groups are filled', () => {
  const old = clone(storage.createInitialState());
  delete old.introStep;
  delete old.titleQuestionVisible; delete old.authorQuestionVisible;
  old.slots['emotion-2'] = { imageId: 'tcct2d', completed: true };
  old.progress = 1;
  old.modal = 'selection'; old.activeSlot = 'emotion-1';
  const store = storage.createStore(() => ({ getItem: () => JSON.stringify(old) }));
  const migrated = store.load().state;
  assert.equal(migrated.progress, 1);
  assert.equal(migrated.slots['emotion-2'].imageId, 'tcct2d');
  assert.equal(migrated.introStep, 2);
  assert.equal(migrated.modal, null);
  assert.equal(rules.openSlot(migrated, 'emotion-1'), migrated);
  assert.equal(rules.openSlot(migrated, 'central').activeSlot, 'central');
  assert.ok(storage.validateState(migrated));
});

test('legacy empty and completed games migrate without losing completion or skipping the new questions', () => {
  for (const state of [storage.createInitialState(), rules.closeModal(completedState())]) {
    const old = clone(state); delete old.introStep;
    delete old.titleQuestionVisible; delete old.authorQuestionVisible;
    const migrated = storage.createStore(() => ({ getItem: () => JSON.stringify(old) })).load().state;
    assert.equal(migrated.progress, state.progress);
    assert.equal(migrated.introStep, state.completed ? 2 : 0);
    assert.equal(migrated.modal, null);
  }
});

test('previous guided-game states preserve answers and turn unanswered questions into hints', () => {
  for (const state of [storage.createInitialState(), titledState(), readyState(), rules.openSlot(select(readyState(), 'central', 'ttd'), 'action-2'), rules.closeModal(completedState())]) {
    const old = clone(state);
    delete old.titleQuestionVisible; delete old.authorQuestionVisible;
    const migrated = storage.createStore(() => ({ getItem: () => JSON.stringify(old) })).load().state;
    assert.equal(migrated.introStep, state.introStep);
    assert.equal(migrated.titleQuestionVisible, state.introStep > 0);
    assert.equal(migrated.authorQuestionVisible, state.introStep === 2);
    assert.equal(migrated.progress, state.progress);
    assert.deepEqual(clone(migrated.slots), clone(state.slots));
    assert.equal(migrated.modal, state.modal);
    assert.equal(migrated.activeSlot, state.activeSlot);
    assert.ok(storage.validateState(migrated));
  }
});

test('an authored step with hidden questions cannot unlock picture slots', () => {
  const state = { ...storage.createInitialState(), introStep: 2 };
  assert.equal(storage.validateState(state), false);
  assert.equal(data.activeGroup(state), undefined);
  assert.equal(rules.openSlot(state, 'central'), state);
});

test('a forged selection for a locked group cannot award a picture or persist', () => {
  const state = { ...readyState(), modal: 'selection', activeSlot: 'emotion-1' };
  assert.equal(rules.chooseImage(state, 'tcct1d').changed, false);
  assert.equal(storage.validateState(state), false);
  assert.equal(storage.createStore().save(state), false);
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
  'invalid intro step': state => { state.introStep = 3; },
  'non-numeric intro step': state => { state.introStep = '2'; },
  'non-boolean title visibility': state => { state.titleQuestionVisible = 'true'; },
  'non-boolean author visibility': state => { state.authorQuestionVisible = 1; },
  'partially missing question flags': state => { delete state.titleQuestionVisible; },
  'author question before title answer': state => { state.authorQuestionVisible = true; },
  'title answer without title question': state => { state.introStep = 1; },
  'author answer without author question': state => { state.introStep = 2; state.titleQuestionVisible = true; },
  'progress before revealing author': state => { state.slots.central = { imageId: 'ttd', completed: true }; state.progress = 1; state.introStep = 1; },
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
  const state = select(readyState(), 'central', 'ttd');
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
