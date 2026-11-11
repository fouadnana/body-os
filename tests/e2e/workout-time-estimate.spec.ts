import { test, expect } from '@playwright/test'
import { PECTORAUX_EXERCISES, seedTodayTemplate } from './helpers'

test.describe('Workout — estimation réelle du temps de séance', () => {
  test('the estimated total time varies with the number of exercises, not a fixed 32 min', async ({ page }) => {
    // Regression: "~ 32 min" was a literal hardcoded string, identical for
    // every muscle group and every custom template regardless of how many
    // exercises or how much rest they actually prescribe.
    await seedTodayTemplate(page)
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    const pecText = await page.locator('.v982SessionHeading em').textContent()
    expect(pecText).toMatch(/5 exercices · ~ \d+ min/)
    expect(pecText).not.toContain('32 min')

    // L5-S1 exercises use much shorter (bodyweight) rest periods, so a
    // template made of those must show a different estimate than Pectoraux's.
    await seedTodayTemplate(page, [{ group: 'L5-S1', name: 'Planche latérale' }])
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    const coreText = await page.locator('.v982SessionHeading em').textContent()
    expect(coreText).not.toBe(pecText)
  })

  test('a shorter custom template shows a shorter estimate than the standard session', async ({ page }) => {
    await seedTodayTemplate(page, [PECTORAUX_EXERCISES[3]]) // Dips only
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    const text = await page.locator('.v982SessionHeading em').textContent()
    expect(text).toMatch(/1 exercices · ~ \d+ min/)
    const minutes = Number(text?.match(/~ (\d+) min/)?.[1])
    expect(minutes).toBeLessThan(20) // well under the 5-exercise session's estimate
  })

  test('the remaining-time bar and minutes update as exercises are completed', async ({ page }) => {
    await seedTodayTemplate(page)
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    const before = await page.locator('.v9Remaining b').textContent()
    const barBefore = await page.locator('.v9Remaining i span').evaluate(el => (el as HTMLElement).style.width)
    expect(barBefore).toBe('0%')

    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await page.waitForTimeout(100)
    await page.locator('.v9NextSet').click()
    await page.locator('button', { hasText: 'TERMINER' }).click()

    const after = await page.locator('.v9Remaining b').textContent()
    const barAfter = await page.locator('.v9Remaining i span').evaluate(el => (el as HTMLElement).style.width)
    expect(barAfter).toBe('20%') // 1 of 5 exercises done
    expect(Number(after?.match(/\d+/)?.[0])).toBeLessThan(Number(before?.match(/\d+/)?.[0]))
  })

  test('finishing every exercise brings the remaining estimate to 0 min and the bar to 100%', async ({ page }) => {
    await seedTodayTemplate(page, [PECTORAUX_EXERCISES[3]]) // Dips only
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await page.waitForTimeout(100)
    await page.locator('.v9NextSet').click()
    await page.locator('button', { hasText: 'TERMINER' }).click()

    await expect(page.locator('.v9Remaining b')).toHaveText('0 min')
    const bar = await page.locator('.v9Remaining i span').evaluate(el => (el as HTMLElement).style.width)
    expect(bar).toBe('100%')
  })
})
