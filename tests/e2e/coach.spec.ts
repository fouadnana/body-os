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
})
