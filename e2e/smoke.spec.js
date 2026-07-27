import { expect, test } from '@playwright/test';

async function tapKey(page, key) {
  await page.keyboard.down(key);
  await page.waitForTimeout(120);
  await page.keyboard.up(key);
}

test('starts a new 3D journey without runtime errors', async ({ page }, testInfo) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle(/Holy Shift/);
  await expect(page.getByRole('heading', { name: 'HOLY SHIFT' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('start-screen.png'),
    animations: 'disabled'
  });

  await page.getByRole('button', { name: '开始新旅程' }).click();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.getByText('与守钟人弥迦交谈', { exact: true })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: testInfo.outputPath('first-frame.png'),
    animations: 'disabled'
  });

  expect(errors).toEqual([]);
});

test('movement, camera toggle, pause and safe reset remain operable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始新旅程' }).click();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.locator('[data-ui="start-screen"]')).toHaveClass(/is-hidden/);

  await tapKey(page, 'KeyV');
  await expect(page.getByText('第一人称', { exact: true })).toBeVisible();
  await tapKey(page, 'KeyV');
  await expect(page.getByText('第三人称', { exact: true })).toBeVisible();

  await page.keyboard.down('KeyW');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyW');

  await tapKey(page, 'Escape');
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
  await page.getByRole('button', { name: '返回安全点' }).click();
  await expect(page.getByRole('status').filter({
    hasText: '已返回最近的安全检查点。'
  })).toBeVisible();
});
