import { test, expect } from '@playwright/test'
import { goNav } from './helpers'

test.describe('Nutrition — ajout rapide (＋)', () => {
  test('the FAB opens a real sheet instead of a fake toast', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v9Fab').click()
    await expect(page.locator('.v93Toast')).toHaveCount(0)
    await expect(page.locator('.v9SheetBack')).toBeVisible()
    await expect(page.locator('.v9SheetBack')).toContainText('AJOUT RAPIDE')
  })

  test('AJOUTER is disabled until a calorie value is entered', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v9Fab').click()
    await expect(page.locator('button', { hasText: 'AJOUTER' })).toBeDisabled()
    await page.locator('label', { hasText: 'CALORIES' }).locator('input').fill('250')
    await expect(page.locator('button', { hasText: 'AJOUTER' })).toBeEnabled()
  })

  test('submitting adds a new real meal entry to the list, with a default name when none is given', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    const before = await page.locator('.v9MealList button').count()
    await page.locator('.v9Fab').click()
    await page.locator('label', { hasText: 'CALORIES' }).locator('input').fill('250')
    await page.locator('button', { hasText: 'AJOUTER' }).click()
    await expect(page.locator('.v9MealList button')).toHaveCount(before + 1)
    await expect(page.locator('.v9MealList button').last()).toContainText('Repas rapide')
    await expect(page.locator('.v9MealList button').last()).toContainText('250 kcal')
  })

  test('a custom name and macros are reflected in the new entry', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v9Fab').click()
    await page.locator('label', { hasText: 'NOM' }).locator('input').fill('Shaker protéiné')
    await page.locator('label', { hasText: 'CALORIES' }).locator('input').fill('180')
    await page.locator('label', { hasText: 'PROTÉINES' }).locator('input').fill('30')
    await page.locator('button', { hasText: 'AJOUTER' }).click()
    await expect(page.locator('.v9MealList button').last()).toContainText('Shaker protéiné')
    await expect(page.locator('.v9MealList button').last()).toContainText('180 kcal')
  })

  test('the added meal persists across a reload', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v9Fab').click()
    await page.locator('label', { hasText: 'NOM' }).locator('input').fill('Barre protéinée')
    await page.locator('label', { hasText: 'CALORIES' }).locator('input').fill('200')
    await page.locator('button', { hasText: 'AJOUTER' }).click()
    await page.reload()
    await goNav(page, 'Nutrition')
    await expect(page.locator('.v9MealList button').last()).toContainText('Barre protéinée')
  })

  test('closing the sheet without filling anything adds nothing', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Nutrition')
    const before = await page.locator('.v9MealList button').count()
    await page.locator('.v9Fab').click()
    await page.locator('.v9SheetBack header button').click()
    await expect(page.locator('.v9MealList button')).toHaveCount(before)
  })
})
