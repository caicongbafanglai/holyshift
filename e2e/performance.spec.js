import { expect, test } from '@playwright/test';

test('keeps the detailed plaza inside adaptive software-renderer budgets', async ({
  browserName,
  context,
  page
}, testInfo) => {
  await page.goto('/?e2e=1');
  await page
    .getByRole('button', { name: '开始新旅程' })
    .evaluate((element) => element.click());
  await expect(page.locator('[data-ui="start-screen"]')).toHaveClass(/is-hidden/);
  await page.waitForTimeout(3200);

  const measurement = await page.evaluate(() => {
    const renderer = window.__holyShiftTest.snapshot().renderer;
    const resources = performance.getEntriesByType('resource');
    return {
      ...renderer,
      directRenderMs: window.__holyShiftTest.renderBenchmark(12),
      directUpdateMs: window.__holyShiftTest.updateBenchmark(120),
      encodedBytes: resources.reduce(
        (total, entry) => total + (entry.encodedBodySize || 0),
        0
      ),
      resourceCount: resources.length
    };
  });
  if (browserName === 'chromium') {
    const session = await context.newCDPSession(page);
    await session.send('Performance.enable');
    const metrics = await session.send('Performance.getMetrics');
    measurement.jsHeapUsedSize =
      metrics.metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value ??
      null;
    await session.detach();
  }

  await testInfo.attach('renderer-budget.json', {
    body: JSON.stringify(measurement, null, 2),
    contentType: 'application/json'
  });

  expect(measurement.triangles).toBeLessThan(60_000);
  expect(measurement.calls).toBeLessThan(100);
  expect(measurement.pixelRatio).toBeGreaterThanOrEqual(0.5);
  expect(measurement.pixelRatio).toBeLessThanOrEqual(1.5);
  expect(measurement.encodedBytes).toBeLessThan(3_000_000);
  expect(measurement.directRenderMs).toBeLessThan(20);
  expect(measurement.directUpdateMs).toBeLessThan(3);
  if (measurement.jsHeapUsedSize !== undefined) {
    expect(measurement.jsHeapUsedSize).not.toBeNull();
    expect(measurement.jsHeapUsedSize).toBeLessThan(160 * 1024 * 1024);
  }
  expect(measurement.fps).toBeGreaterThanOrEqual(8);
  expect(measurement.p95FrameMs).toBeLessThanOrEqual(100);
});
