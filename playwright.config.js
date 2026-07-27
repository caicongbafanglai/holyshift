import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 8_000
  },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4174',
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm run preview -- --port 4174',
        url: 'http://127.0.0.1:4174',
        reuseExistingServer: true,
        timeout: 30_000
      },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader-webgl']
        }
      }
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        headless: process.env.PW_FIREFOX_HEADED !== '1',
        launchOptions: {
          firefoxUserPrefs: {
            'webgl.disabled': false,
            'webgl.force-enabled': true,
            'webgl.software': true
          }
        }
      }
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        deviceScaleFactor: 1
      }
    }
  ]
});
