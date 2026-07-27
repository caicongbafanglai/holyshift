import {
  CHAPTER_ORDER,
  ENEMIES,
  PLAYER_COMBAT,
  type ChapterProgress,
  type EnemyId
} from '../data/content';

export const SAVE_SCHEMA_VERSION = 4;
export const CONTENT_VERSION = '0.3.0';
export const SAVE_KEYS = {
  primary: 'holy-shift.save.v4',
  temporary: 'holy-shift.save.v4.tmp',
  backup: 'holy-shift.save.v4.backup'
} as const;
export const LEGACY_SAVE_KEYS = {
  primary: 'holy-shift.save.v3',
  temporary: 'holy-shift.save.v3.tmp',
  backup: 'holy-shift.save.v3.backup'
} as const;

export interface GameSettings {
  muted: boolean;
  volume: number;
  reducedMotion: boolean;
  quality: 'auto' | 'high' | 'low';
  keyGuideExpanded: boolean;
}

export interface PlayerSaveState {
  hp: number;
  stamina: number;
  shift: number;
}

export interface ChapterFlags {
  heardStudentPun: boolean;
  heardBelieverPun: boolean;
  fountainRestored: boolean;
  elevatorSeen: boolean;
}

export interface GameSave {
  schemaVersion: 4;
  contentVersion: typeof CONTENT_VERSION;
  revision: number;
  updatedAt: string;
  writerId: string;
  progress: ChapterProgress;
  player: PlayerSaveState;
  defeated: Record<EnemyId, boolean>;
  flags: ChapterFlags;
  checkpoint: null;
  consumedEvents: string[];
  playSeconds: number;
  settings: GameSettings;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
    progress: 'intro',
    player: {
      hp: PLAYER_COMBAT.maxHp,
      stamina: PLAYER_COMBAT.maxStamina,
      shift: 0
    },
    defeated: {
      'wisp-a': false,
      'wisp-b': false,
      'wisp-c': false,
      'approved-water-ghost': false
    },
    flags: {
      heardStudentPun: false,
      heardBelieverPun: false,
      fountainRestored: false,
      elevatorSeen: false
    },
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

function finiteResource(value: unknown, maximum: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, value))
    : fallback;
}

function normalizeEventId(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z0-9:-]{1,96}$/iu.test(value)
    ? value
    : null;
}

export function migrateSave(raw: unknown, writerId: string): GameSave | null {
  if (!isRecord(raw)) return null;
  if (
    typeof raw.schemaVersion === 'number' &&
    raw.schemaVersion > SAVE_SCHEMA_VERSION
  ) {
    return null;
  }

  if (raw.schemaVersion !== SAVE_SCHEMA_VERSION) {
    const migrated = createNewSave(writerId);
    migrated.revision =
      typeof raw.revision === 'number' && Number.isSafeInteger(raw.revision)
        ? Math.max(0, raw.revision)
        : 0;
    migrated.playSeconds =
      typeof raw.playSeconds === 'number' && Number.isFinite(raw.playSeconds)
        ? Math.min(10_000_000, Math.max(0, raw.playSeconds))
        : 0;
    migrated.settings = normalizeSettings(raw.settings);
    return migrated;
  }

  if (raw.contentVersion !== CONTENT_VERSION) return null;
  if (
    typeof raw.progress !== 'string' ||
    !CHAPTER_ORDER.includes(raw.progress as ChapterProgress)
  ) {
    return null;
  }

  const defaults = createNewSave(writerId);
  const defeated = isRecord(raw.defeated) ? raw.defeated : {};
  const flags = isRecord(raw.flags) ? raw.flags : {};
  const player = isRecord(raw.player) ? raw.player : {};
  const revision =
    typeof raw.revision === 'number' &&
    Number.isSafeInteger(raw.revision) &&
    raw.revision >= 0
      ? raw.revision
      : 0;
  const playSeconds =
    typeof raw.playSeconds === 'number' &&
    Number.isFinite(raw.playSeconds) &&
    raw.playSeconds >= 0
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
    progress: raw.progress as ChapterProgress,
    player: {
      hp: finiteResource(player.hp, PLAYER_COMBAT.maxHp, PLAYER_COMBAT.maxHp),
      stamina: finiteResource(
        player.stamina,
        PLAYER_COMBAT.maxStamina,
        PLAYER_COMBAT.maxStamina
      ),
      shift: finiteResource(player.shift, PLAYER_COMBAT.maxShift, 0)
    },
    defeated: Object.fromEntries(
      (Object.keys(ENEMIES) as EnemyId[]).map((id) => [id, defeated[id] === true])
    ) as Record<EnemyId, boolean>,
    flags: {
      heardStudentPun: flags.heardStudentPun === true,
      heardBelieverPun: flags.heardBelieverPun === true,
      fountainRestored: flags.fountainRestored === true,
      elevatorSeen: flags.elevatorSeen === true
    },
    checkpoint: null,
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
      { source: 'primary' as const, save: decodeSave(this.storage.getItem(SAVE_KEYS.primary), this.writerId) },
      { source: 'temporary' as const, save: decodeSave(this.storage.getItem(SAVE_KEYS.temporary), this.writerId) },
      { source: 'backup' as const, save: decodeSave(this.storage.getItem(SAVE_KEYS.backup), this.writerId) }
    ].filter((candidate): candidate is {
      source: 'primary' | 'temporary' | 'backup';
      save: GameSave;
    } => candidate.save !== null);

    if (candidates.length === 0) {
      if (Object.values(SAVE_KEYS).some((key) => this.storage.getItem(key))) {
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
      ...structuredClone(current),
      schemaVersion: SAVE_SCHEMA_VERSION,
      contentVersion: CONTENT_VERSION,
      revision: Math.max(current.revision, persisted?.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      writerId: this.writerId
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
    if (persisted) this.storage.setItem(SAVE_KEYS.backup, encodeSave(persisted));
    this.storage.removeItem(SAVE_KEYS.temporary);
    return next;
  }

  reset(): GameSave {
    Object.values(SAVE_KEYS).forEach((key) => this.storage.removeItem(key));
    return createNewSave(this.writerId);
  }

  inspectExternal(serialized: string | null): GameSave | null {
    return decodeSave(serialized, this.writerId);
  }
}
