(function (global) {
  'use strict';
  const image = (group, id, description, isCorrect, extension = 'jpg', revision = '') => ({ id, src: `assets/images/${group}/${id}.${extension}${revision ? `?v=${revision}` : ''}`, description, isCorrect });
  const data = {
    title: 'Cô giáo của con',
    contentVersion: 2,
    central: {
      id: 'central', title: 'Cô giáo của con', question: 'Con hãy chọn bức ảnh cô giáo của mình nhé!',
      slots: ['central'],
      options: [image('central', 'tt1s', 'Ông', false, 'png'), image('central', 'ttd', 'Cô giáo của con', true), image('central', 'tt2s', 'Bà', false, 'png')]
    },
    branches: [
      { id: 'action', title: 'Hoạt động của cô', shortTitle: 'Cô cùng con học và chơi', icon: '✿', number: '01', question: 'Con hãy chọn những bức tranh có cô giáo vui vẻ, tươi cười cùng các con.', slots: ['action-1', 'action-2'], options: [image('action', 'hdcc1d', 'Cô say sưa giảng bài', true), image('action', 'hdccs', 'Cô ngồi viết bài', false), image('action', 'hdcc2d', 'Cô vui vẻ tươi cười khi vào lớp', true)] },
      { id: 'attitude', title: 'Thái độ của cô', shortTitle: 'Cô khi con ngoan, con nghịch', icon: '✦', number: '02', question: 'Theo bộ tranh, cô có thái độ như thế nào khi con ngoan và khi con nghịch?', slots: ['attitude-1', 'attitude-2'], options: [image('attitude', 'tdccs', 'Cô đánh trẻ', false), image('attitude', 'tdcc1d', 'Cô nhắc nhở khi con nghịch', true, 'jpg', '2'), image('attitude', 'tdcc2d', 'Cô yêu thương khi con ngoan', true)] },
      { id: 'emotion', title: 'Tình cảm của bé', shortTitle: 'Con yêu quý cô giáo', icon: '♡', number: '03', question: 'Những bức tranh nào thể hiện tình cảm yêu quý, biết ơn của bé dành cho cô?', slots: ['emotion-1', 'emotion-2'], options: [image('emotion', 'tcct1d', 'Bé yêu quý cô', true), image('emotion', 'tccts', 'Bé giận dỗi với cô', false), image('emotion', 'tcct2d', 'Bé tặng hoa cảm ơn cô', true)] }
    ]
  };
  const groups = [data.central, ...data.branches];
  const groupForSlot = slotId => groups.find(group => group.slots.includes(slotId));
  global.MindMapData = Object.freeze({ ...data, groups, groupForSlot, slotIds: groups.flatMap(group => group.slots) });
})(globalThis);
