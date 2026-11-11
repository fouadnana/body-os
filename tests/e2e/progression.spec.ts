import { test, expect } from '@playwright/test'
import { seedTodayTemplate } from './helpers'

const seedHistory = async (page: import('@playwright/test').Page, entries: unknown[]) => {
  await seedTodayTemplate(page)
  await page.goto('/')
  await page.evaluate((h) => localStorage.setItem('bodyos.workout.history.v1', JSON.stringify(h)), entries)
  await page.reload()
}

const openFirstExercise = async (page: import('@playwright/test').Page) => {
  await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
  await page.locator('.v9ExerciseList button').first().click()
}

test.describe('Progression automatique (Phase 4)', () => {
  test('hitting the top of the rep range last session suggests +2.5 kg and resets reps to the bottom', async ({ page }) => {
    await seedHistory(page, [{ id: 's1', date: '2026-10-20', group: 'Pectoraux', exercise: 'Développé incliné', weight: 100, reps: 10, rir: 1 }])
    await openFirstExercise(page)
    await expect(page.locator('.v9Load b')).toHaveText('102.5')
    await expect(page.locator('.v9RepLine strong')).toHaveText('6')
    await expect(page.locator('.v9ProgressionNote')).toContainText('charge +2,5 kg')
  })

  test('not reaching the top of the rep range suggests +1 rep at the same weight', async ({ page }) => {
    await seedHistory(page, [{ id: 's1', date: '2026-10-20', group: 'Pectoraux', exercise: 'Développé incliné', weight: 90, reps: 7, rir: 2 }])
    await openFirstExercise(page)
    await expect(page.locator('.v9Load b')).toHaveText('90')
    await expect(page.locator('.v9RepLine strong')).toHaveText('8')
    await expect(page.locator('.v9ProgressionNote')).toContainText('8 reps')
  })

  test('the reps suggestion never exceeds the top of the target range', async ({ page }) => {
    await seedHistory(page, [{ id: 's1', date: '2026-10-20', group: 'Pectoraux', exercise: 'Développé incliné', weight: 90, reps: 9, rir: 2 }])
    await openFirstExercise(page)
    await expect(page.locator('.v9RepLine strong')).toHaveText('10')
  })

  test('no past session for this exercise means no suggestion note (first-time defaults apply)', async ({ page }) => {
    await seedTodayTemplate(page)
    await page.goto('/')
    await openFirstExercise(page)
    await expect(page.locator('.v9ProgressionNote')).toHaveCount(0)
  })

  test('a time-based exercise (seconds, not reps) never gets a progression suggestion', async ({ page }) => {
    await seedTodayTemplate(page, [{ group: 'L5-S1', name: 'Planche latérale' }])
    await page.goto('/')
    await page.evaluate((h) => localStorage.setItem('bodyos.workout.history.v1', JSON.stringify(h)),
      [{ id: 's1', date: '2026-10-20', group: 'L5-S1', exercise: 'Planche latérale', weight: 0, reps: 30, rir: 1 }])
    await page.reload()
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button', { hasText: 'Planche latérale' }).click()
    await expect(page.locator('.v9ProgressionNote')).toHaveCount(0)
  })

  test('once a set is logged today, the suggestion note disappears (it only guides the first set)', async ({ page }) => {
    await seedHistory(page, [{ id: 's1', date: '2026-10-20', group: 'Pectoraux', exercise: 'Développé incliné', weight: 100, reps: 10, rir: 1 }])
    await openFirstExercise(page)
    await expect(page.locator('.v9ProgressionNote')).toBeVisible()
    await page.locator('.v9ExerciseActions .pulse').click()
    await page.waitForTimeout(100)
    await page.locator('.v9NextSet').click()
    await expect(page.locator('.v9ProgressionNote')).toHaveCount(0)
  })

  test('an existing today-draft (already edited) takes priority over the progression suggestion on remount', async ({ page }) => {
    await seedHistory(page, [{ id: 's1', date: '2026-10-20', group: 'Pectoraux', exercise: 'Développé incliné', weight: 100, reps: 10, rir: 1 }])
    await openFirstExercise(page)
    await page.locator('.v9Load button').nth(1).click() // user bumps weight further, away from the 102.5 suggestion
    await expect(page.locator('.v9Load b')).toHaveText('105')
    await page.reload()
    await openFirstExercise(page)
    await expect(page.locator('.v9Load b')).toHaveText('105')
  })
})
