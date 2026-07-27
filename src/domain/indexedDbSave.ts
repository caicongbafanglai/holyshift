import {
  CONTENT_VERSION,
  LEGACY_SAVE_KEYS,
  SAVE_KEYS,
  SAVE_SCHEMA_VERSION,
  createNewSave,
  decodeSave,
  encodeSave,
  type GameSave,
  type LoadResult
} from './save';

const DATABASE_NAME = 'holy-shift';
const DATABASE_VERSION = 1;
const STORE_NAME = 'saveRecords';
const LOCK_NAME = 'holy-shift:primary-writer';
const CURRENT_KEY = 'current';
const BACKUP_KEY = 'backup';

type PersistenceBlockReason =
  | 'already-open'
  | 'storage-unavailable'
  | 'corrupt'
  | 'incompatible';

export class PersistenceBlockedError extends Error {
  readonly reason: PersistenceBlockReason;
  readonly diagnostic: string;

  constructor(reason: PersistenceBlockReason, message: string, diagnostic = '') {
    super(message);
    this.name = 'PersistenceBlockedError';
    this.reason = reason;
    this.diagnostic = diagnostic;
  }
}

export interface ScheduledSave {
  save: GameSave;
  committed: Promise<void>;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), {
      once: true
    });
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('IndexedDB 请求失败。')),
      { once: true }
    );
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener(
      'abort',
      () => reject(transaction.error ?? new Error('IndexedDB 事务已中止。')),
      { once: true }
    );
    transaction.addEventListener(
      'error',
      () => reject(transaction.error ?? new Error('IndexedDB 事务失败。')),
      { once: true }
    );
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    });
    request.addEventListener('success', () => resolve(request.result), {
      once: true
    });
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('无法打开 IndexedDB。')),
      { once: true }
    );
    request.addEventListener(
      'blocked',
      () => reject(new Error('IndexedDB 升级被其他标签页阻止。')),
      { once: true }
    );
  });
}

function cloneSave(save: GameSave): GameSave {
  return {
    ...save,
    player: { ...save.player },
    defeated: { ...save.defeated },
    flags: { ...save.flags },
    checkpoint: null,
    consumedEvents: [...save.consumedEvents],
    settings: { ...save.settings }
  };
}

function getRawVersion(serialized: string | null): {
  schemaVersion: unknown;
  contentVersion: unknown;
} | null {
  if (!serialized) return null;
  try {
    const envelope: unknown = JSON.parse(serialized);
    if (
      typeof envelope !== 'object' ||
      envelope === null ||
      !('payload' in envelope) ||
      typeof envelope.payload !== 'string'
    ) {
      return null;
    }
    const raw: unknown = JSON.parse(envelope.payload);
    if (typeof raw !== 'object' || raw === null) return null;
    return {
      schemaVersion: 'schemaVersion' in raw ? raw.schemaVersion : null,
      contentVersion: 'contentVersion' in raw ? raw.contentVersion : null
    };
  } catch {
    return null;
  }
}

function isIncompatible(serialized: string | null): boolean {
  const version = getRawVersion(serialized);
  if (!version) return false;
  return (
    (typeof version.schemaVersion === 'number' &&
      version.schemaVersion > SAVE_SCHEMA_VERSION) ||
    (version.schemaVersion === SAVE_SCHEMA_VERSION &&
      version.contentVersion !== CONTENT_VERSION)
  );
}

async function acquireWriterLock(): Promise<{
  release: () => void;
  task: Promise<void>;
}> {
  if (!('locks' in navigator) || !navigator.locks) {
    throw new PersistenceBlockedError(
      'storage-unavailable',
      '当前浏览器不支持安全的多标签页存档锁。'
    );
  }

  let release = () => {};
  let lockTask: Promise<void> = Promise.resolve();
  const tryAcquire = () =>
    new Promise<boolean>((resolve, reject) => {
      lockTask = navigator.locks
        .request(
          LOCK_NAME,
          { mode: 'exclusive', ifAvailable: true },
          async (lock) => {
            if (!lock) {
              resolve(false);
              return;
            }
            await new Promise<void>((releaseLock) => {
              release = releaseLock;
              resolve(true);
            });
          }
        )
        .catch((error) => {
          reject(error);
        });
    });

  let acquired = false;
  for (let attempt = 0; attempt < 5 && !acquired; attempt += 1) {
    acquired = await tryAcquire();
    if (!acquired && attempt < 4) {
      // Closing a tab releases its Web Lock asynchronously in some engines.
      // A short bounded retry prevents a just-closed writer from looking like
      // a genuinely active second tab.
      await new Promise((resolve) => window.setTimeout(resolve, 125));
    }
  }

  if (!acquired) {
    throw new PersistenceBlockedError(
      'already-open',
      '另一个标签页正在使用这份存档。请关闭它后再重新加载。'
    );
  }

  return {
    release,
    task: lockTask
  };
}

