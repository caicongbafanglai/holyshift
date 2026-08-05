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
        heldInput('x', 'w'),
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
    const input = heldInput('x', 'w');
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
    const flightInput = heldInput('x', 'w');
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

  it.each([10, 21])('finds a collision-free landing from y=%i above the fountain core', (height) => {
    const world = new MushiTownWorld();
    const player = world.player;
    player.position.set(0, height, -8);
    player.update(
      0.01,
      heldInput('x', 'w'),
      {
        yaw: Math.PI,
        forward: new THREE.Vector3(0, 0, -1),
        right: new THREE.Vector3(1, 0, 0)
      },
      world.scene.userData,
      1
    );

    for (let frame = 0; frame < 320 && !player.grounded; frame += 1) {
      player.update(0.05, heldInput(), Math.PI, world.scene.userData);
    }

    expect(player.verticalStateLabel).toBe('GROUND');
    expect(
      collidesAt(
        player.position,
        world.baseColliders,
        player.collisionRadius,
        player.collisionHeight
      )
    ).toBe(false);
    expect(world.isPositionValid(player.position)).toBe(true);
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
      heldInput('x', 'w'),
      climbFrame,
      world.scene.userData,
      1
    );

    for (let frame = 0; frame < 60 && !player.grounded; frame += 1) {
      player.update(
        0.05,
        heldInput('x', 'w', 's'),
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
    const input = heldInput('x', 'w');
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
      ['pinguStall', 'intro'],
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

  it('keeps persisted defeated enemies dead when an encounter is safely reset', () => {
    const world = new MushiTownWorld();
    const defeated = { ...emptyDefeated, 'wisp-a': true };
    world.applyProgress('clearWisps', defeated, {});

    world.resetActiveEnemies(defeated);

    expect(world.enemies.get('wisp-a')).toMatchObject({
      state: 'dead',
      visible: false
    });
    expect(world.enemies.get('wisp-b').isAlive).toBe(true);
    expect(world.enemies.get('wisp-c').isAlive).toBe(true);
  });

  it('routes enemies through the fountain entrance and around its core without dropping chase', () => {
    const world = new MushiTownWorld();
    world.applyProgress('defeatWaterGhost', emptyDefeated, {});
    const boss = world.enemies.get('approved-water-ghost');
    // HS03-AI-001 registered Boss targets; every target must produce a hit
    // within 60 simulated seconds, not merely within the wider stress budget.
    for (const [x, z] of [
      [0, -20],
      [0, -16],
      [0, -14],
      [6, -2],
      [-6, -2],
      [4, -8],
      [-4, -8]
    ]) {
      boss.activate(false);
      world.player.position.set(x, 0, z);
      let hits = 0;

      let firstHitSeconds = null;
      for (let frame = 0; frame < 600 && hits === 0; frame += 1) {
        boss.updateAgent(
          0.1,
          frame / 10,
          world.player,
          world.scene.userData,
          () => {
            hits += 1;
            firstHitSeconds = (frame + 1) / 10;
          }
        );
        if (
          collidesAt(
            boss.position,
            world.baseColliders,
            boss.definition.radius,
            boss.height
          )
        ) {
          throw new Error(`boss intersected static geometry en route to ${x},${z}`);
        }
      }

      expect(hits, `boss reaches ${x},${z}`).toBeGreaterThan(0);
      expect(firstHitSeconds, `boss hits ${x},${z} within 60s`).toBeLessThanOrEqual(60);
    }

    world.applyProgress('clearWisps', emptyDefeated, {});
    const wisp = world.enemies.get('wisp-a');
    world.player.position.set(-7, 0, -17);
    let wispHits = 0;
    for (let frame = 0; frame < 900 && wispHits === 0; frame += 1) {
      wisp.updateAgent(
        0.1,
        frame / 10,
        world.player,
        world.scene.userData,
        () => { wispHits += 1; }
      );
    }
    expect(wispHits).toBeGreaterThan(0);
    expect(wisp.state).not.toBe('idle');
  }, 15_000);

  it('does not plan a fountain detour or aggro outside the frozen detection range', () => {
    const world = new MushiTownWorld();
    world.applyProgress('clearWisps', emptyDefeated, {});
    const wisp = world.enemies.get('wisp-c');
    const spawn = wisp.position.clone();

    world.player.position.set(0, 0, 13);
    expect(wisp.position.distanceTo(world.player.position)).toBeGreaterThan(
      wisp.definition.detectionRange
    );
    wisp.updateAgent(0.1, 0, world.player, world.scene.userData, () => {});

    expect(wisp.state).toBe('idle');
    expect(wisp.navigationWaypoints).toHaveLength(0);
    expect(wisp.position.toArray()).toEqual(spawn.toArray());

    world.player.position.set(0, 0, -9);
    expect(wisp.position.distanceTo(world.player.position)).toBeLessThanOrEqual(
      wisp.definition.detectionRange
    );
    wisp.updateAgent(0.1, 0.1, world.player, world.scene.userData, () => {});

    expect(wisp.state).toBe('chase');
    expect(wisp.navigationWaypoints.length).toBeGreaterThan(0);
  });

  it('reverses local steering after measured stalls at furniture obstacles', () => {
    const world = new MushiTownWorld();
    world.applyProgress('clearWisps', emptyDefeated, {});
    for (const [enemyId, x, z] of [
      ['wisp-a', -16, 16],
      ['wisp-b', 22, 10],
      ['wisp-b', 22, 13],
      ['wisp-b', 22, 16],
      ['wisp-b', 22, 19],
      ['wisp-b', 25, 19]
    ]) {
      const enemy = world.enemies.get(enemyId);
      enemy.avoidanceSign *= -1;
      enemy.activate(false);
      expect(enemy.avoidanceSign).toBe(enemy.initialAvoidanceSign);
      world.player.position.set(x, 0, z);
      let hits = 0;
      for (let frame = 0; frame < 900 && hits === 0; frame += 1) {
        enemy.updateAgent(
          0.1,
          frame / 10,
          world.player,
          world.scene.userData,
          () => { hits += 1; }
        );
        if (
          collidesAt(
            enemy.position,
            world.baseColliders,
            enemy.definition.radius,
            enemy.height
          )
        ) {
          throw new Error(`${enemyId} intersected static geometry en route to ${x},${z}`);
        }
      }
      expect(hits, `${enemyId} reaches ${x},${z}`).toBeGreaterThan(0);
    }
  }, 15_000);

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
            if (!world.player.position.toArray().every(Number.isFinite)) {
              throw new Error(
                `non-finite player position from ${x},${z} toward ${direction.join('+')} at frame ${frame}`
              );
            }
            if (
              collidesAt(
                world.player.position,
                world.baseColliders,
                world.player.collisionRadius,
                world.player.collisionHeight
              )
            ) {
              throw new Error(
                `collision from ${x},${z} toward ${direction.join('+')} at frame ${frame}`
              );
            }
          }
          exercised += 1;
        }
      }
    }
    expect(exercised).toBeGreaterThan(600);
  }, 15_000);
});
