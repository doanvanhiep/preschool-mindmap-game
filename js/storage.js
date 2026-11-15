(function (global) {
  'use strict';
  const data = global.MindMapData;
  const KEY = 'preschool_mindmap_game_v1';
  function createInitialState() {
    return { version: 1, contentVersion: data.contentVersion, introStep: 0, slots: Object.fromEntries(data.slotIds.map(id => [id, { imageId: null, completed: false }])), activeSlot: null, modal: null, progress: 0, completed: false };
  }
  function validateState(state) {
    if (!state || typeof state !== 'object' || state.version !== 1 || state.contentVersion !== data.contentVersion || !state.slots || typeof state.slots !== 'object' || Array.isArray(state.slots)) return false;
    if (Object.keys(state.slots).length !== data.slotIds.length) return false;
    if (![0, 1, 2].includes(state.introStep)) return false;
    let progress = 0;
    for (const group of data.groups) {
      const used = new Set();
      for (const slotId of group.slots) {
        const slot = state.slots[slotId];
        if (!slot || typeof slot !== 'object' || typeof slot.completed !== 'boolean') return false;
        if (slot.imageId === null) { if (slot.completed) return false; continue; }
        if (!slot.completed || !group.options.some(option => option.id === slot.imageId && option.isCorrect) || used.has(slot.imageId)) return false;
        used.add(slot.imageId);
        progress += 1;
      }
    }
    if (state.progress !== progress || state.completed !== (progress === data.slotIds.length)) return false;
    if (progress > 0 && state.introStep !== 2) return false;
    if (![null, 'selection', 'completion'].includes(state.modal)) return false;
    if (state.modal === 'selection') {
      if (!data.slotIds.includes(state.activeSlot) || !data.isSlotAvailable(state, state.activeSlot)) return false;
    } else if (state.activeSlot !== null) return false;
    return state.modal !== 'completion' || state.completed;
  }
  function createStore(getStorage = () => global.localStorage) {
    return {
      load() {
        try {
          const raw = getStorage().getItem(KEY);
          let parsed = raw === null ? null : JSON.parse(raw);
          // Older games allowed any branch first. Keep their pictures and resume
          // at the first incomplete group under the new guided rules.
          if (parsed && typeof parsed === 'object' && !Object.hasOwn(parsed, 'introStep')) {
            parsed = { ...parsed, introStep: parsed.progress > 0 ? 2 : 0 };
            if (parsed.modal === 'selection' && data.slotIds.includes(parsed.activeSlot) && parsed.slots?.[parsed.activeSlot]?.completed === false && !data.isSlotAvailable(parsed, parsed.activeSlot)) {
              parsed = { ...parsed, modal: null, activeSlot: null };
            }
          }
          return { state: validateState(parsed) ? parsed : createInitialState(), available: true };
        } catch (error) {
          return { state: createInitialState(), available: error instanceof SyntaxError };
        }
      },
      save(state) {
        if (!validateState(state)) return false;
        try { getStorage().setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
      },
      reset() { const state = createInitialState(); return { state, saved: this.save(state) }; }
    };
  }
  global.MindMapStorage = Object.freeze({ KEY, createInitialState, validateState, createStore });
})(globalThis);
