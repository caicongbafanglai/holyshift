import { AudioSystem } from './AudioSystem.js';
import { CameraController } from './CameraController.js';
import { InputManager } from './InputManager.js';
import { Renderer } from './Renderer.js';
import { GameUI } from '../ui/GameUI.js';
import { SanctuaryWorld } from '../world/SanctuaryWorld.js';
import {
  CHECKPOINTS,
  GROWTHS,
  RELICS,
  STORY,
  WEAPONS
} from '../data/content.ts';
import {
  createBattle,
  derivePlayerStats,
  performAction
} from '../domain/combat.ts';
import {
  createNewSave
} from '../domain/save.ts';
import { collidesAt, findWalkableGround } from '../entities/Player.js';

const INTERACTION_LABELS = {
  npc: '与守钟人弥迦交谈',
  sentry: '挑战蚀誓守卫',
  warden: '挑战灰烬典狱官',
  boss: '接受最终裁决',
  elite: '挑战无名守墓人',
  weaponShrine: '选择一件武器',
  relicShrine: '触碰圣物祭台'
};

const PROGRESS_AFTER_BATTLE = {
  sentry: 'sentryDefeated',
  warden: 'wardenDefeated',
  boss: 'bossDefeated'
};

const BATTLE_STORY = {
  sentry: STORY.sentry,
  warden: STORY.warden,
  boss: STORY.boss,
  elite: STORY.elite
};

export class Game {
  constructor(container, saveManager, loadResult) {
    this.container = container;
    this.lastFrameTime = performance.now();
    this.mode = 'start';
    this.started = false;
    this.currentBattle = null;
    this.currentBattleId = null;
    this.pendingRewardDraft = null;
    this.hudTimer = 0;
    this.integrityTimer = 0;
    this.autosaveTimer = 0;
    this.externalConflict = false;
    this.animationFrame = null;
    this.dialogueSequence = 0;

    this.saveManager = saveManager;
    this.save = loadResult.save;
    this.hasSave = this.save.revision > 0;

    this.renderer = new Renderer(container, this.save.settings.quality);
    this.world = new SanctuaryWorld();
    this.camera = new CameraController(container);
    this.camera.setCollisionObjects(this.world.cameraCollisionMeshes);
    this.input = new InputManager(this.renderer.instance.domElement);
    this.audio = new AudioSystem(this.save.settings);
    this.ui = new GameUI(container, {
      onAction: (action, value, kind) => this.handleUiAction(action, value, kind),
      onSetting: (name, value) => this.handleSetting(name, value)
    });

    this.world.applyProgress(this.save.progress, this.save.defeated);
    this.world.setCheckpoint(CHECKPOINTS[this.save.progress], false);
    this.applySettings();
    this.ui.showStart(this.save, this.hasSave);
    loadResult.warnings.forEach((warning) => this.ui.showToast(warning, 6000));
    this.input.setEnabled(false);

    this.installEvents();
    this.installLocalTestBridge();
  }

