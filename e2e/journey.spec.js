import { expect, test } from '@playwright/test';

async function fastClick(locator) {
  await expect(locator).toBeVisible();
  await locator.evaluate((element) => element.click());
}

async function teleportAndInteract(page, id) {
  await expect.poll(
    () =>
      page.evaluate(
        (targetId) => window.__holyShiftTest?.teleportTo(targetId) ?? false,
        id
      ),
    { timeout: 15_000 }
  ).toBe(true);
  await expect(page.locator('[data-ui="interaction"]')).toBeVisible();
  await fastClick(page.locator('[data-ui="interaction"]'));
}

async function advanceDialogue(page, lineCount) {
  for (let index = 0; index < lineCount; index += 1) {
    await fastClick(page.locator('[data-ui="dialogue-button"]'));
  }
}

async function expectProgress(page, progress) {
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot().progress),
    { timeout: 15_000 }
  ).toBe(progress);
}

test('completes the real-time first chapter and persists its world state', async ({
  page
}, testInfo) => {
  test.setTimeout(240_000);
  const runtimeErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?e2e=1');
  await fastClick(page.getByRole('button', { name: '开始新旅程' }));
  await expect.poll(
    () => page.evaluate(() => Boolean(window.__holyShiftTest))
  ).toBe(true);

  await teleportAndInteract(page, 'student');
  await advanceDialogue(page, 2);
  await expect.poll(
    () =>
      page.evaluate(
        () => window.__holyShiftTest.snapshot().flags.heardStudentPun
      )
  ).toBe(true);

  await teleportAndInteract(page, 'pastorSenior');
  await advanceDialogue(page, 3);
  await expectProgress(page, 'inspectFountain');

  await teleportAndInteract(page, 'fountain');
  await advanceDialogue(page, 2);
  await expectProgress(page, 'clearWisps');
  await expect(page.locator('[data-ui="combat"]')).toHaveCount(0);
  await expect(page.locator('#game-canvas')).toBeVisible();

  expect(
    await page.evaluate(() => window.__holyShiftTest.teleportToEnemy('wisp-a'))
  ).toBe(true);
  const hpBefore = await page.evaluate(
    () => window.__holyShiftTest.snapshot().enemies['wisp-a'].hp
  );
  await page.keyboard.press('KeyJ');
  await expect.poll(
    () =>
      page.evaluate(
        () => window.__holyShiftTest.snapshot().enemies['wisp-a'].hp
      ),
    { timeout: 8000 }
  ).toBeLessThan(hpBefore);
  await testInfo.attach('real-time-combat.json', {
    body: JSON.stringify(
      await page.evaluate(() => window.__holyShiftTest.snapshot()),
      null,
      2
    ),
    contentType: 'application/json'
  });

  for (const id of ['wisp-a', 'wisp-b', 'wisp-c']) {
    await page.evaluate(
      (enemyId) => window.__holyShiftTest.defeatEnemy(enemyId),
      id
    );
  }
  await expectProgress(page, 'traceSacredGlyph');

  await teleportAndInteract(page, 'pingu');
  await advanceDialogue(page, 4);
  await expectProgress(page, 'consultLin');

  await teleportAndInteract(page, 'linZhenyin');
  await advanceDialogue(page, 4);
  await expectProgress(page, 'defeatWaterGhost');
  await expect(page.locator('[data-ui="boss-bar"]')).toBeVisible();
  await expect(page.locator('[data-ui="boss-name"]')).toHaveText('已审批水鬼');
  await expect(page.locator('#game-canvas')).toBeVisible();

  await page.evaluate(() =>
    window.__holyShiftTest.defeatEnemy('approved-water-ghost')
  );
  await expectProgress(page, 'restoreFountain');
  await page.evaluate(() => window.__holyShiftTest.useShiftAtFountain());
  await expectProgress(page, 'inspectElevator');
  await advanceDialogue(page, 2);
  await expect.poll(
    () =>
      page.evaluate(
        () => window.__holyShiftTest.snapshot().flags.fountainRestored
      )
  ).toBe(true);

  await teleportAndInteract(page, 'elevator');
  await expect(page.locator('[data-ui="dialogue-text"]')).toContainText(
    '191F / SHIFT'
  );
  await advanceDialogue(page, 4);
  await expectProgress(page, 'complete');
  expect(runtimeErrors).toEqual([]);

  await page.reload();
  await expect(page.getByRole('button', { name: '继续第一章' })).toBeVisible();
  await expect(page.locator('[data-ui="save-summary"]')).toContainText(
    '第一章完成'
  );
  await fastClick(page.getByRole('button', { name: '继续第一章' }));
  await expect(page.locator('[data-ui="objective"]')).toHaveText(
    '第一章完成 · 神圣秩序暂时归位'
  );
  await expect.poll(
    () =>
      page.evaluate(
        () => window.__holyShiftTest.snapshot().flags.fountainRestored
      )
  ).toBe(true);
});
