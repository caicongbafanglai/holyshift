import * as THREE from 'three';
import {
  createCharacterMaterial,
  SACRED_MATERIALS
} from '../materials/sacredMaterials.js';
import { createContactShadow, createMesh } from '../modeling/primitives.js';

export function createRawWaterWisp({ name = '生水泡影', variant = 0 } = {}) {
  const root = new THREE.Group();
  root.name = name;
  root.add(createContactShadow(0.68, SACRED_MATERIALS.contactShadow, 1.2));
  const visual = new THREE.Group();
  visual.name = `${name}-视觉根`;
  root.add(visual);

  const water = SACRED_MATERIALS.waterRaw.clone();
  water.opacity = 0.76;
  const dark = createCharacterMaterial(
    [0x275c59, 0x394b76, 0x593d68][variant % 3],
    { emissive: 0x102d34, emissiveIntensity: 0.55, roughness: 0.35 }
  );
  const eye = createCharacterMaterial(0xf5fff0, {
    emissive: 0xaefdf0,
    emissiveIntensity: 0.8
  });
  const pupil = createCharacterMaterial(0x172b3a, { roughness: 0.2 });

  const body = createMesh(
    new THREE.IcosahedronGeometry(0.75, 2),
    water,
    `${name}-多面水体`,
    [0, 1.05, 0],
    [0, 0, 0],
    [0.9, 1.1, 0.82]
  );
  const core = createMesh(
    new THREE.IcosahedronGeometry(0.39, 1),
    dark,
    `${name}-冷笑话核心`,
    [0, 1.06, 0]
  );
  visual.add(body, core);

  for (const side of [-1, 1]) {
    const eyeMesh = createMesh(
      new THREE.SphereGeometry(0.115, 12, 9),
      eye,
      `${name}-${side < 0 ? '左' : '右'}眼白`,
      [side * 0.22, 1.24, 0.57],
      [0, 0, 0],
      [1, 1.2, 0.48]
    );
    const pupilMesh = createMesh(
      new THREE.SphereGeometry(0.058, 10, 7),
      pupil,
      `${name}-${side < 0 ? '左' : '右'}瞳孔`,
      [side * 0.22, 1.23, 0.635],
      [0, 0, 0],
      [0.75, 1.1, 0.38]
    );
    visual.add(eyeMesh, pupilMesh);
  }
  const grin = createMesh(
    new THREE.TorusGeometry(0.23, 0.026, 7, 18, Math.PI * 0.72),
    pupil,
    `${name}-讲冷笑话的嘴`,
    [0, 0.92, 0.65],
    [0, 0, Math.PI * 0.14]
  );
  visual.add(grin);

  const tentacles = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.name = `${name}-水流触手骨架-${index + 1}`;
    pivot.position.set(Math.cos(angle) * 0.45, 0.7, Math.sin(angle) * 0.45);
    pivot.rotation.y = -angle;
    pivot.add(
      createMesh(
        new THREE.CapsuleGeometry(0.08, 0.54, 4, 8),
        water,
        `${name}-水流触手-${index + 1}`,
        [0, -0.3, 0],
        [0, 0, 0.35]
      )
    );
    visual.add(pivot);
    tentacles.push(pivot);
  }

  const forms = [];
  for (let index = 0; index < 3; index += 1) {
    const form = createMesh(
      new THREE.BoxGeometry(0.32, 0.42, 0.025),
      index === 2 ? SACRED_MATERIALS.anomaly : SACRED_MATERIALS.ivoryWarm,
      `${name}-异常审批表-${index + 1}`,
      [0, 1.2, 0]
    );
    visual.add(form);
    forms.push(form);
  }

  root.userData.combatVisual = {
    baseScale: 1,
    body,
    core,
    forms,
    tentacles,
    hitTimer: 0,
    deathTimer: 0
  };
  root.userData.animate = ({ time = 0, delta = 0, hit = false, dying = false } = {}) => {
    const state = root.userData.combatVisual;
    if (hit) state.hitTimer = 0.12;
    if (dying) state.deathTimer += delta;
    state.hitTimer = Math.max(0, state.hitTimer - delta);
    visual.position.y = 0.13 + Math.sin(time * 2.8 + variant) * 0.16;
    visual.rotation.y = time * (0.24 + variant * 0.03);
    visual.scale.setScalar(
      dying
        ? Math.max(0.01, 1 - state.deathTimer * 2.3)
        : 1 + Math.sin(time * 3.4) * 0.025
    );
    body.material.emissiveIntensity = state.hitTimer > 0 ? 2.2 : 0.55;
    tentacles.forEach((tentacle, index) => {
      tentacle.rotation.z = Math.sin(time * 3.2 + index) * 0.26;
    });
    forms.forEach((form, index) => {
      const angle = time * (0.7 + index * 0.12) + index * 2.1;
      form.position.set(
        Math.cos(angle) * 1.06,
        1.22 + Math.sin(angle * 1.6) * 0.2,
        Math.sin(angle) * 1.06
      );
      form.rotation.y = -angle + Math.PI / 2;
    });
  };
  return root;
}
