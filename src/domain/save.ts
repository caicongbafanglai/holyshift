import {
  ENEMIES,
  GROWTHS,
  RELICS,
  WEAPONS,
  type EnemyDefinition,
  type ProgressStep
} from '../data/content';
import type { Loadout } from './combat';

export const SAVE_SCHEMA_VERSION = 3;
export const CONTENT_VERSION = '1.0.0';
export const SAVE_KEYS = {
  primary: 'holy-shift.save.v3',
  temporary: 'holy-shift.save.v3.tmp',
  backup: 'holy-shift.save.v3.backup'
} as const;
export const LEGACY_SAVE_KEYS = {
  primary: 'holy-shift.save.v2',
  temporary: 'holy-shift.save.v2.tmp',
  backup: 'holy-shift.save.v2.backup'
} as const;

export interface GameSettings {
  muted: boolean;
  volume: number;
  reducedMotion: boolean;
  quality: 'auto' | 'high' | 'low';
  keyGuideExpanded: boolean;
}

export interface GameSave {
  schemaVersion: 3;
  contentVersion: typeof CONTENT_VERSION;
  revision: number;
  updatedAt: string;
  writerId: string;
  progress: ProgressStep;
  loadout: Loadout;
  defeated: {
    sentry: boolean;
    warden: boolean;
    boss: boolean;
    elite: boolean;
  };
  optionalMemento: boolean;
  endingSeen: boolean;
  checkpoint: SaveCheckpoint | null;
  consumedEvents: string[];
  playSeconds: number;
  settings: GameSettings;
}

export type SaveCheckpoint =
  | {
      kind: 'inBattle';
      eventId: string;
      battleId: EnemyDefinition['id'];
      progressSnapshot: ProgressStep;
      loadoutSnapshot: Loadout;
    }
  | {
      kind: 'rewardPending';
      eventId: string;
      battleId: 'sentry' | 'warden';
      required: ['weaponId'] | ['relicId', 'growthId'];
    }
  | {
      kind: 'endingPending';
      eventId: string;
    };

interface SaveEnvelope {
  checksum: string;
  payload: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoadResult {
  save: GameSave;
  recoveredFrom: 'primary' | 'temporary' | 'backup' | 'new';
  warnings: string[];
}

const PROGRESS_STEPS = new Set<ProgressStep>([
  'prologue',
  'questAccepted',
  'sentryDefeated',
  'weaponChosen',
  'wardenDefeated',
  'relicChosen',
  'growthChosen',
  'bossDefeated',
  'complete'
]);
const WEAPON_IDS = new Set<string>(WEAPONS.map((item) => item.id));
const RELIC_IDS = new Set<string>(RELICS.map((item) => item.id));
const GROWTH_IDS = new Set<string>(GROWTHS.map((item) => item.id));
const ENEMY_IDS = new Set<string>(Object.keys(ENEMIES));

function normalizeChoiceId(
  value: unknown,
  allowed: ReadonlySet<string>
): string | null {
  return typeof value === 'string' && allowed.has(value) ? value : null;
}

function createWriterId(): string {
  const random = Math.random().toString(36).slice(2);
  return `tab-${Date.now().toString(36)}-${random}`;
}

export function defaultSettings(): GameSettings {
  return {
    muted: false,
    volume: 0.7,
    reducedMotion:
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches,
    quality: 'auto',
    keyGuideExpanded: true
  };
}

export function createNewSave(writerId = createWriterId()): GameSave {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    revision: 0,
    updatedAt: new Date(0).toISOString(),
    writerId,
    progress: 'prologue',
    loadout: {
      weaponId: null,
      relicId: null,
      growthId: null
    },
    defeated: {
      sentry: false,
      warden: false,
      boss: false,
      elite: false
    },
    optionalMemento: false,
    endingSeen: false,
    checkpoint: null,
    consumedEvents: [],
    playSeconds: 0,
    settings: defaultSettings()
  };
}

