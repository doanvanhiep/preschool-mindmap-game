(function (global) {
  'use strict';
  const data = global.MindMapData;
  const storage = global.MindMapStorage;
  function getAvailableOptions(state, slotId) {
    const group = data.groupForSlot(slotId);
    if (!group || state.slots[slotId].completed) return [];
    const used = new Set(group.slots.map(id => state.slots[id].imageId));
    return group.options.filter(option => !used.has(option.id));
  }
  function openSlot(state, slotId) {
    if (!data.slotIds.includes(slotId) || state.slots[slotId].completed) return state;
    return { ...state, activeSlot: slotId, modal: 'selection' };
  }
  function closeModal(state) { return { ...state, activeSlot: null, modal: null }; }
  function chooseImage(state, imageId) {
    if (state.modal !== 'selection' || !state.activeSlot) return { state, correct: false, changed: false };
    const option = getAvailableOptions(state, state.activeSlot).find(item => item.id === imageId);
    if (!option || !option.isCorrect) return { state, correct: false, changed: false };
    const progress = state.progress + 1;
    return { state: { ...state, slots: { ...state.slots, [state.activeSlot]: { imageId, completed: true } }, progress, completed: progress === data.slotIds.length, activeSlot: null, modal: progress === data.slotIds.length ? 'completion' : null }, correct: true, changed: true };
  }
  global.MindMapRules = Object.freeze({ getAvailableOptions, openSlot, closeModal, chooseImage });
  if (typeof document === 'undefined') return;

  const $ = id => document.getElementById(id);
  const store = storage.createStore();
  const loaded = store.load();
  let state = loaded.state;
  let busy = false;
  let returnFocus = null;
  const dialogs = { selection: $('selection-dialog'), completion: $('completion-dialog'), reset: $('reset-dialog') };
  const sounds = Object.fromEntries(['correct', 'wrong', 'complete'].map(name => {
    const audio = new Audio(`assets/sounds/${name}.mp3`);
    audio.volume = name === 'wrong' ? 0.2 : 0.3;
    audio.preload = 'auto';
    return [name, audio];
  }));
  function playSound(name) {
    Object.values(sounds).forEach(sound => { sound.pause(); sound.currentTime = 0; });
    try { const playback = sounds[name].play(); if (playback) playback.catch(() => {}); } catch { /* Audio is optional; the game continues. */ }
  }
  function persist() { if (!store.save(state)) $('storage-notice').hidden = false; }
  if (!loaded.available) $('storage-notice').hidden = false;

  function createSlot(slotId) {
    const group = data.groupForSlot(slotId);
    const slot = state.slots[slotId];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `image-slot${slot.completed ? ' is-complete' : ''}`;
    button.dataset.slot = slotId;
    const slotNumber = group.slots.indexOf(slotId) + 1;
    button.disabled = slot.completed;
    if (slot.completed) {
      const option = group.options.find(item => item.id === slot.imageId);
      const img = document.createElement('img');
      img.src = option.src; img.alt = option.description;
      const label = document.createElement('span'); label.className = 'slot-caption'; label.textContent = option.description;
      const check = document.createElement('span'); check.className = 'slot-check'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
      button.append(img, label, check);
      button.setAttribute('aria-label', `${group.title}, ô ${slotNumber}: ${option.description}, đã hoàn thành`);
    } else {
      const plus = document.createElement('span'); plus.className = 'slot-plus'; plus.textContent = '+'; plus.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span'); label.className = 'slot-prompt'; label.textContent = slotId === 'central' ? 'Cô giáo ở đâu nhỉ?' : 'Chọn tranh';
      button.append(plus, label);
      button.setAttribute('aria-label', `${group.title}, ô ${slotNumber}: chọn tranh`);
    }
    return button;
  }
  function renderBoard() {
    $('central-slot').replaceChildren(createSlot('central'));
    $('branches').replaceChildren(...data.branches.map(branch => {
      const section = document.createElement('section'); section.className = `branch branch-${branch.id}`; section.dataset.branch = branch.id;
      const heading = document.createElement('div'); heading.className = 'branch-heading';
      const icon = document.createElement('span'); icon.className = 'branch-icon'; icon.textContent = branch.icon; icon.setAttribute('aria-hidden', 'true');
      const titles = document.createElement('div');
      const subtitle = document.createElement('p'); subtitle.textContent = branch.shortTitle;
      const title = document.createElement('h2'); title.textContent = branch.title; title.id = `title-${branch.id}`;
      section.setAttribute('aria-labelledby', title.id);
      const number = document.createElement('span'); number.className = 'branch-number'; number.textContent = branch.number; number.setAttribute('aria-hidden', 'true');
      titles.append(subtitle, title); heading.append(icon, titles, number);
      const slots = document.createElement('div'); slots.className = 'branch-slots'; slots.append(...branch.slots.map(createSlot));
      const connectors = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      connectors.classList.add('branch-connectors');
      connectors.setAttribute('aria-hidden', 'true');
      const defs = document.createElementNS(connectors.namespaceURI, 'defs');
      const marker = document.createElementNS(connectors.namespaceURI, 'marker');
      marker.id = `arrow-${branch.id}`;
      Object.entries({ viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto', markerUnits: 'userSpaceOnUse' }).forEach(([name, value]) => marker.setAttribute(name, value));
      const tip = document.createElementNS(connectors.namespaceURI, 'path');
      tip.setAttribute('d', 'M 1 1 L 9 5 L 1 9'); tip.classList.add('arrow-tip');
      marker.append(tip); defs.append(marker); connectors.append(defs);
      branch.slots.forEach(slotId => {
        const path = document.createElementNS(connectors.namespaceURI, 'path');
        path.dataset.targetSlot = slotId;
        path.setAttribute('marker-end', `url(#arrow-${branch.id})`);
        connectors.append(path);
      });
      section.append(connectors, heading, slots); return section;
    }));
    $('progress-text').replaceChildren(document.createTextNode('Bé đã khám phá '));
    const strong = document.createElement('strong'); strong.textContent = `${state.progress}/7`;
    $('progress-text').append(strong, document.createTextNode(' bức tranh'));
    $('progress-dots').replaceChildren(...data.slotIds.map((id, index) => { const dot = document.createElement('span'); dot.className = index < state.progress ? 'filled' : ''; return dot; }));
    requestAnimationFrame(drawConnections);
  }
  function drawConnections() {
    const board = $('mindmap').getBoundingClientRect();
    const central = $('central-node').getBoundingClientRect();
    const mobile = matchMedia('(max-width: 700px)').matches;
    const x1 = central.left - board.left + central.width / 2;
    const y1 = central.top - board.top + central.height / 2;
    $('connections').setAttribute('viewBox', `0 0 ${board.width} ${board.height}`);
    data.branches.forEach(branch => {
      const section = document.querySelector(`.branch-${branch.id}`);
      const rect = section.getBoundingClientRect();
      const heading = section.querySelector('.branch-heading').getBoundingClientRect();
      let x2, y2, path;
      if (mobile) {
        x2 = 16; y2 = heading.top - board.top + heading.height / 2;
        path = `M ${x1} ${y1} H ${x2} V ${y2} H ${rect.left - board.left + 10}`;
      } else {
        x2 = rect.left - board.left + rect.width / 2; y2 = heading.top - board.top + heading.height / 2;
        const bend = (x1 + x2) / 2;
        path = `M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2} ${y2}`;
      }
      $('connections').querySelector(`[data-branch="${branch.id}"]`).setAttribute('d', path);
      const connectors = section.querySelector('.branch-connectors');
      connectors.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      const startX = heading.left - rect.left + heading.width / 2;
      const startY = heading.bottom - rect.top + 3;
      branch.slots.forEach(slotId => {
        const target = section.querySelector(`[data-slot="${slotId}"]`).getBoundingClientRect();
        const targetX = target.left - rect.left + target.width / 2;
        const targetY = target.top - rect.top - 4;
        const middleY = startY + (targetY - startY) / 2;
        connectors.querySelector(`[data-target-slot="${slotId}"]`).setAttribute('d', `M ${startX} ${startY} C ${startX} ${middleY}, ${targetX} ${middleY}, ${targetX} ${targetY}`);
      });
    });
  }
  function showDialog(name) {
    Object.values(dialogs).forEach(dialog => { if (dialog.open && dialog !== dialogs[name]) dialog.close(); });
    if (name && !dialogs[name].open) dialogs[name].showModal();
  }
  function renderSelection() {
    const group = data.groupForSlot(state.activeSlot);
    $('selection-title').textContent = group.title;
    $('selection-instruction').textContent = group.question;
    $('selection-dialog').dataset.theme = group.id;
    $('selection-feedback').textContent = 'Bé chạm vào bức tranh mình chọn nhé!';
    $('selection-feedback').classList.remove('is-wrong');
    $('image-options').replaceChildren(...getAvailableOptions(state, state.activeSlot).map(option => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'option-card'; button.dataset.image = option.id;
      const img = document.createElement('img'); img.src = option.src; img.alt = ''; img.width = 240; img.height = 200;
      const caption = document.createElement('span'); caption.textContent = option.description;
      button.append(img, caption); return button;
    }));
  }
  function restoreModal() {
    if (state.modal === 'selection') { renderSelection(); returnFocus = `[data-slot="${state.activeSlot}"]`; }
    if (state.modal === 'completion') returnFocus = '#reset-button';
    showDialog(state.modal);
  }
  function dismissDialog(name) {
    if (name !== 'reset') { state = closeModal(state); persist(); }
    dialogs[name].close();
    const target = returnFocus ? document.querySelector(returnFocus) : $('reset-button');
    if (target && !target.disabled) target.focus();
    returnFocus = null;
  }
  $('mindmap').addEventListener('click', event => {
    const button = event.target.closest('[data-slot]');
    if (!button || busy) return;
    const next = openSlot(state, button.dataset.slot);
    if (next === state) return;
    state = next; returnFocus = `[data-slot="${button.dataset.slot}"]`; persist(); renderSelection(); showDialog('selection');
  });
  $('image-options').addEventListener('click', event => {
    const button = event.target.closest('[data-image]');
    if (!button || busy || state.modal !== 'selection') return;
    busy = true;
    try {
      const result = chooseImage(state, button.dataset.image);
      if (!result.changed) {
        playSound('wrong');
        $('selection-feedback').textContent = 'Chưa phù hợp rồi. Bé thử chọn bức tranh khác nhé!';
        $('selection-feedback').classList.add('is-wrong');
        button.classList.remove('try-again'); void button.offsetWidth; button.classList.add('try-again');
        return;
      }
      const previousSlot = state.activeSlot;
      state = result.state; persist(); renderBoard(); showDialog(state.modal);
      playSound(state.completed ? 'complete' : 'correct');
      $('game-status').textContent = `Đúng rồi! Bé đã khám phá ${state.progress} trên 7 bức tranh.`;
      if (!state.completed) {
        const group = data.groupForSlot(previousSlot);
        const nextId = [...group.slots, ...data.slotIds].find(id => !state.slots[id].completed);
        if (nextId) document.querySelector(`[data-slot="${nextId}"]`).focus();
      }
      returnFocus = state.completed ? '#reset-button' : null;
    } finally { busy = false; }
  });
  $('reset-button').addEventListener('click', () => { returnFocus = '#reset-button'; showDialog('reset'); });
  $('cancel-reset').addEventListener('click', () => dismissDialog('reset'));
  $('confirm-reset').addEventListener('click', () => {
    state = storage.createInitialState(); Object.values(sounds).forEach(sound => { sound.pause(); sound.currentTime = 0; });
    persist(); renderBoard(); showDialog(null); returnFocus = null; $('reset-button').focus();
    $('game-status').textContent = 'Trò chơi đã bắt đầu lại. Bé cùng chọn tranh nhé!';
  });
  $('view-map').addEventListener('click', () => dismissDialog('completion'));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dismissDialog(button.dataset.close)));
  Object.entries(dialogs).forEach(([name, dialog]) => {
    dialog.addEventListener('cancel', event => { event.preventDefault(); dismissDialog(name); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismissDialog(name);
    });
  });
  renderBoard(); restoreModal();
  new ResizeObserver(drawConnections).observe($('mindmap'));
})(globalThis);
