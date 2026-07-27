import { describe, expect, it } from 'vitest';
import {
  CHECKPOINTS,
  OBJECTIVES,
  STORY,
  type ProgressStep
} from '../src/data/content';

const PROGRESSION: ProgressStep[] = [
  'prologue',
  'questAccepted',
  'sentryDefeated',
  'weaponChosen',
  'wardenDefeated',
  'relicChosen',
  'growthChosen',
  'bossDefeated',
  'complete'
];

describe('content acceptance', () => {
  it('keeps the playable Chinese narrative within the 600–1200 character target', () => {
    const narrative = Object.values(STORY).join('');
    const chineseCharacters = narrative.match(/[\u3400-\u9fff]/gu) ?? [];

    expect(chineseCharacters.length).toBeGreaterThanOrEqual(600);
    expect(chineseCharacters.length).toBeLessThanOrEqual(1200);
  });

  it('defines an objective and a safe checkpoint for every progression state', () => {
    for (const step of PROGRESSION) {
      expect(OBJECTIVES[step]).toBeTruthy();
      expect(CHECKPOINTS[step]).toEqual({
        x: expect.any(Number),
        y: expect.any(Number),
        z: expect.any(Number)
      });
    }
  });
});
