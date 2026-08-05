import { expect, test } from '@playwright/test';

async function fastClick(locator) {
  await expect(locator).toBeVisible();
  await locator.evaluate((element) => element.click());
}

async function startNew(page, testBridge = false) {
  await page.goto(testBridge ? './?e2e=1' : './');
  await fastClick(page.getByRole('button', { name: '开始新旅程' }));
  await expect(page.locator('[data-ui="start-screen"]')).toHaveClass(/is-hidden/);
}

async function teleportAndInteract(page, id) {
  await expect.poll(
    () =>
      page.evaluate(
        (targetId) => window.__holyShiftTest?.teleportTo(targetId) ?? false,
        id
      )
  ).toBe(true);
  await fastClick(page.locator('[data-ui="interaction"]'));
}

async function advanceDialogue(page, count) {
  for (let index = 0; index < count; index += 1) {
    await fastClick(page.locator('[data-ui="dialogue-button"]'));
  }
}

async function overwriteIndexedDb(page, entries) {
  await page.evaluate(async (records) => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('holy-shift', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('saveRecords', 'readwrite');
      const store = transaction.objectStore('saveRecords');
      for (const [key, value] of Object.entries(records)) {
        store.put(value, key);
      }
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  }, entries);
}

async function injectFutureRecord(page, slot, corruptChecksum = false) {
  return page.evaluate(async ({ targetSlot, corrupt }) => {
    window.__holyShiftTest?.preparePersistenceReload();
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('holy-shift', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (key) => new Promise((resolve, reject) => {
      const transaction = database.transaction('saveRecords', 'readonly');
      const request = transaction.objectStore('saveRecords').get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    const current = await read('current');
    const backup = await read('backup');
    const envelope = JSON.parse(current);
    const raw = JSON.parse(envelope.payload);
    raw.schemaVersion = 5;
    raw.contentVersion = '0.4.0';
    raw.revision += 10;
    const payload = JSON.stringify(raw);
    let hash = 0x811c9dc5;
    for (let index = 0; index < payload.length; index += 1) {
      hash ^= payload.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    const future = JSON.stringify({
      checksum: corrupt
        ? '00000000'
        : (hash >>> 0).toString(16).padStart(8, '0'),
      payload
    });

    if (targetSlot === 'emergency') {
      localStorage.setItem('holy-shift.save.v4.tmp', future);
    } else {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction('saveRecords', 'readwrite');
        const store = transaction.objectStore('saveRecords');
        if (targetSlot === 'current') {
          store.put(current, 'backup');
          store.put(future, 'current');
        } else {
          store.put(future, 'backup');
        }
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    }
    database.close();
    return {
      current: targetSlot === 'current' ? future : current,
      backup: targetSlot === 'current'
        ? current
        : targetSlot === 'backup'
          ? future
          : backup,
      emergency: targetSlot === 'emergency' ? future : null
    };
  }, { targetSlot: slot, corrupt: corruptChecksum });
}

async function readRawPersistence(page) {
  return page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('holy-shift', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (key) => new Promise((resolve, reject) => {
      const transaction = database.transaction('saveRecords', 'readonly');
      const request = transaction.objectStore('saveRecords').get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    const result = {
      current: await read('current'),
      backup: await read('backup'),
      emergency: localStorage.getItem('holy-shift.save.v4.tmp')
    };
    database.close();
    return result;
  });
}

test('uses an exclusive Web Lock and permits takeover after the writer closes', async ({
  context,
  page
}) => {
  await startNew(page);
  const secondPage = await context.newPage();
  await secondPage.goto('./');
  await expect(
    secondPage.getByRole('heading', { name: '存档正在另一标签页使用' })
  ).toBeVisible();

  await page.close({ runBeforeUnload: true });
  await secondPage.reload();
  await expect(
    secondPage.getByRole('button', { name: '继续第一章' })
  ).toBeVisible();
});

test('refreshing a live encounter restores its safe deterministic wave state', async ({
  page
}) => {
  await startNew(page, true);
  await teleportAndInteract(page, 'pastorSenior');
  await advanceDialogue(page, 3);
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot().progress)
  ).toBe('inspectFountain');
  await teleportAndInteract(page, 'fountain');
  await advanceDialogue(page, 2);
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot().progress)
  ).toBe('clearWisps');

  expect(
    await page.evaluate(() => window.__holyShiftTest.teleportToEnemy('wisp-a'))
  ).toBe(true);
  await page.keyboard.press('KeyJ');
  await expect.poll(
    () =>
      page.evaluate(
        () => window.__holyShiftTest.snapshot().enemies['wisp-a'].hp
      )
  ).toBeLessThan(48);

  await page.reload();
  await fastClick(page.getByRole('button', { name: '继续第一章' }));
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot().progress)
  ).toBe('clearWisps');
  await expect.poll(
    () =>
      page.evaluate(
        () => window.__holyShiftTest.snapshot().enemies['wisp-a']
      )
  ).toMatchObject({ hp: 48, visible: true });
});

