import {
  BASE_PLAYER,
  ENEMIES,
  GROWTHS,
  INTENTS,
  RELICS,
  WEAPONS,
  type CombatantStats,
  type EnemyAction,
  type EnemyDefinition,
  type PlayerAction
} from '../data/content';

export interface Loadout {
  weaponId: string | null;
  relicId: string | null;
  growthId: string | null;
}

export interface CombatSnapshot {
  enemyId: EnemyDefinition['id'];
  player: CombatantStats & { hp: number; defending: boolean };
  enemy: EnemyDefinition & { hp: number; defending: boolean };
  faith: number;
  round: number;
  intentIndex: number;
  status: 'active' | 'victory' | 'defeat';
  log: string[];
  usedDefend: boolean;
  usedHoly: boolean;
  normalAttackStreak: number;
}

export interface ActionResult {
  accepted: boolean;
  reason?: string;
  state: CombatSnapshot;
  events: string[];
}

function applyBonuses(stats: CombatantStats, choice: { maxHp?: number; pow?: number; arm?: number } | undefined) {
  if (!choice) return;
  stats.maxHp += choice.maxHp ?? 0;
  stats.pow += choice.pow ?? 0;
  stats.arm += choice.arm ?? 0;
}

export function derivePlayerStats(loadout: Loadout): CombatantStats {
  const stats = { ...BASE_PLAYER };
  applyBonuses(stats, WEAPONS.find((item) => item.id === loadout.weaponId));
  applyBonuses(stats, RELICS.find((item) => item.id === loadout.relicId));
  applyBonuses(stats, GROWTHS.find((item) => item.id === loadout.growthId));
  return stats;
}

export function calculateDamage(
  attackerPow: number,
  defenderArm: number,
  multiplier: number,
  defenderIsDefending: boolean
): number {
  const raw = Math.floor(attackerPow * multiplier);
  const afterArmor = Math.max(1, raw - defenderArm);
  return defenderIsDefending ? Math.max(1, Math.ceil(afterArmor * 0.5)) : afterArmor;
}

export function createBattle(enemyId: EnemyDefinition['id'], stats: CombatantStats): CombatSnapshot {
  const enemy = ENEMIES[enemyId];
  return {
    enemyId,
    player: { ...stats, hp: stats.maxHp, defending: false },
    enemy: { ...enemy, hp: enemy.maxHp, defending: false },
    faith: 0,
    round: 1,
    intentIndex: 0,
    status: 'active',
    log: [`${enemy.name} 挡住了去路。它的行动意图已经显露。`],
    usedDefend: false,
    usedHoly: false,
    normalAttackStreak: 0
  };
}

export function getIntent(state: CombatSnapshot): EnemyAction {
  return state.enemy.sequence[state.intentIndex % state.enemy.sequence.length];
}

export function estimateEnemyDamage(state: CombatSnapshot): number {
  const intent = getIntent(state);
  if (intent === 'defend') return 0;
  return calculateDamage(
    state.enemy.pow,
    state.player.arm,
    INTENTS[intent].multiplier,
    state.player.defending
  );
}

function cloneState(state: CombatSnapshot): CombatSnapshot {
  return {
    ...state,
    player: { ...state.player },
    enemy: { ...state.enemy },
    log: [...state.log]
  };
}

