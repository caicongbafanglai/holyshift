import { expect, test } from '@playwright/test';

function intersects(first, second) {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
}

async function visibleRectangles(page) {
  return page.evaluate(() => {
    const selectors = {
      hud: '.hud--player',
      objective: '.objective',
      view: '.view-pill',
      guide: '.key-guide',
      combatKeys: '.combat-keys',
      crosshair: '.crosshair',
      boss: '.boss-bar',
      toast: '.toast'
    };
    return Object.fromEntries(
      Object.entries(selectors).map(([name, selector]) => {
        const rectangle = document
          .querySelector(selector)
          .getBoundingClientRect();
        return [
          name,
          {
            left: rectangle.left,
            right: rectangle.right,
            top: rectangle.top,
            bottom: rectangle.bottom
          }
        ];
      })
    );
  });
}

test('the permanent control guide leaves critical view and HUD regions unobstructed', async ({
  page
}) => {
  test.setTimeout(90_000);
  await page.goto('./');
  await page
    .getByRole('button', { name: '开始新旅程' })
    .evaluate((element) => element.click());
  await expect(page.locator('[data-ui="start-screen"]')).toHaveClass(/is-hidden/);

  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1121, height: 720 },
    { width: 1120, height: 720 },
    { width: 1100, height: 720 },
    { width: 1076, height: 720 },
    { width: 1075, height: 720 },
    { width: 1024, height: 768 },
    { width: 960, height: 540 },
    { width: 901, height: 540 },
    { width: 900, height: 540 },
    { width: 844, height: 390 },
    { width: 701, height: 360 },
    { width: 700, height: 360 },
    { width: 640, height: 360 }
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
    await page.locator('[data-ui="boss-bar"]').evaluate((element) =>
      element.classList.remove('is-hidden')
    );
    await page.locator('[data-ui="toast"]').evaluate((element) => {
      element.textContent = '布局动态态验证';
      element.classList.remove('is-hidden');
    });
    const boxes = await visibleRectangles(page);

    expect(intersects(boxes.hud, boxes.objective)).toBe(false);
    expect(intersects(boxes.view, boxes.objective)).toBe(false);
    expect(intersects(boxes.guide, boxes.objective)).toBe(false);
    expect(intersects(boxes.guide, boxes.crosshair)).toBe(false);
    expect(intersects(boxes.guide, boxes.hud)).toBe(false);
    expect(intersects(boxes.guide, boxes.view)).toBe(false);
    expect(intersects(boxes.combatKeys, boxes.objective)).toBe(false);
    expect(intersects(boxes.combatKeys, boxes.crosshair)).toBe(false);
    expect(intersects(boxes.combatKeys, boxes.hud)).toBe(false);
    expect(intersects(boxes.boss, boxes.guide)).toBe(false);
    expect(intersects(boxes.boss, boxes.combatKeys)).toBe(false);
    expect(intersects(boxes.toast, boxes.objective)).toBe(false);
  }

  await expect(page.locator('.viewport-warning')).not.toBeVisible();
  const visibleGuideText = await page
    .locator('[data-ui="guide-body"]')
    .innerText();
  expect(visibleGuideText).toContain('W A S D');
  expect(visibleGuideText).toContain('调查 / 交谈');
  expect(visibleGuideText).toContain('背包 / 使用食品');
  expect(visibleGuideText).toContain('第一 / 第三人称');
  expect(visibleGuideText).toContain('视向飞行');
  expect(visibleGuideText).toContain('暂停 / 设置');
});
