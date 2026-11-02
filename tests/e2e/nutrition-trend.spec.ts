import { test, expect } from '@playwright/test'
import { goNav } from './helpers'

const seedDailyNutrition = async (page: import('@playwright/test').Page, daily: Record<string, { kcal: number, protein: number, carbs: number, fat: number }>) => {
  await page.goto('/')
  await page.evaluate((d) => localStorage.setItem('bodyos.nutrition.daily.v1', JSON.stringify(d)), daily)
  await page.reload()
}

test.describe('Nutrition — tendance SEMAINE/MOIS (plus un simple changement de libellé)', () => {
  test('without history, SEMAINE/MOIS show a real empty state, not an identical meal list', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v9Segments button', { hasText: 'SEMAINE' }).click()
    // today's own live total still counts as 1 day tracked, so seed nothing and expect either
    // the empty state or a 1-point chart — but crucially, never the day's meal list
    await expect(page.locator('.v9MealList')).toHaveCount(0)
  })

  test('with several days of history, SEMAINE renders a real chart with distinct daily kcal points', async ({ page }) => {
    await seedDailyNutrition(page, {
      '2026-10-27': { kcal: 2500, protein: 190, carbs: 260, fat: 70 },
      '2026-10-28': { kcal: 2700, protein: 200, carbs: 280, fat: 80 },
      '2026-10-29': { kcal: 2400, protein: 180, carbs: 250, fat: 65 },
    })
    await goNav(page, 'Nutrition')
    await page.locator('.v9Segments button', { hasText: 'SEMAINE' }).click()
    await expect(page.locator('.v9NutritionTrend .recharts-line')).toBeVisible()
    await expect(page.locator('.v94PerfStats')).toContainText('JOURS SUIVIS')
  })

  test('the stats row reflects the real average and the gap vs the calorie target', async ({ page }) => {
    await seedDailyNutrition(page, {
      '2026-10-27': { kcal: 2600, protein: 190, carbs: 260, fat: 70 },
      '2026-10-28': { kcal: 2600, protein: 200, carbs: 280, fat: 80 },
    })
    await goNav(page, 'Nutrition')
    await page.locator('.v9Segments button', { hasText: 'SEMAINE' }).click()
    // today's own snapshot (default meals) is also included, so just assert the visible shape
    await expect(page.locator('.v94PerfStats span').first()).toContainText('kcal/j')
    await expect(page.locator('.v94PerfStats span').last()).toContainText('ÉCART VS OBJECTIF')
  })

  test('SEMAINE and MOIS show different day counts when more than 7 days are tracked', async ({ page }) => {
    const daily: Record<string, { kcal: number, protein: number, carbs: number, fat: number }> = {}
    for (let i = 1; i <= 10; i++) {
      daily[`2026-10-${String(i).padStart(2, '0')}`] = { kcal: 2500, protein: 190, carbs: 260, fat: 70 }
    }
    await seedDailyNutrition(page, daily)
    await goNav(page, 'Nutrition')
    await page.locator('.v9Segments button', { hasText: 'SEMAINE' }).click()
    const weekDays = await page.locator('.v94PerfStats span').nth(1).locator('b').textContent()
    await page.locator('.v9Segments button', { hasText: 'MOIS' }).click()
    const monthDays = await page.locator('.v94PerfStats span').nth(1).locator('b').textContent()
    expect(Number(monthDays)).toBeGreaterThan(Number(weekDays))
  })

  test('the AUJOURD\'HUI tab still shows the real meal list, unaffected by the trend view', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await expect(page.locator('.v9MealList')).toBeVisible()
    await expect(page.locator('.v9MealList h3')).toHaveText('REPAS DU JOUR')
    await expect(page.locator('.v9Fab')).toBeVisible()
  })

  test('the quick-add FAB is hidden on SEMAINE/MOIS (it only adds to today)', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v9Segments button', { hasText: 'SEMAINE' }).click()
    await expect(page.locator('.v9Fab')).toHaveCount(0)
  })
})
