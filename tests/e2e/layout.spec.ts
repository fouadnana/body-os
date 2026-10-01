import { test, expect } from '@playwright/test'
import { goNav, collectRealErrors } from './helpers'

test.describe('Layout', () => {
  test('.v9Phone fills wide iPhones (Pro Max/Plus) instead of capping at 390px', async ({ page }) => {
    // Regression: .v9Phone was capped at min(100vw,390px), leaving an empty
    // gutter on logical widths >390px (Pro Max/Plus = 428-430px).
    await page.setViewportSize({ width: 430, height: 926 })
    await page.goto('/')
    const width = await page.locator('.v9Phone').evaluate((el) => el.getBoundingClientRect().width)
    expect(width).toBeGreaterThan(420)
  })

  test('no fake/duplicate status bar is rendered on any screen', async ({ page }) => {
    for (const label of ['Workout', 'Nutrition', 'Progress', 'Coach'] as const) {
      await page.goto('/')
      await goNav(page, label)
      await expect(page.getByText('9:41', { exact: true })).toHaveCount(0)
    }
  })

  test('.v9Page reserves safe-area space at the top on non-Today screens', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Workout')
    const paddingTop = await page.locator('.v9Page').first().evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))
    expect(paddingTop).toBeGreaterThanOrEqual(18)
  })

  test('no uncaught JS errors walking through every major screen', async ({ page }) => {
    // Workout, Coach and Adaptive are immersive screens with no persistent
    // bottom nav (only Today embeds its own, and the root shell only shows
    // one for Nutrition/Progress) — so each screen is reached fresh from Today.
    const errors = collectRealErrors(page)

    await page.goto('/')
    await goNav(page, 'Workout')
    await expect(page.locator('.v94MuscleTabs')).toBeVisible()

    await page.goto('/')
    await goNav(page, 'Nutrition')
    await page.locator('.v9MealList button').first().click()
    await page.locator('.v9MealSheet header button', { hasText: '‹' }).click()

    await page.goto('/')
    await goNav(page, 'Progress')
    await page.locator('.v94MainSegments button', { hasText: 'PHYSIQUE' }).click()
    await page.locator('.v94MainSegments button', { hasText: 'PERF.' }).click()

    await page.goto('/')
    await goNav(page, 'Coach')
    await page.locator('button', { hasText: 'Analyse de ma progression' }).click()
    await expect(page.locator('.v103Adaptive')).toBeVisible()

    expect(errors).toEqual([])
  })
})
