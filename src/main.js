import './styles.css';
import { Game } from './core/Game.js';
import {
  IndexedDbSaveManager,
  PersistenceBlockedError
} from './domain/indexedDbSave.ts';

const container = document.querySelector('#app');
let activeSaveManager = null;

if (!container) {
  throw new Error('Missing #app container.');
}

function releaseStorageOwnership() {
  activeSaveManager?.dispose();
  activeSaveManager = null;
}

window.addEventListener('pagehide', releaseStorageOwnership);
window.addEventListener('beforeunload', releaseStorageOwnership);

function renderStartupFailure({
  title = 'Holy Shift 无法启动',
  message,
  manager = null,
  diagnostic = ''
}) {
  container.innerHTML = `
    <main style="display:grid;place-items:center;height:100%;padding:32px;color:#f4eedc;background:#090b14;text-align:center;font-family:system-ui,sans-serif">
      <div style="max-width:680px">
        <h1 style="font-family:Georgia,serif" data-failure-title></h1>
        <p style="color:#b9b7b2;line-height:1.7" data-failure-copy></p>
        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">
          <button data-failure-reload style="padding:10px 18px;border:0;border-radius:7px;background:#d9ad59;color:#171006;font-weight:800;cursor:pointer">
            重新加载
          </button>
          <button data-failure-copy-diagnostic hidden style="padding:10px 18px;border:1px solid #62563e;border-radius:7px;background:#171a26;color:#f4eedc;font-weight:700;cursor:pointer">
            复制存档诊断
          </button>
          <button data-failure-reset hidden style="padding:10px 18px;border:1px solid #8f4e55;border-radius:7px;background:#321b22;color:#f4eedc;font-weight:700;cursor:pointer">
            删除坏档并重开
          </button>
        </div>
        <p style="color:#777b86;font-size:12px;line-height:1.6" data-failure-status></p>
      </div>
    </main>
  `;
  container.querySelector('[data-failure-title]').textContent = title;
  container.querySelector('[data-failure-copy]').textContent = message;
  container
    .querySelector('[data-failure-reload]')
    .addEventListener('click', () => window.location.reload());

  if (diagnostic) {
    const copyButton = container.querySelector('[data-failure-copy-diagnostic]');
    copyButton.hidden = false;
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(diagnostic);
        container.querySelector('[data-failure-status]').textContent =
          '诊断已复制；原始存档仍未修改。';
      } catch {
        container.querySelector('[data-failure-status]').textContent =
          '浏览器拒绝剪贴板写入；请保留当前标签页并联系维护者。';
      }
    });
  }

  if (manager && diagnostic) {
    const resetButton = container.querySelector('[data-failure-reset]');
    resetButton.hidden = false;
    resetButton.addEventListener('click', async () => {
      if (!window.confirm('此操作会永久删除当前浏览器中的 Holy Shift 坏档与备份。确定继续吗？')) {
        return;
      }
      resetButton.disabled = true;
      try {
        await manager.reset();
        window.location.reload();
      } catch (error) {
        resetButton.disabled = false;
        container.querySelector('[data-failure-status]').textContent =
          error instanceof Error ? error.message : '重置失败。';
      }
    });
  }
}

async function bootstrap() {
  let manager = null;
  try {
    manager = await IndexedDbSaveManager.create();
    activeSaveManager = manager;
    const loadResult = await manager.load();
    const game = new Game(container, manager, loadResult);
    game.start();
    performance.mark('hs-interactive');
    window.__holyShiftBuild = Object.freeze({
      version: '0.3.0-dev',
      branch: 'dev',
      renderer: 'three-webgl2',
      persistence: 'indexeddb-web-locks',
      world: '师老牧镇',
      combat: 'real-time-world-action'
    });
  } catch (error) {
    console.error('Holy Shift failed to start', error);
    if (error instanceof PersistenceBlockedError) {
      renderStartupFailure({
        title:
          error.reason === 'already-open'
            ? '存档正在另一标签页使用'
            : '无法安全打开存档',
        message: error.message,
        manager,
        diagnostic: error.diagnostic
      });
      return;
    }
    releaseStorageOwnership();
    renderStartupFailure({
      message:
        '游戏初始化遇到错误。请确认浏览器已启用 WebGL2、硬件加速、IndexedDB 与站点存储，随后重新加载。'
    });
  }
}

void bootstrap();
