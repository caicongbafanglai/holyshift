import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CameraController } from '../src/core/CameraController.js';
import { Player } from '../src/entities/Player.js';

const idleInput = {
  isPointerLocked: false,
  mouseDelta: { x: 0, y: 0 }
};

describe('dual-view camera safety', () => {
  it('shortens the third-person boom before a wall instead of rendering through it', () => {
    const controller = new CameraController({
      clientWidth: 1280,
      clientHeight: 720
    });
    const player = new Player();
    player.position.set(0, 0, 0);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 0.5));
    wall.position.set(0, 2.5, 3);
    wall.updateMatrixWorld(true);
    controller.setCollisionObjects([wall]);

    controller.update(player, 1 / 60, idleInput, false);

    expect(controller.camera.position.z).toBeGreaterThan(0.5);
    expect(controller.camera.position.z).toBeLessThan(2.75);
    expect(player.visible).toBe(true);
  });

  it('switches to eye height without moving the shared player body', () => {
    const controller = new CameraController({
      clientWidth: 1280,
      clientHeight: 720
    });
    const player = new Player();
    player.position.set(4, 0, -7);
    const before = player.position.clone();

    expect(controller.togglePerson()).toBe(true);
    controller.update(player, 1 / 60, idleInput, false);

    expect(player.position.toArray()).toEqual(before.toArray());
    expect(controller.camera.position.x).toBeCloseTo(4);
    expect(controller.camera.position.y).toBeCloseTo(1.55);
    expect(controller.camera.position.z).toBeCloseTo(-7);
    expect(player.visible).toBe(false);

    expect(controller.togglePerson()).toBe(false);
    controller.update(player, 1 / 60, idleInput, false);
    expect(player.visible).toBe(true);
  });

  it('exposes a normalized full-pitch movement basis for view-directed flight', () => {
    const controller = new CameraController({
      clientWidth: 1280,
      clientHeight: 720
    });
    controller.yaw = Math.PI / 3;
    controller.pitch = Math.PI / 6;
    const frame = controller.movementFrame;

    expect(frame.yaw).toBeCloseTo(Math.PI / 3);
    expect(frame.forward.length()).toBeCloseTo(1);
    expect(frame.forward.y).toBeCloseTo(0.5);
    expect(frame.right.length()).toBeCloseTo(1);
    expect(frame.forward.dot(frame.right)).toBeCloseTo(0);
  });
});
