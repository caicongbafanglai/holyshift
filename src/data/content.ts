export type EnemyAction = 'attack' | 'heavy' | 'defend';
export type PlayerAction = 'attack' | 'defend' | 'holy';
export type ProgressStep =
  | 'prologue'
  | 'questAccepted'
  | 'sentryDefeated'
  | 'weaponChosen'
  | 'wardenDefeated'
  | 'relicChosen'
  | 'growthChosen'
  | 'bossDefeated'
  | 'complete';

export interface CombatantStats {
  maxHp: number;
  pow: number;
  arm: number;
}

export interface EnemyDefinition extends CombatantStats {
  id: 'sentry' | 'warden' | 'boss' | 'elite';
  name: string;
  title: string;
  description: string;
  sequence: EnemyAction[];
  color: number;
}

export interface EquipmentChoice {
  id: string;
  name: string;
  slot: 'weapon' | 'relic';
  description: string;
  maxHp?: number;
  pow?: number;
  arm?: number;
}

export const BASE_PLAYER: CombatantStats = {
  maxHp: 12,
  pow: 4,
  arm: 1
};

export const ENEMIES: Record<EnemyDefinition['id'], EnemyDefinition> = {
  sentry: {
    id: 'sentry',
    name: '蚀誓守卫',
    title: '第一道试炼',
    description: '它的重击会提前显露。积攒信仰，在危险回合防御。',
    maxHp: 10,
    pow: 4,
    arm: 0,
    sequence: ['attack', 'heavy'],
    color: 0x8d4a5f
  },
  warden: {
    id: 'warden',
    name: '灰烬典狱官',
    title: '第二道试炼',
    description: '它会举盾。观察意图，不要把圣术浪费在防御上。',
    maxHp: 14,
    pow: 5,
    arm: 1,
    sequence: ['defend', 'attack', 'heavy'],
    color: 0x76537e
  },
  boss: {
    id: 'boss',
    name: '失冠圣裁者',
    title: '圣堂最终裁决',
    description: '连续强攻无法通过裁决。防住重击，再以圣术击碎圣盾。',
    maxHp: 20,
    pow: 7,
    arm: 2,
    sequence: ['attack', 'heavy', 'defend', 'attack'],
    color: 0xc28b3f
  },
  elite: {
    id: 'elite',
    name: '无名守墓人',
    title: '侧路追忆',
    description: '可选试炼不会改变主线数值，只留下一段被遗忘的名字。',
    maxHp: 18,
    pow: 6,
    arm: 2,
    sequence: ['attack', 'defend', 'heavy'],
    color: 0x50657a
  }
};

export const WEAPONS: EquipmentChoice[] = [
  {
    id: 'dawnblade',
    name: '晨刃',
    slot: 'weapon',
    description: '让每次攻击更具威胁。',
    pow: 2
  },
  {
    id: 'oathhammer',
    name: '守誓锤',
    slot: 'weapon',
    description: '攻守兼备，容错更高。',
    pow: 1,
    arm: 1
  }
];

export const RELICS: EquipmentChoice[] = [
  {
    id: 'lifeamulet',
    name: '生命护符',
    slot: 'relic',
    description: '最大生命提高 4。',
    maxHp: 4
  },
  {
    id: 'ironseal',
    name: '铁印',
    slot: 'relic',
    description: '护甲提高 1。',
    arm: 1
  }
];

export const GROWTHS = [
  {
    id: 'vigor',
    name: '坚韧',
    description: '最大生命提高 4。',
    maxHp: 4,
    pow: 0
  },
  {
    id: 'might',
    name: '威能',
    description: '力量提高 2。',
    maxHp: 0,
    pow: 2
  }
] as const;

export const INTENTS: Record<
  EnemyAction,
  { label: string; short: string; description: string; multiplier: number }
> = {
  attack: {
    label: '普通攻击',
    short: '攻击',
    description: '敌人将进行一次普通攻击。',
    multiplier: 1
  },
  heavy: {
    label: '蓄力重击',
    short: '重击',
    description: '高伤害。此时防御通常是最安全的选择。',
    multiplier: 1.6
  },
  defend: {
    label: '圣盾防御',
    short: '防御',
    description: '敌人将防御，你的下一次伤害会减半。',
    multiplier: 0
  }
};

