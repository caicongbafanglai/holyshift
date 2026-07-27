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
  shiftDamage: 42,
  shiftRange: 6.5,
  shiftCost: 40,
  shiftCooldown: 2.8,
  dodgeStaminaCost: 24,
  staminaRecoveryPerSecond: 22
} as const;

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
      text: '圣水变生水，说明流程有点生。不要慌，牧已成舟。'
    },
    {
      speaker: '牧司学姐',
      text: '这不是普通污染。祷词没有错，却有一个概念被从原位导走了。请先检查池心的流程中枢。'
    }
  ],
  fountainDiscovery: [
    {
      speaker: '老牧师',
      text: '水质清澈，审批齐全，偏偏“圣”没了。鬼不可怕，可怕的是鬼已经通过审批。'
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
      text: 'Holy Shift——把“圣”移回圣水。阿门，不是 Amen，是俺们一起上。'
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
      text: '神圣不可怕，神剩才可怕。看来上面还剩了一层没说完的话。'
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
