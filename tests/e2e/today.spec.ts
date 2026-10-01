import { test, expect } from '@playwright/test'
import { collectRealErrors } from './helpers'

test.describe('Today', () => {
  test('loads with KPIs, bottom nav, and no console errors', async ({ page }) => {
    const errors = collectRealErrors(page)
    await page.goto('/')
    await expect(page.locator('.v104Today')).toBeVisible()
    await expect(page.locator('.v9Bottom button')).toHaveCount(5)
    await expect(page.locator('.v104Kpis > button')).toHaveCount(4)
    expect(errors).toEqual([])
  })

  test('quick log sheet opens and closes', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: 'ACTIVITÉ' }).click()
    await expect(page.locator('.v9SheetBack')).toBeVisible()
    await page.locator('.v9SheetBack button', { hasText: /×|‹/ }).first().click()
    await expect(page.locator('.v9SheetBack')).toHaveCount(0)
  })

  test('Adaptive Sèche card navigates to the adaptive screen', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v104AdaptiveCard').click()
    await expect(page.locator('.v103Adaptive')).toBeVisible()
  })

  test('Entraînement card opens the workout screen for today\'s plan', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v104Train').click()
    await expect(page.locator('.v94MuscleTabs')).toBeVisible()
  })
})
