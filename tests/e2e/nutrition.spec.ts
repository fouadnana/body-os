import { test, expect } from '@playwright/test'
import { goNav, collectRealErrors } from './helpers'

test.describe('Nutrition', () => {
  test('loads with day/week/month tabs and no console errors', async ({ page }) => {
    const errors = collectRealErrors(page)
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await expect(page.locator('.v9Segments button')).toHaveCount(3)
    await expect(page.locator('.v9Segments button.active')).toHaveText("AUJOURD'HUI")
    await page.locator('.v9Segments button', { hasText: 'SEMAINE' }).click()
    await expect(page.locator('.v9MealList h3')).toContainText('APERÇU SEMAINE')
    await page.locator('.v9Segments button', { hasText: 'MOIS' }).click()
    await expect(page.locator('.v9MealList h3')).toContainText('TENDANCE DU MOIS')
    expect(errors).toEqual([])
  })

  test('programme/recettes mode toggle switches content', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await expect(page.locator('.v9MealList')).toBeVisible()
    await page.locator('.v97ModeTabs button', { hasText: 'RECETTES' }).click()
    await expect(page.locator('.v97Recipes')).toBeVisible()
    await page.locator('.v97ModeTabs button', { hasText: 'PROGRAMME' }).click()
    await expect(page.locator('.v9MealList')).toBeVisible()
  })

  test('AI Food Vision sheet opens and closes', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v99VisionCTA').click()
    await expect(page.locator('.v99VisionSheet')).toBeVisible()
    await page.locator('.v99VisionSheet header button').click()
    await expect(page.locator('.v99VisionSheet')).toHaveCount(0)
  })

  test('editing ingredient quantity recomputes kcal/protein/carbs/fat', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v9MealList button').first().click()
    await page.locator('.v9MealSheet header button', { hasText: '•••' }).click()
    const kcalBefore = Number((await page.locator('.v9MealInfo > b').first().textContent())?.match(/\d+/)?.[0])
    await page.locator('.v97IngredientActions button', { hasText: '−' }).first().click()
    await expect
      .poll(async () => Number((await page.locator('.v9MealInfo > b').first().textContent())?.match(/\d+/)?.[0]))
      .toBeLessThan(kcalBefore)
  })

  test('removing an ingredient recomputes totals', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v9MealList button').first().click()
    await page.locator('.v9MealSheet header button', { hasText: '•••' }).click()
    const countBefore = await page.locator('.v97IngredientList > div').count()
    const kcalBefore = Number((await page.locator('.v9MealInfo > b').first().textContent())?.match(/\d+/)?.[0])
    await page.locator('.v97IngredientActions button.remove').first().click()
    await expect(page.locator('.v97IngredientList > div')).toHaveCount(countBefore - 1)
    const kcalAfter = Number((await page.locator('.v9MealInfo > b').first().textContent())?.match(/\d+/)?.[0])
    expect(kcalAfter).toBeLessThan(kcalBefore)
  })

  test('adding an ingredient recomputes totals and persists after reload', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v9MealList button').first().click()
    await page.locator('.v9MealSheet header button', { hasText: '•••' }).click()
    const kcalBefore = Number((await page.locator('.v9MealInfo > b').first().textContent())?.match(/\d+/)?.[0])
    await page.locator('.v97AddFood button').first().click()
    const kcalAfter = Number((await page.locator('.v9MealInfo > b').first().textContent())?.match(/\d+/)?.[0])
    expect(kcalAfter).toBeGreaterThan(kcalBefore)
    await page.locator('.v9Primary', { hasText: 'ENREGISTRER' }).click()
    await page.reload()
    await goNav(page, 'Nutrition')
    await page.locator('.v9MealList button').first().click()
    const persistedKcal = Number((await page.locator('.v9MealInfo > b').first().textContent())?.match(/\d+/)?.[0])
    expect(persistedKcal).toBe(kcalAfter)
  })

  test('nutrition settings sheet opens, edits, and saves', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v93Dots').click()
    await expect(page.locator('.v96NutritionSettings')).toBeVisible()
    await page.locator('.v96NutritionSettings input[type=number]').first().fill('2200')
    await page.locator('.v96NutritionSettings footer button.primary').click()
    await expect(page.locator('.v93Toast')).toContainText('Réglages enregistrés')
    const ringText = (await page.locator('.v9MacroRing b').textContent())?.replace(/\D/g, '')
    expect(ringText).toBe('2200')
  })
})
