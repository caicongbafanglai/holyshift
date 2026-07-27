import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CHECKPOINTS } from '../src/data/content';
import {
  Player,
  collidesAt,
  findWalkableGround
} from '../src/entities/Player.js';
import { MushiTownWorld } from '../src/world/MushiTownWorld.js';

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

const emptyDefeated = {
  'wisp-a': false,
  'wisp-b': false,
  'wisp-c': false,
  'approved-water-ghost': false
};

describe('plaza collision and anti-softlock invariants', () => {
  it('keeps every chapter checkpoint finite, grounded, and outside static geometry', () => {
    const world = new MushiTownWorld();
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
        `${name} overlaps static geometry`
      ).toBe(false);
      expect(world.isPositionValid(position), `${name} is in bounds`).toBe(true);
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
      player.update(0.1, heldInput('d', 'shift'), Math.PI, navigation);
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

  it('slides along a hard corner instead of trapping diagonal movement', () => {
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

  it('does not expose vertical debug movement through arrow keys', () => {
    const player = new Player();
    const navigation = flatNavigation();
    player.position.set(0, 0, 0);
    for (let frame = 0; frame < 30; frame += 1) {
      player.update(0.05, heldInput('arrowup'), Math.PI, navigation);
    }
    expect(player.position.toArray()).toEqual([0, 0, 0]);
    expect(player.verticalStateLabel).toBe('GROUND');
  });

  it('leaves a ground-backed collision-free interaction ring around every story target', () => {
    const world = new MushiTownWorld();
    const targets = [
      ['pastorSenior', 'intro'],
      ['fountain', 'inspectFountain'],
      ['pingu', 'traceSacredGlyph'],
      ['linZhenyin', 'consultLin'],
      ['elevator', 'inspectElevator'],
      ['student', 'complete'],
      ['believer', 'complete'],
      ['noticeBoard', 'intro']
    ];

    for (const [id, progress] of targets) {
      world.applyProgress(progress, emptyDefeated, {});
      const target = world.interactableObjects.get(id);
      expect(target, `${id} exists`).toBeTruthy();
      let safeApproach = null;
      for (const distance of [1.55, 2.1, 2.7, 3.25]) {
        for (let index = 0; index < 24; index += 1) {
          const angle = (index / 24) * Math.PI * 2;
          const candidate = new THREE.Vector3(
            target.position.x + Math.cos(angle) * distance,
            0,
            target.position.z + Math.sin(angle) * distance
          );
          const ground = findWalkableGround(
            candidate.x,
            candidate.z,
            world.scene.userData.walkableSurfaces,
            world.player.maxStepHeight
          );
          if (
            ground &&
            world.isPositionValid(candidate) &&
            !collidesAt(
              candidate,
              world.scene.userData.solidColliders,
              world.player.collisionRadius,
              world.player.collisionHeight
            )
          ) {
            safeApproach = candidate;
            break;
          }
        }
        if (safeApproach) break;
      }
      expect(safeApproach, `${id} has a safe interaction approach`).not.toBeNull();
    }
  });

  it('keeps all active enemy spawns outside architecture and each other', () => {
    const world = new MushiTownWorld();
    for (const progress of ['clearWisps', 'defeatWaterGhost']) {
      world.applyProgress(progress, emptyDefeated, {});
      const active = [...world.enemies.values()].filter((enemy) => enemy.isAlive);
      for (const enemy of active) {
        expect(
          collidesAt(
            enemy.position,
            world.baseColliders,
            enemy.definition.radius,
            enemy.height
          ),
          `${enemy.definition.id} overlaps architecture`
        ).toBe(false);
        expect(world.isPositionValid(enemy.position)).toBe(true);
      }
      for (let left = 0; left < active.length; left += 1) {
        for (let right = left + 1; right < active.length; right += 1) {
          expect(active[left].position.distanceTo(active[right].position)).toBeGreaterThan(
            active[left].definition.radius + active[right].definition.radius + 1
          );
        }
      }
    }
  });

  it('survives deterministic sweeps through walls, furniture, fountain corners, and island edges', () => {
    const world = new MushiTownWorld();
    const navigation = world.scene.userData;
    const directions = [
      ['w'], ['s'], ['a'], ['d'],
      ['w', 'a'], ['w', 'd'], ['s', 'a'], ['s', 'd']
    ];
    let exercised = 0;
    for (const x of [-64, -52, -40, -28, -16, 0, 16, 28, 40, 52, 64]) {
      for (const z of [-90, -78, -64, -50, -36, -22, -8, 6, 20, 34, 48, 61]) {
        const start = new THREE.Vector3(x, 0, z);
        if (
          !world.isPositionValid(start) ||
          collidesAt(
            start,
            world.baseColliders,
            world.player.collisionRadius,
            world.player.collisionHeight
          )
        ) {
          continue;
        }
        for (const direction of directions) {
          world.player.position.copy(start);
          world.player.landOnGround({ y: 0 });
          for (let frame = 0; frame < 14; frame += 1) {
            world.player.update(
              0.1,
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
                world.baseColliders,
                world.player.collisionRadius,
                world.player.collisionHeight
              )
            ).toBe(false);
          }
          exercised += 1;
        }
      }
    }
    expect(exercised).toBeGreaterThan(600);
  });
});
