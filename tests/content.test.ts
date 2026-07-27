import { describe, expect, it } from 'vitest';
import {
  CHAPTER_ORDER,
  CHECKPOINTS,
  DIALOGUES,
  ENEMIES,
  OBJECTIVES,
  PLAYER_COMBAT
} from '../src/data/content';

describe('Holy Shift world bible v0.3 content', () => {
  it('defines one objective and checkpoint for every ordered chapter state', () => {
    expect(new Set(CHAPTER_ORDER).size).toBe(CHAPTER_ORDER.length);
    for (const progress of CHAPTER_ORDER) {
      expect(OBJECTIVES[progress].length).toBeGreaterThan(4);
      expect(Object.values(CHECKPOINTS[progress]).every(Number.isFinite)).toBe(true);
    }
  });

  it('keeps the first chapter focused on the approved world scope', () => {
    const text = JSON.stringify({ DIALOGUES, OBJECTIVES });
    for (const required of [
      '师老牧镇',
      '圣水',
      '生水',
      'Pingu',
      '林镇阴',
      '牧司学姐',
      '191F / SHIFT',
      'Holy Shift'
    ]) {
      expect(text).toContain(required);
    }
    expect(text).not.toContain('暮光圣岛');
    expect(text).not.toContain('失冠圣裁者');
  });

  it('defines only scene-based first-chapter anomaly enemies', () => {
    expect(Object.keys(ENEMIES)).toEqual([
      'wisp-a',
      'wisp-b',
      'wisp-c',
      'approved-water-ghost'
    ]);
    for (const enemy of Object.values(ENEMIES)) {
      expect(enemy.maxHp).toBeGreaterThan(0);
      expect(enemy.speed).toBeGreaterThan(0);
      expect(enemy.telegraphSeconds).toBeGreaterThanOrEqual(0.7);
      expect(enemy.attackRange).toBeGreaterThan(enemy.radius);
    }
  });

  it('keeps action resources finite and dodgeable', () => {
    expect(PLAYER_COMBAT.lightDamage).toHaveLength(3);
    expect(PLAYER_COMBAT.shiftCost).toBeLessThan(PLAYER_COMBAT.maxShift);
    expect(PLAYER_COMBAT.dodgeStaminaCost).toBeLessThan(
      PLAYER_COMBAT.maxStamina
    );
    expect(PLAYER_COMBAT.lightRange).toBeGreaterThan(2);
    expect(PLAYER_COMBAT.flightStaminaPerSecond).toBeGreaterThan(0);
    expect(PLAYER_COMBAT.fountainHealPerSecond).toBeGreaterThan(0);
  });

  it('uses the revised old pastor catchphrase without retaining the retired ones', () => {
    const text = JSON.stringify(DIALOGUES);
    expect(text).toContain('我丢雷楼木！');
    expect(text).not.toContain('阿门，不是 Amen');
    expect(text).not.toContain('神圣不可怕，神剩才可怕');
    expect(text).not.toContain('不要慌，牧已成舟');
  });
});
