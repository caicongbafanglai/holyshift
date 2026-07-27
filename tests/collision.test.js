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

  it('flies along the full camera direction while substepping around solid walls', () => {
    const player = new Player();
    const wall = {
      name: 'flight-wall',
      shape: 'box',
      center: { x: 0, z: 0 },
      width: 8,
      depth: 0.3,
      minY: -1,
      maxY: 20
    };
    const navigation = {
      ...flatNavigation([wall]),
      flightBounds: {
        minX: -20,
        maxX: 20,
        minY: 0.04,
        maxY: 12,
        minZ: -20,
        maxZ: 20
      }
    };
    const movementFrame = {
      yaw: Math.PI,
      forward: new THREE.Vector3(0, 0.5, -Math.sqrt(0.75)),
      right: new THREE.Vector3(1, 0, 0)
    };
    player.position.set(0, 0.5, 3);

    for (let frame = 0; frame < 30; frame += 1) {
      player.update(
        0.05,
        heldInput('ctrl', 'shift', 'w'),
        movementFrame,
        navigation,
        10
      );
      expect(
        collidesAt(
          player.position,
          navigation.solidColliders,
          player.collisionRadius,
          player.collisionHeight
        )
      ).toBe(false);
    }

    expect(player.position.y).toBeGreaterThan(2);
    expect(player.position.z).toBeGreaterThanOrEqual(
      wall.depth / 2 + player.collisionRadius
    );
    expect(player.verticalStateLabel).toBe('FLYING');
    expect(player.flightSecondsThisFrame).toBeCloseTo(0.05);
  });

  it('enters a controlled downward glide without spending powered-flight time', () => {
    const player = new Player();
    const navigation = {
      ...flatNavigation(),
      flightBounds: {
        minX: -20,
        maxX: 20,
        minY: 0,
        maxY: 12,
        minZ: -20,
        maxZ: 20
      }
    };
    const input = heldInput('ctrl', 'shift', 'w');
    player.position.set(0, 4, 4);
    player.update(
      0.1,
      input,
      {
        yaw: Math.PI,
        forward: new THREE.Vector3(0, 0.5, -Math.sqrt(0.75)),
        right: new THREE.Vector3(1, 0, 0)
      },
      navigation,
      10
    );
    const flightPosition = player.position.clone();

    player.update(
      0.25,
      input,
      {
        yaw: Math.PI,
        forward: new THREE.Vector3(0, -0.6, -0.8),
        right: new THREE.Vector3(1, 0, 0)
      },
      navigation,
      0
    );

    expect(player.isFlying).toBe(false);
    expect(player.isGliding).toBe(true);
    expect(player.verticalStateLabel).toBe('GLIDING');
    expect(player.flightSecondsThisFrame).toBe(0);
    expect(player.glideSecondsThisFrame).toBeCloseTo(0.25);
    expect(player.position.y).toBeLessThan(flightPosition.y);
    expect(player.position.y).toBeGreaterThan(flightPosition.y - 0.7);
    expect(player.position.z).toBeLessThan(flightPosition.z - 1);
  });

  it('provides a collision-free stepped route into the healing fountain water', () => {
    const world = new MushiTownWorld();
    const player = world.player;
    player.position.set(0, 0, 4.5);
    player.landOnGround({ y: 0 });

    for (let frame = 0; frame < 35; frame += 1) {
      player.update(
        0.05,
        heldInput('w'),
        Math.PI,
        world.scene.userData
      );
    }

    expect(world.isPlayerInFountainWater()).toBe(true);
    expect(player.position.y).toBeCloseTo(0.62);
    expect(
      collidesAt(
        player.position,
        world.baseColliders,
        player.collisionRadius,
        player.collisionHeight
      )
    ).toBe(false);
  });

  it('settles beside an NPC instead of hovering or landing inside it after flight', () => {
    const world = new MushiTownWorld();
    const player = world.player;
    const flightInput = heldInput('ctrl', 'shift', 'w');
    const idleInput = heldInput();
    const movementFrame = {
      yaw: 0,
      forward: new THREE.Vector3(0, 0, 1),
      right: new THREE.Vector3(-1, 0, 0)
    };
    player.position.set(-31, 3, 37);
    player.update(
      0.01,
      flightInput,
      movementFrame,
      world.scene.userData,
      1
    );

    for (let frame = 0; frame < 60; frame += 1) {
      player.update(
        0.05,
        idleInput,
        Math.PI,
        world.scene.userData
      );
    }

    expect(player.verticalStateLabel).toBe('GROUND');
    expect(player.position.y).toBe(0);
    expect(world.isPositionValid(player.position)).toBe(true);
    expect(
      collidesAt(
        player.position,
        world.baseColliders,
        player.collisionRadius,
        player.collisionHeight
      )
    ).toBe(false);
  });

  it('glides through a low NPC proxy and selects a collision-free landing beside it', () => {
    const world = new MushiTownWorld();
    const player = world.player;
    const climbFrame = {
      yaw: 0,
      forward: new THREE.Vector3(0, 0.5, Math.sqrt(0.75)),
      right: new THREE.Vector3(-1, 0, 0)
    };
    const glideFrame = {
      yaw: 0,
      forward: new THREE.Vector3(0, -0.6, 0.8),
      right: new THREE.Vector3(-1, 0, 0)
    };
    player.position.set(-31, 3, 37);
    player.update(
      0.01,
      heldInput('ctrl', 'shift', 'w'),
      climbFrame,
      world.scene.userData,
      1
    );

    for (let frame = 0; frame < 60 && !player.grounded; frame += 1) {
      player.update(
        0.05,
        heldInput('ctrl', 'shift', 'w', 's'),
        glideFrame,
        world.scene.userData,
        0
      );
    }

    expect(player.verticalStateLabel).toBe('GROUND');
    expect(player.position.y).toBe(0);
    expect(world.isPositionValid(player.position)).toBe(true);
    expect(
      collidesAt(
        player.position,
        world.baseColliders,
        player.collisionRadius,
        player.collisionHeight
      )
    ).toBe(false);
  });

  it('keeps pitched flight inside the 3D island envelope across obstacle sweeps', () => {
    const world = new MushiTownWorld();
    const player = world.player;
    const input = heldInput('ctrl', 'shift', 'w');
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0.62, -0.78),
      new THREE.Vector3(0, -0.62, 0.78)
    ];
    let exercised = 0;

    for (const y of [1, 10, 21]) {
      for (const x of [-60, -30, 0, 30, 60]) {
        for (const z of [-88, -48, -8, 30, 60]) {
          const start = new THREE.Vector3(x, y, z);
          if (
            collidesAt(
              start,
              world.baseColliders,
              player.collisionRadius,
              player.collisionHeight
            )
          ) {
            continue;
          }
          for (const forward of directions) {
            player.position.copy(start);
            for (let frame = 0; frame < 10; frame += 1) {
              player.update(
                0.1,
                input,
                {
                  yaw: Math.atan2(forward.x, forward.z),
                  forward,
                  right: new THREE.Vector3(-forward.z, 0, forward.x)
                    .normalize()
                },
                world.scene.userData,
                10
              );
              expect(world.isPositionValid(player.position)).toBe(true);
              expect(
                collidesAt(
                  player.position,
                  world.baseColliders,
                  player.collisionRadius,
                  player.collisionHeight
                )
              ).toBe(false);
            }
            exercised += 1;
          }
        }
      }
    }
    expect(exercised).toBeGreaterThan(240);
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
