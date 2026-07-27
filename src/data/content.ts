export type ChapterProgress =
  | 'intro'
  | 'inspectFountain'
  | 'clearWisps'
  | 'traceSacredGlyph'
  | 'consultLin'
  | 'defeatWaterGhost'
  | 'restoreFountain'
  | 'inspectElevator'
  | 'complete';

export type EnemyId = 'wisp-a' | 'wisp-b' | 'wisp-c' | 'approved-water-ghost';

export type FoodId =
  | 'redSausage'
  | 'forgetfulBeefNoodles'
  | 'genghisChicken';

export interface FoodDefinition {
  id: FoodId;
  name: string;
  price: number;
  staminaBonus: number;
  appearance: string;
  description: string;
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  maxHp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  detectionRange: number;
  telegraphSeconds: number;
  recoverySeconds: number;
  radius: number;
  rewardShift: number;
  boss: boolean;
  variant: number;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export const PLAYER_COMBAT = {
  maxHp: 120,
  maxStamina: 100,
  maxShift: 100,
  lightDamage: [17, 21, 29],
  lightRange: 3.15,
  lightArcDegrees: 118,
  lightCooldown: [0.31, 0.34, 0.46],
  shiftDamage: 105,
  shiftRange: 16.5,
  shiftCost: 40,
  shiftCooldown: 2.8,
  shiftKeyRecovery: 8,
  dodgeStaminaCost: 24,
  staminaRecoveryPerSecond: 22,
  flightStaminaPerSecond: 10,
  glideStaminaRecoveryPerSecond: 18,
  fountainHealPerSecond: 30,
  fountainShiftRecoveryPerSecond: 28
} as const;

export const TASK_REWARD_CODES = 91;

export const FOOD_ORDER: FoodId[] = [
  'redSausage',
  'forgetfulBeefNoodles',
  'genghisChicken'
];

export const FOODS: Record<FoodId, FoodDefinition> = {
  redSausage: {
    id: 'redSausage',
    name: '红肠',
    price: 18,
    staminaBonus: 27.8,
    appearance: '摊位上数量最多的备案红肠',
    description: '耐力上限临时提高 27.8 点，耐力归零后恢复为 100。'
  },
  forgetfulBeefNoodles: {
    id: 'forgetfulBeefNoodles',
    name: '忘情牛肉面',
    price: 27.8,
    staminaBonus: 91,
    appearance: '看起来普通、实际上不普通的一碗牛肉面',
    description: '耐力上限临时提高 91 点，耐力归零后恢复为 100。'
  },
  genghisChicken: {
    id: 'genghisChicken',
    name: '成吉思鸡',
    price: 200,
    staminaBonus: 278,
    appearance: '金黄酱汁里隐约可见块状黄油鸡的一锅料理',
    description: '耐力上限临时提高 278 点，耐力归零后恢复为 100。'
  }
};

export const ENEMIES: Record<EnemyId, EnemyDefinition> = {
  'wisp-a': {
    id: 'wisp-a',
    name: '生水泡影 · 生',
    maxHp: 48,
    speed: 2.7,
    attackDamage: 13,
    attackRange: 1.65,
    detectionRange: 22,
    telegraphSeconds: 0.72,
    recoverySeconds: 1.1,
    radius: 0.66,
    rewardShift: 18,
    boss: false,
    variant: 0
  },
  'wisp-b': {
    id: 'wisp-b',
    name: '生水泡影 · 剩',
    maxHp: 52,
    speed: 2.55,
    attackDamage: 14,
    attackRange: 1.7,
    detectionRange: 22,
    telegraphSeconds: 0.8,
    recoverySeconds: 1.15,
    radius: 0.68,
    rewardShift: 18,
    boss: false,
    variant: 1
  },
  'wisp-c': {
    id: 'wisp-c',
    name: '生水泡影 · 笙',
    maxHp: 56,
    speed: 2.4,
    attackDamage: 15,
    attackRange: 1.75,
    detectionRange: 23,
    telegraphSeconds: 0.88,
    recoverySeconds: 1.2,
    radius: 0.7,
    rewardShift: 20,
    boss: false,
    variant: 2
  },
  'approved-water-ghost': {
    id: 'approved-water-ghost',
    name: '已审批水鬼',
    maxHp: 260,
    speed: 2.15,
    attackDamage: 21,
    attackRange: 2.5,
    detectionRange: 34,
    telegraphSeconds: 1.05,
    recoverySeconds: 1.35,
    radius: 1.05,
    rewardShift: 100,
    boss: true,
    variant: 0
  }
};

export const CHECKPOINTS: Record<ChapterProgress, { x: number; y: number; z: number }> = {
  intro: { x: 0, y: 0, z: 54 },
  inspectFountain: { x: 7, y: 0, z: 23 },
  clearWisps: { x: 0, y: 0, z: 13 },
  traceSacredGlyph: { x: 17, y: 0, z: 13 },
  consultLin: { x: -20, y: 0, z: -39 },
  defeatWaterGhost: { x: 0, y: 0, z: 14 },
  restoreFountain: { x: 0, y: 0, z: 5.2 },
  inspectElevator: { x: 22, y: 0, z: -78 },
  complete: { x: 0, y: 0, z: 48 }
};

export const OBJECTIVES: Record<ChapterProgress, string> = {
  intro: '与牧司学姐确认圣水异常',
  inspectFountain: '调查神圣广场中央的圣水池',
  clearWisps: '在广场中实时清除 3 只生水泡影',
  traceSacredGlyph: '向 Pingu 核对“圣”字供应链备案',
  consultLin: '在教堂入口附近询问林镇阴',
  defeatWaterGhost: '在场景内击败“已审批水鬼”',
  restoreFountain: '靠近圣水池，按 Q 或鼠标右键施展 Holy Shift',
  inspectElevator: '前往私募教堂神圣电梯',
  complete: '第一章完成 · 神圣秩序暂时归位'
};

export const DIALOGUES: Record<string, DialogueLine[]> = {
  opening: [
    {
      speaker: '牧司学姐',
      text: '会长，圣水池刚完成晨间审批，水却从“圣水”变成了“生水”。喝过的人开始不停讲冷笑话，祷倌组的精神稳定流程已经快被笑话击穿了。'
    },
    {
      speaker: '老牧师',
      text: '我丢雷楼木！圣水变生水，说明流程有点生。先去看看是谁动了“圣”字。'
    },
    {
      speaker: '牧司学姐',
      text: '这不是普通污染。祷词没有错，却有一个概念被从原位导走了。请先检查池心的流程中枢。'
    }
  ],
  fountainDiscovery: [
    {
      speaker: '老牧师',
      text: '我丢雷楼木！水质清澈，审批齐全，偏偏“圣”没了——而且这事居然已经通过审批。'
    },
    {
      speaker: '系统',
      text: '池底响起三声不合规的笑。错位概念凝成“生水泡影”，战斗直接发生在神圣广场。'
    }
  ],
  pinguTrace: [
    {
      speaker: 'Pingu',
      text: '嘎。'
    },
    {
      speaker: '老牧师',
      text: '你说红肠组今早收到了一个没有寄件人的金色“圣”字封签，而且它已经完成食品备案？'
    },
    {
      speaker: 'Pingu',
      text: '嘎。嘎。'
    },
    {
      speaker: '老牧师',
      text: '明白了。不是圣水被污染，是“圣”被调岗。这个调岗手续还盖了章。'
    }
  ],
  linWarning: [
    {
      speaker: '林镇阴',
      text: '水不会自己变生，除非有人把圣拿走了。'
    },
    {
      speaker: '老牧师',
      text: '封签在红肠组，审批章却来自池底。你见过这种流程？'
    },
    {
      speaker: '林镇阴',
      text: '见过。很多年前，第 191 层也把不该移动的东西移走过。先别问。它发现你了。'
    },
    {
      speaker: '系统',
      text: '圣水池的异常获得完整审批，凝成“已审批水鬼”。'
    }
  ],
  restored: [
    {
      speaker: '老牧师',
      text: '我丢雷楼木！Holy Shift——把“圣”给我移回圣水！'
    },
    {
      speaker: '系统',
      text: '“生”回到生命，“圣”回到圣水。池中流程恢复，但教堂电梯传来一声从未登记的到站提示。'
    }
  ],
  ending: [
    {
      speaker: '神圣电梯',
      text: '191F / SHIFT。身份：师牧会会长。签到状态：从未离开。'
    },
    {
      speaker: '林镇阴',
      text: '别按。至少今天别按。地下不阴，阴的是流程；第 191 层则连流程都不一定是原来的流程。'
    },
    {
      speaker: '老牧师',
      text: '我丢雷楼木！第 191 层连我的签到都敢代办。看来上面还有没说完的话。'
    },
    {
      speaker: '系统',
      text: '第一章「圣水有点生」完成。师老牧镇的秩序暂时归位。'
    }
  ],
  studentPun: [
    {
      speaker: '喝过生水的学生',
      text: '会长，我喝完以后特别会“水”论文——因为每一段都没有重点。'
    },
    {
      speaker: '老牧师',
      text: '孩子，这不是能力，是症状。先停止投稿。'
    }
  ],
  believerPun: [
    {
      speaker: '喝过生水的信徒',
      text: '我刚才想去礼拜，系统却让我“离拜”。所以我站远了一点拜。'
    },
    {
      speaker: '老牧师',
      text: '离谱但合规。等我把字移回去。'
    }
  ]
};

export const INTERACTION_LABELS: Record<string, string> = {
  pastorSenior: '与牧司学姐交谈',
  fountain: '检查圣水池流程中枢',
  pingu: '向 Pingu 核对备案',
  pinguStall: '查看 Pingu 食品摊位',
  linZhenyin: '询问林镇阴',
  elevator: '查看神圣电梯',
  student: '听学生汇报症状',
  believer: '听信徒汇报症状',
  noticeBoard: '查看神圣流程公告'
};

export const CHAPTER_ORDER: ChapterProgress[] = [
  'intro',
  'inspectFountain',
  'clearWisps',
  'traceSacredGlyph',
  'consultLin',
  'defeatWaterGhost',
  'restoreFountain',
  'inspectElevator',
  'complete'
];
