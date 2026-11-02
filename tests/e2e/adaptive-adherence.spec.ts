import { test, expect } from '@playwright/test'

const openAdaptive = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
  await page.locator('button', { hasText: 'AI Coach' }).click()
  await page.locator('button', { hasText: 'Analyse de ma progression' }).click()
}

test.describe('Adaptive Sèche — adhérence nutrition réelle (plus de 91% figé)', () => {
  test('without any logged nutrition day, shows an honest empty state instead of a fake 91%', async ({ page }) => {
    await openAdaptive(page)
    const ring = page.locator('section', { has: page.locator('small', { hasText: 'ADHÉRENCE NUTRITION' }) })
    await expect(ring).toContainText('EN ATTENTE')
    await expect(ring).toContainText('Pas encore de repas enregistrés')
    await expect(ring.locator('.v103Ring b')).toHaveText('0')
  })

  test('computes the real on-target percentage from the last 7 tracked days', async ({ page }) => {
    await page.goto('/')
    const daily: Record<string, { kcal: number, protein: number, carbs: number, fat: number }> = {}
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      daily[iso] = i < 5
        ? { kcal: 2600, protein: 200, carbs: 280, fat: 75 } // on target (default settings)
        : { kcal: 3500, protein: 100, carbs: 280, fat: 75 } // off target
    }
    await page.evaluate((d) => localStorage.setItem('bodyos.nutrition.daily.v1', JSON.stringify(d)), daily)
    await page.reload()
    await openAdaptive(page)
    const ring = page.locator('section', { has: page.locator('small', { hasText: 'ADHÉRENCE NUTRITION' }) })
    await expect(ring.locator('.v103Ring b')).toHaveText('71')
    await expect(ring).toContainText('Calories 71% · protéines 71% · repas enregistrés 7/7.')
    await expect(ring).toContainText('BON')
  })

  test('all 7 days on target shows 100% and TRÈS BON', async ({ page }) => {
    await page.goto('/')
    const daily: Record<string, { kcal: number, protein: number, carbs: number, fat: number }> = {}
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      daily[d.toISOString().slice(0, 10)] = { kcal: 2600, protein: 200, carbs: 280, fat: 75 }
    }
    await page.evaluate((d) => localStorage.setItem('bodyos.nutrition.daily.v1', JSON.stringify(d)), daily)
    await page.reload()
    await openAdaptive(page)
    const ring = page.locator('section', { has: page.locator('small', { hasText: 'ADHÉRENCE NUTRITION' }) })
    await expect(ring.locator('.v103Ring b')).toHaveText('100')
    await expect(ring).toContainText('TRÈS BON')
  })

  test('days older than 7 calendar days do not count toward the window', async ({ page }) => {
    await page.goto('/')
    const d = new Date()
    d.setDate(d.getDate() - 10)
    await page.evaluate((iso) => {
      localStorage.setItem('bodyos.nutrition.daily.v1', JSON.stringify({
        [iso]: { kcal: 2600, protein: 200, carbs: 280, fat: 75 },
      }))
    }, d.toISOString().slice(0, 10))
    await page.reload()
    await openAdaptive(page)
    const ring = page.locator('section', { has: page.locator('small', { hasText: 'ADHÉRENCE NUTRITION' }) })
    await expect(ring).toContainText('Pas encore de repas enregistrés')
  })
})
