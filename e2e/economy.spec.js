import { expect, test } from '@playwright/test';

async function fastClick(locator) {
  await expect(locator).toBeVisible();
  await locator.evaluate((element) => element.click());
}

test('Pingu stall purchases, B backpack and zero-stamina expiry form one saved loop', async ({
  page
}) => {
  await page.goto('./?e2e=1');
  await fastClick(page.getByRole('button', { name: '开始新旅程' }));
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest?.snapshot().mode)
  ).toBe('explore');

  expect(
    await page.evaluate(() => window.__holyShiftTest.grantCodes(300))
  ).toBe(300);
  await expect.poll(
    () =>
      page.evaluate(
        () => window.__holyShiftTest.teleportTo('pinguStall')
      ),
    { timeout: 15_000 }
  ).toBe(true);
  await fastClick(page.locator('[data-ui="interaction"]'));
  await expect(page.locator('[data-ui="shop"]')).toBeVisible();
  await expect(page.locator('[data-ui="shop-codes"]')).toHaveText('300');
  await page.setViewportSize({ width: 640, height: 360 });
  const shopPanel = await page.locator('[data-ui="shop"] .panel').boundingBox();
  expect(shopPanel.x).toBeGreaterThanOrEqual(0);
  expect(shopPanel.y).toBeGreaterThanOrEqual(0);
  expect(shopPanel.x + shopPanel.width).toBeLessThanOrEqual(640);
  expect(shopPanel.y + shopPanel.height).toBeLessThanOrEqual(360);
  await expect(page.getByRole('button', { name: '离开摊位' })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 720 });

  const redSausage = page.locator('[data-food-id="redSausage"]').first();
  await fastClick(redSausage.getByRole('button', { name: '放入背包' }));
  await expect(page.locator('[data-ui="shop-codes"]')).toHaveText('282');

  const noodles = page
    .locator('[data-food-id="forgetfulBeefNoodles"]')
    .first();
  await fastClick(noodles.getByRole('button', { name: '立即使用' }));
  await expect(page.locator('[data-ui="shop-codes"]')).toHaveText('254.2');
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot().staminaMaximum)
  ).toBe(191);

  await fastClick(page.getByRole('button', { name: '离开摊位' }));
  await page.keyboard.press('KeyB');
  await expect(page.locator('[data-ui="backpack"]')).toBeVisible();
  const backpackSausage = page
    .locator('[data-ui="backpack-items"] [data-food-id="redSausage"]');
  await expect(backpackSausage.locator('.food-card__quantity')).toHaveText('× 1');
  await fastClick(backpackSausage.getByRole('button', { name: '使用' }));
  await expect(backpackSausage.locator('.food-card__quantity')).toHaveText('× 0');
  await expect.poll(
    () => page.evaluate(() => window.__holyShiftTest.snapshot().staminaMaximum)
  ).toBe(127.8);

  await page.evaluate(() => window.__holyShiftTest.setPlayerStamina(0));
  const expired = await page.evaluate(() => window.__holyShiftTest.snapshot());
  expect(expired.player.activeStaminaFood).toBeNull();
  expect(expired.staminaMaximum).toBe(100);
  expect(expired.economy.inventory.redSausage).toBe(0);

  await page.keyboard.press('KeyB');
  await expect(page.locator('[data-ui="backpack"]')).toHaveClass(/is-hidden/);
});
