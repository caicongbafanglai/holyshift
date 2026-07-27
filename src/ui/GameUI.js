import { ENEMIES, INTENTS, OBJECTIVES } from '../data/content';
import { estimateEnemyDamage, getIntent } from '../domain/combat';

const ACTION_LABELS = {
  attack: '普通攻击',
  defend: '防御',
  holy: '圣术'
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function statDelta(choice) {
  return [
    choice.maxHp ? `生命 +${choice.maxHp}` : '',
    choice.pow ? `力量 +${choice.pow}` : '',
    choice.arm ? `护甲 +${choice.arm}` : ''
  ]
    .filter(Boolean)
    .join(' · ');
}

export class GameUI {
  constructor(container, handlers) {
    this.container = container;
    this.handlers = handlers;
    this.toastTimer = 0;
    this.dialogueCallback = null;
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
      <div class="crosshair" aria-hidden="true"><span></span><span></span></div>

      <section class="hud hud--player" aria-label="角色状态">
        <div class="hud__brand">HOLY SHIFT <span>圣痕迁跃</span></div>
        <div class="hud__bars">
          <div class="bar bar--hp" title="生命值">
            <div class="bar__fill" data-ui="hp-fill"></div>
            <span data-ui="hp-text">12 / 12</span>
          </div>
        </div>
        <div class="hud__stats">
          <span>力量 <b data-ui="pow">4</b></span>
          <span>护甲 <b data-ui="arm">1</b></span>
          <span>信仰 <b data-ui="faith">—</b></span>
        </div>
        <div class="hud__equipment" data-ui="equipment">尚未装备圣器</div>
      </section>

      <section class="objective" aria-live="polite">
        <span class="objective__eyebrow">当前使命</span>
        <strong data-ui="objective">与守钟人弥迦交谈</strong>
        <span class="objective__distance" data-ui="objective-distance"></span>
      </section>

      <div class="view-pill">
        <span data-ui="view-mode">第三人称</span>
        <button type="button" data-action="toggle-mute" aria-label="切换静音" title="切换静音">
          <span data-ui="mute-icon">音效开</span>
        </button>
      </div>

      <aside class="key-guide" data-ui="key-guide" aria-label="操作说明">
        <button class="key-guide__toggle" type="button" data-action="toggle-guide" aria-expanded="true">
          <span>操作</span><span data-ui="guide-chevron">收起</span>
        </button>
        <div class="key-guide__body" data-ui="guide-body">
          <div><kbd>W A S D</kbd><span>移动</span></div>
          <div><kbd>鼠标</kbd><span>观察 / 点击锁定</span></div>
          <div><kbd>Shift</kbd><span>疾跑</span></div>
          <div><kbd>Space</kbd><span>跳跃</span></div>
          <div><kbd>E</kbd><span>交互</span></div>
          <div><kbd>V</kbd><span>第一 / 第三人称</span></div>
          <div><kbd>R</kbd><span>安全点复位</span></div>
          <div><kbd>Esc</kbd><span>暂停 / 设置</span></div>
        </div>
      </aside>

      <button class="interaction-prompt is-hidden" type="button" data-action="interact" data-ui="interaction">
        <kbd>E</kbd><span data-ui="interaction-text">交互</span>
      </button>

      <div class="toast is-hidden" data-ui="toast" role="status"></div>
      <div class="performance-note is-hidden" data-ui="performance-note" role="status"></div>

      <section class="overlay start-screen" data-ui="start-screen" aria-labelledby="game-title">
        <div class="start-screen__art" aria-hidden="true">
          <div class="sigil"><i></i><i></i></div>
        </div>
        <div class="start-screen__content">
          <p class="eyebrow">一段 3D 暮光圣堂冒险</p>
          <h1 id="game-title">HOLY SHIFT</h1>
          <p class="start-screen__subtitle">圣痕迁跃</p>
          <p class="start-screen__copy">
            读取敌人的下一步意图，在攻击、防御与圣术之间作出选择。
            自由探索圣岛，并在第一与第三人称之间即时切换。
          </p>
          <div class="start-screen__actions">
            <button class="button button--primary" type="button" data-action="start-continue" data-ui="continue-button">
              继续旅程
            </button>
            <button class="button button--ghost" type="button" data-action="start-new">
              开始新旅程
            </button>
          </div>
          <p class="start-screen__save" data-ui="save-summary"></p>
          <p class="start-screen__notice">
            无需登录。进度仅保存在当前浏览器；清除浏览器数据会删除存档。
          </p>
        </div>
      </section>

      <section class="overlay dialogue is-hidden" data-ui="dialogue" aria-modal="true" role="dialog">
        <div class="dialogue__card">
          <div class="portrait" aria-hidden="true"><span></span></div>
          <div class="dialogue__content">
            <p class="eyebrow" data-ui="dialogue-speaker">守钟人弥迦</p>
            <p data-ui="dialogue-text"></p>
            <button class="button button--primary" type="button" data-action="dialogue-next" data-ui="dialogue-button">
              继续
            </button>
          </div>
        </div>
      </section>

      <section class="overlay choice is-hidden" data-ui="choice" aria-modal="true" role="dialog">
        <div class="panel panel--choice">
          <p class="eyebrow">成长抉择</p>
          <h2 data-ui="choice-title">选择圣器</h2>
          <p data-ui="choice-copy"></p>
          <div class="choice-grid" data-ui="choice-grid"></div>
          <p class="choice__notice" data-ui="choice-notice">选择后立即装备并自动保存，未选择的物品不能取回。</p>
        </div>
      </section>

      <section class="overlay combat is-hidden" data-ui="combat" aria-modal="true" role="dialog">
        <div class="combat__frame">
          <header class="combat__header">
            <div>
              <p class="eyebrow" data-ui="combat-title">第一道试炼</p>
              <h2 data-ui="enemy-name">蚀誓守卫</h2>
            </div>
            <div class="round">回合 <b data-ui="round">1</b></div>
          </header>
          <div class="combat__intent">
            <span class="intent-icon" data-ui="intent-icon">!</span>
            <div>
              <span>敌人意图</span>
              <strong data-ui="intent-label">普通攻击</strong>
              <small data-ui="intent-detail"></small>
            </div>
          </div>
          <div class="combatants">
            <article class="combatant">
              <span>守誓者</span>
              <div class="bar bar--hp bar--large">
                <div class="bar__fill" data-ui="combat-player-fill"></div>
                <b data-ui="combat-player-hp"></b>
              </div>
              <small data-ui="combat-player-status"></small>
            </article>
            <div class="versus">VS</div>
            <article class="combatant combatant--enemy">
              <span data-ui="combat-enemy-name"></span>
              <div class="bar bar--enemy bar--large">
                <div class="bar__fill" data-ui="combat-enemy-fill"></div>
                <b data-ui="combat-enemy-hp"></b>
              </div>
              <small data-ui="combat-enemy-status"></small>
            </article>
          </div>
          <div class="verdict is-hidden" data-ui="verdict">
            裁决印记 <span data-ui="verdict-marks">○ ○ ○</span>
            <small>连续三次普通攻击将触发致命反噬；防御或圣术可清除。</small>
          </div>
          <div class="combat__log" data-ui="combat-log" aria-live="polite"></div>
          <div class="combat__actions" data-ui="combat-actions">
            <button type="button" class="combat-action" data-action="combat" data-value="attack">
              <kbd>1</kbd><strong>普通攻击</strong><span>造成基础伤害 · 信仰 +1</span>
            </button>
            <button type="button" class="combat-action" data-action="combat" data-value="defend">
              <kbd>2</kbd><strong>防御</strong><span>下次伤害减半 · 信仰 +1</span>
            </button>
            <button type="button" class="combat-action combat-action--holy" data-action="combat" data-value="holy">
              <kbd>3</kbd><strong>圣术</strong><span>2 倍伤害 · 消耗 2 信仰</span>
            </button>
          </div>
          <div class="combat__result is-hidden" data-ui="combat-result">
            <h3 data-ui="combat-result-title"></h3>
            <p data-ui="combat-result-copy"></p>
            <button class="button button--primary" type="button" data-action="combat-result" data-ui="combat-result-button">
              继续
            </button>
          </div>
        </div>
      </section>

      <section class="overlay pause is-hidden" data-ui="pause" aria-modal="true" role="dialog">
        <div class="panel panel--pause">
          <p class="eyebrow">旅程暂停</p>
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
              <option value="auto">自动（推荐）</option>
              <option value="high">高</option>
              <option value="low">低</option>
            </select>
          </label>
          <div class="pause__actions">
            <button class="button button--primary" type="button" data-action="resume">返回游戏</button>
            <button class="button button--ghost" type="button" data-action="safe-reset">返回安全点</button>
            <button class="button button--danger" type="button" data-action="restart">重开旅程</button>
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
        当前窗口小于 640×360，无法可靠完成游戏。请放大窗口或降低浏览器缩放。
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
      const action = button.dataset.action;
      const value = button.dataset.value;
      const kind = button.dataset.kind;
      this.handlers.onAction?.(action, value, kind);
    });

    this.root.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || !this.activeModal) return;
      const focusable = [
        ...this.activeModal.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ].filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
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
      ? `已有存档 · ${OBJECTIVES[save.progress]} · ${Math.max(1, Math.floor(save.playSeconds / 60))} 分钟`
      : '尚无存档；开始后会在任务、胜利和奖励节点自动保存。';
    this.applySettings(save.settings);
    this.focusModal(this.elements['start-screen']);
  }

  hideStart() {
    this.elements['start-screen'].classList.add('is-hidden');
    this.releaseModal(this.elements['start-screen']);
  }

  updateHud({ save, stats, cameraLabel, objectivePosition, playerPosition, interaction, fps }) {
    this.elements['hp-fill'].style.width = '100%';
    this.elements['hp-text'].textContent = `${stats.maxHp} / ${stats.maxHp}`;
    this.elements.pow.textContent = String(stats.pow);
    this.elements.arm.textContent = String(stats.arm);
    this.elements.faith.textContent = '—';
    this.elements['view-mode'].textContent = cameraLabel;
    this.elements.objective.textContent = OBJECTIVES[save.progress];
    const equipment = [
      save.loadout.weaponId
        ? ['晨刃', '守誓锤'].find((_, index) =>
            index === (save.loadout.weaponId === 'dawnblade' ? 0 : 1)
          )
        : null,
      save.loadout.relicId
        ? save.loadout.relicId === 'lifeamulet'
          ? '生命护符'
          : '铁印'
        : null
    ].filter(Boolean);
    this.elements.equipment.textContent =
      equipment.length > 0 ? equipment.join(' · ') : '尚未装备圣器';

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
  }

  showDialogue({ speaker, text, button = '继续' }, callback) {
    this.dialogueCallback = callback;
    this.elements['dialogue-speaker'].textContent = speaker;
    this.elements['dialogue-text'].textContent = text;
    this.elements['dialogue-button'].textContent = button;
    this.elements.dialogue.classList.remove('is-hidden');
    this.focusModal(this.elements.dialogue);
  }

  closeDialogue() {
    this.elements.dialogue.classList.add('is-hidden');
    this.releaseModal(this.elements.dialogue);
    const callback = this.dialogueCallback;
    this.dialogueCallback = null;
    callback?.();
  }

  showChoice({ title, copy, choices, kind }) {
    delete this.elements['choice-grid'].dataset.relic;
    delete this.elements['choice-grid'].dataset.growth;
    this.elements['choice-title'].textContent = title;
    this.elements['choice-copy'].textContent = copy;
    this.elements['choice-grid'].innerHTML = choices
      .map(
        (choice) => `
          <button class="choice-card" type="button" data-action="choice" data-kind="${escapeHtml(kind)}" data-value="${escapeHtml(choice.id)}">
            <span class="choice-card__sigil" aria-hidden="true"></span>
            <strong>${escapeHtml(choice.name)}</strong>
            <b>${escapeHtml(statDelta(choice))}</b>
            <span>${escapeHtml(choice.description)}</span>
          </button>
        `
      )
      .join('');
    this.elements['choice-grid'].classList.remove('reward-bundle');
    this.elements['choice-notice'].textContent =
      '选择后立即装备并自动保存，未选择的物品不能取回。';
    this.elements.choice.classList.remove('is-hidden');
    this.focusModal(this.elements.choice);
  }

  showRewardBundle({ relics, growths }) {
    delete this.elements['choice-grid'].dataset.relic;
    delete this.elements['choice-grid'].dataset.growth;
    const renderGroup = (label, choices, kind) => `
      <section class="reward-group" aria-labelledby="reward-${escapeHtml(kind)}">
        <h3 id="reward-${escapeHtml(kind)}">${escapeHtml(label)}</h3>
        <div class="reward-group__choices">
          ${choices
            .map(
              (choice) => `
                <button
                  class="choice-card choice-card--compact"
                  type="button"
                  aria-pressed="false"
                  data-action="reward-draft"
                  data-kind="${escapeHtml(kind)}"
                  data-value="${escapeHtml(choice.id)}"
                >
                  <strong>${escapeHtml(choice.name)}</strong>
                  <b>${escapeHtml(statDelta(choice))}</b>
                  <span>${escapeHtml(choice.description)}</span>
                </button>
              `
            )
            .join('')}
        </div>
      </section>
    `;

    this.elements['choice-title'].textContent = '完成圣器与成长抉择';
    this.elements['choice-copy'].textContent =
      '先各选一项，再一次确认。确认前不会写入任何奖励，刷新会清空未提交草稿。';
    this.elements['choice-grid'].classList.add('reward-bundle');
    this.elements['choice-grid'].innerHTML = `
      ${renderGroup('第二件圣器', relics, 'relic')}
      ${renderGroup('永久成长', growths, 'growth')}
      <button
        class="button button--primary reward-confirm"
        type="button"
        data-action="reward-confirm"
        disabled
      >
        确认并保存两项选择
      </button>
    `;
    this.elements['choice-notice'].textContent =
      '两项选择会在同一个原子事务中装备、推进任务并消费奖励事件。';
    this.elements.choice.classList.remove('is-hidden');
    this.focusModal(this.elements.choice);
  }

  updateRewardDraft(kind, id) {
    this.elements['choice-grid']
      .querySelectorAll(`[data-action="reward-draft"][data-kind="${kind}"]`)
      .forEach((button) => {
        const selected = button.dataset.value === id;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    this.elements['choice-grid'].dataset[kind] = id;
    const confirm = this.elements['choice-grid'].querySelector(
      '[data-action="reward-confirm"]'
    );
    confirm.disabled = !(
      this.elements['choice-grid'].dataset.relic &&
      this.elements['choice-grid'].dataset.growth
    );
  }

  hideChoice() {
    this.elements.choice.classList.add('is-hidden');
    this.releaseModal(this.elements.choice);
  }

  showCombat(state) {
    const enemy = ENEMIES[state.enemyId];
    this.elements.combat.classList.remove('is-hidden');
    this.elements['combat-title'].textContent = enemy.title;
    this.elements['enemy-name'].textContent = enemy.name;
    this.elements['combat-enemy-name'].textContent = enemy.name;
    this.elements.verdict.classList.toggle('is-hidden', state.enemyId !== 'boss');
    this.elements['combat-result'].classList.add('is-hidden');
    this.elements['combat-actions'].classList.remove('is-hidden');
    this.updateCombat(state);
    this.focusModal(this.elements.combat);
  }

  updateCombat(state) {
    const intent = getIntent(state);
    const intentInfo = INTENTS[intent];
    const estimate = estimateEnemyDamage(state);
    this.elements.round.textContent = String(state.round);
    this.elements['intent-label'].textContent = intentInfo.label;
    this.elements['intent-icon'].textContent =
      intent === 'heavy' ? '!!' : intent === 'defend' ? '◇' : '!';
    this.elements['intent-detail'].textContent =
      intent === 'defend'
        ? intentInfo.description
        : `${intentInfo.description} 预计造成 ${estimate} 点伤害。`;

    const playerPercent = (state.player.hp / state.player.maxHp) * 100;
    const enemyPercent = (state.enemy.hp / state.enemy.maxHp) * 100;
    this.elements['combat-player-fill'].style.width = `${playerPercent}%`;
    this.elements['combat-enemy-fill'].style.width = `${enemyPercent}%`;
    this.elements['combat-player-hp'].textContent = `${state.player.hp} / ${state.player.maxHp}`;
    this.elements['combat-enemy-hp'].textContent = `${state.enemy.hp} / ${state.enemy.maxHp}`;
    this.elements['combat-player-status'].textContent =
      `力量 ${state.player.pow} · 护甲 ${state.player.arm} · 信仰 ${state.faith}/3` +
      (state.player.defending ? ' · 防御中' : '');
    this.elements['combat-enemy-status'].textContent =
      `力量 ${state.enemy.pow} · 护甲 ${state.enemy.arm}` +
      (state.enemy.defending ? ' · 圣盾生效' : '');
    this.elements.faith.textContent = `${state.faith}/3`;
    this.elements['verdict-marks'].textContent = [0, 1, 2]
      .map((index) => (index < state.normalAttackStreak ? '●' : '○'))
      .join(' ');
    this.elements['combat-log'].innerHTML = state.log
      .slice(-5)
      .map((entry) => `<p>${escapeHtml(entry)}</p>`)
      .join('');

    const holyButton = this.root.querySelector('[data-action="combat"][data-value="holy"]');
    holyButton.disabled = state.faith < 2 || state.status !== 'active';
    holyButton.title =
      state.faith < 2 ? `信仰不足：需要 2，当前 ${state.faith}` : '消耗 2 点信仰';
    this.root.querySelectorAll('[data-action="combat"]').forEach((button) => {
      if (button.dataset.value !== 'holy') button.disabled = state.status !== 'active';
    });
  }

  showCombatResult(state) {
    const victory = state.status === 'victory';
    this.elements['combat-actions'].classList.add('is-hidden');
    this.elements['combat-result'].classList.remove('is-hidden');
    this.elements['combat-result-title'].textContent = victory ? '试炼通过' : '裁决失败';
    this.elements['combat-result-copy'].textContent = victory
      ? `${state.enemy.name} 已被击败。奖励与安全检查点将在离开战斗时保存。`
      : '不会丢失已结算奖励。你将以满生命从本场战斗开始处重试。';
    this.elements['combat-result-button'].textContent = victory ? '返回探索' : '重新挑战';
    this.announce(victory ? '战斗胜利' : '战斗失败，可以重新挑战');
  }

  hideCombat() {
    this.elements.combat.classList.add('is-hidden');
    this.releaseModal(this.elements.combat);
    this.elements.faith.textContent = '—';
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
    this.elements['key-guide'].classList.toggle('is-collapsed', !settings.keyGuideExpanded);
    this.elements['guide-body'].classList.toggle('is-hidden', !settings.keyGuideExpanded);
    this.elements['guide-chevron'].textContent = settings.keyGuideExpanded ? '收起' : '展开';
    this.root
      .querySelector('[data-action="toggle-guide"]')
      .setAttribute('aria-expanded', String(settings.keyGuideExpanded));
    this.elements['mute-icon'].textContent = settings.muted ? '已静音' : '音效开';
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion);
  }

  showToast(message, duration = 3200) {
    const toast = this.elements.toast;
    toast.textContent = message;
    toast.classList.remove('is-hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.add('is-hidden'), duration);
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

  toggleGuide(expanded) {
    this.elements['key-guide'].classList.toggle('is-collapsed', !expanded);
    this.elements['guide-body'].classList.toggle('is-hidden', !expanded);
    this.elements['guide-chevron'].textContent = expanded ? '收起' : '展开';
    const button = this.root.querySelector('[data-action="toggle-guide"]');
    button.setAttribute('aria-expanded', String(expanded));
  }

  isModalOpen() {
    return ['start-screen', 'dialogue', 'choice', 'combat', 'pause', 'fatal'].some(
      (name) => !this.elements[name].classList.contains('is-hidden')
    );
  }

  focusModal(modal) {
    this.lastFocused = document.activeElement;
    this.activeModal = modal;
    requestAnimationFrame(() => modal.querySelector('button:not([disabled]), input, select')?.focus());
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
