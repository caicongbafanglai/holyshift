import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  horizontalDistance,
  isTargetInsideAttackArc,
  recoverResource,
  smallestAngleDelta
} from '../src/domain/combat';

describe('real-time world combat math', () => {
  it('accepts targets in front of the player and rejects targets behind', () => {
    expect(
      isTargetInsideAttackArc({
        origin: { x: 0, z: 0 },
        target: { x: 0.5, z: -2 },
        facingYaw: Math.PI,
        range: 3.15,
        arcDegrees: 118
      })
    ).toBe(true);
    expect(
      isTargetInsideAttackArc({
        origin: { x: 0, z: 0 },
        target: { x: 0, z: 2 },
        facingYaw: Math.PI,
        range: 3.15,
        arcDegrees: 118
      })
    ).toBe(false);
  });

  it('handles angle wraparound without a blind seam', () => {
    expect(
      Math.abs(smallestAngleDelta(Math.PI - 0.03, -Math.PI + 0.03))
    ).toBeLessThan(0.07);
  });

  it('enforces attack range independently of the arc', () => {
    expect(
      isTargetInsideAttackArc({
        origin: { x: 0, z: 0 },
        target: { x: 0, z: -3.16 },
        facingYaw: Math.PI,
        range: 3.15,
        arcDegrees: 180
      })
    ).toBe(false);
  });

  it('clamps damage and resource recovery to safe numeric bounds', () => {
    expect(applyDamage(120, 21)).toBe(99);
    expect(applyDamage(8, 999)).toBe(0);
    expect(applyDamage(Number.NaN, 1)).toBe(0);
    expect(recoverResource(90, 100, 22, 1)).toBe(100);
    expect(recoverResource(20, 100, 22, 0.5)).toBe(31);
  });

  it('uses horizontal world distance for melee and AI decisions', () => {
    expect(horizontalDistance({ x: -2, z: 4 }, { x: 1, z: 8 })).toBe(5);
  });
});
