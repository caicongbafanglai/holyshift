import * as THREE from 'three';
import { collidesAt } from '../../entities/Player.js';
import { createApprovedWaterGhost } from '../../art/enemies/createApprovedWaterGhost.js';
import { createRawWaterWisp } from '../../art/enemies/createRawWaterWisp.js';
import { batchRigidCharacter } from '../../art/modeling/batchMeshes.js';

const MOVE_STEP = 0.14;
const NEXT = new THREE.Vector3();
const DIRECTION = new THREE.Vector3();

function createEnemyModel(definition) {
  return definition.boss
    ? createApprovedWaterGhost()
    : createRawWaterWisp({
        name: definition.name,
        variant: definition.variant
      });
}

export class CombatEnemyAgent extends THREE.Group {
  constructor(definition, spawn) {
    super();
    this.definition = definition;
    this.name = `${definition.name}-实时战斗实体`;
    this.spawn = new THREE.Vector3(spawn.x, spawn.y ?? 0, spawn.z);
    this.model = createEnemyModel(definition);
    const batchedVisual = batchRigidCharacter(
      this.model,
      `${definition.name}-战斗优化`
    );
    this.model.userData.animate = ({
      time = 0,
      delta = 0,
      hit = false,
      dying = false,
      attackPhase = 0,
      enraged = false
    } = {}) => {
      if (dying) this.deathElapsed += 0;
      batchedVisual.position.y =
        Math.sin(time * (definition.boss ? 1.9 : 2.8) + definition.variant) *
        (definition.boss ? 0.08 : 0.14);
      batchedVisual.rotation.y =
        Math.sin(time * 0.7) * 0.04 +
        Math.sin(attackPhase * Math.PI) * (definition.boss ? 0.18 : 0.28);
      const deathScale = dying
        ? Math.max(0.01, 1 - this.deathElapsed * (definition.boss ? 1.2 : 2.2))
        : 1;
      const pulse =
        1 +
        Math.sin(time * (enraged ? 4.2 : 2.4)) *
          (enraged ? 0.045 : 0.018);
      batchedVisual.scale.setScalar(deathScale * pulse);
      if (hit) {
        batchedVisual.rotation.z =
          Math.sin(time * 28) * (definition.boss ? 0.055 : 0.09);
      } else {
        batchedVisual.rotation.z *= Math.max(0, 1 - delta * 18);
      }
    };
    this.add(this.model);
    this.hp = definition.maxHp;
    this.state = 'inactive';
    this.timer = 0;
    this.attackPhase = 0;
    this.hitVisualPending = false;
    this.deathElapsed = 0;
    this.onDefeated = null;
    this.position.copy(this.spawn);
    this.visible = false;
  }

  activate(defeated = false) {
    this.position.copy(this.spawn);
    this.hp = this.definition.maxHp;
    this.timer = 0;
    this.attackPhase = 0;
    this.deathElapsed = 0;
    this.hitVisualPending = false;
    this.state = defeated ? 'dead' : 'idle';
    this.visible = !defeated;
    this.scale.setScalar(1);
  }

  deactivate() {
    this.state = 'inactive';
    this.visible = false;
  }

  reset() {
    this.activate(false);
  }

  takeDamage(amount) {
    if (!this.isAlive || !Number.isFinite(amount) || amount <= 0) return 0;
    const applied = Math.min(this.hp, Math.max(0, Math.round(amount)));
    this.hp -= applied;
    this.hitVisualPending = true;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dying';
      this.timer = this.definition.boss ? 0.9 : 0.48;
      this.deathElapsed = 0;
      this.onDefeated?.(this);
    } else if (this.state === 'telegraph') {
      this.timer += this.definition.boss ? 0.04 : 0.11;
    }
    return applied;
  }

  updateAgent(delta, time, player, navigation, onPlayerHit) {
    if (!this.visible || this.state === 'inactive' || this.state === 'dead') return;
    if (this.state === 'dying') {
      this.timer -= delta;
      this.deathElapsed += delta;
      this.model.userData.animate?.({
        time,
        delta,
        hit: this.hitVisualPending,
        dying: true,
        attackPhase: 0
      });
      this.hitVisualPending = false;
      if (this.timer <= 0) {
        this.visible = false;
        this.state = 'dead';
      }
      return;
    }

    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const distance = Math.hypot(dx, dz);
    const targetYaw = Math.atan2(dx, dz);
    const turnDelta = Math.atan2(
      Math.sin(targetYaw - this.rotation.y),
      Math.cos(targetYaw - this.rotation.y)
    );
    this.rotation.y += turnDelta * Math.min(1, delta * 7);
    this.attackPhase = 0;

    if (this.state === 'idle' && distance <= this.definition.detectionRange) {
      this.state = 'chase';
    }

    if (this.state === 'chase') {
      if (distance <= this.definition.attackRange) {
        this.state = 'telegraph';
        this.timer = this.definition.telegraphSeconds;
      } else if (distance <= this.definition.detectionRange * 1.25) {
        DIRECTION.set(dx, 0, dz).normalize();
        this.moveWithCollision(
          DIRECTION.x * this.definition.speed * delta,
          DIRECTION.z * this.definition.speed * delta,
          navigation.staticColliders ?? navigation.solidColliders ?? []
        );
      } else {
        this.state = 'idle';
      }
    } else if (this.state === 'telegraph') {
      this.timer -= delta;
      this.attackPhase = Math.min(
        1,
        Math.max(0, 1 - this.timer / this.definition.telegraphSeconds)
      );
      if (this.timer <= 0) {
        if (distance <= this.definition.attackRange + 0.75) {
          onPlayerHit?.(this.definition.attackDamage, this);
        }
        this.state = 'recovery';
        this.timer = this.definition.recoverySeconds;
      }
    } else if (this.state === 'recovery') {
      this.timer -= delta;
      if (this.timer <= 0) this.state = 'chase';
    }

    this.model.userData.animate?.({
      time,
      delta,
      hit: this.hitVisualPending,
      dying: false,
      attackPhase: this.attackPhase,
      enraged:
        this.definition.boss &&
        this.hp / this.definition.maxHp <= 0.45
    });
    this.hitVisualPending = false;
  }

  moveWithCollision(dx, dz, colliders) {
    const distance = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(distance / MOVE_STEP));
    const stepX = dx / steps;
    const stepZ = dz / steps;
    for (let index = 0; index < steps; index += 1) {
      NEXT.set(this.position.x + stepX, 0, this.position.z + stepZ);
      if (!collidesAt(NEXT, colliders, this.definition.radius, this.height)) {
        this.position.copy(NEXT);
        continue;
      }
      NEXT.set(this.position.x + stepX, 0, this.position.z);
      if (!collidesAt(NEXT, colliders, this.definition.radius, this.height)) {
        this.position.copy(NEXT);
        continue;
      }
      NEXT.set(this.position.x, 0, this.position.z + stepZ);
      if (!collidesAt(NEXT, colliders, this.definition.radius, this.height)) {
        this.position.copy(NEXT);
      }
    }
  }

  get collider() {
    return {
      name: `${this.definition.id}-敌人动态碰撞`,
      shape: 'cylinder',
      center: { x: this.position.x, z: this.position.z },
      radius: this.definition.radius,
      minY: 0,
      maxY: this.height
    };
  }

  get height() {
    return this.definition.boss ? 3.4 : 2;
  }

  get isAlive() {
    return this.visible && !['inactive', 'dying', 'dead'].includes(this.state);
  }

  get healthRatio() {
    return this.definition.maxHp > 0 ? this.hp / this.definition.maxHp : 0;
  }
}
