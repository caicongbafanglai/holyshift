import { OBJECTIVES, PLAYER_COMBAT } from '../data/content.ts';

function formatMinutes(seconds) {
  return Math.max(1, Math.floor(seconds / 60));
}

export class GameUI {
  constructor(container, handlers) {
    this.container = container;
    this.handlers = handlers;
    this.toastTimer = 0;
    this.chapterTimer = 0;
    this.lastFocused = null;
    this.activeModal = null;
    this.renderShell();
    this.bind();
  }

  renderShell() {
    this.root = document.createElement('div');
    this.root.className = 'game-ui';
    this.root.innerHTML = `
      <div class="vignette" aria-hidden="true"></div>
      <div class="damage-flash" data-ui="damage-flash" aria-hidden="true"></div>
      <div class="crosshair" aria-hidden="true"><span></span><span></span><i></i></div>
      <div class="hit-numbers" data-ui="hit-numbers" aria-hidden="true"></div>

      <section class="hud hud--player" aria-label="老牧师状态">
        <div class="hud__identity">
          <div class="hud__seal" aria-hidden="true">牧</div>
          <div>
            <strong>老牧师</strong>
            <span>私募教堂 · 师牧会会长</span>
          </div>
        </div>
        <div class="resource resource--hp" title="生命">
          <span>生命</span>
          <div><i data-ui="hp-fill"></i></div>
          <b data-ui="hp-text">120 / 120</b>
        </div>
        <div class="resource resource--stamina" title="耐力">
          <span>耐力</span>
          <div><i data-ui="stamina-fill"></i></div>
          <b data-ui="stamina-text">100</b>
        </div>
        <div class="resource resource--shift" title="Holy Shift 能量">
          <span>SHIFT</span>
          <div><i data-ui="shift-fill"></i></div>
          <b data-ui="shift-text">0 / 100</b>
        </div>
      </section>

      <section class="objective" aria-live="polite">
        <span>第一章 · 圣水有点生</span>
        <strong data-ui="objective">与牧司学姐确认圣水异常</strong>
        <b data-ui="objective-distance"></b>
      </section>

      <div class="view-pill">
        <span data-ui="view-mode">第三人称</span>
        <button type="button" data-action="toggle-mute" aria-label="切换静音">
          <span data-ui="mute-icon">音效开</span>
        </button>
      </div>

      <aside class="combat-keys" aria-label="战斗操作">
        <div><kbd>左键 / J</kbd><span><b>手杖连击</b><small>三段场景攻击</small></span></div>
        <div><kbd>右键 / Q</kbd><span><b>Holy Shift</b><small>大范围高伤 · 耗 40 SHIFT</small></span></div>
        <div><kbd>Ctrl</kbd><span><b>闪避</b><small>单按 · 消耗 24 耐力</small></span></div>
      </aside>

      <aside class="key-guide" data-ui="key-guide" aria-label="操作说明">
        <button class="key-guide__toggle" type="button" data-action="toggle-guide" aria-expanded="true">
          <span>完整操作</span><span data-ui="guide-chevron">收起</span>
        </button>
        <div class="key-guide__body" data-ui="guide-body">
          <div><kbd>W A S D</kbd><span>移动</span></div>
          <div><kbd>鼠标</kbd><span>观察 / 点击锁定</span></div>
          <div><kbd>Shift</kbd><span>疾跑 · 点按回 SHIFT</span></div>
          <div><kbd>Space</kbd><span>跳跃</span></div>
          <div class="key-guide__wide"><kbd>Ctrl + Shift + W A S D</kbd><span>视向飞行 · 俯视滑翔回耐</span></div>
          <div><kbd>E</kbd><span>调查 / 交谈</span></div>
          <div><kbd>V</kbd><span>第一 / 第三人称</span></div>
          <div><kbd>R</kbd><span>安全点复位</span></div>
          <div><kbd>Esc</kbd><span>暂停 / 设置</span></div>
        </div>
      </aside>

      <button class="interaction-prompt is-hidden" type="button" data-action="interact" data-ui="interaction">
        <kbd>E</kbd><span data-ui="interaction-text">交互</span>
      </button>

      <section class="boss-bar is-hidden" data-ui="boss-bar" aria-label="首领生命">
        <span>异常已获审批</span>
        <strong data-ui="boss-name">已审批水鬼</strong>
        <div><i data-ui="boss-fill"></i></div>
        <b data-ui="boss-hp"></b>
      </section>

      <div class="toast is-hidden" data-ui="toast" role="status"></div>
      <div class="performance-note is-hidden" data-ui="performance-note" role="status"></div>
      <div class="chapter-card is-hidden" data-ui="chapter-card" role="status">
        <span data-ui="chapter-eyebrow">主线更新</span>
        <strong data-ui="chapter-title"></strong>
      </div>

      <section class="dialogue-strip is-hidden" data-ui="dialogue" aria-live="polite">
        <div class="dialogue-strip__portrait" data-ui="dialogue-portrait" aria-hidden="true">牧</div>
        <div class="dialogue-strip__content">
          <strong data-ui="dialogue-speaker"></strong>
          <p data-ui="dialogue-text"></p>
        </div>
        <button type="button" data-action="dialogue-next" data-ui="dialogue-button">
          继续 <kbd>E</kbd>
        </button>
      </section>

      <section class="overlay start-screen" data-ui="start-screen" aria-labelledby="game-title">
        <div class="start-screen__skyline" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i>
        </div>
        <div class="start-screen__content">
          <p class="eyebrow">原创 3D 动作 RPG · 基础世界观 v0.3</p>
          <h1 id="game-title">HOLY SHIFT</h1>
          <p class="start-screen__subtitle">师老牧镇 · 圣水有点生</p>
          <p class="start-screen__copy">
            在高级、神圣、干净但制度离谱的环水小岛，
            扮演师牧会会长老牧师，把错位的概念移回原位。
            战斗全程发生在 3D 广场中。
          </p>
          <div class="start-screen__actions">
            <button class="button button--primary" type="button" data-action="start-continue" data-ui="continue-button">
              继续第一章
            </button>
            <button class="button button--ghost" type="button" data-action="start-new">
              开始新旅程
            </button>
          </div>
          <p class="start-screen__save" data-ui="save-summary"></p>
          <p class="start-screen__notice">
            无需登录。存档只保存在当前浏览器；清除站点数据会删除进度。
          </p>
        </div>
      </section>

      <section class="overlay pause is-hidden" data-ui="pause" aria-modal="true" role="dialog">
        <div class="panel panel--pause">
          <p class="eyebrow">牧已成舟 · 旅程暂停</p>
          <h2>设置</h2>
          <label class="setting">
            <span>音量</span>
            <input data-ui="volume" type="range" min="0" max="1" step="0.05" value="0.7" />
          </label>
          <label class="setting setting--check">
            <input data-ui="reduced-motion" type="checkbox" />
            <span>减少动态效果</span>
          </label>
          <label class="setting">
            <span>画质</span>
            <select data-ui="quality">
              <option value="auto">自动（流畅优先）</option>
              <option value="high">高</option>
              <option value="low">低</option>
            </select>
          </label>
          <div class="pause__actions">
            <button class="button button--primary" type="button" data-action="resume">返回游戏</button>
            <button class="button button--ghost" type="button" data-action="safe-reset">返回安全点</button>
            <button class="button button--danger" type="button" data-action="restart">重开第一章</button>
          </div>
          <p class="pause__meta" data-ui="pause-meta"></p>
        </div>
      </section>

      <section class="fatal is-hidden" data-ui="fatal" role="alert">
        <div>
          <h1>无法启动 3D 场景</h1>
          <p data-ui="fatal-copy"></p>
          <button class="button button--primary" type="button" data-action="reload">重新加载</button>
        </div>
      </section>

      <div class="viewport-warning">
        当前窗口小于 640×360，无法可靠完成实时战斗。请放大窗口或降低浏览器缩放。
      </div>
      <div class="sr-only" aria-live="assertive" data-ui="live"></div>
    `;
    this.container.appendChild(this.root);
    this.cacheElements();
  }

