(function (global) {
  'use strict';
  const data = global.MindMapData;
  const storage = global.MindMapStorage;
  const showTitleQuestion = state => state.introStep === 0 && !state.titleQuestionVisible ? { ...state, titleQuestionVisible: true } : state;
  const showAuthorQuestion = state => state.introStep === 1 && !state.authorQuestionVisible ? { ...state, authorQuestionVisible: true } : state;
  const revealPoemTitle = state => state.introStep === 0 && state.titleQuestionVisible ? { ...state, introStep: 1 } : state;
  const revealAuthor = state => state.introStep === 1 && state.authorQuestionVisible ? { ...state, introStep: 2 } : state;
  function getAvailableOptions(state, slotId) {
    const group = data.groupForSlot(slotId);
    if (!group || !data.isSlotAvailable(state, slotId)) return [];
    const used = new Set(group.slots.map(id => state.slots[id].imageId));
    return group.options.filter(option => !used.has(option.id));
  }
  function openSlot(state, slotId) {
    if (!data.slotIds.includes(slotId) || !data.isSlotAvailable(state, slotId)) return state;
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
  global.MindMapRules = Object.freeze({ showTitleQuestion, showAuthorQuestion, revealPoemTitle, revealAuthor, getAvailableOptions, openSlot, closeModal, chooseImage });
  if (typeof document === 'undefined') return;

  const $ = id => document.getElementById(id);
  const store = storage.createStore();
  const loaded = store.load();
  let state = loaded.state;
  let busy = false;
  let introClickReadyAt = 0;
  let returnFocus = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const effectLayer = document.createElement('div');
  effectLayer.className = 'effect-layer';
  effectLayer.setAttribute('aria-hidden', 'true');
  document.body.append(effectLayer);
  const dialogs = { selection: $('selection-dialog'), completion: $('completion-dialog'), reset: $('reset-dialog') };
  const sounds = Object.fromEntries(['correct', 'wrong', 'complete', 'applause'].map(name => {
    const audio = new Audio(`assets/sounds/${name}.mp3?v=applause-1`);
    audio.volume = name === 'wrong' ? 0.2 : name === 'applause' ? 0.24 : 0.28;
    audio.preload = 'auto';
    return [name, audio];
  }));
  function stopSounds() {
    Object.values(sounds).forEach(sound => { try { sound.pause(); sound.currentTime = 0; } catch { /* Some browsers may not have loaded the audio yet. */ } });
  }
  function playSound(name) {
    stopSounds();
    try {
      const playback = sounds[name].play(); if (playback) playback.catch(() => {});
    } catch { /* Audio is optional; the game continues. */ }
  }

  function fittedImageRect(image, fallback = image) {
    const rect = image.getBoundingClientRect();
    const width = image.naturalWidth || fallback.naturalWidth;
    const height = image.naturalHeight || fallback.naturalHeight;
    if (!width || !height) return rect;
    const scale = Math.min(rect.width / width, rect.height / height);
    return { left: rect.left + (rect.width - width * scale) / 2, top: rect.top + (rect.height - height * scale) / 2, width: width * scale, height: height * scale };
  }

  async function waitForAnimation(animation, duration) {
    let deadline;
    try {
      await Promise.race([
        animation.finished.catch(() => {}),
        new Promise(resolve => {
          deadline = setTimeout(() => {
            try { animation.finish(); } catch { animation.cancel(); }
            resolve();
          }, duration + 300);
        })
      ]);
    } finally { clearTimeout(deadline); }
  }

  async function flyImage(sourceImage, sourceRect, target) {
    const image = target.querySelector('img');
    if (reducedMotion.matches || !image.animate) return;
    // Keep the saved answer, but reveal its image only when the flying copy arrives.
    target.classList.add('is-arriving');
    const flying = document.createElement('img');
    flying.src = sourceImage.currentSrc || sourceImage.src;
    flying.alt = '';
    flying.className = 'flying-image';
    Object.assign(flying.style, { left: `${sourceRect.left}px`, top: `${sourceRect.top}px`, width: `${sourceRect.width}px`, height: `${sourceRect.height}px` });
    effectLayer.append(flying);
    let flight;
    const finishFlight = () => { try { if (flight && flight.playState !== 'finished') flight.finish(); } catch { /* A cancelled animation needs no further work. */ } };
    try {
      const rect = target.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > innerHeight) target.scrollIntoView({ block: 'center', behavior: 'instant' });
      const destination = fittedImageRect(image, sourceImage);
      const dx = destination.left - sourceRect.left;
      const dy = destination.top - sourceRect.top;
      const sx = destination.width / sourceRect.width;
      const sy = destination.height / sourceRect.height;
      flight = flying.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { offset: 0.45, transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 45}px) scale(${1 + (sx - 1) * 0.4}, ${1 + (sy - 1) * 0.4})`, opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 1 }
      ], { duration: 1350, easing: 'cubic-bezier(.35,0,.2,1)', fill: 'forwards' });
      window.addEventListener('resize', finishFlight, { once: true });
      const onVisibility = () => { if (document.hidden) finishFlight(); };
      document.addEventListener('visibilitychange', onVisibility);
      try { await waitForAnimation(flight, 1350); } catch { /* Reload, resize and cancelled effects never change the saved answer. */ }
      finally { document.removeEventListener('visibilitychange', onVisibility); }
      target.classList.remove('is-arriving');
      await waitForAnimation(image.animate([{ opacity: 0.5, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' }), 220);
    } finally {
      window.removeEventListener('resize', finishFlight);
      flying.remove();
      target.classList.remove('is-arriving');
    }
  }

  function celebrate(target, completed) {
    target.classList.add('is-celebrating');
    setTimeout(() => target.classList.remove('is-celebrating'), 2300);
    if (reducedMotion.matches || typeof target.animate !== 'function') return;
    // Replace the previous show instead of stacking hundreds of delayed bursts.
    effectLayer.querySelectorAll('.firework-particle').forEach(particle => {
      particle.getAnimations().forEach(animation => animation.cancel());
      particle.remove();
    });
    const bursts = completed
      ? [[.12, .2, 0], [.86, .18, 600], [.48, .4, 1200], [.18, .67, 1800], [.83, .7, 2400], [.48, .82, 3000], [.33, .15, 3600], [.67, .55, 4200]]
      : [[.14, .22, 0], [.84, .2, 550], [.5, .43, 1100], [.18, .7, 1700], [.82, .72, 2300], [.5, .82, 3000]];
    const colors = ['#e7ad32', '#e58aa6', '#74a8ce', '#8bae70', '#c39de1'];
    const count = completed ? 24 : 20;
    bursts.forEach(([relativeX, relativeY, delay]) => {
      const x = relativeX * innerWidth;
      const y = relativeY * innerHeight;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        const radius = 45 + Math.random() * Math.min(150, Math.min(innerWidth, innerHeight) * .2);
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;
        const particle = document.createElement('i');
        particle.className = 'firework-particle';
        Object.assign(particle.style, { left: `${x}px`, top: `${y}px`, background: colors[i % colors.length], color: colors[i % colors.length] });
        effectLayer.append(particle);
        const duration = 1800 + Math.random() * 600;
        const animation = particle.animate([
          { transform: 'translate(0,0) scale(.2)', opacity: 0 },
          { offset: 0.08, opacity: 1 },
          { offset: 0.6, transform: `translate(${dx * 0.8}px,${dy * 0.8 + 12}px) scale(1)`, opacity: 0.9 },
          { transform: `translate(${dx}px,${dy + 75}px) scale(.1)`, opacity: 0 }
        ], { duration, delay, easing: 'cubic-bezier(.12,.65,.35,1)', fill: 'both' });
        waitForAnimation(animation, duration + delay).finally(() => particle.remove());
      }
    });
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
    button.disabled = busy || !data.isSlotAvailable(state, slotId);
    if (slot.completed) {
      const option = group.options.find(item => item.id === slot.imageId);
      const img = document.createElement('img');
      img.src = option.src; img.alt = option.description;
      const check = document.createElement('span'); check.className = 'slot-check'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
      button.append(img, check);
      button.setAttribute('aria-label', `${group.title}, ô ${slotNumber}: ${option.description}, đã hoàn thành`);
    } else {
      const plus = document.createElement('span'); plus.className = 'slot-plus'; plus.textContent = '+'; plus.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span'); label.className = 'slot-prompt'; label.textContent = slotId === 'central' ? 'Cô giáo ở đâu nhỉ?' : 'Chọn tranh';
      button.append(plus, label);
      button.setAttribute('aria-label', `${group.title}, ô ${slotNumber}: chọn tranh`);
    }
    return button;
  }
  function updateAvailability() {
    document.querySelectorAll('[data-slot]').forEach(button => {
      const available = data.isSlotAvailable(state, button.dataset.slot);
      button.disabled = busy || !available;
      button.classList.toggle('is-current', available && !busy);
      button.classList.toggle('is-locked', !available && !state.slots[button.dataset.slot].completed);
    });
  }
  function renderIntroButton(button, questionVisible, answered, question, answer, label) {
    button.classList.toggle('is-hint', !questionVisible);
    button.disabled = answered;
    if (!questionVisible) {
      const image = document.createElement('img');
      image.src = 'assets/images/tap-hand.svg'; image.alt = ''; image.width = 48; image.height = 48;
      image.setAttribute('aria-hidden', 'true');
      button.replaceChildren(image); button.setAttribute('aria-label', label);
    } else {
      button.textContent = answered ? answer : question;
      button.removeAttribute('aria-label');
    }
  }
  function renderIntro() {
    renderIntroButton($('poem-title-button'), state.titleQuestionVisible, state.introStep > 0, data.poem.titleQuestion, data.title, 'Hiện câu hỏi tên bài thơ');
    $('poem-author').hidden = state.introStep === 0;
    renderIntroButton($('poem-author-button'), state.authorQuestionVisible, state.introStep === 2, data.poem.authorQuestion, data.poem.author, 'Hiện câu hỏi tác giả');
    const group = data.activeGroup(state);
    $('play-hint').hidden = state.introStep < 2;
    $('play-hint').textContent = state.introStep < 2 ? '' : group ? `Chọn tranh cho ${group.id === 'central' ? 'ô trung tâm' : group.title.toLocaleLowerCase('vi')}` : 'Con đã hoàn thành sơ đồ!';
  }
  function renderBoard() {
    renderIntro();
    $('central-slot').replaceChildren(createSlot('central'));
    $('branches').replaceChildren(...data.branches.map(branch => {
      const section = document.createElement('section'); section.className = `branch branch-${branch.id}`; section.dataset.branch = branch.id;
      const heading = document.createElement('div'); heading.className = 'branch-heading';
      const title = document.createElement('h2'); title.textContent = branch.title; title.id = `title-${branch.id}`;
      section.setAttribute('aria-labelledby', title.id);
      heading.append(title);
      const slots = document.createElement('div'); slots.className = 'branch-slots'; slots.append(...branch.slots.map(createSlot));
      section.append(heading, slots); return section;
    }));
    updateAvailability();
    requestAnimationFrame(drawConnections);
  }
  function drawConnections() {
    const board = $('mindmap').getBoundingClientRect();
    const central = document.querySelector('[data-slot="central"]').getBoundingClientRect();
    const mobile = matchMedia('(max-width: 700px)').matches;
    const x1 = central.left - board.left + central.width / 2;
    const y1 = central.top - board.top + central.height / 2;
    $('connections').setAttribute('viewBox', `0 0 ${board.width} ${board.height}`);
    const svg = $('connections');
    svg.replaceChildren();
    const ns = svg.namespaceURI;
    const makePath = (d, color, targetSlot = null) => {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d); path.style.stroke = color;
      if (targetSlot) path.dataset.targetSlot = targetSlot;
      svg.append(path); return path;
    };
    data.branches.forEach(branch => {
      const section = document.querySelector(`.branch-${branch.id}`);
      const heading = section.querySelector('.branch-heading').getBoundingClientRect();
      const color = getComputedStyle(section).getPropertyValue('--accent').trim();
      const defs = document.createElementNS(ns, 'defs');
      const marker = document.createElementNS(ns, 'marker');
      marker.id = `arrow-${branch.id}`;
      Object.entries({ viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '10', markerHeight: '10', orient: 'auto', markerUnits: 'userSpaceOnUse' }).forEach(([name, value]) => marker.setAttribute(name, value));
      const tip = document.createElementNS(ns, 'path');
      tip.setAttribute('d', 'M 1 1 L 9 5 L 1 9'); tip.style.stroke = color;
      marker.append(tip); defs.append(marker); svg.append(defs);
      const startX = heading.left - board.left + heading.width / 2;
      const startY = heading.bottom - board.top + 10;
      // One labelled stem from the center, then two independent arrow destinations.
      const stem = mobile
        ? `M ${x1} ${y1} H 12 V ${startY} H ${startX}`
        : `M ${x1} ${y1} C ${(x1 + startX) / 2} ${y1}, ${(x1 + startX) / 2} ${startY}, ${startX} ${startY}`;
      makePath(stem, color).dataset.branch = branch.id;
      branch.slots.forEach(slotId => {
        const target = section.querySelector(`[data-slot="${slotId}"]`).getBoundingClientRect();
        const targetX = target.left - board.left + target.width / 2;
        const targetY = target.top - board.top - 7;
        const middleY = startY + (targetY - startY) / 2;
        makePath(`M ${startX} ${startY} C ${startX} ${middleY}, ${targetX} ${middleY}, ${targetX} ${targetY}`, color, slotId).setAttribute('marker-end', `url(#arrow-${branch.id})`);
      });
    });
  }
  function showDialog(name) {
    Object.values(dialogs).forEach(dialog => { if (dialog.open && dialog !== dialogs[name]) dialog.close(); });
    if (name && !dialogs[name].open) dialogs[name].showModal();
  }
  function renderSelection() {
    const group = data.groupForSlot(state.activeSlot);
    $('selection-title').textContent = group.selectionTitle || group.title;
    $('selection-instruction').textContent = group.question;
    $('selection-dialog').dataset.theme = group.id;
    $('selection-feedback').textContent = '';
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
  function advanceIntro(kind, event) {
    if (busy || event.detail > 1 || performance.now() < introClickReadyAt) return;
    const title = kind === 'title';
    if (!title && state.introStep !== 1) return;
    const questionVisible = title ? state.titleQuestionVisible : state.authorQuestionVisible;
    const next = title ? (questionVisible ? revealPoemTitle(state) : showTitleQuestion(state)) : (questionVisible ? revealAuthor(state) : showAuthorQuestion(state));
    if (next === state) return;
    // Keep double taps and held keys from skipping the newly revealed question.
    introClickReadyAt = performance.now() + 400;
    state = next; persist(); renderBoard();
    if (!questionVisible) {
      $('game-status').textContent = title ? data.poem.titleQuestion : data.poem.authorQuestion;
    } else if (title) {
      playSound('applause');
      $('game-status').textContent = `Bài thơ ${data.title}.`;
      $('poem-author-button').focus({ preventScroll: true });
    } else {
      playSound('applause');
      $('game-status').textContent = `Tác giả ${data.poem.author}. Con hãy chọn tranh cho ô trung tâm.`;
      document.querySelector('[data-slot="central"]').focus({ preventScroll: true });
    }
  }
  for (const kind of ['title', 'author']) {
    const button = $(`poem-${kind}-button`);
    button.addEventListener('click', event => advanceIntro(kind, event));
    button.addEventListener('keydown', event => { if (event.repeat && ['Enter', ' '].includes(event.key)) event.preventDefault(); });
  }
  $('mindmap').addEventListener('click', event => {
    const button = event.target.closest('[data-slot]');
    if (!button || busy) return;
    const next = openSlot(state, button.dataset.slot);
    if (next === state) return;
    state = next; returnFocus = `[data-slot="${button.dataset.slot}"]`; persist(); renderSelection(); showDialog('selection');
  });
  $('image-options').addEventListener('click', async event => {
    const button = event.target.closest('[data-image]');
    if (!button || busy || state.modal !== 'selection') return;
    busy = true;
    let nextFocus = null;
    try {
      const result = chooseImage(state, button.dataset.image);
      if (!result.changed) {
        playSound('wrong');
        $('selection-feedback').textContent = 'Chưa đúng rồi, con thử lại nhé!';
        $('selection-feedback').classList.add('is-wrong');
        button.classList.remove('try-again'); void button.offsetWidth; button.classList.add('try-again');
        return;
      }
      const previousSlot = state.activeSlot;
      const sourceImage = button.querySelector('img');
      const sourceRect = fittedImageRect(sourceImage);
      state = result.state;
      // Persist before starting any effect so a reload during flight is safe.
      persist(); showDialog(null); renderBoard();
      $('mindmap').setAttribute('aria-busy', 'true');
      $('reset-button').disabled = true;
      stopSounds();
      const target = document.querySelector(`[data-slot="${previousSlot}"]`);
      try { await flyImage(sourceImage, sourceRect, target); } catch { target.classList.remove('is-arriving'); }
      celebrate(target, state.completed);
      playSound(state.completed ? 'complete' : 'correct');
      $('game-status').textContent = `Đúng rồi! Bé đã khám phá ${state.progress} trên 7 bức tranh.`;
      if (state.completed) {
        if (!reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 600));
        showDialog('completion');
      }
      if (!state.completed) {
        nextFocus = data.slotIds.find(id => data.isSlotAvailable(state, id));
      }
      returnFocus = state.completed ? '#reset-button' : null;
    } finally {
      busy = false;
      $('mindmap').removeAttribute('aria-busy');
      $('reset-button').disabled = false;
      updateAvailability();
      if (nextFocus) document.querySelector(`[data-slot="${nextFocus}"]`).focus({ preventScroll: event.detail !== 0 });
    }
  });
  $('reset-button').addEventListener('click', () => { if (busy) return; returnFocus = '#reset-button'; showDialog('reset'); });
  $('cancel-reset').addEventListener('click', () => dismissDialog('reset'));
  $('confirm-reset').addEventListener('click', () => {
    state = storage.createInitialState(); stopSounds();
    introClickReadyAt = 0;
    effectLayer.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    effectLayer.replaceChildren();
    persist(); renderBoard(); showDialog(null); returnFocus = null; $('poem-title-button').focus();
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
