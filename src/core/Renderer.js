import * as THREE from 'three';

const QUALITY_RATIOS = {
  high: 1.5,
  low: 0.85
};

export class Renderer {
  constructor(container, quality = 'auto') {
    this.container = container;
    this.quality = quality;
    this.frameTimes = [];
    this.lastEvaluation = performance.now();
    this.slowWindows = 0;
    this.fastWindows = 0;
    this.qualityNotice = null;

    this.instance = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false
    });
    this.instance.domElement.id = 'game-canvas';
    this.instance.domElement.setAttribute('aria-label', 'Holy Shift 3D 游戏画面');
    this.instance.domElement.tabIndex = 0;
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1.05;
    this.instance.shadowMap.enabled = false;
    this.instance.setClearColor(0xb9dce5, 1);
    this.instance.info.autoReset = true;

    const gl = this.instance.getContext();
    const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = rendererInfo
      ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    this.softwareRenderer = /swiftshader|llvmpipe|software/i.test(
      String(rendererName)
    );
    this.minimumPixelRatio = this.softwareRenderer ? 0.5 : 0.7;
    this.autoPixelRatio = this.softwareRenderer
      ? 0.62
      : Math.min(window.devicePixelRatio || 1, 1.25);
    this.autoStartingRatio = this.softwareRenderer
      ? Math.min(window.devicePixelRatio || 1, 0.5)
      : Math.min(window.devicePixelRatio || 1, 0.7);
    const initialRatio =
      quality === 'auto'
        ? this.autoStartingRatio
        : Math.min(window.devicePixelRatio || 1, QUALITY_RATIOS[quality]);
    this.pixelRatio = Math.max(this.minimumPixelRatio, initialRatio);
    this.instance.setPixelRatio(this.pixelRatio);
    this.resize();
    container.appendChild(this.instance.domElement);
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.instance.setSize(width, height, false);
  }

  setQuality(quality) {
    this.quality = quality;
    const requested =
      quality === 'auto'
        ? this.autoStartingRatio
        : Math.min(window.devicePixelRatio || 1, QUALITY_RATIOS[quality]);
    this.setPixelRatio(Math.max(this.minimumPixelRatio, requested));
    this.slowWindows = 0;
    this.fastWindows = 0;
  }

  setPixelRatio(value) {
    const next = Math.max(this.minimumPixelRatio, Math.min(1.5, value));
    if (Math.abs(next - this.pixelRatio) < 0.04) return;
    this.pixelRatio = next;
    this.instance.setPixelRatio(next);
    this.resize();
  }

  recordFrame(deltaSeconds) {
    const frameMs = Math.min(100, Math.max(0, deltaSeconds * 1000));
    this.frameTimes.push(frameMs);
    if (this.frameTimes.length > 360) this.frameTimes.shift();

    const now = performance.now();
    if (
      this.quality !== 'auto' ||
      now - this.lastEvaluation < 1600 ||
      this.frameTimes.length < 12
    ) {
      return;
    }
    this.lastEvaluation = now;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)];
    const median = sorted[Math.floor((sorted.length - 1) * 0.5)];

    if (!this.softwareRenderer && p95 >= 70 && median >= 45) {
      // Some privacy-preserving engines report only a generic/virtual GPU
      // name. Sustained frame cost is a more reliable signal than that name.
      this.softwareRenderer = true;
      this.minimumPixelRatio = 0.5;
      this.autoPixelRatio = Math.min(window.devicePixelRatio || 1, 0.62);
      this.autoStartingRatio = Math.min(window.devicePixelRatio || 1, 0.5);
      this.setPixelRatio(Math.min(this.pixelRatio, this.autoStartingRatio));
      this.slowWindows = 0;
      this.fastWindows = 0;
      this.qualityNotice =
        '检测到持续的软件级渲染负载，已切换流畅优先场景细节。';
      return;
    }

    if (p95 > 33.3) {
      this.slowWindows += 1;
      this.fastWindows = 0;
    } else if (p95 < 19) {
      this.fastWindows += 1;
      this.slowWindows = 0;
    } else {
      this.slowWindows = 0;
      this.fastWindows = 0;
    }

    if (
      this.slowWindows >= 2 &&
      this.pixelRatio > this.minimumPixelRatio + 0.02
    ) {
      this.setPixelRatio(this.pixelRatio - 0.15);
      this.slowWindows = 0;
      this.qualityNotice = '检测到持续低帧率，已自动降低渲染精度。';
    } else if (
      this.fastWindows >= 6 &&
      this.pixelRatio < this.autoPixelRatio
    ) {
      this.setPixelRatio(this.pixelRatio + 0.1);
      this.fastWindows = 0;
    }
  }

  resetPerformanceSamples() {
    this.frameTimes.length = 0;
    this.lastEvaluation = performance.now();
    this.slowWindows = 0;
    this.fastWindows = 0;
  }

  render(scene, camera) {
    this.instance.render(scene, camera);
  }

  get stats() {
    const samples = this.frameTimes;
    const average = samples.length
      ? samples.reduce((sum, value) => sum + value, 0) / samples.length
      : 0;
    const sorted = [...samples].sort((a, b) => a - b);
    return {
      fps: average > 0 ? 1000 / average : 0,
      p95FrameMs: sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.95)] : 0,
      pixelRatio: this.pixelRatio,
      quality: this.quality,
      softwareRenderer: this.softwareRenderer,
      slowWindows: this.slowWindows,
      samples: samples.length,
      triangles: this.instance.info.render.triangles,
      calls: this.instance.info.render.calls
    };
  }

  dispose() {
    this.instance.dispose();
    this.instance.domElement.remove();
  }
}
