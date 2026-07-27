import { expect, test } from '@playwright/test';

async function fastClick(locator) {
  await expect(locator).toBeVisible();
  await locator.evaluate((element) => element.click());
}

async function startNew(page, testBridge = false) {
  await page.goto(testBridge ? '/?e2e=1' : '/');
  await fastClick(page.getByRole('button', { name: '开始新旅程' }));
  await expect(page.locator('[data-ui="start-screen"]')).toHaveClass(/is-hidden/);
}

async function teleport(page, id) {
  await expect.poll(
    () => page.evaluate(() => Boolean(window.__holyShiftTest))
  ).toBe(true);
  expect(
    await page.evaluate(
      (targetId) => window.__holyShiftTest.teleportTo(targetId),
      id
    )
  ).toBe(true);
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

test('uses an exclusive Web Lock and permits takeover only after the writer closes', async ({
  context,
  page
}) => {
  await startNew(page);
  const secondPage = await context.newPage();
  await secondPage.goto('/');
  await expect(
    secondPage.getByRole('heading', { name: '存档正在另一标签页使用' })
  ).toBeVisible();

  await page.close({ runBeforeUnload: true });
  await secondPage.reload();
  await expect(
    secondPage.getByRole('button', { name: '继续旅程' })
  ).toBeVisible();
});

test('refreshing an active battle restarts the same deterministic fight', async ({
  page
}) => {
  await startNew(page, true);
  await teleport(page, 'npc');
  await fastClick(page.locator('[data-ui="interaction"]'));
  await fastClick(page.getByRole('button', { name: '听取使命' }));
  await fastClick(page.getByRole('button', { name: '接受使命' }));

  await teleport(page, 'sentry');
  await fastClick(page.locator('[data-ui="interaction"]'));
  await expect(page.locator('[data-ui="combat"]')).toBeVisible();

  await page.reload();
  await fastClick(page.getByRole('button', { name: '继续旅程' }));
  await expect(page.locator('[data-ui="combat"]')).toBeVisible();
  await expect(page.locator('[data-ui="round"]')).toHaveText('1');
  await expect(page.locator('[data-ui="combat-player-hp"]')).toHaveText('12 / 12');
  await expect(page.locator('[data-ui="combat-enemy-hp"]')).toHaveText('10 / 10');
});

test('recovers a corrupt current record, then blocks and safely resets when both copies fail', async ({
  page
}) => {
  await startNew(page, true);
  await teleport(page, 'npc');
  await fastClick(page.locator('[data-ui="interaction"]'));
  await fastClick(page.getByRole('button', { name: '听取使命' }));
  await fastClick(page.getByRole('button', { name: '接受使命' }));
  await expect(
    page.getByRole('status').filter({ hasText: '进度已自动保存。' })
  ).toBeVisible();

  await overwriteIndexedDb(page, { current: '{"tampered":true}' });
  await page.reload();
  await expect(
    page.getByRole('status').filter({ hasText: '主存档校验失败' })
  ).toBeVisible();

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
    page.getByRole('button', { name: '继续旅程' })
  ).toBeHidden();
});
