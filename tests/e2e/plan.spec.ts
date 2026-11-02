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

test.describe('Plan — Semaine — objectif de la semaine (plus de 92% figé)', () => {
  test('each day shows its real logged steps, not a fixed 10 000 pas placeholder', async ({ page }) => {
    await page.goto('/')
    const mondayIso = await page.evaluate(() => {
      const d = new Date()
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      return d.toISOString().slice(0, 10)
    })
    await page.evaluate((iso) => {
      localStorage.setItem('bodyos.daily.log.v1', JSON.stringify([{ date: iso, steps: 850 }]))
    }, mondayIso)
    await page.reload()
    await openPlan(page)
    await expect(page.locator('.v9Week article').first()).toContainText('850 pas')
    await expect(page.locator('.v9Week article').nth(1)).toContainText('— pas')
  })

  test('the weekly summary shows an honest empty state instead of a fake 92%', async ({ page }) => {
    await openPlan(page)
    await expect(page.locator('.v9WeekGoal aside')).toContainText('Pas encore assez de données pour juger tes progrès.')
    await expect(page.locator('.v9WeekGoal aside strong')).toHaveText('—')
  })

  test('the weekly summary reflects real nutrition adherence, not a fixed 92%', async ({ page }) => {
    await page.goto('/')
    const daily: Record<string, { kcal: number, protein: number, carbs: number, fat: number }> = {}
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      daily[d.toISOString().slice(0, 10)] = { kcal: 2600, protein: 200, carbs: 280, fat: 75 }
    }
    await page.evaluate((d) => localStorage.setItem('bodyos.nutrition.daily.v1', JSON.stringify(d)), daily)
    await page.reload()
    await openPlan(page)
    await expect(page.locator('.v9WeekGoal aside strong')).toHaveText('100%')
    await expect(page.locator('.v9WeekGoal aside')).toContainText('Tes progrès sont excellents.')
    await expect(page.locator('.v9WeekGoal aside')).toContainText('Aucun ajustement calorique nécessaire cette semaine.')
  })
})
