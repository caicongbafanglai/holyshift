import { describe, expect, it } from 'vitest';
import {
  calculateDamage,
  createBattle,
  derivePlayerStats,
  enumerateLoadouts,
  findWinningPlan,
  getIntent,
  performAction
} from '../src/domain/combat';

describe('deterministic combat rules', () => {
  it('applies armor before the 50% defend reduction', () => {
    expect(calculateDamage(7, 2, 1.6, false)).toBe(9);
    expect(calculateDamage(7, 2, 1.6, true)).toBe(5);
    expect(calculateDamage(1, 99, 1, true)).toBe(1);
  });

  it('rejects holy magic without spending a turn when faith is insufficient', () => {
    const battle = createBattle('sentry', { maxHp: 12, pow: 4, arm: 1 });
    const result = performAction(battle, 'holy');

    expect(result.accepted).toBe(false);
    expect(result.state).toEqual(battle);
    expect(getIntent(result.state)).toBe('attack');
  });

  it('ends immediately when the player defeats an enemy', () => {
    const battle = createBattle('sentry', { maxHp: 12, pow: 40, arm: 1 });
    const result = performAction(battle, 'attack');

    expect(result.state.status).toBe('victory');
    expect(result.state.player.hp).toBe(12);
  });
});

describe('boss acceptance across all eight Must loadouts', () => {
  const loadouts = enumerateLoadouts();

  it('enumerates exactly eight legal combinations', () => {
    expect(loadouts).toHaveLength(8);
  });

  it.each(loadouts)('pure attacks fail for $weaponId / $relicId / $growthId', (loadout) => {
    let battle = createBattle('boss', derivePlayerStats(loadout));

    for (let turn = 0; turn < 20 && battle.status === 'active'; turn += 1) {
      battle = performAction(battle, 'attack').state;
    }

    expect(battle.status).toBe('defeat');
  });

  it.each(loadouts)(
    'has a deterministic plan using both defend and holy for $weaponId / $relicId / $growthId',
    (loadout) => {
      const plan = findWinningPlan('boss', derivePlayerStats(loadout));

      expect(plan).not.toBeNull();
      expect(plan).toContain('defend');
      expect(plan).toContain('holy');
    }
  );
});
