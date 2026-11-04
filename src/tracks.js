export const tracks = [
  {
    name: '职能',
    tag: 'FUNCTION',
    size: 30,
    codes: { 3: 'A3', 6: 'D4', 9: 'G3', 12: 'J3', 15: 'N3', 18: 'Q3', 21: 'T3', 24: 'W8', 27: 'Y2' },
    ranks: { 3: '专员', 6: '高级专员', 9: '助理总监', 12: '总监', 15: '地区总监', 18: '副总裁', 21: '高级副总裁', 24: '执行副总裁', 27: '主席' },
    notes: [
      '当你获得任务MVP时，在你的职能记录条上标记1格，且无需从其他记录条上移除一格。',
      '每当你在职能记录条上标记一格时，将任意一项资质的"资质保证上限"提升1点，最高不超过9点。'
    ]
  },
  {
    name: '现实',
    tag: 'REALITY',
    size: 30,
    codes: { 1: 'C4', 4: 'L11', 8: 'E2', 10: 'O4', 14: 'T6', 16: 'V2', 20: 'X3', 22: 'H5', 26: 'E3' },
    notes: [
      '当你既未获得任务MVP也未进入察看期时，你可以将你与任意一段关系的连结提升1点。',
      '每当你在现实记录条上标记一格时，将你与任意一段"关系"的"连结"提升1点，然后对关系网内的每段关系重复此操作。'
    ]
  },
  {
    name: '异常',
    tag: 'ANOMALY',
    size: 30,
    codes: { 1: 'H4', 2: 'H3', 5: 'U2', 7: 'X2', 11: 'N1', 13: 'Q2', 17: 'L10', 19: 'G8', 23: 'A7' },
    notes: [
      '当你进入察看期时，在你的异常记录条上标记1格，且无需从其他记录条上移除一格。',
      '每当你在异常记录条上标记一格时，选择一项：',
      '➤练习：在任意一项异常能力上标记"熟练"。',
      '➤广为人知：从一项异常能力中移除"熟练"标记，并向你的团队提出该能力的问题。在获得最多票数的答案轨道上做标记，然后获得所有已解锁的能力。'
    ]
  },
  {
    name: '人伦条',
    tag: 'HUMANITY',
    size: 15,
    codes: { 1: 'M21', 2: 'G100', 4: 'H63', 7: 'B147', 10: 'L21', 13: 'P16', 15: 'H52' },
    notes: ['请注意，当你在其他的地方花费时间时，无需为“人伦条”的末尾划掉一格。但若你在“人伦条”上花费时间时，你需要在“职能条”，“现实条”和“异常条”的末尾各划掉一格。']
  }
];

export const actions = {
  light: '点亮',
  gray: '变灰',
  unlight: '撤回点亮',
  ungray: '撤回灰色'
};

export function emptyRecord() {
  return { lit: [0, 0, 0, 0], grey: [0, 0, 0, 0], revision: 0 };
}

export function cellState(record, track, cell) {
  if (cell <= record.lit[track]) return 'lit';
  if (cell > tracks[track].size - record.grey[track]) return 'grey';
  return 'blank';
}

export function legalActions(record, track, cell) {
  const size = tracks[track]?.size;
  if (!size || !Number.isInteger(cell) || cell < 1 || cell > size) return [];
  const left = record.lit[track];
  const right = size - record.grey[track];
  if (cell <= left) return cell === left ? ['unlight'] : [];
  if (cell > right) return cell === right + 1 ? ['ungray'] : [];
  return [
    ...(cell === left + 1 ? ['light'] : []),
    ...(cell === right ? ['gray'] : [])
  ];
}

export function applyAction(record, track, cell, action) {
  if (!legalActions(record, track, cell).includes(action)) throw new Error('该格当前无法执行此操作');
  const next = { lit: [...record.lit], grey: [...record.grey], revision: record.revision + 1 };
  if (action === 'light') next.lit[track]++;
  if (action === 'unlight') next.lit[track]--;
  if (action === 'gray') next.grey[track]++;
  if (action === 'ungray') next.grey[track]--;
  return next;
}
