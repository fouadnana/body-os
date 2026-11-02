import { test, expect } from '@playwright/test'
import { goNav } from './helpers'

const openPhysique = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await goNav(page, 'Progress')
  await page.locator('.v94MainSegments button', { hasText: 'PHYSIQUE' }).click()
}

test.describe('Progress — PHYSIQUE : vraies mesures corporelles (plus de données figées)', () => {
  test('without any logged measurement, the tab shows an honest empty state, not a fake score/chart', async ({ page }) => {
    await openPhysique(page)
    await expect(page.locator('.v9Impact')).toContainText('DERNIÈRE MESURE')
    await expect(page.locator('.v9Impact')).toContainText('pas encore mesuré')
    await expect(page.locator('.v94MuscleDetail .v94NoData')).toContainText('Pas encore de mesure')
    await expect(page.locator('.v94MuscleDetail .recharts-line')).toHaveCount(0)
  })

  test('＋ MESURER opens a real sheet with one input per muscle group', async ({ page }) => {
    await openPhysique(page)
    await page.locator('button', { hasText: '＋ MESURER' }).click()
    await expect(page.locator('.v103Sheet')).toContainText('MESURES CORPORELLES')
    const labels = await page.locator('.v103Sheet label').allTextContents()
    expect(labels.map(l => l.split('(')[0].trim())).toEqual(['PECTORAUX', 'DOS', 'ÉPAULES', 'JAMBES', 'BRAS'])
  })

  test('logging a measurement for the selected muscle updates the card and the chip stays selected', async ({ page }) => {
    await openPhysique(page)
    await page.locator('button', { hasText: '＋ MESURER' }).click()
    await page.locator('label', { hasText: 'PECTORAUX' }).locator('input').fill('106')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()
    await expect(page.locator('.v9Impact')).toContainText('106 cm')
    await expect(page.locator('.v94MuscleDetail')).toContainText('106 cm')
  })

  test('leaving a muscle field blank does not log a measurement for it', async ({ page }) => {
    await openPhysique(page)
    await page.locator('button', { hasText: '＋ MESURER' }).click()
    await page.locator('label', { hasText: 'DOS' }).locator('input').fill('121')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()
    await expect(page.locator('.v9Impact')).toContainText('pas encore mesuré') // still on Pectoraux by default
    await page.locator('.v94MuscleChips button', { hasText: 'Dos' }).click()
    await expect(page.locator('.v9Impact')).toContainText('121 cm')
  })

  test('a second measurement shows a real delta vs the previous one, not a hardcoded percentage', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('bodyos.daily.log.v1', JSON.stringify([{ date: '2026-10-15', measurements: { Pectoraux: 103 } }]))
    })
    await openPhysique(page)
    await page.locator('button', { hasText: '＋ MESURER' }).click()
    await page.locator('label', { hasText: 'PECTORAUX' }).locator('input').fill('106')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()
    await expect(page.locator('.v9Impact')).toContainText('+3,0 cm')
    await expect(page.locator('.v94MuscleDetail .recharts-line')).toBeVisible()
  })

  test('measurements persist across a reload', async ({ page }) => {
    await openPhysique(page)
    await page.locator('button', { hasText: '＋ MESURER' }).click()
    await page.locator('label', { hasText: 'BRAS' }).locator('input').fill('34.5')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()
    await page.reload()
    await openPhysique(page)
    await page.locator('.v94MuscleChips button', { hasText: 'Bras' }).click()
    await expect(page.locator('.v9Impact')).toContainText('34.5 cm')
  })

  test('measuring one muscle does not overwrite another muscle already logged the same day', async ({ page }) => {
    await openPhysique(page)
    await page.locator('button', { hasText: '＋ MESURER' }).click()
    await page.locator('label', { hasText: 'PECTORAUX' }).locator('input').fill('106')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()

    await page.locator('button', { hasText: '＋ MESURER' }).click()
    await page.locator('label', { hasText: 'DOS' }).locator('input').fill('121')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()

    await page.locator('.v94MuscleChips button', { hasText: 'Dos' }).click()
    await expect(page.locator('.v9Impact')).toContainText('121 cm')
    await page.locator('.v94MuscleChips button', { hasText: 'Pectoraux' }).click()
    await expect(page.locator('.v9Impact')).toContainText('106 cm') // Pectoraux wasn't wiped out
  })

  test('the athlete overlay switches per muscle chip', async ({ page }) => {
    await openPhysique(page)
    await expect(page.locator('.v94AthleteMini')).toHaveClass(/chest/)
    await page.locator('.v94MuscleChips button', { hasText: 'Jambes' }).click()
    await expect(page.locator('.v94AthleteMini')).toHaveClass(/legs/)
  })
})
