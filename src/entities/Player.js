import * as THREE from 'three';
import { MAP } from '../data/mapConfig.js';
import { createOldPastor } from '../art/characters/oldPastor/createOldPastor.js';

const MOVE_VECTOR = new THREE.Vector3();
const STEP_VECTOR = new THREE.Vector3();
const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const MAX_STEP_HEIGHT = 0.35;
const MAX_WALKABLE_SLOPE_DEGREES = 30;
const JUMP_VELOCITY = 6.5;
const GRAVITY = -18;
const GROUND_CHECK_DISTANCE = 0.22;
const COYOTE_TIME = 0.15;
const JUMP_BUFFER_TIME = 0.12;
const MAX_HORIZONTAL_MOVE_STEP = 0.15;
const MAX_VERTICAL_MOVE_STEP = 0.08;
const LOWEST_SAFE_Y = MAP.plazaY - 20;
const EPSILON = 0.0001;
const VERTICAL_STATES = {
  GROUNDED: 'grounded',
  JUMPING: 'jumping',
  FALLING: 'falling'
};

function pointInPolygon(x, z, points) {
  let inside = false;
  for (let index = 0, last = points.length - 1; index < points.length; last = index, index += 1) {
    const xi = points[index][0];
    const zi = points[index][1];
    const xj = points[last][0];
    const zj = points[last][1];
    const intersects = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function toLocal2D(x, z, center, rotation = 0) {
  const dx = x - center.x;
  const dz = z - center.z;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: dx * cos - dz * sin,
    z: dx * sin + dz * cos
  };
}

function pointInBoxSurface(x, z, surface) {
  const local = toLocal2D(x, z, surface.center, surface.rotation || 0);
  return Math.abs(local.x) <= surface.width / 2 + EPSILON && Math.abs(local.z) <= surface.depth / 2 + EPSILON;
}

function normalizeAngle(angle) {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function pointInAngleRange(angle, startAngle, endAngle) {
  const normalizedAngle = normalizeAngle(angle);
  const start = normalizeAngle(startAngle);
  const end = normalizeAngle(endAngle);
  if (start <= end) {
    return normalizedAngle >= start - EPSILON && normalizedAngle <= end + EPSILON;
  }
  return normalizedAngle >= start - EPSILON || normalizedAngle <= end + EPSILON;
}

function getAngleProgressInRange(angle, startAngle, endAngle) {
  const direction = endAngle >= startAngle ? 1 : -1;
  const minAngle = Math.min(startAngle, endAngle);
  const maxAngle = Math.max(startAngle, endAngle);
  const twoPi = Math.PI * 2;
  const normalizedAngle = normalizeAngle(angle);
  const firstTurn = Math.floor((minAngle - normalizedAngle) / twoPi) - 1;
  const lastTurn = Math.ceil((maxAngle - normalizedAngle) / twoPi) + 1;

  for (let turn = firstTurn; turn <= lastTurn; turn += 1) {
    const candidate = normalizedAngle + turn * twoPi;
    if (candidate < minAngle - EPSILON || candidate > maxAngle + EPSILON) {
      continue;
    }
    const progress = direction > 0
      ? (candidate - startAngle) / (endAngle - startAngle)
      : (startAngle - candidate) / (startAngle - endAngle);
    return THREE.MathUtils.clamp(progress, 0, 1);
  }

  return null;
}

function surfaceHeightAt(surface, x, z) {
  if (surface.shape === 'polygon') {
    return pointInPolygon(x, z, surface.points) ? surface.y : null;
  }

  if (surface.shape === 'polygonRing') {
    const holes = surface.holes || [surface.innerPoints].filter(Boolean);
    return pointInPolygon(x, z, surface.outerPoints) && !holes.some((hole) => pointInPolygon(x, z, hole)) ? surface.y : null;
  }

  if (surface.shape === 'box') {
    return pointInBoxSurface(x, z, surface) ? surface.y : null;
  }

  if (surface.shape === 'rampBox') {
    if (!pointInBoxSurface(x, z, surface)) {
      return null;
    }
    const local = toLocal2D(x, z, surface.center, surface.rotation || 0);
    const t = THREE.MathUtils.clamp((local.z + surface.depth / 2) / surface.depth, 0, 1);
    return THREE.MathUtils.lerp(surface.yStart, surface.yEnd, t);
  }

  if (surface.shape === 'circleRing') {
    const distance = Math.hypot(x - surface.center.x, z - surface.center.z);
    if (distance >= surface.innerRadius - EPSILON && distance <= surface.outerRadius + EPSILON) {
      return surface.y;
    }
  }

  if (surface.shape === 'annularSector') {
    const dx = x - surface.center.x;
    const dz = z - surface.center.z;
    const distance = Math.hypot(dx, dz);
    if (distance < surface.innerRadius - EPSILON || distance > surface.outerRadius + EPSILON) {
      return null;
    }
    const angle = Math.atan2(dz, dx);
    return pointInAngleRange(angle, surface.startAngle, surface.endAngle) ? surface.y : null;
  }

  if (surface.shape === 'spiralRamp') {
    const dx = x - surface.center.x;
    const dz = z - surface.center.z;
    const distance = Math.hypot(dx, dz);
    if (distance < surface.innerRadius - EPSILON || distance > surface.outerRadius + EPSILON) {
      return null;
    }
    const progress = getAngleProgressInRange(Math.atan2(dz, dx), surface.startAngle, surface.endAngle);
    return progress === null ? null : THREE.MathUtils.lerp(surface.yStart, surface.yEnd, progress);
  }

  return null;
}

function getSurfaceSlopeDegrees(surface) {
  if (surface?.shape === 'rampBox') {
    return THREE.MathUtils.radToDeg(Math.atan2(Math.abs(surface.yEnd - surface.yStart), surface.depth));
  }

  if (surface?.shape === 'spiralRamp') {
    const midRadius = (surface.innerRadius + surface.outerRadius) / 2;
    const arcLength = midRadius * Math.abs(surface.endAngle - surface.startAngle);
    return THREE.MathUtils.radToDeg(Math.atan2(Math.abs(surface.yEnd - surface.yStart), Math.max(arcLength, EPSILON)));
  }

  return surface?.slopeDegrees ?? surface?.maxSlopeDegrees ?? 0;
}

function isWalkableSurface(surface) {
  if (!surface || surface.walkable === false || surface.userData?.walkable === false) {
    return false;
  }

  if (surface.userData?.type === 'decoration' || surface.userData?.type === 'decorations') {
    return false;
  }

  if (surface.name?.toLowerCase().includes('water')) {
    return false;
  }

  return getSurfaceSlopeDegrees(surface) <= MAX_WALKABLE_SLOPE_DEGREES + EPSILON;
}

function findWalkableGround(x, z, walkableSurfaces = [], maxY = Infinity) {
  let ground = null;

  walkableSurfaces.forEach((surface) => {
    if (!isWalkableSurface(surface)) {
      return;
    }

    const y = surfaceHeightAt(surface, x, z);
    if (y === null) {
      return;
    }
    if (y > maxY + EPSILON) {
      return;
    }
    if (!ground || y > ground.y) {
      ground = {
        y,
        surface
      };
    }
  });

  return ground;
}

function findWalkableGroundInRange(x, z, walkableSurfaces = [], minY = -Infinity, maxY = Infinity) {
  let ground = null;

  walkableSurfaces.forEach((surface) => {
    if (!isWalkableSurface(surface)) {
      return;
    }

    const y = surfaceHeightAt(surface, x, z);
    if (y === null || y < minY - EPSILON || y > maxY + EPSILON) {
      return;
    }

    if (!ground || y > ground.y) {
      ground = {
        y,
        surface
      };
    }
  });

  return ground;
}

function findGroundWithinCheckDistance(x, z, walkableSurfaces, footY) {
  return findWalkableGroundInRange(
    x,
    z,
    walkableSurfaces,
    footY - GROUND_CHECK_DISTANCE,
    footY + EPSILON
  );
}

function findCeilingWalkableSurface(x, z, walkableSurfaces = [], oldTopY, newTopY) {
  let ceiling = null;
  const minY = Math.min(oldTopY, newTopY);
  const maxY = Math.max(oldTopY, newTopY);

  walkableSurfaces.forEach((surface) => {
    if (!isWalkableSurface(surface)) {
      return;
    }

    const y = surfaceHeightAt(surface, x, z);
    if (y === null || y <= minY + EPSILON || y > maxY + EPSILON) {
      return;
    }

    if (!ceiling || y < ceiling.y) {
      ceiling = {
        y,
        surface
      };
    }
  });

  return ceiling;
}

function isChurchVerticalCoreSurface(surface) {
  return (
    surface?.name?.startsWith('church_spiral_') ||
    surface?.name?.startsWith('church_floor_ring_') ||
    surface?.name?.startsWith('church_floor_') ||
    surface?.name?.startsWith('church_floor_01_collision_fix') ||
    surface?.name?.startsWith('floor_walk_fix_') ||
    surface?.name?.startsWith('lift_platform_')
  );
}

function verticalRangesOverlap(playerY, playerHeight, collider) {
  const playerMinY = playerY;
  const playerMaxY = playerY + playerHeight;
  return playerMaxY > collider.minY + EPSILON && playerMinY < collider.maxY - EPSILON;
}

function pointSegmentDistance(x, z, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) {
    return Math.hypot(x - start.x, z - start.z);
  }
  const t = THREE.MathUtils.clamp(((x - start.x) * dx + (z - start.z) * dz) / lengthSquared, 0, 1);
  const closestX = start.x + dx * t;
  const closestZ = start.z + dz * t;
  return Math.hypot(x - closestX, z - closestZ);
}

function cylinderIntersectsSegment3D(position, radius, height, collider) {
  const sampleCount = 5;
  const dy = collider.end.y - collider.start.y;
  for (let index = 0; index < sampleCount; index += 1) {
    const sampleY = position.y + (height * index) / (sampleCount - 1);
    const t = Math.abs(dy) > EPSILON
      ? THREE.MathUtils.clamp((sampleY - collider.start.y) / dy, 0, 1)
      : 0;
    const closestX = THREE.MathUtils.lerp(collider.start.x, collider.end.x, t);
    const closestY = THREE.MathUtils.lerp(collider.start.y, collider.end.y, t);
    const closestZ = THREE.MathUtils.lerp(collider.start.z, collider.end.z, t);
    const colliderRadius = collider.radius ?? 0;
    if (Math.abs(closestY - sampleY) > radius + colliderRadius) {
      continue;
    }
    if (Math.hypot(position.x - closestX, position.z - closestZ) < radius + colliderRadius) {
      return true;
    }
  }
  return false;
}

function circleIntersectsBox(x, z, radius, collider) {
  const local = toLocal2D(x, z, collider.center, collider.rotation || 0);
  const halfWidth = collider.width / 2;
  const halfDepth = collider.depth / 2;
  const closestX = THREE.MathUtils.clamp(local.x, -halfWidth, halfWidth);
  const closestZ = THREE.MathUtils.clamp(local.z, -halfDepth, halfDepth);
  return Math.hypot(local.x - closestX, local.z - closestZ) < radius;
}

function playerIntersectsSurfaceSlab(position, collider, radius, height, options = {}) {
  const surface = collider.surface;
  if (!surface) {
    return false;
  }

  const sampleRadius = Math.max(radius - EPSILON, 0);
  const diagonalRadius = sampleRadius * Math.SQRT1_2;
  const samples = [
    [0, 0],
    [sampleRadius, 0],
    [-sampleRadius, 0],
    [0, sampleRadius],
    [0, -sampleRadius],
    [diagonalRadius, diagonalRadius],
    [-diagonalRadius, diagonalRadius],
    [diagonalRadius, -diagonalRadius],
    [-diagonalRadius, -diagonalRadius]
  ];
  const playerMinY = position.y;
  const playerMaxY = position.y + height;
  const thickness = collider.thickness ?? surface.thickness ?? 0.1;

  return samples.some(([offsetX, offsetZ]) => {
    const topY = surfaceHeightAt(surface, position.x + offsetX, position.z + offsetZ);
    if (topY === null) {
      return false;
    }
    if (
      options.ignoreWalkableStepUp &&
      topY >= playerMinY - EPSILON &&
      topY - playerMinY <= MAX_STEP_HEIGHT + EPSILON
    ) {
      return false;
    }
    const bottomY = topY - thickness;
    return playerMaxY > bottomY + EPSILON && playerMinY < topY - EPSILON;
  });
}

function collidesAt(position, colliders = [], radius, height, options = {}) {
  return colliders.some((collider) => {
    if (collider.shape === 'surfaceSlab') {
      return playerIntersectsSurfaceSlab(position, collider, radius, height, options);
    }

    if (!verticalRangesOverlap(position.y, height, collider)) {
      return false;
    }

    if (collider.shape === 'box') {
      return circleIntersectsBox(position.x, position.z, radius, collider);
    }

    if (collider.shape === 'segment') {
      return pointSegmentDistance(position.x, position.z, collider.start, collider.end) < radius + collider.thickness / 2;
    }

    if (collider.shape === 'cylinder') {
      return Math.hypot(position.x - collider.center.x, position.z - collider.center.z) < radius + collider.radius;
    }

    if (collider.shape === 'segment3D') {
      return cylinderIntersectsSegment3D(position, radius, height, collider);
    }

    return false;
  });
}

export class Player extends THREE.Group {
  constructor() {
    super();
    this.name = '老牧师 · 玩家';
    this.collisionHeight = 1.78;
    this.collisionRadius = 0.35;
    this.walkSpeed = 5.2;
    this.runSpeed = 9.2;
    this.didResetThisFrame = false;
    this.safetyResetCount = 0;
    this.lastSafetyMessage = '';
    this.elapsed = 0;
    this.movingThisFrame = false;
    this.sprintingThisFrame = false;
    this.attackAnimationTimer = 0;
    this.attackAnimationDuration = 0.42;
    this.castAnimationTimer = 0;
    this.castAnimationDuration = 0.72;
    this.hurtAnimationTimer = 0;
    this.hurtAnimationDuration = 0.28;
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.dodgeDirection = new THREE.Vector3();
    this.dodgeSpeed = 16.5;
    this.resetPoint = new THREE.Vector3(
      MAP.playerReset.x,
      MAP.playerReset.y,
      MAP.playerReset.z
    );
    this.reset();
    this.character = createOldPastor();
    this.add(this.character);
  }

  reset() {
    const resetPoint = this.resetPoint ?? MAP.playerReset;
    this.position.set(resetPoint.x, resetPoint.y, resetPoint.z);
    this.rotation.y = Math.PI;
    this.velocityY = 0;
    this.jumpBufferTimer = 0;
    this.coyoteTimer = COYOTE_TIME;
    this.setVerticalState(VERTICAL_STATES.GROUNDED);
  }

  setRespawn(point, teleport = false) {
    if (
      !point ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      !Number.isFinite(point.z)
    ) {
      return false;
    }
    this.resetPoint.set(point.x, point.y, point.z);
    if (teleport) {
      this.reset();
      this.didResetThisFrame = true;
    }
    return true;
  }

  update(delta, input, movementYaw = Math.PI, navigation = {}) {
    this.didResetThisFrame = false;
    this.elapsed += delta;
    this.attackAnimationTimer = Math.max(0, this.attackAnimationTimer - delta);
    this.castAnimationTimer = Math.max(0, this.castAnimationTimer - delta);
    this.hurtAnimationTimer = Math.max(0, this.hurtAnimationTimer - delta);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
    this.movingThisFrame = false;
    this.sprintingThisFrame = false;
    if (this.resetIfBelowSafeHeight()) {
      return;
    }

    this.updateMovement(delta, input, movementYaw, navigation);
    this.resetIfBelowSafeHeight();
    this.character.userData.animate?.({
      time: this.elapsed,
      moving: this.movingThisFrame,
      sprinting: this.sprintingThisFrame,
      attackPhase: this.attackAnimationTimer > 0
        ? 1 - this.attackAnimationTimer / this.attackAnimationDuration
        : 0,
      castPhase: this.castAnimationTimer > 0
        ? 1 - this.castAnimationTimer / this.castAnimationDuration
        : 0,
      hurtPhase: this.hurtAnimationTimer > 0
        ? 1 - this.hurtAnimationTimer / this.hurtAnimationDuration
        : 0
    });
  }

  updateMovement(delta, input, movementYaw = Math.PI, navigation = {}) {
    MOVE_VECTOR.set(0, 0, 0);
    const forwardAmount = (input.isDown('w') ? 1 : 0) - (input.isDown('s') ? 1 : 0);
    const rightAmount = (input.isDown('d') ? 1 : 0) - (input.isDown('a') ? 1 : 0);
    const walkableSurfaces = navigation.walkableSurfaces || [];
    const colliders = navigation.solidColliders || navigation.colliders || [];
    let currentGround = this.updateVerticalMovement(
      delta,
      input,
      walkableSurfaces,
      colliders
    );

    currentGround =
      currentGround ||
      findWalkableGround(this.position.x, this.position.z, walkableSurfaces, this.position.y + MAX_STEP_HEIGHT);

    const dodging = this.dodgeTimer > 0;
    if (dodging) {
      this.dodgeTimer = Math.max(0, this.dodgeTimer - delta);
      MOVE_VECTOR.copy(this.dodgeDirection).multiplyScalar(this.dodgeSpeed * delta);
    } else if (forwardAmount === 0 && rightAmount === 0) {
      return;
    } else {
      FORWARD.set(Math.sin(movementYaw), 0, Math.cos(movementYaw));
      RIGHT.set(-FORWARD.z, 0, FORWARD.x);
      MOVE_VECTOR.addScaledVector(FORWARD, forwardAmount);
      MOVE_VECTOR.addScaledVector(RIGHT, rightAmount);
      MOVE_VECTOR.normalize().multiplyScalar((input.isDown('shift') ? this.runSpeed : this.walkSpeed) * delta);
    }

    const movementLength = MOVE_VECTOR.length();
    const movementSteps = Math.max(1, Math.ceil(movementLength / MAX_HORIZONTAL_MOVE_STEP));
    STEP_VECTOR.copy(MOVE_VECTOR).multiplyScalar(1 / movementSteps);

    let moved = false;
    for (let step = 0; step < movementSteps; step += 1) {
      currentGround = findWalkableGround(
        this.position.x,
        this.position.z,
        walkableSurfaces,
        this.position.y + MAX_STEP_HEIGHT
      );
      const nextPosition = this.resolveMovementWithSlide(
        {
          x: this.position.x + STEP_VECTOR.x,
          y: this.position.y,
          z: this.position.z + STEP_VECTOR.z
        },
        currentGround,
        walkableSurfaces,
        colliders
      );

      if (!nextPosition) {
        break;
      }

      this.position.set(nextPosition.x, nextPosition.y, nextPosition.z);
      const resolvedGround = findWalkableGround(
        this.position.x,
        this.position.z,
        walkableSurfaces,
        this.position.y + MAX_STEP_HEIGHT
      );
      if (this.onGround && resolvedGround) {
        this.position.y = resolvedGround.y;
        this.velocityY = 0;
      }
      moved = true;
    }

    if (!moved) {
      return;
    }
    this.movingThisFrame = true;
    this.sprintingThisFrame = dodging || input.isDown('shift');
    this.rotation.y = Math.atan2(MOVE_VECTOR.x, MOVE_VECTOR.z);
  }

  startDodge(input, movementYaw = Math.PI) {
    if (this.dodgeCooldown > 0 || !this.grounded) return false;
    const forwardAmount = (input.isDown('w') ? 1 : 0) - (input.isDown('s') ? 1 : 0);
    const rightAmount = (input.isDown('d') ? 1 : 0) - (input.isDown('a') ? 1 : 0);
    FORWARD.set(Math.sin(movementYaw), 0, Math.cos(movementYaw));
    RIGHT.set(-FORWARD.z, 0, FORWARD.x);
    this.dodgeDirection
      .copy(FORWARD)
      .multiplyScalar(forwardAmount || (rightAmount === 0 ? 1 : 0))
      .addScaledVector(RIGHT, rightAmount)
      .normalize();
    this.dodgeTimer = 0.28;
    this.dodgeCooldown = 0.72;
    return true;
  }

  faceYaw(yaw) {
    if (Number.isFinite(yaw)) this.rotation.y = yaw;
  }

  triggerAttackAnimation(duration = 0.42) {
    this.attackAnimationDuration = Math.max(0.1, duration);
    this.attackAnimationTimer = this.attackAnimationDuration;
  }

  triggerCastAnimation(duration = 0.72) {
    this.castAnimationDuration = Math.max(0.1, duration);
    this.castAnimationTimer = this.castAnimationDuration;
  }

  triggerHurtAnimation(duration = 0.28) {
    this.hurtAnimationDuration = Math.max(0.1, duration);
    this.hurtAnimationTimer = this.hurtAnimationDuration;
  }

  get invulnerable() {
    return this.dodgeTimer > 0.035;
  }

  resolveMovementWithSlide(nextPosition, currentGround, walkableSurfaces, colliders) {
    const resolved = this.resolveMovement(
      { ...nextPosition },
      currentGround,
      walkableSurfaces,
      colliders
    );
    if (resolved) {
      return resolved;
    }

    const deltaX = nextPosition.x - this.position.x;
    const deltaZ = nextPosition.z - this.position.z;
    const candidates = Math.abs(deltaX) >= Math.abs(deltaZ)
      ? [
          { x: nextPosition.x, y: nextPosition.y, z: this.position.z },
          { x: this.position.x, y: nextPosition.y, z: nextPosition.z }
        ]
      : [
          { x: this.position.x, y: nextPosition.y, z: nextPosition.z },
          { x: nextPosition.x, y: nextPosition.y, z: this.position.z }
        ];

    for (const candidate of candidates) {
      const slid = this.resolveMovement(
        candidate,
        currentGround,
        walkableSurfaces,
        colliders
      );
      if (slid) {
        return slid;
      }
    }

    return null;
  }

  updateVerticalMovement(delta, input, walkableSurfaces, solidColliders = []) {
    const jumpPressed = input.consumePressed('space');

    if (jumpPressed) {
      this.jumpBufferTimer = JUMP_BUFFER_TIME;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);
    }

    let currentGround = findWalkableGround(
      this.position.x,
      this.position.z,
      walkableSurfaces,
      this.position.y + MAX_STEP_HEIGHT
    );
    const checkedGround = findGroundWithinCheckDistance(this.position.x, this.position.z, walkableSurfaces, this.position.y);

    if (checkedGround && this.velocityY <= 0) {
      this.landOnGround(checkedGround);
      currentGround = checkedGround;
    } else if (this.grounded) {
      this.setVerticalState(VERTICAL_STATES.FALLING);
    }

    if (this.grounded) {
      this.coyoteTimer = COYOTE_TIME;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
    }

    if (this.jumpBufferTimer > 0 && (this.grounded || this.coyoteTimer > 0)) {
      this.velocityY = JUMP_VELOCITY;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.setVerticalState(VERTICAL_STATES.JUMPING);
    }

    if (!this.grounded || this.velocityY !== 0) {
      const previousY = this.position.y;
      this.velocityY += GRAVITY * delta;
      if (this.verticalState === VERTICAL_STATES.JUMPING && this.velocityY <= 0) {
        this.setVerticalState(VERTICAL_STATES.FALLING);
      }

      const nextY = this.position.y + this.velocityY * delta;
      if (this.velocityY > 0) {
        const hitSolid = this.moveVerticallyWithCollision(nextY - previousY, solidColliders);
        if (hitSolid) {
          this.velocityY = 0;
          this.setVerticalState(VERTICAL_STATES.FALLING);
        }
      } else {
        const landingGround = findWalkableGroundInRange(
          this.position.x,
          this.position.z,
          walkableSurfaces,
          nextY - GROUND_CHECK_DISTANCE,
          previousY + GROUND_CHECK_DISTANCE
        );
        if (landingGround) {
          this.landOnGround(landingGround);
          currentGround = landingGround;
        } else {
          const hitSolid = this.moveVerticallyWithCollision(nextY - previousY, solidColliders);
          if (hitSolid) {
            this.velocityY = 0;
          }
          this.setVerticalState(VERTICAL_STATES.FALLING);
        }
      }
    }

    currentGround = findWalkableGround(
      this.position.x,
      this.position.z,
      walkableSurfaces,
      this.position.y + MAX_STEP_HEIGHT
    );
    const finalCheckedGround = findGroundWithinCheckDistance(
      this.position.x,
      this.position.z,
      walkableSurfaces,
      this.position.y
    );
    if (finalCheckedGround && this.velocityY <= 0) {
      this.landOnGround(finalCheckedGround);
      currentGround = finalCheckedGround;
    }

    return currentGround;
  }

  moveVerticallyWithCollision(deltaY, solidColliders = []) {
    if (deltaY === 0) {
      return false;
    }

    if (solidColliders.length === 0) {
      this.position.y += deltaY;
      return false;
    }

    const stepCount = Math.max(1, Math.ceil(Math.abs(deltaY) / MAX_VERTICAL_MOVE_STEP));
    const stepY = deltaY / stepCount;
    for (let index = 0; index < stepCount; index += 1) {
      const nextPosition = {
        x: this.position.x,
        y: this.position.y + stepY,
        z: this.position.z
      };
      if (collidesAt(nextPosition, solidColliders, this.collisionRadius, this.collisionHeight)) {
        return true;
      }
      this.position.y = nextPosition.y;
    }

    return false;
  }

  resolveMovement(nextPosition, currentGround, walkableSurfaces, colliders) {
    const currentGroundY = currentGround?.y ?? this.position.y;
    const grounded = this.onGround && this.position.y <= currentGroundY + MAX_STEP_HEIGHT + EPSILON;
    const nextGround = findWalkableGround(
      nextPosition.x,
      nextPosition.z,
      walkableSurfaces,
      grounded ? currentGroundY + MAX_STEP_HEIGHT : this.position.y + MAX_STEP_HEIGHT
    );
    if (!nextGround) {
      if (grounded) {
        nextPosition.y = this.position.y;
        this.velocityY = Math.min(this.velocityY, 0);
        this.setVerticalState(VERTICAL_STATES.FALLING);
      }
      return collidesAt(nextPosition, colliders, this.collisionRadius, this.collisionHeight, { ignoreWalkableStepUp: grounded })
        ? null
        : nextPosition;
    }

    const groundDelta = nextGround.y - currentGroundY;

    if (grounded && groundDelta > MAX_STEP_HEIGHT + EPSILON) {
      return null;
    }

    if (grounded && groundDelta < -MAX_STEP_HEIGHT - EPSILON) {
      nextPosition.y = this.position.y;
      this.velocityY = Math.min(this.velocityY, 0);
      this.setVerticalState(VERTICAL_STATES.FALLING);
      return collidesAt(nextPosition, colliders, this.collisionRadius, this.collisionHeight, { ignoreWalkableStepUp: grounded })
        ? null
        : nextPosition;
    }

    if (grounded) {
      nextPosition.y = nextGround.y;
    }

    if (collidesAt(nextPosition, colliders, this.collisionRadius, this.collisionHeight, { ignoreWalkableStepUp: grounded })) {
      return null;
    }

    return nextPosition;
  }

  setVerticalState(state) {
    this.verticalState = state;
    this.grounded = state === VERTICAL_STATES.GROUNDED;
    this.onGround = this.grounded;
  }

  landOnGround(ground) {
    this.position.y = ground.y;
    this.velocityY = 0;
    this.setVerticalState(VERTICAL_STATES.GROUNDED);
  }

  resetIfBelowSafeHeight() {
    if (this.position.y >= LOWEST_SAFE_Y) {
      return false;
    }

    console.warn('player fell below safe height', {
      y: this.position.y,
      lowestSafeY: LOWEST_SAFE_Y
    });
    this.safetyResetCount += 1;
    this.lastSafetyMessage = 'player fell below safe height';
    this.reset();
    this.didResetThisFrame = true;
    return true;
  }

  get verticalVelocity() {
    return this.velocityY;
  }

  set verticalVelocity(value) {
    this.velocityY = value;
  }

  get verticalStateLabel() {
    if (this.verticalState === VERTICAL_STATES.JUMPING) return 'JUMPING';
    if (this.verticalState === VERTICAL_STATES.FALLING) return 'FALLING';
    return 'GROUND';
  }

  get maxStepHeight() {
    return MAX_STEP_HEIGHT;
  }

  get maxWalkableSlopeDegrees() {
    return MAX_WALKABLE_SLOPE_DEGREES;
  }

  get playerCapsule() {
    return {
      name: 'player_capsule',
      height: this.collisionHeight,
      radius: this.collisionRadius,
      footY: this.position.y,
      headY: this.position.y + this.collisionHeight
    };
  }

  get player_capsule() {
    return this.playerCapsule;
  }

  get lowestSafeY() {
    return LOWEST_SAFE_Y;
  }

  get jumpVelocity() {
    return JUMP_VELOCITY;
  }

  get gravity() {
    return GRAVITY;
  }

  get groundCheckDistance() {
    return GROUND_CHECK_DISTANCE;
  }

  get coyoteTime() {
    return COYOTE_TIME;
  }

  get jumpBufferTime() {
    return JUMP_BUFFER_TIME;
  }

  get verticalStates() {
    return Object.values(VERTICAL_STATES);
  }
}

export {
  MAX_HORIZONTAL_MOVE_STEP,
  MAX_STEP_HEIGHT,
  MAX_WALKABLE_SLOPE_DEGREES,
  collidesAt,
  findWalkableGround,
  surfaceHeightAt
};
