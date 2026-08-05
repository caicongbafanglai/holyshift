import * as THREE from 'three';

const FOV = 64;
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = THREE.MathUtils.degToRad(76);
const EYE_HEIGHT = 1.55;
const THIRD_PERSON_DISTANCE = 6.8;
const THIRD_PERSON_HEIGHT = 2.25;
const CAMERA_SKIN = 0.28;

const FORWARD = new THREE.Vector3();
const TARGET = new THREE.Vector3();
const DESIRED = new THREE.Vector3();
const DIRECTION = new THREE.Vector3();

export class CameraController {
  constructor(container) {
    this.container = container;
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.07, 1350);
    this.camera.name = 'third-person-camera';
    this.yaw = Math.PI;
    this.pitch = 0.08;
    this.firstPerson = false;
    this.collisionObjects = [];
    this.raycaster = new THREE.Raycaster();
    this.justSwitched = true;
    this.frameBasis = {
      yaw: this.yaw,
      forward: new THREE.Vector3(),
      right: new THREE.Vector3()
    };
    this.resize();
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setCollisionObjects(objects) {
    this.collisionObjects = objects;
  }

  togglePerson() {
    this.firstPerson = !this.firstPerson;
    this.camera.name = this.firstPerson ? 'first-person-camera' : 'third-person-camera';
    this.justSwitched = true;
    return this.firstPerson;
  }

  update(player, delta, input, lookEnabled = true) {
    if (lookEnabled && input?.isPointerLocked) {
      this.yaw -= input.mouseDelta.x * MOUSE_SENSITIVITY;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - input.mouseDelta.y * MOUSE_SENSITIVITY,
        -PITCH_LIMIT,
        PITCH_LIMIT
      );
    }

    FORWARD.set(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();
    TARGET.set(player.position.x, player.position.y + EYE_HEIGHT, player.position.z);

    if (this.firstPerson) {
      player.visible = false;
      this.camera.position.copy(TARGET);
      this.camera.lookAt(DESIRED.copy(TARGET).addScaledVector(FORWARD, 30));
      this.justSwitched = false;
      return;
    }

    player.visible = true;
    DESIRED.set(
      TARGET.x - Math.sin(this.yaw) * THIRD_PERSON_DISTANCE,
      TARGET.y + THIRD_PERSON_HEIGHT - this.pitch * 1.2,
      TARGET.z - Math.cos(this.yaw) * THIRD_PERSON_DISTANCE
    );

    DIRECTION.subVectors(DESIRED, TARGET);
    const desiredDistance = DIRECTION.length();
    DIRECTION.normalize();
    this.raycaster.set(TARGET, DIRECTION);
    this.raycaster.far = desiredDistance;
    const hits = this.raycaster.intersectObjects(this.collisionObjects, true);
    if (hits.length > 0) {
      const safeDistance = Math.max(0.65, hits[0].distance - CAMERA_SKIN);
      DESIRED.copy(TARGET).addScaledVector(DIRECTION, safeDistance);
    }

    const blend = this.justSwitched ? 1 : 1 - Math.exp(-delta * 18);
    this.camera.position.lerp(DESIRED, blend);
    this.camera.lookAt(
      TARGET.x + FORWARD.x * 4,
      TARGET.y + FORWARD.y * 4,
      TARGET.z + FORWARD.z * 4
    );
    this.justSwitched = false;
  }

  resetView() {
    this.yaw = Math.PI;
    this.pitch = 0.08;
    this.justSwitched = true;
  }

  resetSessionState() {
    this.firstPerson = false;
    this.camera.name = 'third-person-camera';
    this.resetView();
  }

  get movementYaw() {
    return this.yaw;
  }

  get movementFrame() {
    const horizontalCosine = Math.cos(this.pitch);
    this.frameBasis.yaw = this.yaw;
    this.frameBasis.forward
      .set(
        Math.sin(this.yaw) * horizontalCosine,
        Math.sin(this.pitch),
        Math.cos(this.yaw) * horizontalCosine
      )
      .normalize();
    this.frameBasis.right.set(
      -Math.cos(this.yaw),
      0,
      Math.sin(this.yaw)
    );
    return this.frameBasis;
  }

  get label() {
    return this.firstPerson ? '第一人称' : '第三人称';
  }
}
