import { test, expect } from '@playwright/test'

test.describe('Workout — minuteur de repos (Phase 2, bandeau inline, échéance persistée)', () => {
  test('counts down on its own (deadline-based), not just via the +/-15s buttons, and overlays the exercise screen', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T10:00:00Z') })
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9SheetBack .v9Rest')).toBeVisible({ timeout: 2000 })
    // the exercise screen underneath stays mounted — not a full navigation
    await expect(page.locator('.v9Exercise')).toBeVisible()
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
    await expect(page.locator('.v9SheetBack .v9Rest')).toBeVisible({ timeout: 2000 })
    await page.clock.fastForward('00:20')
    await expect(page.locator('.v9Timer b')).toHaveText('00:25')
    await page.reload()
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    // the overlay re-appears on re-entering the exercise because the deadline is still in the future
    await expect(page.locator('.v9SheetBack .v9Rest')).toBeVisible({ timeout: 2000 })
    const stored = await page.evaluate(() => localStorage.getItem('bodyos.rest.deadline.v1'))
    expect(stored).not.toBeNull()
    const remainingMs = Number(stored) - (await page.evaluate(() => Date.now()))
    // a little real time elapses performing the post-reload navigation itself
    expect(Math.round(remainingMs / 1000)).toBeGreaterThanOrEqual(23)
    expect(Math.round(remainingMs / 1000)).toBeLessThanOrEqual(25)
  })

  test('skipping/leaving rest clears the deadline and closes the overlay, so the next rest starts fresh at 45s', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T10:00:00Z') })
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9SheetBack .v9Rest')).toBeVisible({ timeout: 2000 })
    await page.clock.fastForward('00:20')
    await page.locator('.v9TitleBar button', { hasText: 'Passer' }).click()
    await expect(page.locator('.v9SheetBack')).toHaveCount(0)
    const stored = await page.evaluate(() => localStorage.getItem('bodyos.rest.deadline.v1'))
    expect(stored).toBeNull()
  })

  test('+15s / -15s adjust the real deadline, confirmed after a further fast-forward', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T10:00:00Z') })
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9SheetBack .v9Rest')).toBeVisible({ timeout: 2000 })
    await page.locator('.v93TimerControls button', { hasText: '+15' }).click()
    await expect(page.locator('.v9Timer b')).toHaveText('01:00')
    await page.clock.fastForward('00:15')
    await expect(page.locator('.v9Timer b')).toHaveText('00:45')
  })

  test('"Reprendre l\'exercice" closes the overlay and leaves the exercise screen untouched', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9SheetBack .v9Rest')).toBeVisible({ timeout: 2000 })
    await page.locator('.v9NextSet').click()
    await expect(page.locator('.v9SheetBack')).toHaveCount(0)
    await expect(page.locator('.v9Exercise')).toBeVisible()
    await expect(page.locator('.v9TodaySets > div')).toHaveCount(1)
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
