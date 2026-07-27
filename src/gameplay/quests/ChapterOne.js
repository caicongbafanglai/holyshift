import { CHAPTER_ORDER } from '../../data/content.ts';

const MAIN_INTERACTIONS = {
  intro: ['pastorSenior'],
  inspectFountain: ['fountain'],
  clearWisps: [],
  traceSacredGlyph: ['pingu'],
  consultLin: ['linZhenyin'],
  defeatWaterGhost: [],
  restoreFountain: [],
  inspectElevator: ['elevator'],
  complete: []
};

export function isProgress(value) {
  return CHAPTER_ORDER.includes(value);
}

export function progressIndex(progress) {
  return Math.max(0, CHAPTER_ORDER.indexOf(progress));
}

export function getInteractionIds(progress) {
  return [
    ...(MAIN_INTERACTIONS[progress] ?? []),
    'pinguStall',
    'student',
    'believer',
    'noticeBoard'
  ];
}

export function getWaveForProgress(progress) {
  if (progress === 'clearWisps') {
    return ['wisp-a', 'wisp-b', 'wisp-c'];
  }
  if (progress === 'defeatWaterGhost') {
    return ['approved-water-ghost'];
  }
  return [];
}

export function allWaveEnemiesDefeated(progress, defeated) {
  const wave = getWaveForProgress(progress);
  return wave.length > 0 && wave.every((id) => defeated[id] === true);
}

export function getNextProgressAfterWave(progress) {
  if (progress === 'clearWisps') return 'traceSacredGlyph';
  if (progress === 'defeatWaterGhost') return 'restoreFountain';
  return progress;
}

export function canRestoreAtFountain(progress, playerPosition, fountainPosition) {
  if (progress !== 'restoreFountain') return false;
  return Math.hypot(
    playerPosition.x - fountainPosition.x,
    playerPosition.z - fountainPosition.z
  ) <= 14.5;
}
