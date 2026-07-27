import { describe, expect, it } from 'vitest';
import {
  CONTENT_VERSION,
  SAVE_KEYS,
  SaveManager,
  checksumPayload,
  createNewSave,
  type GameSave
} from '../src/domain/save';

class MemoryStorage {
  values = new Map<string, string>();
  failWrites = false;

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('quota');
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

function envelope(save: unknown) {
  const payload = JSON.stringify(save);
  return JSON.stringify({ payload, checksum: checksumPayload(payload) });
}

describe('transactional v0.3 local save', () => {
  it('round-trips a verified action-RPG save and increments revisions', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const first = manager.save(createNewSave('tab-a'));
    const second = manager.save({ ...first, progress: 'inspectFountain' });

    expect(second.revision).toBe(2);
    expect(manager.load().save.progress).toBe('inspectFountain');
    expect(manager.load().recoveredFrom).toBe('primary');
  });

  it('recovers a newer completed transaction from the temporary slot', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const primary = manager.save(createNewSave('tab-a'));
    const interrupted: GameSave = {
      ...primary,
      revision: primary.revision + 1,
      progress: 'consultLin'
    };
    storage.setItem(SAVE_KEYS.temporary, envelope(interrupted));

    const result = manager.load();

    expect(result.recoveredFrom).toBe('temporary');
    expect(result.save.progress).toBe('consultLin');
    expect(result.warnings[0]).toContain('事务副本');
  });

  it('falls back to a valid backup when the primary checksum is invalid', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const backup: GameSave = {
      ...createNewSave('tab-a'),
      revision: 7,
      progress: 'restoreFountain'
    };
    storage.setItem(SAVE_KEYS.primary, '{"checksum":"bad","payload":"{}"}');
    storage.setItem(SAVE_KEYS.backup, envelope(backup));

    const result = manager.load();

    expect(result.recoveredFrom).toBe('backup');
    expect(result.save.revision).toBe(7);
    expect(result.save.progress).toBe('restoreFountain');
  });

  it('never reports a failed storage write as successful', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    storage.failWrites = true;
    expect(() => manager.save(createNewSave('tab-a'))).toThrow('quota');
  });

  it('rejects unknown progress instead of loading a soft-locked state', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const invalid = { ...createNewSave('tab-a'), progress: 'inside-wall' };
    storage.setItem(SAVE_KEYS.primary, envelope(invalid));

    const result = manager.load();

    expect(result.recoveredFrom).toBe('new');
    expect(result.save.progress).toBe('intro');
  });

  it('clamps forged combat resources and normalizes enemy flags', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const forged = {
      ...createNewSave('tab-a'),
      player: { hp: 999999, stamina: -9, shift: Number.NaN },
      defeated: {
        'wisp-a': true,
        'wisp-b': '<script>',
        'approved-water-ghost': true,
        forged: true
      }
    };
    storage.setItem(SAVE_KEYS.primary, envelope(forged));
    const loaded = manager.load().save;

    expect(loaded.player).toEqual({ hp: 120, stamina: 0, shift: 0 });
    expect(loaded.defeated).toEqual({
      'wisp-a': true,
      'wisp-b': false,
      'wisp-c': false,
      'approved-water-ghost': true
    });
  });

  it('migrates a schema-v3 world save to the new chapter start safely', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    storage.setItem(
      SAVE_KEYS.primary,
      envelope({
        schemaVersion: 3,
        contentVersion: '1.0.0',
        revision: 12,
        progress: 'bossDefeated',
        playSeconds: 321,
        settings: {
          muted: true,
          volume: 0.25,
          reducedMotion: true,
          quality: 'low',
          keyGuideExpanded: false
        }
      })
    );

    const loaded = manager.load().save;

    expect(loaded.contentVersion).toBe(CONTENT_VERSION);
    expect(loaded.progress).toBe('intro');
    expect(loaded.playSeconds).toBe(321);
    expect(loaded.settings.muted).toBe(true);
  });

  it('rejects future schemas without overwriting their source record', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const future = {
      ...createNewSave('tab-a'),
      schemaVersion: 99,
      contentVersion: 'future'
    };
    const serialized = envelope(future);
    storage.setItem(SAVE_KEYS.primary, serialized);

    const result = manager.load();

    expect(result.recoveredFrom).toBe('new');
    expect(storage.getItem(SAVE_KEYS.primary)).toBe(serialized);
  });
});
