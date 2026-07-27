import * as THREE from 'three';
import { SACRED_MATERIALS } from '../../art/materials/sacredMaterials.js';
import { createMesh } from '../../art/modeling/primitives.js';

export class CombatEffects {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
  }

  spawnStaffArc(position, yaw, combo) {
    const material = SACRED_MATERIALS.polishedGold.clone();
    material.transparent = true;
    material.opacity = 0.92;
    material.depthWrite = false;
    const arc = createMesh(
      new THREE.TorusGeometry(2.05 + combo * 0.18, 0.055 + combo * 0.015, 7, 36, Math.PI * 0.68),
      material,
      '手杖实时攻击弧',
      [position.x, position.y + 1.0, position.z],
      [Math.PI / 2, yaw + Math.PI * 0.16, 0]
    );
    this.scene.add(arc);
    this.active.push({
      object: arc,
      material,
      age: 0,
      life: 0.2,
      type: 'arc'
    });
  }

  spawnShift(position, radius = 6.5) {
    const material = SACRED_MATERIALS.holyShift.clone();
    material.transparent = true;
    material.opacity = 0.85;
    material.depthWrite = false;
    const ring = createMesh(
      new THREE.RingGeometry(0.88, 1, 64),
      material,
      'Holy Shift 场景冲击环',
      [position.x, position.y + 0.08, position.z],
      [-Math.PI / 2, 0, 0]
    );
    this.scene.add(ring);
    this.active.push({
      object: ring,
      material,
      age: 0,
      life: 0.55,
      radius,
      type: 'shift'
    });
  }

  spawnHit(position, critical = false) {
    const material = (
      critical ? SACRED_MATERIALS.anomaly : SACRED_MATERIALS.polishedGold
    ).clone();
    material.transparent = true;
    material.opacity = 1;
    material.depthWrite = false;
    const spark = createMesh(
      new THREE.OctahedronGeometry(critical ? 0.38 : 0.24, 1),
      material,
      critical ? 'Holy Shift 命中特效' : '手杖命中特效',
      [position.x, position.y + 1.15, position.z]
    );
    this.scene.add(spark);
    this.active.push({
      object: spark,
      material,
      age: 0,
      life: critical ? 0.42 : 0.25,
      type: 'hit'
    });
  }

  update(delta) {
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const effect = this.active[index];
      effect.age += delta;
      const t = Math.min(1, effect.age / effect.life);
      effect.material.opacity = 1 - t;
      if (effect.type === 'shift') {
        const scale = 0.8 + effect.radius * t;
        effect.object.scale.setScalar(scale);
        effect.object.rotation.z += delta * 1.8;
      } else if (effect.type === 'arc') {
        effect.object.rotation.z += delta * 5.5;
        effect.object.scale.setScalar(1 + t * 0.22);
      } else {
        effect.object.scale.setScalar(1 + t * 2.1);
        effect.object.rotation.y += delta * 8;
      }
      if (t >= 1) {
        this.scene.remove(effect.object);
        effect.object.geometry.dispose();
        effect.material.dispose();
        this.active.splice(index, 1);
      }
    }
  }
}
