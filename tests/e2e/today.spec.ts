import { test, expect } from '@playwright/test'
import { collectRealErrors, goNav } from './helpers'

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
    await expect(page.locator('.v982SessionHeading')).toBeVisible()
  })
})

test.describe('Plus (Phase 1 — remplace l\'onglet Coach)', () => {
  test('bottom nav shows Today/Séance/Nutrition/Progrès/Plus, no bare "Coach" tab', async ({ page }) => {
    await page.goto('/')
    const labels = await page.locator('.v9Bottom small').allTextContents()
    expect(labels).toEqual(['Today', 'Séance', 'Nutrition', 'Progrès', 'Plus'])
  })

  test('Plus lists AI Coach and Plan — Semaine, both still reachable', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Coach') // mapped to Plus → AI Coach, see helpers.ts
    await expect(page.locator('.v9Coach')).toBeVisible()
    await expect(page.locator('.v9TitleBar b')).toHaveText('AI COACH')
  })

  test('back from AI Coach returns to Plus, not Today', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
    await page.locator('button', { hasText: 'AI Coach' }).click()
    await page.locator('.v9TitleBar button', { hasText: '‹' }).click()
    await expect(page.locator('.v9TitleBar b')).toHaveText('PLUS')
  })

  test('Plan — Semaine is reachable directly from Plus', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
    await page.locator('button', { hasText: 'Plan — Semaine' }).click()
    await expect(page.locator('.v9Week')).toBeVisible()
  })
})
