import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const localBaseUrl = 'http://127.0.0.1:4174/holyshift/';
const buildOutDir = process.env.HOLYSHIFT_DIST_DIR;
const quoteForPosixShell = (value) =>
  `'${value.replaceAll("'", "'\"'\"'")}'`;
const previewCommand = buildOutDir
  ? `npm run preview -- --port 4174 --outDir ${quoteForPosixShell(buildOutDir)}`
  : 'npm run preview -- --port 4174';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 8_000
  },
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: process.env.PLAYWRIGHT_HTML_OUTPUT_DIR ?? 'playwright-report',
        open: 'never'
      }
    ]
  ],
  outputDir: process.env.PLAYWRIGHT_TEST_OUTPUT_DIR ?? 'test-results',
  use: {
    baseURL: externalBaseUrl ?? localBaseUrl,
    viewport: { width: 1280, height: 720 },
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: previewCommand,
        url: localBaseUrl,
        // Evidence must fail on a stale listener, never test an older build.
        reuseExistingServer: false,
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
