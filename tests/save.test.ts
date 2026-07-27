import { describe, expect, it } from 'vitest';
import {
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

function envelope(save: GameSave) {
  const payload = JSON.stringify(save);
  return JSON.stringify({ payload, checksum: checksumPayload(payload) });
}

describe('transactional local save', () => {
  it('round-trips a verified save and increments revisions', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const first = manager.save(createNewSave('tab-a'));
    const second = manager.save({ ...first, progress: 'questAccepted' });

    expect(second.revision).toBe(2);
    expect(manager.load().save.progress).toBe('questAccepted');
    expect(manager.load().recoveredFrom).toBe('primary');
  });

  it('recovers a newer completed transaction from the temporary slot', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const primary = manager.save(createNewSave('tab-a'));
    const interrupted = {
      ...primary,
      revision: primary.revision + 1,
      progress: 'weaponChosen' as const
    };
    storage.setItem(SAVE_KEYS.temporary, envelope(interrupted));

    const result = manager.load();

    expect(result.recoveredFrom).toBe('temporary');
    expect(result.save.progress).toBe('weaponChosen');
    expect(result.warnings[0]).toContain('事务副本');
  });

  it('falls back to backup when primary checksum is invalid', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const backup = { ...createNewSave('tab-a'), revision: 7, progress: 'relicChosen' as const };
    storage.setItem(SAVE_KEYS.primary, '{"checksum":"bad","payload":"{}"}');
    storage.setItem(SAVE_KEYS.backup, envelope(backup));

    const result = manager.load();

    expect(result.recoveredFrom).toBe('backup');
    expect(result.save.revision).toBe(7);
    expect(result.save.progress).toBe('wardenDefeated');
    expect(result.save.loadout.relicId).toBeNull();
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
    storage.setItem(SAVE_KEYS.primary, envelope(invalid as unknown as GameSave));

    const result = manager.load();

    expect(result.recoveredFrom).toBe('new');
    expect(result.save.progress).toBe('prologue');
  });

  it('drops forged equipment identifiers before deriving gameplay stats', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const forged = {
      ...createNewSave('tab-a'),
      loadout: {
        weaponId: '<script>alert(1)</script>',
        relicId: 'infinite-armor',
        growthId: 'unknown'
      }
    };
    storage.setItem(SAVE_KEYS.primary, envelope(forged));

    const result = manager.load();

    expect(result.save.loadout).toEqual({
      weaponId: null,
      relicId: null,
      growthId: null
    });
  });

  it('round-trips a deterministic in-battle checkpoint and consumed event IDs', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const save = createNewSave('tab-a');
    save.checkpoint = {
      kind: 'inBattle',
      eventId: 'battle:sentry:1',
      battleId: 'sentry',
      progressSnapshot: 'questAccepted',
      loadoutSnapshot: { ...save.loadout }
    };
    save.consumedEvents = ['quest:accepted:1'];

    manager.save(save);
    const loaded = manager.load().save;

    expect(loaded.checkpoint).toEqual(save.checkpoint);
    expect(loaded.consumedEvents).toEqual(['quest:accepted:1']);
  });

  it('rejects future schemas without overwriting the original record', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, 'tab-a');
    const future = {
      ...createNewSave('tab-a'),
      schemaVersion: 99,
      contentVersion: 'future'
    };
    const serialized = envelope(future as unknown as GameSave);
    storage.setItem(SAVE_KEYS.primary, serialized);

    const result = manager.load();

    expect(result.recoveredFrom).toBe('new');
    expect(storage.getItem(SAVE_KEYS.primary)).toBe(serialized);
  });
});