export function checksumPayload(payload: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function encodeSave(save: GameSave): string {
  const payload = JSON.stringify(save);
  const envelope: SaveEnvelope = {
    checksum: checksumPayload(payload),
    payload
  };
  return JSON.stringify(envelope);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeSettings(value: unknown): GameSettings {
  const defaults = defaultSettings();
  if (!isRecord(value)) return defaults;
  return {
    muted: typeof value.muted === 'boolean' ? value.muted : defaults.muted,
    volume:
      typeof value.volume === 'number' && Number.isFinite(value.volume)
        ? Math.min(1, Math.max(0, value.volume))
        : defaults.volume,
    reducedMotion:
      typeof value.reducedMotion === 'boolean'
        ? value.reducedMotion
        : defaults.reducedMotion,
    quality:
      value.quality === 'high' || value.quality === 'low' || value.quality === 'auto'
        ? value.quality
        : defaults.quality,
    keyGuideExpanded:
      typeof value.keyGuideExpanded === 'boolean'
        ? value.keyGuideExpanded
        : defaults.keyGuideExpanded
  };
}

function normalizeLoadout(value: unknown): Loadout {
  const loadout = isRecord(value) ? value : {};
  return {
    weaponId: normalizeChoiceId(loadout.weaponId, WEAPON_IDS),
    relicId: normalizeChoiceId(loadout.relicId, RELIC_IDS),
    growthId: normalizeChoiceId(loadout.growthId, GROWTH_IDS)
  };
}

function normalizeEventId(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z0-9:-]{1,96}$/iu.test(value)
    ? value
    : null;
}

function normalizeCheckpoint(value: unknown): SaveCheckpoint | null {
  if (!isRecord(value)) return null;
  const eventId = normalizeEventId(value.eventId);
  if (!eventId) return null;

  if (
    value.kind === 'inBattle' &&
    typeof value.battleId === 'string' &&
    ENEMY_IDS.has(value.battleId) &&
    typeof value.progressSnapshot === 'string' &&
    PROGRESS_STEPS.has(value.progressSnapshot as ProgressStep)
  ) {
    return {
      kind: 'inBattle',
      eventId,
      battleId: value.battleId as EnemyDefinition['id'],
      progressSnapshot: value.progressSnapshot as ProgressStep,
      loadoutSnapshot: normalizeLoadout(value.loadoutSnapshot)
    };
  }

  if (
    value.kind === 'rewardPending' &&
    (value.battleId === 'sentry' || value.battleId === 'warden')
  ) {
    return {
      kind: 'rewardPending',
      eventId,
      battleId: value.battleId,
      required:
        value.battleId === 'sentry'
          ? ['weaponId']
          : ['relicId', 'growthId']
    };
  }

  if (value.kind === 'endingPending') {
    return {
      kind: 'endingPending',
      eventId
    };
  }

  return null;
}

export function migrateSave(raw: unknown, writerId: string): GameSave | null {
  if (!isRecord(raw)) return null;

  const schemaVersion = raw.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2 && schemaVersion !== SAVE_SCHEMA_VERSION) {
    return null;
  }
  if (
    schemaVersion === SAVE_SCHEMA_VERSION &&
    raw.contentVersion !== CONTENT_VERSION
  ) {
    return null;
  }

  const progress = raw.progress;
  if (typeof progress !== 'string' || !PROGRESS_STEPS.has(progress as ProgressStep)) {
    return null;
  }
  const normalizedProgress: ProgressStep =
    progress === 'relicChosen' ? 'wardenDefeated' : (progress as ProgressStep);
  const normalizedLoadout = normalizeLoadout(raw.loadout);
  if (progress === 'relicChosen') {
    normalizedLoadout.relicId = null;
    normalizedLoadout.growthId = null;
  }

  const defeated = isRecord(raw.defeated) ? raw.defeated : {};
  const revision =
    typeof raw.revision === 'number' && Number.isSafeInteger(raw.revision) && raw.revision >= 0
      ? raw.revision
      : 0;
  const playSeconds =
    typeof raw.playSeconds === 'number' && Number.isFinite(raw.playSeconds) && raw.playSeconds >= 0
      ? Math.min(raw.playSeconds, 10_000_000)
      : 0;

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    revision,
    updatedAt:
      typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))
        ? raw.updatedAt
        : new Date(0).toISOString(),
    writerId:
      typeof raw.writerId === 'string' && raw.writerId.length <= 128
        ? raw.writerId
        : writerId,
    progress: normalizedProgress,
    loadout: normalizedLoadout,
    defeated: {
      sentry: defeated.sentry === true,
      warden: defeated.warden === true,
      boss: defeated.boss === true,
      elite: defeated.elite === true
    },
    optionalMemento: raw.optionalMemento === true,
    endingSeen: raw.endingSeen === true,
    checkpoint: normalizeCheckpoint(raw.checkpoint),
    consumedEvents: Array.isArray(raw.consumedEvents)
      ? raw.consumedEvents
          .map(normalizeEventId)
          .filter((value): value is string => value !== null)
          .slice(-64)
      : [],
    playSeconds,
    settings: normalizeSettings(raw.settings)
  };
}

