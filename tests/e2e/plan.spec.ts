import { test, expect } from '@playwright/test'
import { collectRealErrors } from './helpers'

const openPlan = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
  await page.locator('button', { hasText: 'Plan — Semaine' }).click()
}

test.describe('Plan — Semaine', () => {
  test('no uncaught JS errors across selecting a day and editing the schedule', async ({ page }) => {
    const errors = collectRealErrors(page)
    await openPlan(page)
    await page.locator('.v9Week article').nth(2).click()
    await page.locator('.v93Dots').click()
    await page.locator('.v96SettingsBody label', { hasText: 'Mardi' }).locator('select').selectOption('Cardio')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()
    expect(errors).toEqual([])
  })

  test('back caret returns to Plus, not Coach (its entry point via Plus)', async ({ page }) => {
    await openPlan(page)
    await page.locator('.v9TitleBar button', { hasText: '‹' }).click()
    await expect(page.locator('.v9TitleBar b')).toHaveText('PLUS')
  })

  test('back caret also returns to Plus when entered via AI Coach > Planifie ma semaine', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
    await page.locator('button', { hasText: 'AI Coach' }).click()
    await page.locator('button', { hasText: 'Planifie ma semaine' }).click()
    await expect(page.locator('.v9Week')).toBeVisible()
    await page.locator('.v9TitleBar button', { hasText: '‹' }).click()
    await expect(page.locator('.v9TitleBar b')).toHaveText('PLUS')
  })

  test('the ◫ button opens a real schedule editor instead of doing nothing', async ({ page }) => {
    await openPlan(page)
    await page.locator('.v93Dots').click()
    await expect(page.locator('.v96NutritionSettings')).toContainText('MON PROGRAMME')
    await expect(page.locator('.v96SettingsBody label')).toHaveCount(7)
  })

  test('changing a day in the schedule editor and saving updates the week view', async ({ page }) => {
    await openPlan(page)
    await page.locator('.v93Dots').click()
    await page.locator('.v96SettingsBody label', { hasText: 'Lundi' }).locator('select').selectOption('Repos')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()
    await expect(page.locator('.v96NutritionSettings')).toHaveCount(0)
    await expect(page.locator('.v9Week article').first()).toContainText('Repos')
  })

  test('the schedule change persists across a reload', async ({ page }) => {
    await openPlan(page)
    await page.locator('.v93Dots').click()
    await page.locator('.v96SettingsBody label', { hasText: 'Lundi' }).locator('select').selectOption('Repos')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()
    await page.reload()
    await openPlan(page)
    await expect(page.locator('.v9Week article').first()).toContainText('Repos')
  })

  test('ANNULER closes the editor without saving changes', async ({ page }) => {
    await openPlan(page)
    const before = await page.locator('.v9Week article').first().textContent()
    await page.locator('.v93Dots').click()
    await page.locator('.v96SettingsBody label', { hasText: 'Lundi' }).locator('select').selectOption('Repos')
    await page.locator('button', { hasText: 'ANNULER' }).click()
    await expect(page.locator('.v9Week article').first()).toHaveText(before ?? '')
  })
})
