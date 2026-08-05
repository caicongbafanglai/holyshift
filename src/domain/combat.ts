export interface SpatialPoint {
  x: number;
  y?: number;
  z: number;
}

export function horizontalDistance(left: SpatialPoint, right: SpatialPoint): number {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

export function normalizeRadians(value: number): number {
  const twoPi = Math.PI * 2;
  return ((value % twoPi) + twoPi) % twoPi;
}

export function smallestAngleDelta(left: number, right: number): number {
  const delta = normalizeRadians(left) - normalizeRadians(right);
  return Math.atan2(Math.sin(delta), Math.cos(delta));
}

export function isTargetInsideAttackArc({
  origin,
  target,
  facingYaw,
  range,
  arcDegrees,
  maxVerticalDistance = Number.POSITIVE_INFINITY
}: {
  origin: SpatialPoint;
  target: SpatialPoint;
  facingYaw: number;
  range: number;
  arcDegrees: number;
  maxVerticalDistance?: number;
}): boolean {
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const dy = (target.y ?? 0) - (origin.y ?? 0);
  if (Math.abs(dy) > maxVerticalDistance) return false;
  if (Math.hypot(dx, dz) > range) return false;
  const targetYaw = Math.atan2(dx, dz);
  return Math.abs(smallestAngleDelta(targetYaw, facingYaw)) <=
    (arcDegrees * Math.PI / 180) / 2;
}

export function applyDamage(currentHp: number, damage: number): number {
  if (!Number.isFinite(currentHp) || !Number.isFinite(damage)) return 0;
  return Math.max(0, Math.round(currentHp - Math.max(0, damage)));
}

export function recoverResource(
  current: number,
  maximum: number,
  perSecond: number,
  delta: number
): number {
  if (![current, maximum, perSecond, delta].every(Number.isFinite)) return 0;
  return Math.min(Math.max(0, maximum), Math.max(0, current + perSecond * Math.max(0, delta)));
}