  cacheElements() {
    this.elements = {};
    this.root.querySelectorAll('[data-ui]').forEach((element) => {
      this.elements[element.dataset.ui] = element;
    });
  }

  bind() {
    this.root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      this.handlers.onAction?.(
        button.dataset.action,
        button.dataset.value,
        button.dataset.kind
      );
    });
    this.root.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || !this.activeModal) return;
      const focusable = [
        ...this.activeModal.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled])'
        )
      ].filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    this.elements.volume.addEventListener('input', (event) => {
      this.handlers.onSetting?.('volume', Number(event.target.value));
    });
    this.elements['reduced-motion'].addEventListener('change', (event) => {
      this.handlers.onSetting?.('reducedMotion', event.target.checked);
    });
    this.elements.quality.addEventListener('change', (event) => {
      this.handlers.onSetting?.('quality', event.target.value);
    });
  }

  showStart(save, hasSave) {
    this.elements['start-screen'].classList.remove('is-hidden');
    this.elements['continue-button'].classList.toggle('is-hidden', !hasSave);
    this.elements['save-summary'].textContent = hasSave
      ? `已有存档 · ${OBJECTIVES[save.progress]} · ${formatMinutes(save.playSeconds)} 分钟`
      : '尚无存档；任务节点、战斗胜利与设置都会自动保存。';
    this.applySettings(save.settings);
    this.focusModal(this.elements['start-screen']);
  }

  hideStart() {
    this.elements['start-screen'].classList.add('is-hidden');
    this.releaseModal(this.elements['start-screen']);
  }

  updateHud({
    save,
    cameraLabel,
    objectivePosition,
    playerPosition,
    interaction,
    fps,
    boss
  }) {
    const hpPercent = (save.player.hp / PLAYER_COMBAT.maxHp) * 100;
    const staminaPercent = (save.player.stamina / PLAYER_COMBAT.maxStamina) * 100;
    const shiftPercent = (save.player.shift / PLAYER_COMBAT.maxShift) * 100;
    this.elements['hp-fill'].style.width = `${hpPercent}%`;
    this.elements['stamina-fill'].style.width = `${staminaPercent}%`;
    this.elements['shift-fill'].style.width = `${shiftPercent}%`;
    this.elements['hp-text'].textContent =
      `${Math.ceil(save.player.hp)} / ${PLAYER_COMBAT.maxHp}`;
    this.elements['stamina-text'].textContent =
      String(Math.floor(save.player.stamina));
    this.elements['shift-text'].textContent =
      `${Math.floor(save.player.shift)} / ${PLAYER_COMBAT.maxShift}`;
    this.elements['view-mode'].textContent = cameraLabel;
    this.elements.objective.textContent = OBJECTIVES[save.progress];

    if (objectivePosition) {
      const distance = Math.hypot(
        objectivePosition.x - playerPosition.x,
        objectivePosition.z - playerPosition.z
      );
      this.elements['objective-distance'].textContent = `${Math.round(distance)} m`;
    } else {
      this.elements['objective-distance'].textContent = '';
    }

    this.elements.interaction.classList.toggle('is-hidden', !interaction);
    if (interaction) this.elements['interaction-text'].textContent = interaction;
    this.elements['pause-meta'].textContent =
      `已游玩 ${Math.floor(save.playSeconds / 60)} 分钟 · ${cameraLabel} · ${fps.toFixed(0)} FPS`;

    this.elements['boss-bar'].classList.toggle('is-hidden', !boss);
    if (boss) {
      this.elements['boss-name'].textContent = boss.definition.name;
      this.elements['boss-fill'].style.width = `${boss.healthRatio * 100}%`;
      this.elements['boss-hp'].textContent = `${boss.hp} / ${boss.definition.maxHp}`;
    }
  }

  showDialogue({ speaker, text, final = false }) {
    this.elements['dialogue-speaker'].textContent = speaker;
    this.elements['dialogue-text'].textContent = text;
    this.elements['dialogue-portrait'].textContent = speaker === 'Pingu'
      ? '嘎'
      : speaker.slice(0, 1);
    this.elements['dialogue-button'].childNodes[0].textContent =
      final ? '结束 ' : '继续 ';
    this.elements.dialogue.classList.remove('is-hidden');
  }

  hideDialogue() {
    this.elements.dialogue.classList.add('is-hidden');
  }

  showChapterUpdate(title, eyebrow = '主线更新', duration = 2600) {
    this.elements['chapter-eyebrow'].textContent = eyebrow;
    this.elements['chapter-title'].textContent = title;
    this.elements['chapter-card'].classList.remove('is-hidden');
    window.clearTimeout(this.chapterTimer);
    this.chapterTimer = window.setTimeout(
      () => this.elements['chapter-card'].classList.add('is-hidden'),
      duration
    );
  }

  showHit({ amount, kind }) {
    const number = document.createElement('b');
    number.className = `hit-number hit-number--${kind}`;
    number.textContent = `-${amount}`;
    number.style.setProperty('--hit-x', `${46 + Math.random() * 8}%`);
    number.style.setProperty('--hit-y', `${42 + Math.random() * 9}%`);
    this.elements['hit-numbers'].appendChild(number);
    window.setTimeout(() => number.remove(), 760);
  }

  flashDamage() {
    const flash = this.elements['damage-flash'];
    flash.classList.remove('is-active');
    void flash.offsetWidth;
    flash.classList.add('is-active');
  }

  showPause(save) {
    this.applySettings(save.settings);
    this.elements.pause.classList.remove('is-hidden');
    this.focusModal(this.elements.pause);
  }

  hidePause() {
    this.elements.pause.classList.add('is-hidden');
    this.releaseModal(this.elements.pause);
  }

  applySettings(settings) {
    this.elements.volume.value = String(settings.volume);
    this.elements['reduced-motion'].checked = settings.reducedMotion;
    this.elements.quality.value = settings.quality;
    this.elements['key-guide'].classList.toggle(
      'is-collapsed',
      !settings.keyGuideExpanded
    );
    this.elements['guide-body'].classList.toggle(
      'is-hidden',
      !settings.keyGuideExpanded
    );
    this.elements['guide-chevron'].textContent =
      settings.keyGuideExpanded ? '收起' : '展开';
    this.root
      .querySelector('[data-action="toggle-guide"]')
      .setAttribute('aria-expanded', String(settings.keyGuideExpanded));
    this.elements['mute-icon'].textContent = settings.muted ? '已静音' : '音效开';
    document.documentElement.classList.toggle(
      'reduce-motion',
      settings.reducedMotion
    );
  }

  toggleGuide(expanded) {
    this.elements['key-guide'].classList.toggle('is-collapsed', !expanded);
    this.elements['guide-body'].classList.toggle('is-hidden', !expanded);
    this.elements['guide-chevron'].textContent = expanded ? '收起' : '展开';
    this.root
      .querySelector('[data-action="toggle-guide"]')
      .setAttribute('aria-expanded', String(expanded));
  }

  showToast(message, duration = 3200) {
    const toast = this.elements.toast;
    toast.textContent = message;
    toast.classList.remove('is-hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(
      () => toast.classList.add('is-hidden'),
      duration
    );
    this.announce(message);
  }

  showPerformanceNotice(message) {
    const note = this.elements['performance-note'];
    note.textContent = message;
    note.classList.remove('is-hidden');
    window.setTimeout(() => note.classList.add('is-hidden'), 5000);
  }

  showFatal(message) {
    this.elements['fatal-copy'].textContent = message;
    this.elements.fatal.classList.remove('is-hidden');
    this.focusModal(this.elements.fatal);
  }

  isModalOpen() {
    return ['start-screen', 'pause', 'fatal'].some(
      (name) => !this.elements[name].classList.contains('is-hidden')
    );
  }

  focusModal(modal) {
    this.lastFocused = document.activeElement;
    this.activeModal = modal;
    requestAnimationFrame(() => {
      modal.querySelector('button:not([disabled]), input, select')?.focus();
    });
  }

  releaseModal(modal) {
    if (this.activeModal === modal) this.activeModal = null;
  }

  announce(message) {
    this.elements.live.textContent = '';
    requestAnimationFrame(() => {
      this.elements.live.textContent = message;
    });
  }
}
