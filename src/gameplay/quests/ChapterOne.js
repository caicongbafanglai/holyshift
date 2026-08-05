import { CHAPTER_ORDER, PLAYER_COMBAT } from '../../data/content.ts';

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

export function reconcileCompletedWaveProgress(progress, defeated) {
  return allWaveEnemiesDefeated(progress, defeated)
    ? getNextProgressAfterWave(progress)
    : progress;
}

export function canRestoreAtFountain(progress, playerPosition, fountainPosition) {
  if (progress !== 'restoreFountain') return false;
  const horizontalDistance = Math.hypot(
    playerPosition.x - fountainPosition.x,
    playerPosition.z - fountainPosition.z
  );
  const verticalDistance = Math.abs(
    (playerPosition.y ?? 0) - (fountainPosition.y ?? 0)
  );
  return (
    horizontalDistance <= PLAYER_COMBAT.fountainRestoreHorizontalRange &&
    verticalDistance <= PLAYER_COMBAT.fountainRestoreVerticalRange
  );
}
