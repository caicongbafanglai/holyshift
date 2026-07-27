import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createPlazaCitizen } from '../src/art/characters/crowd/createPlazaCitizen.js';
import { createLinZhenyin } from '../src/art/characters/linZhenyin/createLinZhenyin.js';
import { createOldPastor } from '../src/art/characters/oldPastor/createOldPastor.js';
import { createPastorSenior } from '../src/art/characters/pastorSenior/createPastorSenior.js';
import { createPingu } from '../src/art/characters/pingu/createPingu.js';
import { batchRigidCharacter } from '../src/art/modeling/batchMeshes.js';

const characterCases = [
  ['老牧师', createOldPastor, 8_000, 12_000],
  ['林镇阴', createLinZhenyin, 6_000, 9_500],
  ['牧司学姐', createPastorSenior, 7_000, 10_500],
  ['Pingu', createPingu, 2_200, 4_500],
  [
    '广场学生',
    () => createPlazaCitizen({ name: '广场学生', kind: 'student' }),
    4_500,
    7_000
  ],
  [
    '广场信徒',
    () => createPlazaCitizen({ name: '广场信徒', kind: 'believer' }),
    4_500,
    7_000
  ]
];

function analyzeModel(model) {
  let meshes = 0;
  let triangles = 0;
  const geometryTypes = new Set();
  model.traverse((object) => {
    if (!object.isMesh) return;
    meshes += 1;
    geometryTypes.add(object.geometry.type);
    triangles +=
      (object.geometry.index?.count ??
        object.geometry.attributes.position.count) / 3;
  });
  return { meshes, triangles, geometryTypes };
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : [target];
  });
}

describe('authored character modeling quality gates', () => {
  it('does not regress to stock ball, capsule, cylinder, cone, torus or box assemblies', () => {
    const directory = path.resolve('src/art/characters');
    const source = sourceFiles(directory)
      .filter((file) => file.endsWith('.js'))
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(
      /new THREE\.(?:Sphere|Capsule|Cylinder|Cone|Torus|Box)Geometry/
    );
  });

  it.each(characterCases)(
    '%s carries authored silhouette metadata and stays inside its detail budget',
    (_name, createCharacter, minimumTriangles, maximumTriangles) => {
      const model = createCharacter();
      const analysis = analyzeModel(model);
      expect(model.userData.characterQuality?.authoredGeometry).toBe(true);
      expect(Object.isFrozen(model.userData.characterQuality)).toBe(true);
      expect(model.userData.characterQuality.silhouette.length).toBeGreaterThan(8);
      expect(analysis.triangles).toBeGreaterThanOrEqual(minimumTriangles);
      expect(analysis.triangles).toBeLessThanOrEqual(maximumTriangles);
      expect(analysis.meshes).toBeGreaterThan(1);
      expect(
        [...analysis.geometryTypes].some((type) =>
          ['SphereGeometry', 'CapsuleGeometry', 'CylinderGeometry'].includes(type)
        )
      ).toBe(false);
    }
  );

  it('keeps every humanoid rig continuous and finite through run, attack and cast extremes', () => {
    const humans = [
      createOldPastor(),
      createLinZhenyin(),
      createPastorSenior(),
      createPlazaCitizen({ name: '动作学生', kind: 'student' }),
      createPlazaCitizen({ name: '动作信徒', kind: 'believer' })
    ];
    const poses = [
      { time: 0 },
      { time: 0.25, moving: true, sprinting: true },
      { time: 0.25, attackPhase: 0.5 },
      { time: 0.25, castPhase: 0.5 },
      { time: 0.25, hurtPhase: 0.5 }
    ];

    for (const model of humans) {
      const { rig } = model.userData;
      expect(rig).toBeTruthy();
      expect(rig.headPivot.parent).toBe(rig.visual);
      for (const limb of [
        rig.leftArm,
        rig.rightArm,
        rig.leftLeg,
        rig.rightLeg
      ]) {
        expect(limb.lower.parent).toBe(limb.upper);
      }
      for (const pose of poses) {
        model.userData.animate?.(pose);
        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        expect(bounds.min.toArray().every(Number.isFinite)).toBe(true);
        expect(bounds.max.toArray().every(Number.isFinite)).toBe(true);
        expect(size.x).toBeGreaterThan(0.5);
        expect(size.y).toBeGreaterThan(1.4);
        expect(size.x).toBeLessThan(4.2);
        expect(size.y).toBeLessThan(4.2);
        expect(size.z).toBeLessThan(4.2);
        expect(bounds.min.y).toBeGreaterThan(-0.55);
      }
    }
  });

  it('batches rigid NPC detail into one opaque draw mesh without dropping geometry', () => {
    const npcs = [
      createLinZhenyin(),
      createPastorSenior(),
      createPingu(),
      createPlazaCitizen({ name: '批次学生', kind: 'student' }),
      createPlazaCitizen({ name: '批次信徒', kind: 'believer' })
    ];
    for (const model of npcs) {
      const before = analyzeModel(model);
      batchRigidCharacter(model, model.name);
      const after = analyzeModel(model);
      expect(after.meshes).toBeLessThanOrEqual(2);
      expect(after.triangles).toBeCloseTo(before.triangles, 4);
    }
  });
});
