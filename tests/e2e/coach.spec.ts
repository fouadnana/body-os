import { test, expect } from '@playwright/test'
import { goNav, collectRealErrors } from './helpers'

test.describe('Coach', () => {
  test('prompts answer in demo mode without errors', async ({ page }) => {
    const errors = collectRealErrors(page)
    await page.goto('/')
    await goNav(page, 'Coach')
    await page.locator('button', { hasText: 'Que dois-je ajuster' }).click()
    await expect(page.locator('.v93CoachAnswer')).toBeVisible()
    await page.locator('button', { hasText: 'Conseil récupération' }).click()
    await expect(page.locator('.v93CoachAnswer')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('Planifie ma semaine opens the plan screen', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Coach')
    await page.locator('button', { hasText: 'Planifie ma semaine' }).click()
    await expect(page.locator('.v9Week')).toBeVisible()
  })
})

test.describe('Adaptive Sèche', () => {
  test('trajectory shows an empty state until a check-in is saved, then plots the real weight', async ({ page }) => {
    // Regression: the "TRAJECTOIRE 14 JOURS" chart used to be 100%
    // hardcoded demo data, completely disconnected from the saved check-in.
    await page.goto('/')
    await goNav(page, 'Coach')
    await page.locator('button', { hasText: 'Analyse de ma progression' }).click()
    await expect(page.locator('.v103Adaptive')).toBeVisible()
    await expect(page.locator('.v103Trend .v94NoData')).toContainText('Complète le check-in')
    await expect(page.locator('.v103Trend header b')).toHaveText('—')

    await page.locator('.v103Checkin button', { hasText: 'COMPLÉTER' }).click()
    await expect(page.locator('.v103Sheet')).toBeVisible()
    await page.locator('label', { hasText: 'POIDS' }).locator('input').fill('105.8')
    await page.locator('.v103Sheet .v9Primary').click()
    await expect(page.locator('.v103Sheet')).toHaveCount(0)

    await expect(page.locator('.v103Trend header b')).toHaveText('105,8 kg')
    await expect(page.locator('.v103Trend .v94NoData')).toHaveCount(0)
  })

  test('check-in persists after reload', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Coach')
    await page.locator('button', { hasText: 'Analyse de ma progression' }).click()
    await page.locator('.v103Checkin button', { hasText: 'COMPLÉTER' }).click()
    await page.locator('label', { hasText: 'POIDS' }).locator('input').fill('99.4')
    await page.locator('.v103Sheet .v9Primary').click()
    await page.reload()
    await goNav(page, 'Coach')
    await page.locator('button', { hasText: 'Analyse de ma progression' }).click()
    await expect(page.locator('.v103Trend header b')).toHaveText('99,4 kg')
  })

  test('back caret returns to Today when entered via the Today trajectory/adaptive card (its primary entry points)', async ({ page }) => {
    // Regression: the back caret used to be hardcoded to 'coach', stranding
    // users on the demo AI Coach screen when they came from Today instead.
    await page.goto('/')
    await page.locator('.v104Trajectory').click()
    await expect(page.locator('.v103Adaptive')).toBeVisible()
    await page.locator('.v9TitleBar button', { hasText: '‹' }).click()
    await expect(page.locator('.v104Brand')).toBeVisible()
  })

  test('back caret also returns to Today when entered via AI Coach > Analyse de ma progression', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Coach')
    await page.locator('button', { hasText: 'Analyse de ma progression' }).click()
    await page.locator('.v9TitleBar button', { hasText: '‹' }).click()
    await expect(page.locator('.v104Brand')).toBeVisible()
  })

  test('the weekly decision kcal reflects the real configured calorie target, not a hardcoded value', async ({ page }) => {
    // Regression: "2 510 KCAL MAINTENUES" used to be a literal hardcoded
    // string, disconnected from the actual editable target (2600 by default,
    // and never updating if the user changed it in Nutrition settings).
    await page.goto('/')
    await page.locator('.v104Trajectory').click()
    await expect(page.locator('.v103Decision')).toContainText('2 600 KCAL MAINTENUES')

    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Nutrition' }).click()
    await page.locator('.v93Dots').click()
    await page.locator('label', { hasText: 'CALORIES' }).locator('input').fill('2200')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()

    await page.goto('/')
    await page.locator('.v104Trajectory').click()
    await expect(page.locator('.v103Decision')).toContainText('2 200 KCAL MAINTENUES')
  })

  test('the week number is computed from the first tracked data, not hardcoded to 7', async ({ page }) => {
    // Regression: "SEMAINE 7" was a literal hardcoded string, true for
    // nobody in particular. A brand-new user with no tracked data yet
    // should see week 1.
    await page.goto('/')
    await page.locator('.v104Trajectory').click()
    await expect(page.locator('.v9TitleBar small')).toHaveText('INTELLIGENCE · SEMAINE 1')

    await page.goto('/')
    await page.evaluate(() => {
      // 17 days before today → week 3, with a day of slack on either side
      // for timezone rounding so the test isn't boundary-sensitive
      const d = new Date()
      d.setDate(d.getDate() - 17)
      const iso = d.toISOString().slice(0, 10)
      localStorage.setItem('bodyos.daily.log.v1', JSON.stringify([{ date: iso, weight: 90 }]))
    })
    await page.reload()
    await page.locator('.v104Trajectory').click()
    await expect(page.locator('.v9TitleBar small')).toContainText('SEMAINE 3')
  })
})
