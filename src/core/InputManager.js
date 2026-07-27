const CONTROL_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'shift',
  'space',
  'e',
  'b',
  'v',
  'r',
  'm',
  'escape',
  'j',
  'q',
  'ctrl',
  'enter'
]);

function normalizeKey(event) {
  if (event.code === 'Space') return 'space';
  if (event.code.startsWith('Key')) return event.code.slice(3).toLowerCase();
  if (event.code.startsWith('Digit')) return event.code.slice(5);
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') return 'shift';
  if (event.code === 'ControlLeft' || event.code === 'ControlRight') return 'ctrl';
  if (event.code === 'Escape') return 'escape';
  if (event.code === 'Enter' || event.code === 'NumpadEnter') return 'enter';
  return event.key.toLowerCase();
}

function isEditableTarget(target) {
  return (
    target instanceof HTMLElement &&
    (target.matches('input, textarea, select') || target.isContentEditable)
  );
}

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.enabled = true;

    window.addEventListener('keydown', (event) => {
      const key = normalizeKey(event);
      if (isEditableTarget(event.target) && key !== 'escape') return;
      if (!CONTROL_KEYS.has(key)) return;
      event.preventDefault();
      if (!event.repeat) this.pressed.add(key);
      this.down.add(key);
    });

    window.addEventListener('keyup', (event) => {
      const key = normalizeKey(event);
      if (CONTROL_KEYS.has(key)) this.down.delete(key);
    });

    window.addEventListener('blur', () => this.clear());

    canvas.addEventListener('click', () => {
      if (!this.enabled || document.pointerLockElement) return;
      canvas.requestPointerLock?.();
    });

    canvas.addEventListener('pointerdown', (event) => {
      if (!this.enabled || !this.isPointerLocked) return;
      if (event.button === 0) this.pressed.add('attack');
      if (event.button === 2) this.pressed.add('skill');
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    document.addEventListener('mousemove', (event) => {
      if (!this.enabled || !this.isPointerLocked) return;
      this.mouseDelta.x += event.movementX || 0;
      this.mouseDelta.y += event.movementY || 0;
    });

    document.addEventListener('pointerlockchange', () => {
      if (!this.isPointerLocked) {
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
      }
    });
  }

  isDown(key) {
    return this.enabled && this.down.has(key);
  }

  consumePressed(key) {
    if (!this.pressed.has(key)) return false;
    this.pressed.delete(key);
    return true;
  }

  peekPressed(key) {
    return this.pressed.has(key);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.down.clear();
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }
  }

  releasePointer() {
    if (this.isPointerLocked) document.exitPointerLock?.();
  }

  requestPointer() {
    if (!this.isPointerLocked && this.enabled) this.canvas.requestPointerLock?.();
  }

  clear() {
    this.down.clear();
    this.pressed.clear();
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }

  endFrame() {
    this.pressed.clear();
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
  }

  get isPointerLocked() {
    return document.pointerLockElement === this.canvas;
  }

  get hasMovementInput() {
    return this.enabled && ['w', 'a', 's', 'd'].some((key) => this.down.has(key));
  }
}