test('recovers a corrupt current record, then blocks and safely resets when both copies fail', async ({
  page
}) => {
  await startNew(page, true);
  await teleportAndInteract(page, 'pastorSenior');
  await advanceDialogue(page, 3);
  await expect(
    page.getByRole('status').filter({ hasText: '主线进度已自动保存' })
  ).toBeVisible();

  await page.evaluate(() => window.__holyShiftTest.preparePersistenceReload());
  await overwriteIndexedDb(page, { current: '{"tampered":true}' });
  await page.reload();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: /主存档校验失败|同步紧急日志恢复/ })
  ).toBeVisible();

  await page.evaluate(() => window.__holyShiftTest.preparePersistenceReload());
  await overwriteIndexedDb(page, {
    current: '{"tampered":"current"}',
    backup: '{"tampered":"backup"}'
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '无法安全打开存档' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '删除坏档并重开' })
  ).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除坏档并重开' }).click();
  await expect(
    page.getByRole('button', { name: '开始新旅程' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '继续第一章' })
  ).toBeHidden();
});

for (const slot of ['current', 'backup', 'emergency']) {
  test(`blocks a checksum-valid future ${slot} record without rewriting any slot`, async ({
    page
  }) => {
    await startNew(page, true);
    const expected = await injectFutureRecord(page, slot);

    await page.reload();
    await expect(
      page.getByRole('heading', { name: '无法安全打开存档' })
    ).toBeVisible();
    await expect(page.getByText(/未来或不兼容内容版本/)).toBeVisible();
    expect(await readRawPersistence(page)).toEqual(expected);
  });
}

test('does not mistake a checksum-corrupt future-looking backup for a valid future save', async ({
  page
}) => {
  await startNew(page, true);
  const expected = await injectFutureRecord(page, 'backup', true);

  await page.reload();
  await expect(
    page.getByRole('button', { name: '继续第一章' })
  ).toBeVisible();
  expect(await readRawPersistence(page)).toEqual(expected);
});

test('changing a setting while restarting cannot resurrect the previous journey', async ({
  page
}) => {
  await startNew(page, true);
  await teleportAndInteract(page, 'pastorSenior');
  await advanceDialogue(page, 3);
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot().progress)
  ).toBe('inspectFountain');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.evaluate(() => {
    const quality = document.querySelector('[data-ui="quality"]');
    quality.value = 'low';
    quality.dispatchEvent(new window.Event('change', { bubbles: true }));
    document.querySelector('[data-action="restart"]').click();
  });

  await expect(page.locator('[data-ui="pause"]')).toHaveClass(/is-hidden/);
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot())
  ).toMatchObject({
    progress: 'intro',
    defeated: {
      'wisp-a': false,
      'wisp-b': false,
      'wisp-c': false,
      'approved-water-ghost': false
    },
    economy: { codes: 0 }
  });
  expect((await readRawPersistence(page)).backup).toBeNull();

  await page.evaluate(() => window.__holyShiftTest.preparePersistenceReload());
  await page.reload();
  await fastClick(page.getByRole('button', { name: '继续第一章' }));
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot())
  ).toMatchObject({ progress: 'intro', economy: { codes: 0 } });
});
