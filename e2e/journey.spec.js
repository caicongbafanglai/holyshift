import { expect, test } from '@playwright/test';

const ACTIONS = {
  attack: '[data-action="combat"][data-value="attack"]',
  defend: '[data-action="combat"][data-value="defend"]',
  holy: '[data-action="combat"][data-value="holy"]'
};

async function clickWithoutGpuStall(locator) {
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
    { timeout: 12_000 }
  ).toBe(true);
  const prompt = page.locator('[data-ui="interaction"]');
  await expect(prompt).toBeVisible();
  await clickWithoutGpuStall(prompt);
}

async function winBattle(page, actions) {
  await expect(page.locator('[data-ui="combat"]')).toBeVisible();
  for (const action of actions) {
    const button = page.locator(ACTIONS[action]);
    await expect(button).toBeEnabled();
    await button.evaluate((element) => element.click());
  }
  await expect(page.getByRole('heading', { name: '试炼通过' })).toBeVisible();
  await clickWithoutGpuStall(page.locator('[data-ui="combat-result-button"]'));
  await expect(page.locator('[data-ui="dialogue"]')).toBeVisible();
  await clickWithoutGpuStall(page.locator('[data-ui="dialogue-button"]'));
}

test('completes the main story, optional route, rewards, boss mechanic, and ending', async ({
  page
}) => {
  test.setTimeout(240_000);
  const runtimeErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/?e2e=1');
  await clickWithoutGpuStall(page.getByRole('button', { name: '开始新旅程' }));
  await expect.poll(
    () => page.evaluate(() => Boolean(window.__holyShiftTest))
  ).toBe(true);

  await teleportAndInteract(page, 'npc');
  await clickWithoutGpuStall(page.getByRole('button', { name: '听取使命' }));
  await clickWithoutGpuStall(page.getByRole('button', { name: '接受使命' }));
  await expect(page.getByText('沿朝圣径击败蚀誓守卫', { exact: true })).toBeVisible();

  await teleportAndInteract(page, 'sentry');
  await winBattle(page, ['attack', 'defend', 'holy']);

  await teleportAndInteract(page, 'weaponShrine');
  await clickWithoutGpuStall(page.getByRole('button', { name: /晨刃/ }));
  await expect(page.locator('[data-ui="equipment"]')).toContainText('晨刃');

  await teleportAndInteract(page, 'warden');
  await winBattle(page, ['attack', 'defend', 'holy', 'attack']);

  await teleportAndInteract(page, 'relicShrine');
  await clickWithoutGpuStall(page.getByRole('button', { name: /生命护符/ }));
  await clickWithoutGpuStall(page.getByRole('button', { name: /坚韧/ }));
  await clickWithoutGpuStall(
    page.getByRole('button', { name: '确认并保存两项选择' })
  );
  await expect(page.locator('[data-ui="equipment"]')).toContainText('生命护符');

  await teleportAndInteract(page, 'elite');
  await winBattle(page, ['attack', 'defend', 'holy', 'attack', 'defend', 'holy']);
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot().optionalMemento)
  ).toBe(true);

  await teleportAndInteract(page, 'boss');
  await expect(page.getByText(/连续三次普通攻击将触发致命反噬/)).toBeVisible();
  await winBattle(page, ['attack', 'defend', 'holy', 'attack', 'attack']);

  await teleportAndInteract(page, 'npc');
  await clickWithoutGpuStall(page.getByRole('button', { name: '见证复明' }));
  await expect(page.getByText(/圣堂已复明/)).toBeVisible();
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot().progress)
  ).toBe('complete');
  expect(runtimeErrors).toEqual([]);

  await page.reload();
  await expect(page.getByRole('button', { name: '继续旅程' })).toBeVisible();
  await expect(page.locator('[data-ui="save-summary"]')).toContainText('圣堂已复明');
  await clickWithoutGpuStall(page.getByRole('button', { name: '继续旅程' }));
  await expect(page.getByText('圣堂已复明；可继续探索或重开旅程', {
    exact: true
  })).toBeVisible();
});
