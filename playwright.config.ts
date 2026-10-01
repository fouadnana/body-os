import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

const sandboxChromium = '/opt/pw-browsers/chromium'
const launchOptions = existsSync(sandboxChromium)
  ? { executablePath: sandboxChromium, args: ['--no-sandbox'] }
  : {}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173/body-os/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions,
  },
  projects: [
    {
      // A Chromium mobile-viewport profile — NOT devices['iPhone 13'], which
      // forces WebKit (unavailable in this environment's browser install).
      name: 'iphone',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --host 127.0.0.1',
    url: 'http://127.0.0.1:5173/body-os/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
