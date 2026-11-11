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

  test('PAS/SOMMEIL/RÉCUP row shows an honest empty state with no data, then the real values once logged', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.v104StatsRow button').nth(0).locator('b')).toHaveText('—')
    await expect(page.locator('.v104StatsRow button').nth(1).locator('b')).toHaveText('—')
    await expect(page.locator('.v104StatsRow button').nth(2).locator('b')).toHaveText('—')

    const today = new Date().toISOString().slice(0, 10)
    await page.evaluate((date) => localStorage.setItem('bodyos.daily.log.v1', JSON.stringify([
      { date, steps: 8420, sleep: 4, recovery: 4 },
    ])), today)
    await page.reload()
    await expect(page.locator('.v104StatsRow button').nth(0).locator('b')).toHaveText('8 420')
    await expect(page.locator('.v104StatsRow button').nth(1).locator('b')).toHaveText('4/5')
    // recovery 4/5 → (4-1)/4*100 = 75%, same formula as Adaptive Sèche's signal
    await expect(page.locator('.v104StatsRow button').nth(2).locator('b')).toHaveText('75%')
  })

  test('the Plan actuel card shows the real week number and the configured goal direction/intensity', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.v104PlanCard')).toContainText('Semaine 1')
    await expect(page.locator('.v104PlanCard')).toContainText('Déficit modéré') // default weeklyRate is -0.55

    const seventeenDaysAgo = new Date()
    seventeenDaysAgo.setDate(seventeenDaysAgo.getDate() - 17)
    await page.evaluate((iso) => localStorage.setItem('bodyos.daily.log.v1', JSON.stringify([{ date: iso, weight: 90 }])), seventeenDaysAgo.toISOString().slice(0, 10))
    await page.reload()
    await expect(page.locator('.v104PlanCard')).toContainText('Semaine 3')
  })

  test('the Prochaine séance card shows the real scheduled template name and a non-fixed duration', async ({ page }) => {
    await page.goto('/')
    const planText = await page.locator('.v104NextSession b').textContent()
    test.skip(planText === 'Repos' || planText === 'Cardio', 'today is Repos/Cardio in the default schedule — nothing to assert here')

    const expectedName = await page.evaluate(() => {
      const DEFAULT_SCHEDULE = ['tpl_upper', 'tpl_lower', 'tpl_push', 'tpl_pull', 'tpl_full', 'tpl_l5s1', 'Repos']
      const schedule = JSON.parse(localStorage.getItem('bodyos.schedule.v1') || 'null') ?? DEFAULT_SCHEDULE
      const templates = JSON.parse(localStorage.getItem('bodyos.templates.v1') || '[]')
      const todayIdx = (new Date().getDay() + 6) % 7
      return templates.find((t: { id: string }) => t.id === schedule[todayIdx])?.name
    })
    await expect(page.locator('.v104NextSession b')).toContainText(expectedName!)
    await expect(page.locator('.v104NextSession b')).toContainText('min')
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
