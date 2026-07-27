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

test('uses an exclusive Web Lock and permits takeover after the writer closes', async ({
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

  await overwriteIndexedDb(page, { current: '{"tampered":true}' });
  await page.reload();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /主存档校验失败|同步紧急日志恢复/ })
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
    page.getByRole('button', { name: '继续第一章' })
  ).toBeHidden();
});