export function decodeSave(
  serialized: string | null,
  writerId: string
): GameSave | null {
  if (!serialized) return null;
  try {
    const envelope: unknown = JSON.parse(serialized);
    if (!isRecord(envelope)) return null;
    if (typeof envelope.payload !== 'string' || typeof envelope.checksum !== 'string') {
      return null;
    }
    if (checksumPayload(envelope.payload) !== envelope.checksum) return null;
    return migrateSave(JSON.parse(envelope.payload), writerId);
  } catch {
    return null;
  }
}

export class SaveManager {
  readonly writerId: string;
  private readonly storage: StorageLike;

  constructor(storage: StorageLike, writerId = createWriterId()) {
    this.storage = storage;
    this.writerId = writerId;
  }

  load(): LoadResult {
    const warnings: string[] = [];
    const candidates = [
      {
        source: 'primary' as const,
        save: decodeSave(this.storage.getItem(SAVE_KEYS.primary), this.writerId)
      },
      {
        source: 'temporary' as const,
        save: decodeSave(this.storage.getItem(SAVE_KEYS.temporary), this.writerId)
      },
      {
        source: 'backup' as const,
        save: decodeSave(this.storage.getItem(SAVE_KEYS.backup), this.writerId)
      }
    ].filter((candidate): candidate is { source: 'primary' | 'temporary' | 'backup'; save: GameSave } =>
      candidate.save !== null
    );

    if (candidates.length === 0) {
      if (
        this.storage.getItem(SAVE_KEYS.primary) ||
        this.storage.getItem(SAVE_KEYS.temporary) ||
        this.storage.getItem(SAVE_KEYS.backup)
      ) {
        warnings.push('检测到无法验证的存档，已安全创建新旅程；原始坏档未被当作有效进度使用。');
      }
      return {
        save: createNewSave(this.writerId),
        recoveredFrom: 'new',
        warnings
      };
    }

    candidates.sort((left, right) => right.save.revision - left.save.revision);
    const selected = candidates[0];
    selected.save.writerId = this.writerId;

    if (selected.source !== 'primary') {
      warnings.push(
        selected.source === 'temporary'
          ? '上次保存中途被打断，已从已验证的事务副本恢复。'
          : '主存档无效，已从最近的已验证备份恢复。'
      );
      try {
        this.storage.setItem(SAVE_KEYS.primary, encodeSave(selected.save));
        this.storage.removeItem(SAVE_KEYS.temporary);
      } catch {
        warnings.push('恢复成功，但浏览器拒绝写回主存档；本次会话仍可继续。');
      }
    }

    return {
      save: selected.save,
      recoveredFrom: selected.source,
      warnings
    };
  }

  save(current: GameSave): GameSave {
    const persisted = decodeSave(this.storage.getItem(SAVE_KEYS.primary), this.writerId);
    const next: GameSave = {
      ...current,
      schemaVersion: SAVE_SCHEMA_VERSION,
      contentVersion: CONTENT_VERSION,
      revision: Math.max(current.revision, persisted?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      writerId: this.writerId,
      loadout: { ...current.loadout },
      defeated: { ...current.defeated },
      checkpoint: current.checkpoint
        ? structuredClone(current.checkpoint)
        : null,
      consumedEvents: [...current.consumedEvents],
      settings: { ...current.settings }
    };

    const serialized = encodeSave(next);
    this.storage.setItem(SAVE_KEYS.temporary, serialized);
    if (!decodeSave(this.storage.getItem(SAVE_KEYS.temporary), this.writerId)) {
      throw new Error('临时存档写入后校验失败。');
    }

    this.storage.setItem(SAVE_KEYS.primary, serialized);
    const verified = decodeSave(this.storage.getItem(SAVE_KEYS.primary), this.writerId);
    if (!verified || verified.revision !== next.revision) {
      throw new Error('主存档写入后校验失败。');
    }

    if (persisted) {
      this.storage.setItem(SAVE_KEYS.backup, encodeSave(persisted));
    }
    this.storage.removeItem(SAVE_KEYS.temporary);
    return next;
  }

  reset(): GameSave {
    this.storage.removeItem(SAVE_KEYS.primary);
    this.storage.removeItem(SAVE_KEYS.temporary);
    this.storage.removeItem(SAVE_KEYS.backup);
    return createNewSave(this.writerId);
  }

  inspectExternal(serialized: string | null): GameSave | null {
    return decodeSave(serialized, this.writerId);
  }
}