export const CHECKPOINTS: Record<ProgressStep, { x: number; y: number; z: number }> = {
  prologue: { x: 0, y: 0, z: 49 },
  questAccepted: { x: 0, y: 0, z: 38 },
  sentryDefeated: { x: 0, y: 0, z: 14 },
  weaponChosen: { x: 0, y: 0, z: 4 },
  wardenDefeated: { x: 0, y: 0, z: -16 },
  relicChosen: { x: 0, y: 0, z: -27 },
  growthChosen: { x: 0, y: 0, z: -31 },
  bossDefeated: { x: 0, y: 0, z: -48 },
  complete: { x: 0, y: 0, z: 42 }
};

export const STORY = {
  prologue:
    '暮光吞没圣岛后的第七夜，圣堂钟声第一次逆向响起。海面凝成铅色，归航的船只在同一片雾里绕行，岛民便把姓名刻在钟楼石阶上，等待一个无人敢许诺的清晨。守钟人弥迦相信，失落的圣火仍藏在地底裁决厅。你是最后一名守誓者，也是唯一能听见钟声中第二个节拍的人；那节拍像一颗尚未熄灭的心，正从朝圣径尽头呼唤你。',
  quest:
    '沿朝圣径进入暮光圣堂，穿过碎碑庭院与灰烬回廊。腐化守卫并非野兽，它们仍受旧律约束，会在出手前显露下一步意图：普通攻击可积攒信仰，重击前应当防御，圣盾升起时则要保留力量；信仰足够后，以圣术终结战斗。取回两件圣器并接受一次永久成长，随后走入裁决厅，面对失冠圣裁者。侧路的墓园没有主线奖励，却可能保存着这场灾厄为何开始的答案。',
  sentry:
    '守卫倒下时，锈蚀甲片下露出一行旧誓：力量并非永远向前，而是知道何时停下。它直到最后仍把盾朝向圣堂，而非朝向你；腐化夺走了记忆，却没能彻底改写职责。前方祭台亮起，两件沉睡多年的武器同时回应你的圣痕，但你只能带走其中一件。',
  warden:
    '典狱官的灰烬散入石缝，露出通往内院的青铜钥印。墙上残画记载：失冠圣裁者曾主动封闭圣火，因为火焰会放大持有者最后一个念头；当年恐惧席卷全岛，火便把恐惧变成了永夜。第二件圣器仍在发热，仿佛有人刚把它放在祭台上。选定圣物后，你还必须决定自己愿意以坚韧承受黑暗，还是以威能更快地结束它。',
  elite:
    '无名守墓人放下残刃。碑上浮现一个早被风磨去的名字：伊蕾，第一位拒绝焚毁岛民记忆的裁决官。她把自己的名字献给圣火，才为后来者留下可以撤回裁决的余地。墓园的追忆不会提高任何主线数值，却让你明白，所谓胜利并不是抹去黑暗，而是在记得代价之后仍选择点灯。',
  boss:
    '失冠者没有倒下。他只是跪回空王座前，终于想起自己曾守护的名字。第三枚裁决印记在你收住攻势的瞬间碎裂：旧律承认了克制，而不是征服。逆行的钟声恢复正拍，圣火沿每一道裂缝重新点亮，庭院枯枝生出银色嫩芽，海雾也第一次向外退去。弥迦仍守在入口，他应当亲眼看见这场迟到了七年的黎明。',
  ending:
    '圣堂重获微光。弥迦敲下最后一声钟，石阶上的姓名依次泛起金色，归航灯塔越过海雾回应。岛民不会把你称作新的裁决者，因为这一次，没有谁需要替所有人决定该遗忘什么。你的武器、圣物、成长与墓园追忆都被写入本地存档；只要这份存档仍在，这座圣岛就会记得今夜，也会记得你曾在最锋利的一击之前选择停手。'
};

export const OBJECTIVES: Record<ProgressStep, string> = {
  prologue: '与守钟人弥迦交谈',
  questAccepted: '沿朝圣径击败蚀誓守卫',
  sentryDefeated: '在晨刃与守誓锤之间作出选择',
  weaponChosen: '穿过碎碑庭院，击败灰烬典狱官',
  wardenDefeated: '从祭台选择一件圣物',
  relicChosen: '选择一次永久成长',
  growthChosen: '进入裁决厅，击败失冠圣裁者',
  bossDefeated: '返回圣堂入口，见证世界变化',
  complete: '圣堂已复明；可继续探索或重开旅程'
};
