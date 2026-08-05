import { expect, test } from '@playwright/test';

for (const key of ['Enter', 'Space']) {
  test(`the start modal traps focus and preserves native ${key} activation`, async ({
    page
  }) => {
    await page.goto('./');
    const startDialog = page.getByRole('dialog', { name: 'HOLY SHIFT' });
    const startButton = page.getByRole('button', { name: '开始新旅程' });

    await expect(startDialog).toBeVisible();
    await expect(startButton).toBeFocused();
    await expect(page.locator('#game-canvas')).toHaveAttribute('inert', '');
    await page.keyboard.press('Tab');
    await expect(startButton).toBeFocused();
    await page.keyboard.press(key);

    await expect(startDialog).toBeHidden();
    await expect(page.locator('#game-canvas')).toBeFocused();
  });
}

test('dynamic status, named pause dialog and mute state remain accessible', async ({
  page
}) => {
  await page.goto('./?e2e=1');
  await page.getByRole('button', { name: '开始新旅程' }).press('Enter');

  const liveMutations = await page.evaluate(async () => {
    const objective = document.querySelector('[data-ui="objective"]');
    let count = 0;
    const observer = new window.MutationObserver((records) => {
      count += records.length;
    });
    observer.observe(objective, { childList: true, characterData: true, subtree: true });
    await new Promise((resolve) => {
      window.setTimeout(resolve, 650);
    });
    observer.disconnect();
    return count;
  });
  expect(liveMutations).toBe(0);

  const mute = page.locator('[data-ui="mute-button"]');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '设置' })).toBeVisible();
});

test('the undersized-viewport warning owns focus and hides game controls', async ({
  page
}) => {
  await page.setViewportSize({ width: 639, height: 360 });
  await page.goto('./');

  const warning = page.getByRole('alertdialog', { name: '窗口尺寸不足' });
  await expect(warning).toBeVisible();
  await expect(warning).toBeFocused();
  await expect(page.locator('#game-canvas')).toHaveCSS('visibility', 'hidden');
  await expect(warning).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Tab');
  await expect(warning).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(warning).toBeFocused();

  await page.setViewportSize({ width: 640, height: 360 });
  await expect(warning).toBeHidden();
  await expect(page.getByRole('button', { name: '开始新旅程' })).toBeFocused();

  await page.setViewportSize({ width: 639, height: 360 });
  await expect(warning).toBeFocused();
  await page.setViewportSize({ width: 640, height: 360 });
  await expect(page.getByRole('button', { name: '开始新旅程' })).toBeFocused();
});

test('a failed first save keeps the start modal reusable without stranding inert UI', async ({
  page
}) => {
  await page.goto('./?e2e=1');
  expect(
    await page.evaluate(() => window.__holyShiftTest.failNextSaveCommit())
  ).toBe(true);

  await page.getByRole('button', { name: '开始新旅程' }).click();
  const persistenceError = page.getByRole('alert').filter({
    hasText: /无法创建新存档.*E2E forced persistence failure/
  });
  await expect(persistenceError).toBeVisible();
  const newJourney = page.getByRole('button', { name: '开始新旅程' });
  await expect(newJourney).toBeEnabled();
  await expect(newJourney).toBeFocused();

  await newJourney.click();
  await expect(page.locator('[data-ui="start-screen"]')).toHaveClass(/is-hidden/);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeFocused();
  await expect(canvas).not.toHaveAttribute('aria-hidden', 'true');
  expect(await canvas.evaluate((element) => element.inert)).toBe(false);
});
