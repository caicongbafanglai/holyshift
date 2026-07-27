import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CHECKPOINTS } from '../src/data/content';
import {
  Player,
  collidesAt,
  findWalkableGround
} from '../src/entities/Player.js';
import { SanctuaryWorld } from '../src/world/SanctuaryWorld.js';

function heldInput(...keys) {
  const held = new Set(keys);
  return {
    isDown: (key) => held.has(key),
    consumePressed: () => false
  };
}

function flatNavigation(colliders = []) {
  return {
    walkableSurfaces: [
      {
        name: 'test-floor',
        shape: 'box',
        center: { x: 0, z: 0 },
        width: 100,
        depth: 100,
        y: 0,
        walkable: true
      }
    ],
    solidColliders: colliders
  };
}

describe('player collision and recovery invariants', () => {
  it('keeps every story checkpoint finite, grounded, and outside solid geometry', () => {
    const world = new SanctuaryWorld();

    for (const [name, checkpoint] of Object.entries(CHECKPOINTS)) {
      const position = new THREE.Vector3(
        checkpoint.x,
        checkpoint.y,
        checkpoint.z
      );
      const ground = findWalkableGround(
        position.x,
        position.z,
        world.scene.userData.walkableSurfaces,
        position.y + world.player.maxStepHeight
      );

      expect(ground, `${name} has ground`).not.toBeNull();
      expect(
        collidesAt(
          position,
          world.baseColliders,
          world.player.collisionRadius,
          world.player.collisionHeight
        ),
        `${name} overlaps a collider`
      ).toBe(false);
      expect(world.isPositionValid(position), `${name} is in recovery bounds`).toBe(true);
    }
  });

  it('substeps sprint movement so a low frame rate cannot tunnel through a thin wall', () => {
    const player = new Player();
    const wall = {
      name: 'thin-wall',
      shape: 'box',
      center: { x: 0, z: 0 },
      width: 0.08,
      depth: 12,
      minY: -1,
      maxY: 4
    };
    const navigation = flatNavigation([wall]);
    player.position.set(-1.4, 0, 0);

    for (let frame = 0; frame < 30; frame += 1) {
      player.update(0.05, heldInput('d', 'shift'), Math.PI, navigation);
      expect(
        collidesAt(
          player.position,
          navigation.solidColliders,
          player.collisionRadius,
          player.collisionHeight
        )
      ).toBe(false);
    }

    expect(player.position.x).toBeLessThanOrEqual(-player.collisionRadius);
  });

  it('does not expose legacy vertical debug movement through arrow keys', () => {
    const player = new Player();
    const navigation = flatNavigation();
    player.position.set(0, 0, 0);

    for (let frame = 0; frame < 30; frame += 1) {
      player.update(0.05, heldInput('arrowup'), Math.PI, navigation);
    }

    expect(player.position.toArray()).toEqual([0, 0, 0]);
    expect(player.verticalStateLabel).toBe('GROUND');
  });

  it('slides along a hard corner instead of trapping the player on diagonal input', () => {
    const player = new Player();
    const obstacle = {
      name: 'corner-block',
      shape: 'box',
      center: { x: 0, z: 0 },
      width: 2,
      depth: 2,
      minY: -1,
      maxY: 4
    };
    const navigation = flatNavigation([obstacle]);
    player.position.set(-2.2, 0, -1.1);
    const startZ = player.position.z;

    for (let frame = 0; frame < 90; frame += 1) {
      player.update(1 / 30, heldInput('w', 'a'), 0, navigation);
      expect(Number.isFinite(player.position.x)).toBe(true);
      expect(Number.isFinite(player.position.z)).toBe(true);
      expect(
        collidesAt(
          player.position,
          navigation.solidColliders,
          player.collisionRadius,
          player.collisionHeight
        )
      ).toBe(false);
    }

    expect(player.position.z).toBeGreaterThan(startZ + 2);
  });

  it('survives a deterministic grid sweep around real-world obstacles', () => {
    const world = new SanctuaryWorld();
    const navigation = world.scene.userData;
    const directions = [
      ['w'],
      ['s'],
      ['a'],
      ['d'],
      ['w', 'a'],
      ['w', 'd'],
      ['s', 'a'],
      ['s', 'd']
    ];
    let exercised = 0;

    for (const x of [-36, -24, -12, 0, 12, 24, 36]) {
      for (const z of [-62, -46, -30, -14, 2, 18, 34, 50]) {
        const start = new THREE.Vector3(x, 0, z);
        if (
          collidesAt(
            start,
            navigation.solidColliders,
            world.player.collisionRadius,
            world.player.collisionHeight
          )
        ) {
          continue;
        }

        for (const direction of directions) {
          world.player.position.copy(start);
          world.player.landOnGround({ y: 0 });
          for (let frame = 0; frame < 20; frame += 1) {
            world.player.update(
              0.05,
              heldInput(...direction, 'shift'),
              Math.PI,
              navigation
            );
            expect(Number.isFinite(world.player.position.x)).toBe(true);
            expect(Number.isFinite(world.player.position.y)).toBe(true);
            expect(Number.isFinite(world.player.position.z)).toBe(true);
            expect(
              collidesAt(
                world.player.position,
                navigation.solidColliders,
                world.player.collisionRadius,
                world.player.collisionHeight
              )
            ).toBe(false);
          }
          exercised += 1;
        }
      }
    }

    expect(exercised).toBeGreaterThan(300);
  });

  it('leaves a collision-free interaction annulus around every required target', () => {
    const world = new SanctuaryWorld();
    const defeated = {
      sentry: false,
      warden: false,
      boss: false,
      elite: false
    };
    const targets = [
      ['npc', 'prologue'],
      ['sentry', 'questAccepted'],
      ['weaponShrine', 'sentryDefeated'],
      ['warden', 'weaponChosen'],
      ['relicShrine', 'wardenDefeated'],
      ['elite', 'growthChosen'],
      ['boss', 'growthChosen']
    ];

    for (const [id, progress] of targets) {
      world.applyProgress(progress, defeated);
      const target = world.interactableObjects.get(id);
      expect(target?.visible, `${id} should be visible`).toBe(true);
      let safeApproach = null;

      for (const distance of [1.5, 2, 2.5, 3, 3.3]) {
        for (let index = 0; index < 16; index += 1) {
          const angle = (index / 16) * Math.PI * 2;
          const candidate = new THREE.Vector3(
            target.position.x + Math.cos(angle) * distance,
            0,
            target.position.z + Math.sin(angle) * distance
          );
          const colliding = collidesAt(
            candidate,
            world.scene.userData.solidColliders,
            world.player.collisionRadius,
            world.player.collisionHeight
          );
          const ground = findWalkableGround(
            candidate.x,
            candidate.z,
            world.scene.userData.walkableSurfaces,
            world.player.maxStepHeight
          );
          if (!colliding && ground && world.isPositionValid(candidate)) {
            safeApproach = candidate;
            break;
          }
        }
        if (safeApproach) break;
      }

      expect(safeApproach, `${id} has no safe interaction position`).not.toBeNull();
      expect(
        safeApproach.distanceTo(target.position),
        `${id} safe position exceeds interaction distance`
      ).toBeLessThan(3.4);
    }
  });
});