export class IndexedDbSaveManager {
  readonly writerId: string;
  private readonly database: IDBDatabase;
  private readonly releaseLock: () => void;
  private readonly lockTask: Promise<void>;
  private writeQueue: Promise<void> = Promise.resolve();
  private nextRevision = 0;
  private disposed = false;

  private constructor(
    database: IDBDatabase,
    writerId: string,
    releaseLock: () => void,
    lockTask: Promise<void>
  ) {
    this.database = database;
    this.writerId = writerId;
    this.releaseLock = releaseLock;
    this.lockTask = lockTask;
    this.database.addEventListener('versionchange', () => {
      this.database.close();
    });
  }

  static async create(): Promise<IndexedDbSaveManager> {
    if (!('indexedDB' in globalThis)) {
      throw new PersistenceBlockedError(
        'storage-unavailable',
        '当前浏览器未提供 IndexedDB，无法安全保存游戏。'
      );
    }

    const randomId =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const writerId = `tab-${randomId}`;
    const lock = await acquireWriterLock();
    try {
      const database = await openDatabase();
      return new IndexedDbSaveManager(
        database,
        writerId,
        lock.release,
        lock.task
      );
    } catch (error) {
      lock.release();
      throw new PersistenceBlockedError(
        'storage-unavailable',
        error instanceof Error ? error.message : '无法初始化浏览器存储。'
      );
    }
  }

  async load(): Promise<LoadResult> {
    const transaction = this.database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const completed = transactionDone(transaction);
    const currentRequest = requestResult<string | undefined>(
      store.get(CURRENT_KEY)
    );
    const backupRequest = requestResult<string | undefined>(
      store.get(BACKUP_KEY)
    );
    const [currentRaw, backupRaw] = await Promise.all([
      currentRequest,
      backupRequest
    ]);
    await completed;

    const current = decodeSave(currentRaw ?? null, this.writerId);
    const backup = decodeSave(backupRaw ?? null, this.writerId);
    let emergencyRaw: string | null = null;
    try {
      emergencyRaw = localStorage.getItem(SAVE_KEYS.temporary);
    } catch {
      emergencyRaw = null;
    }
    const emergency = decodeSave(emergencyRaw, this.writerId);

    const candidates = [
      current ? { source: 'primary' as const, save: current } : null,
      backup ? { source: 'backup' as const, save: backup } : null,
      emergency ? { source: 'emergency' as const, save: emergency } : null
    ]
      .filter((candidate): candidate is {
        source: 'primary' | 'backup' | 'emergency';
        save: GameSave;
      } => candidate !== null)
      .sort((left, right) => right.save.revision - left.save.revision);

    if (candidates.length > 0) {
      const selected = candidates[0];
      selected.save.writerId = this.writerId;
      this.nextRevision = selected.save.revision;
      if (selected.source === 'emergency') {
        await this.restoreEmergency(selected.save, currentRaw ?? null);
        this.clearEmergencyJournal(selected.save.revision);
        return {
          save: selected.save,
          recoveredFrom: 'temporary',
          warnings: ['检测到页面在事务落盘前中断，已从同步紧急日志恢复最新进度。']
        };
      }
      if (selected.source === 'backup') {
        await this.restoreBackup(selected.save, currentRaw ?? null);
        return {
          save: selected.save,
          recoveredFrom: 'backup',
          warnings: ['主存档校验失败，已从最近的有效事务备份恢复。']
        };
      }
      this.clearEmergencyJournal(selected.save.revision);
      return {
        save: selected.save,
        recoveredFrom: 'primary',
        warnings: []
      };
    }

    if (currentRaw || backupRaw || emergencyRaw) {
      const incompatible =
        isIncompatible(currentRaw ?? null) ||
        isIncompatible(backupRaw ?? null) ||
        isIncompatible(emergencyRaw);
      const diagnostic = JSON.stringify(
        {
          database: DATABASE_NAME,
          schemaExpected: SAVE_SCHEMA_VERSION,
          contentExpected: CONTENT_VERSION,
          current: currentRaw ?? null,
          backup: backupRaw ?? null,
          emergency: emergencyRaw
        },
        null,
        2
      );
      throw new PersistenceBlockedError(
        incompatible ? 'incompatible' : 'corrupt',
        incompatible
          ? '检测到来自未来或不兼容内容版本的存档；原记录未被覆盖。'
          : '当前存档与备份均无法通过完整性校验；原记录未被覆盖。',
        diagnostic
      );
    }

    const migrated = await this.loadLegacySave();
    if (migrated) {
      this.nextRevision = migrated.revision;
      const scheduled = this.save(migrated);
      await scheduled.committed;
      return {
        save: scheduled.save,
        recoveredFrom: 'primary',
        warnings: ['已把旧版浏览器存档迁移到 IndexedDB 原子存储。']
      };
    }

    return {
      save: createNewSave(this.writerId),
      recoveredFrom: 'new',
      warnings: []
    };
  }

