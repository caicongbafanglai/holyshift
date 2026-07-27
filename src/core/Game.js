import { AudioSystem } from './AudioSystem.js';
import { CameraController } from './CameraController.js';
import { InputManager } from './InputManager.js';
import { Renderer } from './Renderer.js';
import { GameUI } from '../ui/GameUI.js';
import { MushiTownWorld } from '../world/MushiTownWorld.js';
import {
  CHECKPOINTS,
  DIALOGUES,
  INTERACTION_LABELS,
  OBJECTIVES,
  PLAYER_COMBAT
} from '../data/content.ts';
import { createNewSave } from '../domain/save.ts';
import {
  collidesAt,
  findWalkableGround
} from '../entities/Player.js';
import { ActionCombat } from '../gameplay/combat/ActionCombat.js';
import {
  allWaveEnemiesDefeated,
  getNextProgressAfterWave
} from '../gameplay/quests/ChapterOne.js';

export class Game {
  constructor(container, saveManager, loadResult) {
    this.container = container;
    this.saveManager = saveManager;
    this.save = loadResult.save;
    this.hasSave = this.save.revision > 0;
    this.lastFrameTime = performance.now();
    this.mode = 'start';
    this.modeBeforePause = 'explore';
    this.started = false;
    this.animationFrame = null;
    this.hudTimer = 0;
    this.integrityTimer = 0;
    this.autosaveTimer = 0;
    this.pendingWaveCompletion = null;
    this.defeatHandling = false;
    this.dialogueLines = [];
    this.dialogueIndex = 0;
    this.dialogueCompletion = null;

    this.renderer = new Renderer(container, this.save.settings.quality);
    this.world = new MushiTownWorld();
    this.world.setSoftwareRenderingMode(this.renderer.softwareRenderer);
    this.camera = new CameraController(container);
    this.camera.setCollisionObjects(this.world.cameraCollisionMeshes);
    this.input = new InputManager(this.renderer.instance.domElement);
    this.audio = new AudioSystem(this.save.settings);
    this.ui = new GameUI(container, {
      onAction: (action, value, kind) =>
        this.handleUiAction(action, value, kind),
      onSetting: (name, value) => this.handleSetting(name, value)
    });
    this.combat = new ActionCombat(this.world, {
      onAction: (action) => this.handleCombatSound(action),
      onHit: (hit) => this.ui.showHit(hit),
      onUnavailable: (message) => this.ui.showToast(message, 2400),
      onPlayerDamage: ({ amount, attacker }) =>
        this.handlePlayerDamage(amount, attacker),
      onPlayerDefeat: () => this.handlePlayerDefeat(),
      onDodge: () => this.audio.play('dodge'),
      onFountainShift: () => void this.restoreFountain()
    });
    this.world.onEnemyDefeated = (enemy) => this.handleEnemyDefeated(enemy);

    this.applySaveToWorld(false);
    this.applySettings();
    this.ui.showStart(this.save, this.hasSave);
    loadResult.warnings.forEach((warning) =>
      this.ui.showToast(warning, 6500)
    );
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
      if (document.hidden && this.started) {
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

    const teleportNear = (target, preferredDistance = 2.2) => {
      if (!target || !this.started) return false;
      const distances = [preferredDistance, 2.8, 3.25, 1.65];
      for (const distance of distances) {
        for (let index = 0; index < 20; index += 1) {
          const angle = (index / 20) * Math.PI * 2;
          const x = target.position.x + Math.sin(angle) * distance;
          const z = target.position.z + Math.cos(angle) * distance;
          const ground = findWalkableGround(
            x,
            z,
            this.world.scene.userData.walkableSurfaces,
            this.world.player.maxStepHeight
          );
          if (
            !ground ||
            collidesAt(
              { x, y: ground.y, z },
              this.world.scene.userData.solidColliders,
              this.world.player.collisionRadius,
              this.world.player.collisionHeight
            )
          ) {
            continue;
          }
          this.world.player.position.set(x, ground.y, z);
          this.world.player.landOnGround(ground);
          this.camera.resetView();
          this.updateHud();
          return true;
        }
      }
      return false;
    };

    Object.defineProperty(window, '__holyShiftTest', {
      configurable: true,
      value: Object.freeze({
        teleportTo: (id) =>
          teleportNear(this.world.interactableObjects.get(id)),
        teleportToEnemy: (id) =>
          teleportNear(this.world.enemies.get(id), 2.65),
        defeatEnemy: (id) => {
          const enemy = this.world.enemies.get(id);
          if (!enemy?.isAlive) return false;
          enemy.takeDamage(99999);
          return true;
        },
        grantShift: (amount = PLAYER_COMBAT.maxShift) => {
          this.save.player.shift = Math.min(
            PLAYER_COMBAT.maxShift,
            Math.max(0, Number(amount) || 0)
          );
          return this.save.player.shift;
        },
        useShiftAtFountain: () => {
          this.save.player.shift = PLAYER_COMBAT.maxShift;
          this.world.player.position.set(0, 0, 5);
          this.world.player.landOnGround({ y: 0 });
          this.combat.holyShift();
          return true;
        },
        renderBenchmark: (iterations = 8) => {
          const count = Math.min(30, Math.max(1, Number(iterations) || 1));
          const started = performance.now();
          for (let index = 0; index < count; index += 1) {
            this.renderer.render(this.world.scene, this.camera.camera);
          }
          return (performance.now() - started) / count;
        },
        updateBenchmark: (iterations = 100) => {
          const count = Math.min(500, Math.max(1, Number(iterations) || 1));
          const started = performance.now();
          for (let index = 0; index < count; index += 1) {
            this.world.update(
              1 / 60,
              this.input,
              this.camera.movementYaw,
              true
            );
            this.combat.update(
              1 / 60,
              this.input,
              this.camera.movementYaw,
              false
            );
            this.camera.update(
              this.world.player,
              1 / 60,
              this.input,
              false
            );
          }
          return (performance.now() - started) / count;
        },
        snapshot: () => ({
          mode: this.mode,
          progress: this.save.progress,
          defeated: { ...this.save.defeated },
          flags: { ...this.save.flags },
          player: { ...this.save.player },
          position: this.world.player.position.toArray(),
          enemies: Object.fromEntries(
            [...this.world.enemies].map(([id, enemy]) => [
              id,
              {
                state: enemy.state,
                hp: enemy.hp,
                visible: enemy.visible
              }
            ])
          ),
          renderer: this.renderer.stats
        })
      })
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

  handleUiAction(action) {
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
      case 'dialogue-next':
        this.advanceDialogue();
        break;
      case 'toggle-mute':
        this.setMuted(!this.save.settings.muted);
        break;
      case 'toggle-guide':
        this.save.settings.keyGuideExpanded =
          !this.save.settings.keyGuideExpanded;
        this.ui.toggleGuide(this.save.settings.keyGuideExpanded);
        void this.commitSave('键位面板设置', false);
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
    if (this.save.player.hp <= 0) {
      this.save.player.hp = PLAYER_COMBAT.maxHp;
    }
    this.applySaveToWorld(true);
    this.ui.hideStart();
    this.ui.hidePause();
    this.input.setEnabled(true);
    this.renderer.resetPerformanceSamples();
    await this.audio.resume();
    this.focusCanvas();
    this.ui.showChapterUpdate(OBJECTIVES[this.save.progress], '继续第一章');
  }

  async startNewGame(fromPause = false) {
    if (
      this.hasSave &&
      !window.confirm('开始新旅程会删除当前浏览器中的第一章进度。确定继续吗？')
    ) {
      return;
    }
    try {
      await this.saveManager.reset();
    } catch (error) {
      this.ui.showToast(
        `无法清理旧存档：${error instanceof Error ? error.message : '未知错误'}。`,
        6000
      );
      return;
    }
    this.save = createNewSave(this.saveManager.writerId);
    if (!(await this.commitSave('创建 v0.3 新旅程'))) return;
    this.hasSave = true;
    this.started = true;
    this.mode = 'explore';
    this.modeBeforePause = 'explore';
    this.pendingWaveCompletion = null;
    this.defeatHandling = false;
    this.ui.hideDialogue();
    this.applySaveToWorld(true);
    this.ui.hideStart();
    this.ui.hidePause();
    this.input.setEnabled(true);
    this.renderer.resetPerformanceSamples();
    await this.audio.resume();
    this.focusCanvas();
    this.ui.showChapterUpdate('第一章 · 圣水有点生', '师老牧镇');
    if (fromPause) this.ui.showToast('第一章已从头开始。');
  }

  applySaveToWorld(teleport) {
    this.world.applyProgress(
      this.save.progress,
      this.save.defeated,
      this.save.flags
    );
    this.world.setCheckpoint(CHECKPOINTS[this.save.progress], teleport);
    this.combat?.bindState(this.save.player, this.save.defeated);
    if (this.combat) {
      this.combat.progress = this.save.progress;
      this.combat.defeated = this.save.defeated;
    }
    if (teleport) this.camera?.resetView();
  }

  interact() {
    if (!['explore', 'dialogue'].includes(this.mode)) return;
    if (this.mode === 'dialogue') {
      this.advanceDialogue();
      return;
    }
    const nearest = this.world.getNearestInteractable(
      this.save.progress,
      this.save.defeated
    );
    if (!nearest) return;
    this.audio.play('interact');

    switch (nearest.id) {
      case 'pastorSenior':
        this.showDialogueSequence(DIALOGUES.opening, () =>
          void this.setProgress('inspectFountain', '接受圣水异常调查')
        );
        break;
      case 'fountain':
        if (this.save.progress === 'inspectFountain') {
          this.showDialogueSequence(DIALOGUES.fountainDiscovery, () =>
            void this.setProgress('clearWisps', '发现生水泡影')
          );
        }
        break;
      case 'pingu':
        this.showDialogueSequence(DIALOGUES.pinguTrace, () =>
          void this.setProgress('consultLin', '确认圣字供应链封签')
        );
        break;
      case 'linZhenyin':
        this.showDialogueSequence(DIALOGUES.linWarning, () =>
          void this.setProgress('defeatWaterGhost', '已审批水鬼出现')
        );
        break;
      case 'elevator':
        this.showDialogueSequence(DIALOGUES.ending, () => {
          this.save.flags.elevatorSeen = true;
          void this.setProgress('complete', '完成第一章');
        });
        break;
      case 'student':
        this.save.flags.heardStudentPun = true;
        this.showDialogueSequence(DIALOGUES.studentPun, () =>
          void this.commitSave('记录学生生水症状', false)
        );
        break;
      case 'believer':
        this.save.flags.heardBelieverPun = true;
        this.showDialogueSequence(DIALOGUES.believerPun, () =>
          void this.commitSave('记录信徒生水症状', false)
        );
        break;
      case 'noticeBoard':
        this.showDialogueSequence([
          {
            speaker: '神圣流程公告',
            text: '圣水饮用前请完成神圣签到。异常发生后请在三个工作日内补填《异常已经发生但仍需事前审批表》。'
          },
          {
            speaker: '老牧师',
            text: '表格写得很完整，只有负责部门从“师牧会”变成了“失牧会”。又一个小型 Shift。'
          }
        ]);
        break;
      default:
        break;
    }
  }

  showDialogueSequence(lines, completion = null) {
    if (!Array.isArray(lines) || lines.length === 0) return;
    this.dialogueLines = lines;
    this.dialogueIndex = 0;
    this.dialogueCompletion = completion;
    this.mode = 'dialogue';
    this.input.releasePointer();
    this.renderDialogueLine();
  }

  renderDialogueLine() {
    const line = this.dialogueLines[this.dialogueIndex];
    if (!line) return;
    this.ui.showDialogue({
      ...line,
      final: this.dialogueIndex === this.dialogueLines.length - 1
    });
  }

  advanceDialogue() {
    if (this.mode !== 'dialogue') return;
    this.dialogueIndex += 1;
    if (this.dialogueIndex < this.dialogueLines.length) {
      this.renderDialogueLine();
      return;
    }
    const completion = this.dialogueCompletion;
    this.dialogueLines = [];
    this.dialogueIndex = 0;
    this.dialogueCompletion = null;
    this.ui.hideDialogue();
    this.mode = 'explore';
    completion?.();
    this.focusCanvas();
  }

  async setProgress(progress, reason) {
    if (this.save.progress === progress) return true;
    this.save.progress = progress;
    if (progress === 'inspectElevator') {
      this.save.flags.fountainRestored = true;
    }
    this.applySaveToWorld(false);
    const saved = await this.commitSave(reason);
    this.ui.showChapterUpdate(OBJECTIVES[progress]);
    if (saved) this.ui.showToast('主线进度已自动保存。', 1900);
    return saved;
  }

  handleEnemyDefeated(enemy) {
    const id = enemy.definition.id;
    if (this.save.defeated[id]) return;
    this.save.defeated[id] = true;
    this.save.player.shift = Math.min(
      PLAYER_COMBAT.maxShift,
      this.save.player.shift + enemy.definition.rewardShift
    );
    this.audio.play('victory');
    this.ui.showToast(`${enemy.definition.name} 已被移出当前流程。`, 2200);
    void this.commitSave(`实时战斗击败 ${id}`, false);

    if (
      allWaveEnemiesDefeated(this.save.progress, this.save.defeated) &&
      !this.pendingWaveCompletion
    ) {
      this.pendingWaveCompletion = {
        timer: enemy.definition.boss ? 1.05 : 0.62,
        progress: getNextProgressAfterWave(this.save.progress)
      };
    }
  }

  handleCombatSound(action) {
    this.audio.play(
      action === 'holy' ? 'holy' : action === 'dodge' ? 'dodge' : 'attack'
    );
  }

  handlePlayerDamage(amount, attacker) {
    this.audio.play('hurt');
    this.ui.flashDamage();
    this.ui.showToast(
      `${attacker.definition.name} 命中，生命 -${amount}。`,
      1200
    );
  }

  handlePlayerDefeat() {
    if (this.defeatHandling) return;
    this.defeatHandling = true;
    this.audio.play('defeat');
    this.combat.restorePlayer();
    this.world.setCheckpoint(CHECKPOINTS[this.save.progress], true);
    this.camera.resetView();
    this.ui.showToast(
      '老牧师被流程驳回，已带着完整任务进度返回安全点；本轮异常已重置。',
      5200
    );
    void this.commitSave('战败安全恢复', false).finally(() => {
      this.defeatHandling = false;
    });
  }

  async restoreFountain() {
    if (this.save.progress !== 'restoreFountain') return;
    this.save.flags.fountainRestored = true;
    this.world.restoreFountain();
    await this.setProgress('inspectElevator', 'Holy Shift 恢复圣水');
    this.showDialogueSequence(DIALOGUES.restored);
    this.audio.play('complete');
  }

  async commitSave(_reason, announceFailure = true) {
    try {
      const scheduled = this.saveManager.save(this.save);
      if (scheduled && 'committed' in scheduled) {
        this.save = scheduled.save;
        this.combat.bindState(this.save.player, this.save.defeated);
        await scheduled.committed;
      } else {
        this.save = scheduled;
        this.combat.bindState(this.save.player, this.save.defeated);
      }
      return true;
    } catch (error) {
      if (announceFailure) {
        this.ui.showToast(
          `存档事务未完成：${error instanceof Error ? error.message : '未知错误'}。当前内存会话仍可继续。`,
          7000
        );
      }
      return false;
    }
  }

  safeReset() {
    this.combat.restorePlayer();
    this.world.setCheckpoint(
      CHECKPOINTS[this.save.progress] ?? CHECKPOINTS.intro,
      true
    );
    this.camera.resetView();
    this.ui.showToast('已返回最近的安全检查点，当前异常遭遇已重置。');
    void this.commitSave('手动安全复位', false);
  }

  pause() {
    if (!this.started || this.mode === 'start' || this.mode === 'pause') return;
    this.modeBeforePause = this.mode;
    this.mode = 'pause';
    this.input.setEnabled(false);
    this.input.releasePointer();
    this.ui.showPause(this.save);
  }

  resume() {
    if (!this.started) return;
    this.ui.hidePause();
    this.mode = this.modeBeforePause === 'dialogue' ? 'dialogue' : 'explore';
    this.input.setEnabled(true);
    void this.audio.resume();
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
    if (this.input.consumePressed('m')) {
      this.setMuted(!this.save.settings.muted);
    }
    if (this.mode === 'pause') {
      if (this.input.consumePressed('escape')) this.resume();
      return;
    }
    if (!this.started || this.mode === 'start') return;
    if (this.input.consumePressed('escape')) {
      this.pause();
      return;
    }
    if (this.input.consumePressed('v')) {
      const firstPerson = this.camera.togglePerson();
      this.ui.showToast(
        firstPerson ? '已切换为第一人称。' : '已切换为第三人称。',
        1500
      );
    }
    if (this.input.consumePressed('r')) this.safeReset();
    if (
      this.mode === 'dialogue' &&
      (this.input.consumePressed('e') || this.input.consumePressed('enter'))
    ) {
      this.advanceDialogue();
      return;
    }
    if (this.mode === 'explore' && this.input.consumePressed('e')) {
      this.interact();
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
    const insideStatic = collidesAt(
      player.position,
      this.world.baseColliders,
      player.collisionRadius,
      player.collisionHeight
    );
    if (!this.world.isPositionValid(player.position) || !ground || insideStatic) {
      this.world.setCheckpoint(
        CHECKPOINTS[this.save.progress] ?? CHECKPOINTS.intro,
        true
      );
      this.camera.resetView();
      this.ui.showToast(
        '检测到越界或实体重叠，已自动回退到无碰撞安全点。',
        4600
      );
    }
  }

  updateHud() {
    const nearest =
      this.mode === 'explore'
        ? this.world.getNearestInteractable(
            this.save.progress,
            this.save.defeated
          )
        : null;
    this.ui.updateHud({
      save: this.save,
      cameraLabel: this.camera.label,
      objectivePosition: this.world.getObjectivePosition(this.save.progress),
      playerPosition: this.world.player.position,
      interaction: nearest ? INTERACTION_LABELS[nearest.id] : null,
      fps: this.renderer.stats.fps,
      boss: this.combat.activeBoss
    });
  }

  loop = () => {
    this.animationFrame = requestAnimationFrame(this.loop);
    const now = performance.now();
    const frameDelta = Math.max((now - this.lastFrameTime) / 1000, 0);
    // Collision, dodge and enemy movement all substep internally, so a 100 ms
    // ceiling preserves real-world timing on software renderers without
    // allowing background-tab sized tunnelling jumps.
    const delta = Math.min(frameDelta, 0.1);
    this.lastFrameTime = now;

    this.handleKeyboard();
    const simulationActive =
      this.started && ['explore', 'dialogue'].includes(this.mode);
    this.world.update(
      delta,
      this.input,
      this.camera.movementYaw,
      simulationActive
    );
    if (simulationActive) {
      this.combat.update(
        delta,
        this.input,
        this.camera.movementYaw,
        true
      );
    }
    if (this.world.player.didResetThisFrame) this.camera.resetView();
    this.camera.update(
      this.world.player,
      delta,
      this.input,
      simulationActive
    );
    this.renderer.recordFrame(frameDelta);
    if (
      this.renderer.softwareRenderer &&
      !this.world.softwareRenderingMode
    ) {
      this.world.setSoftwareRenderingMode(true);
    }
    this.renderer.render(this.world.scene, this.camera.camera);

    if (simulationActive) {
      this.save.playSeconds += delta;
      this.autosaveTimer += delta;
      if (this.autosaveTimer >= 30) {
        this.autosaveTimer = 0;
        void this.commitSave('定时安全保存', false);
      }
    }

    if (this.pendingWaveCompletion) {
      this.pendingWaveCompletion.timer -= delta;
      if (this.pendingWaveCompletion.timer <= 0) {
        const next = this.pendingWaveCompletion.progress;
        this.pendingWaveCompletion = null;
        void this.setProgress(next, '完成实时异常遭遇');
      }
    }

    this.integrityTimer -= delta;
    if (simulationActive && this.integrityTimer <= 0) {
      this.integrityTimer = 0.45;
      this.verifyPlayerIntegrity();
    }

    this.hudTimer -= delta;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.09;
      this.updateHud();
      if (this.renderer.qualityNotice) {
        this.ui.showPerformanceNotice(this.renderer.qualityNotice);
        this.renderer.qualityNotice = null;
      }
    }
    this.input.endFrame();
  };
}
