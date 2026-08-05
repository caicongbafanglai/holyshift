import { expect, test } from '@playwright/test';

test('flight, downward glide and fountain recovery form a safe resource loop', async ({
  page
}) => {
  await page.goto('./?e2e=1');
  await page
    .getByRole('button', { name: '开始新旅程' })
    .evaluate((element) => element.click());
  await expect(page.locator('[data-ui="start-screen"]')).toHaveClass(/is-hidden/);

  await page.evaluate(() => window.__holyShiftTest.setCameraPitch(0.55));
  await page.keyboard.down('KeyX');
  await page.keyboard.down('KeyW');
  let airborne = null;
  await expect.poll(async () => {
    airborne = await page.evaluate(() => window.__holyShiftTest.snapshot());
    return (
      airborne.traversal.flying &&
      airborne.player.stamina < 100 &&
      airborne.position[1] > 1.5
    );
  }, { timeout: 8000 }).toBe(true);
  await page.evaluate(() => window.__holyShiftTest.setCameraPitch(-0.65));
  let gliding = null;
  await expect.poll(async () => {
    gliding = await page.evaluate(() => window.__holyShiftTest.snapshot());
    return (
      gliding.traversal.gliding &&
      !gliding.traversal.flying &&
      gliding.position[1] < airborne.position[1] &&
      gliding.player.stamina > airborne.player.stamina
    );
  }, { timeout: 8000 }).toBe(true);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyX');

  expect(airborne.traversal.flying).toBe(true);
  expect(airborne.player.stamina).toBeLessThan(100);
  expect(airborne.player.stamina).toBeGreaterThanOrEqual(90);
  expect(airborne.position[1]).toBeGreaterThan(1.5);
  expect(gliding.traversal.gliding).toBe(true);
  expect(gliding.traversal.flying).toBe(false);
  expect(gliding.position[1]).toBeLessThan(airborne.position[1]);
  expect(gliding.player.stamina).toBeGreaterThan(airborne.player.stamina);

  const shiftPulse = await page.evaluate(() => {
    window.__holyShiftTest.grantShift(0);
    return window.__holyShiftTest.snapshot().player.shift;
  });
  expect(shiftPulse).toBe(0);
  await page.keyboard.press('Shift');
  await expect.poll(() =>
    page.evaluate(() => window.__holyShiftTest.snapshot().player.shift)
  ).toBeGreaterThanOrEqual(8);

  const enteredWater = await page.evaluate(() => {
    window.__holyShiftTest.setPlayerHealth(30);
    window.__holyShiftTest.grantShift(0);
    return window.__holyShiftTest.teleportIntoFountain();
  });
  expect(enteredWater).toBe(true);
  await expect.poll(() =>
    page.evaluate(() => window.__holyShiftTest.snapshot().player.hp),
  { timeout: 8000 }).toBeGreaterThan(35);
  await expect.poll(() =>
    page.evaluate(() => window.__holyShiftTest.snapshot().player.shift),
  { timeout: 8000 }).toBeGreaterThan(12);
  const healed = await page.evaluate(() =>
    window.__holyShiftTest.snapshot()
  );
  expect(healed.traversal.inFountainWater).toBe(true);
  expect(healed.player.hp).toBeGreaterThan(35);
  expect(healed.player.hp).toBeLessThanOrEqual(120);
  expect(healed.player.shift).toBeGreaterThan(12);
  expect(healed.player.shift).toBeLessThanOrEqual(100);
});
