import { expect, test } from '@playwright/test';

test('view-directed flight drains stamina and fountain water restores health', async ({
  page
}) => {
  await page.goto('/?e2e=1');
  await page
    .getByRole('button', { name: '开始新旅程' })
    .evaluate((element) => element.click());
  await expect(page.locator('[data-ui="start-screen"]')).toHaveClass(/is-hidden/);

  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(700);
  const airborne = await page.evaluate(() =>
    window.__holyShiftTest.snapshot()
  );
  await page.keyboard.up('KeyW');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');

  expect(airborne.traversal.flying).toBe(true);
  expect(airborne.player.stamina).toBeLessThan(95);
  expect(airborne.position[1]).toBeGreaterThan(0.15);

  const enteredWater = await page.evaluate(() => {
    window.__holyShiftTest.setPlayerHealth(30);
    return window.__holyShiftTest.teleportIntoFountain();
  });
  expect(enteredWater).toBe(true);
  await page.waitForTimeout(900);
  const healed = await page.evaluate(() =>
    window.__holyShiftTest.snapshot()
  );
  expect(healed.traversal.inFountainWater).toBe(true);
  expect(healed.player.hp).toBeGreaterThan(35);
  expect(healed.player.hp).toBeLessThanOrEqual(120);
});
