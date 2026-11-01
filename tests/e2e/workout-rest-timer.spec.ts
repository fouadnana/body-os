import { test, expect } from '@playwright/test'

test.describe('Workout — minuteur de repos (Phase 2, échéance persistée)', () => {
  test('counts down on its own (deadline-based), not just via the +/-15s buttons', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T10:00:00Z') })
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9Rest')).toBeVisible({ timeout: 2000 })
    await expect(page.locator('.v9Timer b')).toHaveText('00:45')
    await page.clock.fastForward('00:10')
    await expect(page.locator('.v9Timer b')).toHaveText('00:35')
  })

  test('deadline survives a page reload mid-rest (persisted, not reset to 45s)', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T10:00:00Z') })
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9Rest')).toBeVisible({ timeout: 2000 })
    await page.clock.fastForward('00:20')
    await expect(page.locator('.v9Timer b')).toHaveText('00:25')
    await page.reload()
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    // reload resets the in-app WorkoutView to 'session', but the stored
    // deadline must still reflect the real remaining time if re-entered
    const stored = await page.evaluate(() => localStorage.getItem('bodyos.rest.deadline.v1'))
    expect(stored).not.toBeNull()
    const remainingMs = Number(stored) - (await page.evaluate(() => Date.now()))
    expect(Math.round(remainingMs / 1000)).toBe(25)
  })

  test('skipping/leaving rest clears the deadline so the next rest starts fresh at 45s', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T10:00:00Z') })
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9Rest')).toBeVisible({ timeout: 2000 })
    await page.clock.fastForward('00:20')
    await page.locator('.v9TitleBar button', { hasText: 'Passer' }).click()
    const stored = await page.evaluate(() => localStorage.getItem('bodyos.rest.deadline.v1'))
    expect(stored).toBeNull()
  })

  test('+15s / -15s adjust the real deadline, confirmed after a further fast-forward', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T10:00:00Z') })
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9Rest')).toBeVisible({ timeout: 2000 })
    await page.locator('.v93TimerControls button', { hasText: '+15' }).click()
    await expect(page.locator('.v9Timer b')).toHaveText('01:00')
    await page.clock.fastForward('00:15')
    await expect(page.locator('.v9Timer b')).toHaveText('00:45')
  })
})

test.describe('Workout — garde anti-double-validation (Phase 2)', () => {
  test('rapid double-tap on the validate button only logs one history entry', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v94MuscleTabs button', { hasText: 'Pectoraux' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    const pulse = page.locator('.v9ExerciseActions .pulse')
    await pulse.click({ force: true })
    await pulse.click({ force: true }).catch(() => {}) // second tap may hit a disabled button; that's the point
    await page.waitForTimeout(800)
    const count = await page.evaluate(() => {
      const log = JSON.parse(localStorage.getItem('bodyos.workout.history.v1') || '[]')
      return log.filter((e: any) => e.group === 'Pectoraux').length
    })
    expect(count).toBe(1)
  })

  test('the validate button is disabled immediately after the first tap', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    const pulse = page.locator('.v9ExerciseActions .pulse')
    await pulse.click()
    await expect(pulse).toBeDisabled()
  })
})
