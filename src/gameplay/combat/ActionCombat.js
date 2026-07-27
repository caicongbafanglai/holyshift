import { PLAYER_COMBAT } from '../../data/content.ts';
import {
  isTargetInsideAttackArc,
  recoverResource
} from '../../domain/combat.ts';
import { canRestoreAtFountain } from '../quests/ChapterOne.js';
import { CombatEffects } from './CombatEffects.js';

export class ActionCombat {
  constructor(world, callbacks = {}) {
    this.world = world;
    this.callbacks = callbacks;
    this.effects = new CombatEffects(world.scene);
    this.playerState = null;
    this.defeated = null;
    this.progress = 'intro';
    this.elapsed = 0;
    this.attackCooldown = 0;
    this.shiftCooldown = 0;
    this.combo = 0;
    this.comboWindow = 0;
    this.hitStop = 0;
  }

  bindState(playerState, defeated) {
    this.playerState = playerState;
    this.defeated = defeated;
  }

  syncProgress(progress, defeated = this.defeated) {
    this.progress = progress;
    this.defeated = defeated;
    this.world.syncEnemyWave(progress, defeated);
  }

  update(delta, input, cameraYaw, enabled = true) {
    this.elapsed += delta;
    this.effects.update(delta);
    if (!this.playerState) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.shiftCooldown = Math.max(0, this.shiftCooldown - delta);
    this.comboWindow = Math.max(0, this.comboWindow - delta);
    this.playerState.stamina = recoverResource(
      this.playerState.stamina,
      PLAYER_COMBAT.maxStamina,
      PLAYER_COMBAT.staminaRecoveryPerSecond,
      delta
    );

    if (enabled) {
      if (
        (input.consumePressed('attack') || input.consumePressed('j')) &&
        this.attackCooldown <= 0
      ) {
        this.lightAttack(cameraYaw);
      }
      if (
        (input.consumePressed('skill') || input.consumePressed('q')) &&
        this.shiftCooldown <= 0
      ) {
        this.holyShift();
      }
      if (input.consumePressed('ctrl')) this.dodge(input, cameraYaw);
    }

    for (const enemy of this.world.enemies.values()) {
      enemy.updateAgent(
        delta,
        this.elapsed,
        this.world.player,
        this.world.scene.userData,
        (damage, attacker) => this.damagePlayer(damage, attacker)
      );
    }
    this.world.refreshEnemyColliders();
  }

  lightAttack(cameraYaw) {
    const player = this.world.player;
    this.combo = this.comboWindow > 0 ? (this.combo + 1) % 3 : 0;
    const damage = PLAYER_COMBAT.lightDamage[this.combo];
    const cooldown = PLAYER_COMBAT.lightCooldown[this.combo];
    this.attackCooldown = cooldown;
    this.comboWindow = 0.72;
    player.faceYaw(cameraYaw);
    player.triggerAttackAnimation(cooldown + 0.12);
    this.effects.spawnStaffArc(player.position, cameraYaw, this.combo);

    const targets = [...this.world.enemies.values()]
      .filter(
        (enemy) =>
          enemy.isAlive &&
          isTargetInsideAttackArc({
            origin: player.position,
            target: enemy.position,
            facingYaw: cameraYaw,
            range: PLAYER_COMBAT.lightRange,
            arcDegrees: PLAYER_COMBAT.lightArcDegrees
          })
      )
      .sort(
        (left, right) =>
          player.position.distanceToSquared(left.position) -
          player.position.distanceToSquared(right.position)
      )
      .slice(0, this.combo === 2 ? 3 : 2);

    for (const enemy of targets) {
      const applied = enemy.takeDamage(damage);
      if (applied <= 0) continue;
      this.playerState.shift = Math.min(
        PLAYER_COMBAT.maxShift,
        this.playerState.shift + 9 + this.combo * 2
      );
      this.effects.spawnHit(enemy.position, this.combo === 2);
      this.callbacks.onHit?.({
        amount: applied,
        enemy,
        kind: this.combo === 2 ? 'combo' : 'light'
      });
    }
    this.callbacks.onAction?.('attack');
  }

  holyShift() {
    if (this.playerState.shift < PLAYER_COMBAT.shiftCost) {
      this.callbacks.onUnavailable?.(
        `Holy Shift 能量不足：需要 ${PLAYER_COMBAT.shiftCost}，当前 ${Math.floor(this.playerState.shift)}。`
      );
      return;
    }
    const player = this.world.player;
    this.playerState.shift -= PLAYER_COMBAT.shiftCost;
    this.shiftCooldown = PLAYER_COMBAT.shiftCooldown;
    this.attackCooldown = Math.max(this.attackCooldown, 0.58);
    player.triggerCastAnimation(0.72);
    this.effects.spawnShift(player.position, PLAYER_COMBAT.shiftRange);
    this.callbacks.onAction?.('holy');

    if (
      canRestoreAtFountain(
        this.progress,
        player.position,
        this.world.fountain.position
      )
    ) {
      this.callbacks.onFountainShift?.();
      return;
    }

    let hitCount = 0;
    for (const enemy of this.world.enemies.values()) {
      if (
        !enemy.isAlive ||
        player.position.distanceTo(enemy.position) > PLAYER_COMBAT.shiftRange
      ) {
        continue;
      }
      const bonus = enemy.definition.boss ? 1.2 : 1;
      const applied = enemy.takeDamage(PLAYER_COMBAT.shiftDamage * bonus);
      if (applied <= 0) continue;
      hitCount += 1;
      this.effects.spawnHit(enemy.position, true);
      this.callbacks.onHit?.({ amount: applied, enemy, kind: 'shift' });
    }
    if (hitCount === 0) {
      this.callbacks.onUnavailable?.('Holy Shift 已释放，但范围内没有可移位的异常。');
    }
  }

  dodge(input, cameraYaw) {
    if (this.playerState.stamina < PLAYER_COMBAT.dodgeStaminaCost) {
      this.callbacks.onUnavailable?.('耐力不足，无法闪避。');
      return;
    }
    if (!this.world.player.startDodge(input, cameraYaw)) return;
    this.playerState.stamina -= PLAYER_COMBAT.dodgeStaminaCost;
    this.callbacks.onAction?.('dodge');
  }

  damagePlayer(damage, attacker) {
    if (!this.playerState || this.world.player.invulnerable) {
      this.callbacks.onDodge?.(attacker);
      return;
    }
    const applied = Math.min(this.playerState.hp, Math.max(0, Math.round(damage)));
    this.playerState.hp -= applied;
    this.world.player.triggerHurtAnimation();
    this.callbacks.onPlayerDamage?.({ amount: applied, attacker });
    if (this.playerState.hp <= 0) this.callbacks.onPlayerDefeat?.();
  }

  restorePlayer() {
    if (!this.playerState) return;
    this.playerState.hp = PLAYER_COMBAT.maxHp;
    this.playerState.stamina = PLAYER_COMBAT.maxStamina;
    this.playerState.shift = Math.max(0, this.playerState.shift * 0.5);
    this.world.resetActiveEnemies();
  }

  get activeBoss() {
    return [...this.world.enemies.values()].find(
      (enemy) => enemy.definition.boss && enemy.isAlive
    ) ?? null;
  }
}
