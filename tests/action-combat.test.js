import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PLAYER_COMBAT } from '../src/data/content.ts';
import { ActionCombat } from '../src/gameplay/combat/ActionCombat.js';

function createEnemy({ name, x, hp, boss = false }) {
  return {
    name,
    hp,
    isAlive: true,
    position: new THREE.Vector3(x, 0, 0),
    definition: { boss },
    takeDamage(amount) {
      const applied = Math.min(this.hp, Math.max(0, Math.round(amount)));
      this.hp -= applied;
      this.isAlive = this.hp > 0;
      return applied;
    },
    updateAgent() {}
  };
}

function createCombatWorld(enemies = []) {
  return {
    scene: new THREE.Scene(),
    fountain: { position: new THREE.Vector3(0, 0, -100) },
    player: {
      position: new THREE.Vector3(),
      isFlying: false,
      isGliding: false,
      flightRequestedThisFrame: false,
      triggerCastAnimation() {}
    },
    enemies: new Map(
      enemies.map((enemy, index) => [`enemy-${index}`, enemy])
    ),
    syncEnemyWave() {},
    refreshEnemyColliders() {}
  };
}

function pressedInput(...keys) {
  const pressed = new Set(keys);
  return {
    isDown: () => false,
    consumePressed(key) {
      if (!pressed.has(key)) return false;
      pressed.delete(key);
      return true;
    }
  };
}

describe('Holy Shift combat and recovery loop', () => {
  it('spends SHIFT to deal heavy damage throughout the enlarged world radius', () => {
    const nearWisp = createEnemy({ name: 'near-wisp', x: 15.8, hp: 56 });
    const nearBoss = createEnemy({
      name: 'near-boss',
      x: -16.2,
      hp: 260,
      boss: true
    });
    const farWisp = createEnemy({ name: 'far-wisp', x: 17.2, hp: 56 });
    const world = createCombatWorld([nearWisp, nearBoss, farWisp]);
    const hits = [];
    const combat = new ActionCombat(world, {
      onHit: (hit) => hits.push(hit)
    });
    const playerState = {
      hp: PLAYER_COMBAT.maxHp,
      stamina: PLAYER_COMBAT.maxStamina,
      shift: PLAYER_COMBAT.maxShift
    };
    combat.bindState(playerState, {});
    combat.syncProgress('clearWisps', {});

    combat.holyShift();

    expect(PLAYER_COMBAT.shiftRange).toBeGreaterThanOrEqual(16);
    expect(PLAYER_COMBAT.shiftDamage).toBeGreaterThanOrEqual(100);
    expect(playerState.shift).toBe(
      PLAYER_COMBAT.maxShift - PLAYER_COMBAT.shiftCost
    );
    expect(nearWisp.isAlive).toBe(false);
    expect(nearBoss.hp).toBeLessThan(150);
    expect(farWisp.hp).toBe(56);
    expect(hits).toHaveLength(2);
  });

  it('restores SHIFT on each Shift key press and stamina while gliding', () => {
    const world = createCombatWorld();
    world.player.isGliding = true;
    world.player.flightRequestedThisFrame = true;
    const combat = new ActionCombat(world);
    const playerState = {
      hp: PLAYER_COMBAT.maxHp,
      stamina: 40,
      shift: 0
    };
    combat.bindState(playerState, {});

    combat.update(0.5, pressedInput('shift'), 0, true);

    expect(playerState.shift).toBe(PLAYER_COMBAT.shiftKeyRecovery);
    expect(playerState.stamina).toBe(
      40 + PLAYER_COMBAT.glideStaminaRecoveryPerSecond * 0.5
    );
  });
});
