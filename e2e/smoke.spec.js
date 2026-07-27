import { expect, test } from '@playwright/test';

async function tapKey(page, key) {
  await page.keyboard.down(key);
  await page.waitForTimeout(140);
  await page.keyboard.up(key);
}

test('starts the 师老牧镇 3D chapter without runtime errors', async ({
  page
}, testInfo) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle(/Holy Shift.*师老牧镇/);
  await expect(page.getByRole('heading', { name: 'HOLY SHIFT' })).toBeVisible();
  await expect(page.getByText('师老牧镇 · 圣水有点生')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('start-screen.png'),
    animations: 'disabled'
  });

  await page.getByRole('button', { name: '开始新旅程' }).click();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(
    page.getByText('与牧司学姐确认圣水异常', { exact: true })
  ).toBeVisible();
  await expect(page.getByText('手杖连击', { exact: true })).toBeVisible();
  await expect(page.getByText('Holy Shift', { exact: true })).toBeVisible();
  await page.waitForTimeout(1400);
  await page.screenshot({
    path: testInfo.outputPath('first-frame.png'),
    animations: 'disabled'
  });

  expect(errors).toEqual([]);
});

test('movement, real-time controls, camera toggle, pause and reset stay operable', async ({
  page
}) => {
  await page.goto('/?e2e=1');
  await page.getByRole('button', { name: '开始新旅程' }).click();
  await expect(page.locator('[data-ui="start-screen"]')).toHaveClass(/is-hidden/);

  await tapKey(page, 'KeyV');
  await expect(page.getByText('第一人称', { exact: true })).toBeVisible();
  await tapKey(page, 'KeyV');
  await expect(page.getByText('第三人称', { exact: true })).toBeVisible();

  const before = await page.evaluate(
    () => window.__holyShiftTest.snapshot().position
  );
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(520);
  await page.keyboard.up('KeyW');
  await expect.poll(
    () =>
      page.evaluate(
        (start) => {
          const current = window.__holyShiftTest.snapshot().position;
          return Math.hypot(current[0] - start[0], current[2] - start[2]);
        },
        before
      )
  ).toBeGreaterThan(0.5);

  await tapKey(page, 'Escape');
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
  await page.getByRole('button', { name: '返回安全点' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '已返回最近的安全检查点' })
  ).toBeVisible();
});
