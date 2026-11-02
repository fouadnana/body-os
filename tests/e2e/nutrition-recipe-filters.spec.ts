import { test, expect } from '@playwright/test'
import { goNav } from './helpers'

const openRecipes = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await goNav(page, 'Nutrition')
  await page.locator('.v97ModeTabs button', { hasText: 'RECETTES' }).click()
}

test.describe('Nutrition — filtres de recettes et favoris', () => {
  test('the filter chips are real toggles, not dead buttons', async ({ page }) => {
    await openRecipes(page)
    await expect(page.locator('.v97RecipeFilters button.active')).toHaveText('TOUTES')
    const totalCount = await page.locator('.v97RecipeGrid button').count()
    expect(totalCount).toBe(6)
  })

  test('RAPIDES filters to recipes of 15 minutes or less', async ({ page }) => {
    await openRecipes(page)
    await page.locator('.v97RecipeFilters button', { hasText: 'RAPIDES' }).click()
    await expect(page.locator('.v97RecipeFilters button.active')).toHaveText('RAPIDES')
    const names = await page.locator('.v97RecipeGrid button b').allTextContents()
    expect(names.sort()).toEqual(['Bowl Skyr myrtilles', 'Omelette protéinée', 'Skyr fruits rouges'].sort())
  })

  test('PROTÉINÉES filters to recipes with at least 40g of protein', async ({ page }) => {
    await openRecipes(page)
    await page.locator('.v97RecipeFilters button', { hasText: 'PROTÉINÉES' }).click()
    const count = await page.locator('.v97RecipeGrid button').count()
    expect(count).toBe(5) // every recipe except "Skyr fruits rouges" (25g)
    const names = await page.locator('.v97RecipeGrid button b').allTextContents()
    expect(names).not.toContain('Skyr fruits rouges')
  })

  test('FAVORIS starts empty with a helpful empty state', async ({ page }) => {
    await openRecipes(page)
    await page.locator('.v97RecipeFilters button', { hasText: 'FAVORIS' }).click()
    await expect(page.locator('.v97RecipeGrid button')).toHaveCount(0)
    await expect(page.locator('.v94NoData')).toContainText('Pas encore de recette favorite')
  })

  test('the ♡ in a recipe sheet toggles it into FAVORIS, persisted across reload', async ({ page }) => {
    await openRecipes(page)
    await page.locator('.v97RecipeGrid button', { hasText: 'Saumon citron' }).click()
    await expect(page.locator('.v97FavoriteToggle')).toHaveText('♡')
    await page.locator('.v97FavoriteToggle').click()
    await expect(page.locator('.v97FavoriteToggle')).toHaveText('♥')
    await page.locator('.v97RecipeSheet header button').first().click()
    await page.locator('.v97RecipeFilters button', { hasText: 'FAVORIS' }).click()
    await expect(page.locator('.v97RecipeGrid button')).toHaveCount(1)
    await expect(page.locator('.v97RecipeGrid button')).toContainText('Saumon citron & riz')

    await page.reload()
    await page.locator('.v9Bottom button', { hasText: 'Nutrition' }).click()
    await page.locator('.v97ModeTabs button', { hasText: 'RECETTES' }).click()
    await page.locator('.v97RecipeFilters button', { hasText: 'FAVORIS' }).click()
    await expect(page.locator('.v97RecipeGrid button')).toHaveCount(1)
  })

  test('toggling the heart again removes it from favorites', async ({ page }) => {
    await openRecipes(page)
    await page.locator('.v97RecipeGrid button', { hasText: 'Saumon citron' }).click()
    await page.locator('.v97FavoriteToggle').click()
    await page.locator('.v97FavoriteToggle').click()
    await expect(page.locator('.v97FavoriteToggle')).toHaveText('♡')
    await page.locator('.v97RecipeSheet header button').first().click()
    await page.locator('.v97RecipeFilters button', { hasText: 'FAVORIS' }).click()
    await expect(page.locator('.v97RecipeGrid button')).toHaveCount(0)
  })
})
