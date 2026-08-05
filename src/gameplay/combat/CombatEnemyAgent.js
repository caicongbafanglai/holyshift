import * as THREE from 'three';
import { PLAYER_COMBAT } from '../../data/content.ts';
import { collidesAt } from '../../entities/Player.js';
import { createApprovedWaterGhost } from '../../art/enemies/createApprovedWaterGhost.js';
import { createRawWaterWisp } from '../../art/enemies/createRawWaterWisp.js';
import { batchRigidCharacter } from '../../art/modeling/batchMeshes.js';

const MOVE_STEP = 0.14;
const DIRECT_STEERING_ANGLES = [
  0,
  Math.PI / 4,
  -Math.PI / 4,
  Math.PI / 2,
  -Math.PI / 2,
  (Math.PI * 3) / 4,
  (-Math.PI * 3) / 4,
  Math.PI
];
const NEXT = new THREE.Vector3();
const DIRECTION = new THREE.Vector3();

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.z - start.z);
  const t = Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared
  ));
  return Math.hypot(
    point.x - (start.x + dx * t),
    point.z - (start.z + dz * t)
  );
}

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
    this.avoidanceFrames = 0;
    this.initialAvoidanceSign = definition.variant % 2 === 0 ? 1 : -1;
    this.avoidanceSign = this.initialAvoidanceSign;
    this.navigationWaypoints = [];
    this.navigationProgressKey = '';
    this.navigationBestDistance = Infinity;
    this.navigationStallSeconds = 0;
    this.fountainDetourComplete = false;
    this.fountainDetourSide = 0;
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
    this.avoidanceFrames = 0;
    this.avoidanceSign = this.initialAvoidanceSign;
    this.navigationWaypoints = [];
    this.navigationProgressKey = '';
    this.navigationBestDistance = Infinity;
    this.navigationStallSeconds = 0;
    this.fountainDetourComplete = false;
    this.fountainDetourSide = 0;
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

    const colliders = navigation.staticColliders ?? navigation.solidColliders ?? [];
    const playerDx = player.position.x - this.position.x;
    const playerDy = player.position.y - this.position.y;
    const playerDz = player.position.z - this.position.z;
    const distance = Math.hypot(playerDx, playerDy, playerDz);
    const verticalDistance = Math.abs(playerDy);
    if (
      this.state === 'idle' &&
      verticalDistance <= PLAYER_COMBAT.enemyDetectionVerticalRange &&
      distance <= this.definition.detectionRange
    ) {
      this.state = 'chase';
    }
    if (this.state === 'chase') {
      this.planFountainDetour(player.position, colliders);
    }
    const hadNavigationWaypoints = this.navigationWaypoints.length > 0;
    while (
      this.navigationWaypoints.length > 0 &&
      Math.hypot(
        this.navigationWaypoints[0].x - this.position.x,
        this.navigationWaypoints[0].z - this.position.z
      ) <= 1.35
    ) {
      this.navigationWaypoints.shift();
    }
    if (hadNavigationWaypoints && this.navigationWaypoints.length === 0) {
      this.fountainDetourComplete = true;
    }
    const navigationTarget = this.navigationWaypoints[0] ?? player.position;
    const dx = navigationTarget.x - this.position.x;
    const dz = navigationTarget.z - this.position.z;
    const targetYaw = Math.atan2(dx, dz);
    const turnDelta = Math.atan2(
      Math.sin(targetYaw - this.rotation.y),
      Math.cos(targetYaw - this.rotation.y)
    );
    this.rotation.y += turnDelta * Math.min(1, delta * 7);
    this.attackPhase = 0;

    if (this.state === 'chase') {
      if (
        verticalDistance <= PLAYER_COMBAT.enemyAttackVerticalRange &&
        distance <= this.definition.attackRange
      ) {
        this.state = 'telegraph';
        this.timer = this.definition.telegraphSeconds;
      } else if (
        this.navigationWaypoints.length > 0 ||
        distance <= this.definition.detectionRange * 1.25
      ) {
        this.trackNavigationProgress(navigationTarget, delta);
        DIRECTION.set(dx, 0, dz).normalize();
        this.moveWithCollision(
          DIRECTION.x * this.definition.speed * delta,
          DIRECTION.z * this.definition.speed * delta,
          colliders
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
        if (
          verticalDistance <= PLAYER_COMBAT.enemyAttackVerticalRange &&
          distance <= this.definition.attackRange + 0.75
        ) {
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
    NEXT.set(this.position.x + stepX, 0, this.position.z + stepZ);
    if (collidesAt(NEXT, colliders, this.definition.radius, this.height)) {
      this.avoidanceFrames = Math.max(this.avoidanceFrames, 36);
    }
    const steeringAngles = this.avoidanceFrames > 0
      ? [
          this.avoidanceSign * Math.PI / 2,
          this.avoidanceSign * Math.PI / 4,
          0,
          this.avoidanceSign * Math.PI * 3 / 4,
          -this.avoidanceSign * Math.PI / 4,
          -this.avoidanceSign * Math.PI / 2,
          Math.PI
        ]
      : DIRECT_STEERING_ANGLES;
    for (let index = 0; index < steps; index += 1) {
      for (const angle of steeringAngles) {
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const candidateX = stepX * cosine - stepZ * sine;
        const candidateZ = stepX * sine + stepZ * cosine;
        NEXT.set(
          this.position.x + candidateX,
          0,
          this.position.z + candidateZ
        );
        if (!collidesAt(NEXT, colliders, this.definition.radius, this.height)) {
          this.position.copy(NEXT);
          break;
        }
      }
    }
    this.avoidanceFrames = Math.max(0, this.avoidanceFrames - 1);
  }

  trackNavigationProgress(target, delta) {
    const waypoint = this.navigationWaypoints[0];
    const key = waypoint
      ? `${this.navigationWaypoints.length}:${waypoint.x.toFixed(2)}:${waypoint.z.toFixed(2)}`
      : 'live-player';
    const distance = Math.hypot(
      target.x - this.position.x,
      target.z - this.position.z
    );
    if (key !== this.navigationProgressKey) {
      this.navigationProgressKey = key;
      this.navigationBestDistance = distance;
      this.navigationStallSeconds = 0;
      return;
    }
    if (distance <= this.navigationBestDistance - 0.08) {
      this.navigationBestDistance = distance;
      this.navigationStallSeconds = 0;
      return;
    }
    this.navigationStallSeconds += delta;
    if (this.navigationStallSeconds < 4.5) return;
    this.avoidanceSign *= -1;
    this.avoidanceFrames = 0;
    this.navigationBestDistance = distance;
    this.navigationStallSeconds = 0;
  }

  planFountainDetour(target, colliders) {
    if (this.navigationWaypoints.length > 0) return;
    const ring = colliders.filter((collider) =>
      collider.name?.startsWith('圣水池环形盆壁碰撞-') &&
      collider.shape === 'segment'
    );
    if (ring.length === 0) return;

    const points = ring.flatMap((collider) => [collider.start, collider.end]);
    const center = points.reduce(
      (sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }),
      { x: 0, z: 0 }
    );
    center.x /= points.length;
    center.z /= points.length;
    const ringRadius = Math.max(
      ...points.map((point) => Math.hypot(point.x - center.x, point.z - center.z))
    );
    const start = { x: this.position.x, z: this.position.z };
    const startRadius = Math.hypot(start.x - center.x, start.z - center.z);
    const targetRadius = Math.hypot(target.x - center.x, target.z - center.z);
    const interiorThreshold = ringRadius - this.definition.radius * 0.5;
    const startInside = startRadius < interiorThreshold;
    const targetInside = targetRadius < interiorThreshold;
    const outerGate = {
      x: center.x,
      z: center.z + ringRadius + this.definition.radius + 0.7
    };
    const innerGate = {
      x: center.x,
      z: center.z + ringRadius - this.definition.radius - 2.15
    };
    const core = colliders.find(
      (collider) => collider.name === '圣水池中心流程基座碰撞'
    );

    if (startInside && targetInside) {
      this.navigationWaypoints = this.buildCoreDetour(
        start,
        target,
        center,
        core
      );
      return;
    }

    if (!startInside && targetInside) {
      this.fountainDetourComplete = false;
      this.navigationWaypoints = [
        ...this.buildOutsideDetour(start, outerGate, center, ringRadius),
        outerGate,
        innerGate,
        ...this.buildCoreDetour(innerGate, target, center, core)
      ];
      return;
    }

    if (startInside && !targetInside) {
      this.fountainDetourComplete = false;
      this.navigationWaypoints = [
        ...this.buildCoreDetour(start, innerGate, center, core),
        outerGate,
        ...this.buildOutsideDetour(outerGate, target, center, ringRadius)
      ];
      return;
    }

    const targetSide = Math.sign(target.z - center.z) || 1;
    if (
      this.fountainDetourComplete &&
      targetSide === this.fountainDetourSide
    ) {
      return;
    }
    this.fountainDetourComplete = false;
    this.fountainDetourSide = targetSide;
    this.navigationWaypoints = this.buildOutsideDetour(
      start,
      target,
      center,
      ringRadius
    );
  }

  buildOutsideDetour(start, target, center, ringRadius) {
    const safeRadius = ringRadius + this.definition.radius + 0.8;
    if (distanceToSegment(center, start, target) >= safeRadius) return [];
    const sideX = center.x +
      this.avoidanceSign * (ringRadius + this.definition.radius + 3);
    const targetSide = Math.sign(target.z - center.z) || 1;
    const outsideTargetZ = center.z +
      targetSide * (ringRadius + this.definition.radius + 3);
    return [
      { x: sideX, z: center.z },
      { x: sideX, z: outsideTargetZ },
      { x: target.x, z: outsideTargetZ }
    ];
  }

  buildCoreDetour(start, target, center, core) {
    if (!core) return [{ x: target.x, z: target.z }];
    const clearance = core.radius + this.definition.radius + 0.65;
    if (distanceToSegment(center, start, target) >= clearance) {
      return [{ x: target.x, z: target.z }];
    }

    const startAngle = Math.atan2(start.z - center.z, start.x - center.x);
    let endAngle = Math.atan2(target.z - center.z, target.x - center.x);
    const direction = target.x > center.x + 0.35
      ? -1
      : target.x < center.x - 0.35
        ? 1
        : this.avoidanceSign;
    if (direction > 0) {
      while (endAngle <= startAngle) endAngle += Math.PI * 2;
    } else {
      while (endAngle >= startAngle) endAngle -= Math.PI * 2;
    }
    const delta = endAngle - startAngle;
    const steps = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 5)));
    const waypoints = [];
    for (let index = 0; index <= steps; index += 1) {
      const angle = startAngle + (delta * index) / steps;
      waypoints.push({
        x: center.x + Math.cos(angle) * clearance,
        z: center.z + Math.sin(angle) * clearance
      });
    }
    waypoints.push({ x: target.x, z: target.z });
    return waypoints;
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