export function performAction(current: CombatSnapshot, action: PlayerAction): ActionResult {
  const state = cloneState(current);
  const events: string[] = [];

  if (state.status !== 'active') {
    return { accepted: false, reason: '战斗已经结束。', state, events };
  }

  if (action === 'holy' && state.faith < 2) {
    return {
      accepted: false,
      reason: `信仰不足：圣术需要 2 点，当前为 ${state.faith}。`,
      state,
      events
    };
  }

  if (action === 'attack' || action === 'holy') {
    const multiplier = action === 'holy' ? 2 : 1;
    const damage = calculateDamage(state.player.pow, state.enemy.arm, multiplier, state.enemy.defending);
    state.enemy.hp = Math.max(0, state.enemy.hp - damage);
    state.enemy.defending = false;

    if (action === 'holy') {
      state.faith -= 2;
      state.usedHoly = true;
      state.normalAttackStreak = 0;
      events.push(`圣术命中，造成 ${damage} 点伤害，消耗 2 点信仰。`);
    } else {
      state.faith = Math.min(3, state.faith + 1);
      state.normalAttackStreak += 1;
      events.push(`普通攻击造成 ${damage} 点伤害，获得 1 点信仰。`);
    }
  } else {
    state.player.defending = true;
    state.faith = Math.min(3, state.faith + 1);
    state.usedDefend = true;
    state.normalAttackStreak = 0;
    events.push('你进入防御状态，下一次受到的伤害减半，并获得 1 点信仰。');
  }

  if (state.enemy.hp <= 0) {
    state.status = 'victory';
    events.push(`${state.enemy.name} 被击败。`);
    state.log.push(...events);
    return { accepted: true, state, events };
  }

  if (state.enemyId === 'boss' && state.normalAttackStreak >= 3) {
    state.player.hp = 0;
    state.status = 'defeat';
    events.push('第三枚裁决印记闭合：连续强攻触发圣裁反噬。防御或圣术可以清除印记。');
    state.log.push(...events);
    return { accepted: true, state, events };
  }

  const intent = getIntent(state);
  if (intent === 'defend') {
    state.enemy.defending = true;
    events.push(`${state.enemy.name} 举起圣盾，下一次受到的伤害减半。`);
  } else {
    const damage = calculateDamage(
      state.enemy.pow,
      state.player.arm,
      INTENTS[intent].multiplier,
      state.player.defending
    );
    state.player.hp = Math.max(0, state.player.hp - damage);
    state.player.defending = false;
    events.push(`${state.enemy.name} 使用${INTENTS[intent].label}，造成 ${damage} 点伤害。`);
  }

  if (state.player.hp <= 0) {
    state.status = 'defeat';
    events.push('你在裁决中倒下。战斗将从进入前的安全快照重开。');
  } else {
    state.round += 1;
    state.intentIndex = (state.intentIndex + 1) % state.enemy.sequence.length;
  }

  state.log.push(...events);
  state.log = state.log.slice(-12);
  return { accepted: true, state, events };
}

export function enumerateLoadouts(): Loadout[] {
  return WEAPONS.flatMap((weapon) =>
    RELICS.flatMap((relic) =>
      GROWTHS.map((growth) => ({
        weaponId: weapon.id,
        relicId: relic.id,
        growthId: growth.id
      }))
    )
  );
}

export function findWinningPlan(
  enemyId: EnemyDefinition['id'],
  stats: CombatantStats,
  maxTurns = 14
): PlayerAction[] | null {
  const initial = createBattle(enemyId, stats);
  const queue: Array<{ state: CombatSnapshot; actions: PlayerAction[] }> = [
    { state: initial, actions: [] }
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    const { state, actions } = next;
    if (
      state.status === 'victory' &&
      state.usedDefend &&
      state.usedHoly
    ) {
      return actions;
    }
    if (state.status !== 'active' || actions.length >= maxTurns) continue;

    for (const action of ['attack', 'defend', 'holy'] as PlayerAction[]) {
      const result = performAction(state, action);
      if (!result.accepted) continue;
      const candidate = result.state;
      const key = [
        candidate.player.hp,
        candidate.player.defending ? 1 : 0,
        candidate.enemy.hp,
        candidate.enemy.defending ? 1 : 0,
        candidate.faith,
        candidate.intentIndex,
        candidate.usedDefend ? 1 : 0,
        candidate.usedHoly ? 1 : 0,
        candidate.normalAttackStreak,
        actions.length + 1
      ].join(':');
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ state: candidate, actions: [...actions, action] });
    }
  }

  return null;
}
