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

    // the "pourquoi maintenir ?" explanation sheet must match too, not just the button
    await page.locator('.v103Decision button').click()
    await expect(page.locator('.v93InfoSheet')).toContainText('maintenir 2 200 kcal')
  })

  test('the weekly decision defaults to MAINTENIR with honest placeholders when there is no data', async ({ page }) => {
    // Regression: "MAINTENIR", "−0,48 kg", "−0,7 cm" and "STABLE" used to be
    // literal hardcoded strings, shown identically to every user regardless
    // of their actual data.
    await page.goto('/')
    await page.locator('.v104Trajectory').click()
    await expect(page.locator('.v103DecisionTop b')).toHaveText('MAINTENIR')
    const metrics = page.locator('.v103DecisionMetrics')
    await expect(metrics).toContainText('POIDS 7J')
    await expect(metrics.locator('span').nth(0).locator('b')).toHaveText('—')
    await expect(metrics.locator('span').nth(1).locator('b')).toHaveText('—')
    await expect(metrics.locator('span').nth(2).locator('b')).toHaveText('EN ATTENTE')
  })

  test('the decision becomes RÉDUIRE with a lower suggested target when the real weekly loss is clearly slower than the goal', async ({ page }) => {
    await page.goto('/')
    const log: { date: string, weight: number, waist: number }[] = []
    const today = new Date()
    for (let i = 10; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      log.push({ date: d.toISOString().slice(0, 10), weight: 90 - (10 - i) * 0.02, waist: 95 })
    }
    await page.evaluate((l) => localStorage.setItem('bodyos.daily.log.v1', JSON.stringify(l)), log)
    await page.reload()
    await page.locator('.v104Trajectory').click()
    await expect(page.locator('.v103DecisionTop b')).toHaveText('RÉDUIRE')
    await expect(page.locator('.v103Decision')).toContainText('2 450 KCAL SUGGÉRÉS')
    await page.locator('.v103Decision button').click()
    await expect(page.locator('.v93InfoSheet')).toContainText('réduire à 2 450 kcal')
  })

  test('the decision becomes AUGMENTER with a higher suggested target when the real weekly loss is clearly faster than the goal', async ({ page }) => {
    await page.goto('/')
    const log: { date: string, weight: number, waist: number }[] = []
    const today = new Date()
    for (let i = 10; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      log.push({ date: d.toISOString().slice(0, 10), weight: 90 - (10 - i) * 0.3, waist: 95 })
    }
    await page.evaluate((l) => localStorage.setItem('bodyos.daily.log.v1', JSON.stringify(l)), log)
    await page.reload()
    await page.locator('.v104Trajectory').click()
    await expect(page.locator('.v103DecisionTop b')).toHaveText('AUGMENTER')
    await expect(page.locator('.v103Decision')).toContainText('2 750 KCAL SUGGÉRÉS')
  })

  test('POIDS 7J and TAILLE reflect the real 7-day deltas, not hardcoded values', async ({ page }) => {
    await page.goto('/')
    const today = new Date()
    const dateNDaysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
    await page.evaluate((entries) => localStorage.setItem('bodyos.daily.log.v1', JSON.stringify(entries)), [
      { date: dateNDaysAgo(8), weight: 92, waist: 98 },
      { date: dateNDaysAgo(0), weight: 90, waist: 96.5 },
    ])
    await page.reload()
    await page.locator('.v104Trajectory').click()
    const metrics = page.locator('.v103DecisionMetrics')
    await expect(metrics.locator('span').nth(0).locator('b')).toHaveText('-2,0 kg')
    await expect(metrics.locator('span').nth(1).locator('b')).toHaveText('-1,5 cm')
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