  installEvents() {
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.camera.resize();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.started && !this.externalConflict) {
        void this.commitSave('页面隐藏', false);
      }
    });
  }

  installLocalTestBridge() {
    const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
    if (
      !localHosts.has(window.location.hostname) ||
      new URLSearchParams(window.location.search).get('e2e') !== '1'
    ) {
      return;
    }

    const bridge = Object.freeze({
      teleportTo: (id) => {
        if (!this.started || this.mode !== 'explore') return false;
        const target = this.world.interactableObjects.get(id);
        if (!target?.visible) return false;
        this.world.player.position.set(target.position.x, 0, target.position.z + 3.05);
        this.world.player.landOnGround({ y: 0 });
        this.camera.resetView();
        this.updateHud();
        return true;
      },
      snapshot: () => ({
        mode: this.mode,
        progress: this.save.progress,
        defeated: { ...this.save.defeated },
        optionalMemento: this.save.optionalMemento,
        position: this.world.player.position.toArray(),
        renderer: this.renderer.stats
      })
    });

    Object.defineProperty(window, '__holyShiftTest', {
      value: bridge,
      configurable: true
    });
  }

  start() {
    this.loop();
  }

  focusCanvas() {
    requestAnimationFrame(() => {
      this.renderer.instance.domElement.focus({ preventScroll: true });
    });
  }

  handleUiAction(action, value, kind) {
    switch (action) {
      case 'start-continue':
        void this.continueGame();
        break;
      case 'start-new':
        void this.startNewGame();
        break;
      case 'interact':
        this.interact();
        break;
      case 'toggle-mute':
        this.setMuted(!this.save.settings.muted);
        break;
      case 'toggle-guide':
        this.save.settings.keyGuideExpanded = !this.save.settings.keyGuideExpanded;
        this.ui.toggleGuide(this.save.settings.keyGuideExpanded);
        void this.commitSave('键位面板设置', false);
        break;
      case 'dialogue-next':
        this.ui.closeDialogue();
        break;
      case 'choice':
        void this.selectChoice(kind, value);
        break;
      case 'reward-draft':
        this.selectRewardDraft(kind, value);
        break;
      case 'reward-confirm':
        void this.confirmRewardBundle();
        break;
      case 'combat':
        this.combatAction(value);
        break;
      case 'combat-result':
        void this.finishCombatResult();
        break;
      case 'resume':
        this.resume();
        break;
      case 'safe-reset':
        this.safeReset();
        this.resume();
        break;
      case 'restart':
        void this.startNewGame(true);
        break;
      case 'reload':
        window.location.reload();
        break;
      default:
        break;
    }
  }

  async continueGame() {
    if (this.started) return;
    this.started = true;
    this.mode = 'explore';
    const activeBattle =
      this.save.checkpoint?.kind === 'inBattle'
        ? this.save.checkpoint
        : null;
    if (activeBattle) {
      this.save.progress = activeBattle.progressSnapshot;
      this.save.loadout = { ...activeBattle.loadoutSnapshot };
    }
    this.world.applyProgress(this.save.progress, this.save.defeated);
    this.world.setCheckpoint(CHECKPOINTS[this.save.progress], true);
    this.camera.resetView();
    this.ui.hideStart();
    this.ui.hidePause();
    this.input.setEnabled(true);
    this.renderer.resetPerformanceSamples();
    this.audio.resume();
    this.focusCanvas();
    this.ui.showToast('已从最近的安全检查点继续。');
    if (activeBattle) {
      await this.startBattle(activeBattle.battleId, false);
    }
  }

  async startNewGame(fromPause = false) {
    if (this.mode === 'saving') return;
    if (
      this.hasSave &&
      !window.confirm('开始新旅程会删除当前本地进度。确定继续吗？')
    ) {
      return;
    }
    this.mode = 'saving';
    this.save = createNewSave(this.saveManager.writerId);
    if (!(await this.commitSave('创建新旅程'))) {
      this.hasSave = false;
      this.mode = fromPause ? 'pause' : 'start';
      return;
    }
    this.hasSave = true;
    this.externalConflict = false;
    this.started = true;
    this.currentBattle = null;
    this.currentBattleId = null;
    this.mode = 'explore';
    this.world.applyProgress(this.save.progress, this.save.defeated);
    this.world.setCheckpoint(CHECKPOINTS.prologue, true);
    this.camera.resetView();
    this.ui.hideStart();
    this.ui.hidePause();
    this.ui.hideCombat();
    this.ui.hideChoice();
    this.input.setEnabled(true);
    this.renderer.resetPerformanceSamples();
    this.audio.resume();
    this.focusCanvas();
    if (fromPause) this.ui.showToast('新旅程已经开始。');
  }

  interact() {
    if (this.mode !== 'explore') return;
    const nearest = this.world.getNearestInteractable(
      this.save.progress,
      this.save.defeated
    );
    if (!nearest) return;
    this.audio.play('interact');

    switch (nearest.id) {
      case 'npc':
        if (this.save.progress === 'prologue') {
          this.showDialogue('守钟人弥迦', STORY.prologue, '听取使命', () => {
            this.showDialogue('守钟人弥迦', STORY.quest, '接受使命', () => {
              this.save.progress = 'questAccepted';
              void this.progressChanged('接受主线任务');
            });
          });
        } else if (this.save.progress === 'bossDefeated') {
          this.showDialogue('守钟人弥迦', STORY.ending, '见证复明', () => {
            void this.completeEnding();
          });
        }
        break;
      case 'sentry':
      case 'warden':
      case 'boss':
      case 'elite':
        void this.startBattle(nearest.id);
        break;
      case 'weaponShrine':
        this.showChoice(
          '选择第一件圣器',
          '武器会立即改变后续战斗。晨刃偏向力量，守誓锤提供攻守平衡。',
          WEAPONS,
          'weapon'
        );
        break;
      case 'relicShrine':
        if (this.save.progress === 'wardenDefeated') {
          this.pendingRewardDraft = {
            relicId: null,
            growthId: null
          };
          this.mode = 'choice';
          this.input.setEnabled(false);
          this.input.releasePointer();
          this.ui.showRewardBundle({
            relics: RELICS,
            growths: GROWTHS
          });
        }
        break;
      default:
        break;
    }
  }

  showDialogue(speaker, text, button, callback) {
    const sequence = ++this.dialogueSequence;
    this.mode = 'dialogue';
    this.input.setEnabled(false);
    this.input.releasePointer();
    this.ui.showDialogue({ speaker, text, button }, () => {
      callback?.();
      if (sequence === this.dialogueSequence && this.mode === 'dialogue') {
        this.mode = 'explore';
        this.input.setEnabled(true);
        this.focusCanvas();
      }
    });
  }

  showChoice(title, copy, choices, kind) {
    this.mode = 'choice';
    this.input.setEnabled(false);
    this.input.releasePointer();
    this.ui.showChoice({ title, copy, choices, kind });
  }

  async selectChoice(kind, id) {
    if (this.mode !== 'choice') return;
    if (kind === 'weapon' && WEAPONS.some((choice) => choice.id === id)) {
      const previous = structuredClone(this.save);
      this.mode = 'saving';
      this.save.loadout.weaponId = id;
      this.save.progress = 'weaponChosen';
      this.consumeCheckpointEvent();
      this.save.checkpoint = null;
      if (!(await this.commitSave('装备武器'))) {
        this.save = previous;
        this.mode = 'choice';
        return;
      }
      this.audio.play('choice');
      this.ui.hideChoice();
      this.mode = 'explore';
      this.focusCanvas();
      this.world.applyProgress(this.save.progress, this.save.defeated);
      this.world.setCheckpoint(CHECKPOINTS[this.save.progress], false);
      this.ui.showToast('奖励已原子保存。');
    }
  }

  selectRewardDraft(kind, id) {
    if (this.mode !== 'choice' || !this.pendingRewardDraft) return;
    if (kind === 'relic' && RELICS.some((choice) => choice.id === id)) {
      this.pendingRewardDraft.relicId = id;
      this.ui.updateRewardDraft('relic', id);
    }
    if (kind === 'growth' && GROWTHS.some((choice) => choice.id === id)) {
      this.pendingRewardDraft.growthId = id;
      this.ui.updateRewardDraft('growth', id);
    }
  }

  async confirmRewardBundle() {
    const draft = this.pendingRewardDraft;
    if (
      this.mode !== 'choice' ||
      !draft?.relicId ||
      !draft.growthId ||
      !RELICS.some((choice) => choice.id === draft.relicId) ||
      !GROWTHS.some((choice) => choice.id === draft.growthId)
    ) {
      return;
    }

    const previous = structuredClone(this.save);
    this.mode = 'saving';
    this.save.loadout.relicId = draft.relicId;
    this.save.loadout.growthId = draft.growthId;
    this.save.progress = 'growthChosen';
    this.consumeCheckpointEvent();
    this.save.checkpoint = null;
    if (!(await this.commitSave('一次确认圣物与成长'))) {
      this.save = previous;
      this.mode = 'choice';
      return;
    }

    this.pendingRewardDraft = null;
    this.audio.play('choice');
    this.ui.hideChoice();
    this.mode = 'explore';
    this.focusCanvas();
    this.world.applyProgress(this.save.progress, this.save.defeated);
    this.world.setCheckpoint(CHECKPOINTS[this.save.progress], false);
    this.ui.showToast('两项奖励已在同一事务中保存。');
  }

  consumeCheckpointEvent() {
    const eventId = this.save.checkpoint?.eventId;
    if (eventId && !this.save.consumedEvents.includes(eventId)) {
      this.save.consumedEvents.push(eventId);
      this.save.consumedEvents = this.save.consumedEvents.slice(-64);
    }
  }

  async completeEnding() {
    const previous = structuredClone(this.save);
    this.save.progress = 'complete';
    this.save.endingSeen = true;
    this.consumeCheckpointEvent();
    this.save.checkpoint = null;
    if (!(await this.progressChanged('完成主线'))) {
      this.save = previous;
      return;
    }
    this.audio.play('complete');
  }

  async startBattle(enemyId, persistCheckpoint = true) {
    if (persistCheckpoint) {
      const previous = structuredClone(this.save);
      this.mode = 'saving';
      this.input.setEnabled(false);
      this.save.checkpoint = {
        kind: 'inBattle',
        eventId: `battle:${enemyId}:${this.save.revision + 1}`,
        battleId: enemyId,
        progressSnapshot: this.save.progress,
        loadoutSnapshot: { ...this.save.loadout }
      };
      if (!(await this.commitSave(`进入 ${enemyId} 战斗`))) {
        this.save = previous;
        this.mode = 'explore';
        this.input.setEnabled(true);
        return;
      }
    }
    this.currentBattleId = enemyId;
    this.currentBattle = createBattle(
      enemyId,
      derivePlayerStats(this.save.loadout)
    );
    this.mode = 'combat';
    this.input.setEnabled(false);
    this.input.releasePointer();
    this.ui.showCombat(this.currentBattle);
  }

  combatAction(action) {
    if (this.mode !== 'combat' || !this.currentBattle) return;
    const result = performAction(this.currentBattle, action);
    if (!result.accepted) {
      this.ui.showToast(result.reason ?? '当前行动不可用。');
      this.ui.updateCombat(this.currentBattle);
      return;
    }
    this.currentBattle = result.state;
    this.audio.play(action);
    if (result.state.status === 'defeat') this.audio.play('defeat');
    if (result.state.status === 'victory') this.audio.play('victory');
    this.ui.updateCombat(this.currentBattle);
    if (this.currentBattle.status !== 'active') {
      this.ui.showCombatResult(this.currentBattle);
    }
  }

  async finishCombatResult() {
    if (
      this.mode !== 'combat' ||
      !this.currentBattle ||
      !this.currentBattleId
    ) {
      return;
    }
    if (this.currentBattle.status === 'defeat') {
      this.currentBattle = createBattle(
        this.currentBattleId,
        derivePlayerStats(this.save.loadout)
      );
      this.ui.showCombat(this.currentBattle);
      return;
    }

    const enemyId = this.currentBattleId;
    const previous = structuredClone(this.save);
    const battleEventId =
      this.save.checkpoint?.kind === 'inBattle'
        ? this.save.checkpoint.eventId
        : `battle:${enemyId}:${this.save.revision}`;
    if (!this.save.consumedEvents.includes(battleEventId)) {
      this.save.consumedEvents.push(battleEventId);
    }
    this.save.defeated[enemyId] = true;
    if (enemyId === 'elite') {
      this.save.optionalMemento = true;
      this.save.checkpoint = null;
    } else if (enemyId === 'boss') {
      this.save.progress = 'bossDefeated';
      this.save.checkpoint = {
        kind: 'endingPending',
        eventId: `ending:boss:${this.save.revision + 1}`
      };
    } else {
      this.save.progress = PROGRESS_AFTER_BATTLE[enemyId];
      this.save.checkpoint = {
        kind: 'rewardPending',
        eventId: `reward:${enemyId}:${this.save.revision + 1}`,
        battleId: enemyId,
        required:
          enemyId === 'sentry'
            ? ['weaponId']
            : ['relicId', 'growthId']
      };
    }
    this.mode = 'saving';
    if (!(await this.commitSave(`结算 ${enemyId} 胜利`))) {
      this.save = previous;
      this.mode = 'combat';
      return;
    }
    this.currentBattle = null;
    this.currentBattleId = null;
    this.ui.hideCombat();
    this.mode = 'explore';
    this.input.setEnabled(true);
    this.world.applyProgress(this.save.progress, this.save.defeated);
    this.world.setCheckpoint(CHECKPOINTS[this.save.progress], false);
    this.ui.showToast('胜利已在原子事务中保存。');
    this.showDialogue(
      enemyId === 'elite' ? '碑上残响' : '圣堂回声',
      BATTLE_STORY[enemyId],
      '继续探索'
    );
  }

  async progressChanged(reason) {
    this.world.applyProgress(this.save.progress, this.save.defeated);
    this.world.setCheckpoint(CHECKPOINTS[this.save.progress], false);
    const saved = await this.commitSave(reason);
    if (saved) this.ui.showToast('进度已自动保存。');
    return saved;
  }

  async commitSave(_reason, announceFailure = true) {
    if (this.externalConflict) return false;
    try {
      const scheduled = this.saveManager.save(this.save);
      this.save = scheduled.save;
      await scheduled.committed;
      return true;
    } catch (error) {
      if (announceFailure) {
        this.ui.showToast(
          `存档事务未完成：${error instanceof Error ? error.message : '未知错误'}。内存会话仍保留，请检查隐私模式或存储空间后重试。`,
          7000
        );
      }
      return false;
    }
  }

  safeReset() {
    const checkpoint = CHECKPOINTS[this.save.progress] ?? CHECKPOINTS.prologue;
    this.world.setCheckpoint(checkpoint, true);
    this.camera.resetView();
    this.ui.showToast('已返回最近的安全检查点。');
  }

  pause() {
    if (!this.started || this.mode !== 'explore') return;
    this.mode = 'pause';
    this.input.setEnabled(false);
    this.input.releasePointer();
    this.ui.showPause(this.save);
  }

  resume() {
    if (!this.started || this.externalConflict) return;
    this.ui.hidePause();
    this.mode = 'explore';
    this.input.setEnabled(true);
    this.audio.resume();
    this.focusCanvas();
  }

  handleSetting(name, value) {
    if (!(name in this.save.settings)) return;
    this.save.settings[name] = value;
    this.applySettings();
    void this.commitSave(`设置 ${name}`, false);
  }

  applySettings() {
    this.audio?.setMuted(this.save.settings.muted);
    this.audio?.setVolume(this.save.settings.volume);
    this.renderer.setQuality(this.save.settings.quality);
    this.ui?.applySettings(this.save.settings);
  }

  setMuted(muted) {
    this.save.settings.muted = muted;
    this.audio.setMuted(muted);
    this.ui.applySettings(this.save.settings);
    void this.commitSave('静音设置', false);
  }

  handleKeyboard() {
    if (this.input.consumePressed('m')) this.setMuted(!this.save.settings.muted);

    if (this.mode === 'explore') {
      if (this.input.consumePressed('escape')) {
        this.pause();
        return;
      }
      if (this.input.consumePressed('v')) {
        const firstPerson = this.camera.togglePerson();
        this.ui.showToast(firstPerson ? '已切换为第一人称。' : '已切换为第三人称。', 1800);
      }
      if (this.input.consumePressed('r')) this.safeReset();
      if (this.input.consumePressed('e')) this.interact();
      return;
    }

    if (this.mode === 'pause' && this.input.consumePressed('escape')) {
      this.resume();
      return;
    }

    if (this.mode === 'combat' && this.currentBattle?.status === 'active') {
      if (this.input.consumePressed('1')) this.combatAction('attack');
      if (this.input.consumePressed('2')) this.combatAction('defend');
      if (this.input.consumePressed('3')) this.combatAction('holy');
    }
  }

  verifyPlayerIntegrity() {
    const player = this.world.player;
    const ground = findWalkableGround(
      player.position.x,
      player.position.z,
      this.world.scene.userData.walkableSurfaces,
      player.position.y + player.maxStepHeight
    );
    const insideSolid = collidesAt(
      player.position,
      this.world.scene.userData.solidColliders,
      player.collisionRadius,
      player.collisionHeight
    );
    if (!this.world.isPositionValid(player.position) || !ground || insideSolid) {
      this.safeReset();
      this.ui.showToast('检测到非法或重叠位置，已自动回退到安全检查点。', 5000);
    }
  }

  updateHud() {
    const nearest =
      this.mode === 'explore'
        ? this.world.getNearestInteractable(this.save.progress, this.save.defeated)
        : null;
    const stats = derivePlayerStats(this.save.loadout);
    this.ui.updateHud({
      save: this.save,
      stats,
      cameraLabel: this.camera.label,
      objectivePosition: this.world.getObjectivePosition(this.save.progress),
      playerPosition: this.world.player.position,
      interaction: nearest ? INTERACTION_LABELS[nearest.id] : null,
      fps: this.renderer.stats.fps
    });
  }

  loop = () => {
    this.animationFrame = requestAnimationFrame(this.loop);
    const now = performance.now();
    const frameDelta = Math.max((now - this.lastFrameTime) / 1000, 0);
    const delta = Math.min(frameDelta, 0.05);
    this.lastFrameTime = now;

    this.handleKeyboard();
    const allowMovement = this.started && this.mode === 'explore';
    this.world.update(delta, this.input, this.camera.movementYaw, allowMovement);
    if (this.world.player.didResetThisFrame) this.camera.resetView();
    this.camera.update(
      this.world.player,
      delta,
      this.input,
      allowMovement
    );
    this.renderer.recordFrame(frameDelta);
    this.renderer.render(this.world.scene, this.camera.camera);

    if (this.started && (this.mode === 'explore' || this.mode === 'combat')) {
      this.save.playSeconds += delta;
      this.autosaveTimer += delta;
      if (this.autosaveTimer >= 30) {
        this.autosaveTimer = 0;
        void this.commitSave('定时安全保存', false);
      }
    }

    this.integrityTimer -= delta;
    if (allowMovement && this.integrityTimer <= 0) {
      this.integrityTimer = 0.5;
      this.verifyPlayerIntegrity();
    }

    this.hudTimer -= delta;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.12;
      this.updateHud();
      if (this.renderer.qualityNotice) {
        this.ui.showPerformanceNotice(this.renderer.qualityNotice);
        this.renderer.qualityNotice = null;
      }
    }

    this.input.endFrame();
  };
}
