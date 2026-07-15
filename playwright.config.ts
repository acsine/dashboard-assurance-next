import { defineConfig, devices } from '@playwright/test'

const port = 3100
const baseURL = `http://127.0.0.1:${port}`
const sessionSecret = 'playwright-session-secret-at-least-32-characters'

process.env.SESSION_SECRET = sessionSecret

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/fr/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      API_URL: 'http://127.0.0.1:9',
      SESSION_SECRET: sessionSecret,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
