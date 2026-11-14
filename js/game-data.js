(function (global) {
  'use strict';
  const image = (group, id, description, isCorrect) => ({ id, src: `assets/images/${group}/${id}.svg`, description, isCorrect });
  const data = {
    title: 'Cô giáo của bé',
    central: {
      id: 'central', title: 'Cô giáo của bé', question: 'Ai là cô giáo cùng bé học và chơi mỗi ngày?',
      slots: ['central'],
      options: [image('central', 'doctor', 'Bác sĩ', false), image('central', 'teacher', 'Cô giáo', true), image('central', 'chef', 'Đầu bếp', false)]
    },
    branches: [
      { id: 'emotion', title: 'Tình cảm của trẻ', shortTitle: 'Một trái tim ấm áp', icon: '♡', number: '01', question: 'Bé có những tình cảm nào dành cho cô giáo?', slots: ['emotion-1', 'emotion-2'], options: [image('emotion', 'love', 'Yêu quý cô', true), image('emotion', 'toys', 'Thích đồ chơi', false), image('emotion', 'gratitude', 'Biết ơn cô', true)] },
      { id: 'action', title: 'Hành động của trẻ', shortTitle: 'Những việc làm bé xinh', icon: '✿', number: '02', question: 'Bé làm gì để thể hiện sự quan tâm đến cô giáo?', slots: ['action-1', 'action-2'], options: [image('action', 'help', 'Giúp cô cất đồ chơi', true), image('action', 'greeting', 'Chào cô', true), image('action', 'football', 'Đá bóng', false)] },
      { id: 'attitude', title: 'Thái độ của trẻ', shortTitle: 'Bé ngoan mỗi ngày', icon: '✦', number: '03', question: 'Khi ở bên cô giáo, bé nên có thái độ như thế nào?', slots: ['attitude-1', 'attitude-2'], options: [image('attitude', 'chatting', 'Nói chuyện khi cô giảng', false), image('attitude', 'listening', 'Chăm chú nghe cô', true), image('attitude', 'respect', 'Lễ phép với cô', true)] }
    ]
  };
  const groups = [data.central, ...data.branches];
  const groupForSlot = slotId => groups.find(group => group.slots.includes(slotId));
  global.MindMapData = Object.freeze({ ...data, groups, groupForSlot, slotIds: groups.flatMap(group => group.slots) });
})(globalThis);
