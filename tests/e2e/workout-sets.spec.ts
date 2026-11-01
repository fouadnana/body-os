import { test, expect } from '@playwright/test'

test.describe('Workout — séries multiples, RIR, suppression (Phase 2)', () => {
  test('validating a set adds it to the "séries d\'aujourd\'hui" table with its RIR', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9Rest')).toBeVisible({ timeout: 2000 })
    await page.locator('.v9NextSet').click()
    await expect(page.locator('.v9TodaySets > div')).toHaveCount(1)
    await expect(page.locator('.v9TodaySets > div').first()).toContainText('100 kg × 10')
    await expect(page.locator('.v9TodaySets > div').first()).toContainText('RIR 1')
  })

  test('adjusting weight and RIR before validating a second set logs the new values, not the first set\'s', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9Rest')).toBeVisible({ timeout: 2000 })
    await page.locator('.v9NextSet').click()

    await page.locator('.v9Load button').nth(1).click() // +2.5kg
    await page.locator('.v9RirStepper button').nth(1).click() // +1 RIR
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9Rest')).toBeVisible({ timeout: 2000 })
    await page.locator('.v9NextSet').click()

    await expect(page.locator('.v9TodaySets > div')).toHaveCount(2)
    await expect(page.locator('.v9TodaySets > div').nth(1)).toContainText('102.5 kg × 10')
    await expect(page.locator('.v9TodaySets > div').nth(1)).toContainText('RIR 2')
  })

  test('deleting a logged set removes it from the table and from history', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9Rest')).toBeVisible({ timeout: 2000 })
    await page.locator('.v9NextSet').click()

    await expect(page.locator('.v9TodaySets > div')).toHaveCount(1)
    await page.locator('.v9TodaySets > div button').first().click()
    await expect(page.locator('.v9TodaySets')).toHaveCount(0)

    const count = await page.evaluate(() => {
      const log = JSON.parse(localStorage.getItem('bodyos.workout.history.v1') || '[]')
      return log.length
    })
    expect(count).toBe(0)
  })

  test('the "séries d\'aujourd\'hui" section is absent before any set is validated', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await expect(page.locator('.v9TodaySets')).toHaveCount(0)
  })
})