  save(current: GameSave): ScheduledSave {
    const next = cloneSave(current);
    next.schemaVersion = SAVE_SCHEMA_VERSION;
    next.contentVersion = CONTENT_VERSION;
    next.revision = Math.max(current.revision, this.nextRevision) + 1;
    next.updatedAt = new Date().toISOString();
    next.writerId = this.writerId;
    this.nextRevision = next.revision;
    try {
      localStorage.setItem(SAVE_KEYS.temporary, encodeSave(next));
    } catch {
      // IndexedDB remains authoritative when synchronous emergency storage is
      // unavailable (for example, a strict private-browsing quota).
    }

    const committed = this.writeQueue
      .then(() => this.writeAtomic(next))
      .then(() => this.clearEmergencyJournal(next.revision));
    this.writeQueue = committed.catch(() => {});
    return {
      save: next,
      committed
    };
  }

  async reset(): Promise<GameSave> {
    await this.writeQueue;
    const transaction = this.database.transaction(STORE_NAME, 'readwrite');
    const completed = transactionDone(transaction);
    transaction.objectStore(STORE_NAME).clear();
    await completed;
    this.nextRevision = 0;
    try {
      for (const key of Object.values(LEGACY_SAVE_KEYS)) {
        localStorage.removeItem(key);
      }
      for (const key of Object.values(SAVE_KEYS)) {
        localStorage.removeItem(key);
      }
    } catch {
      // IndexedDB reset is authoritative; legacy cleanup is best effort.
    }
    return createNewSave(this.writerId);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseLock();
    void this.lockTask.catch(() => {});
    this.database.close();
  }

  private async writeAtomic(save: GameSave): Promise<void> {
    const transaction = this.database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const completed = transactionDone(transaction);
    const currentRaw = await requestResult<string | undefined>(
      store.get(CURRENT_KEY)
    );
    const current = decodeSave(currentRaw ?? null, this.writerId);

    if (currentRaw && current) {
      store.put(currentRaw, BACKUP_KEY);
    } else if (currentRaw) {
      store.put(currentRaw, `quarantine:${Date.now()}`);
    }
    store.put(encodeSave(save), CURRENT_KEY);
    await completed;
  }

  private async restoreBackup(
    backup: GameSave,
    invalidCurrent: string | null
  ): Promise<void> {
    const transaction = this.database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const completed = transactionDone(transaction);
    if (invalidCurrent) {
      store.put(invalidCurrent, `quarantine:${Date.now()}`);
    }
    store.put(encodeSave(backup), CURRENT_KEY);
    await completed;
  }

  private async restoreEmergency(
    emergency: GameSave,
    previousCurrent: string | null
  ): Promise<void> {
    const transaction = this.database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const completed = transactionDone(transaction);
    if (previousCurrent) {
      const previous = decodeSave(previousCurrent, this.writerId);
      store.put(
        previousCurrent,
        previous ? BACKUP_KEY : `quarantine:${Date.now()}`
      );
    }
    store.put(encodeSave(emergency), CURRENT_KEY);
    await completed;
  }

  private clearEmergencyJournal(committedRevision: number): void {
    try {
      const pending = decodeSave(
        localStorage.getItem(SAVE_KEYS.temporary),
        this.writerId
      );
      if (pending && pending.revision <= committedRevision) {
        localStorage.removeItem(SAVE_KEYS.temporary);
      }
    } catch {
      // Best-effort cleanup; a verified stale journal is ignored on next load.
    }
  }

  private async loadLegacySave(): Promise<GameSave | null> {
    try {
      const candidates = [
        localStorage.getItem(SAVE_KEYS.primary),
        localStorage.getItem(SAVE_KEYS.temporary),
        localStorage.getItem(SAVE_KEYS.backup),
        localStorage.getItem(LEGACY_SAVE_KEYS.primary),
        localStorage.getItem(LEGACY_SAVE_KEYS.temporary),
        localStorage.getItem(LEGACY_SAVE_KEYS.backup)
      ]
        .map((serialized) => decodeSave(serialized, this.writerId))
        .filter((save): save is GameSave => save !== null)
        .sort((left, right) => right.revision - left.revision);
      return candidates[0] ?? null;
    } catch {
      return null;
    }
  }
}
