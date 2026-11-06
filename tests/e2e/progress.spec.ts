import { test, expect } from '@playwright/test'
import { goNav, collectRealErrors } from './helpers'

test.describe('Progress', () => {
  test('SÈCHE/PHYSIQUE/PERF tabs all render without errors', async ({ page }) => {
    const errors = collectRealErrors(page)
    await page.goto('/')
    await goNav(page, 'Progress')
    await expect(page.locator('.v94MainSegments button.active')).toHaveText('SÈCHE')
    await expect(page.locator('.v9WeightCard')).toBeVisible()

    await page.locator('.v94MainSegments button', { hasText: 'PHYSIQUE' }).click()
    await expect(page.locator('.v94MuscleDetail')).toBeVisible()

    await page.locator('.v94MainSegments button', { hasText: 'PERF.' }).click()
    await expect(page.locator('.v94PerfHero')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('PERF tab shows an empty state until a set is logged for the selected muscle, then real data', async ({ page }) => {
    // Regression: this tab used to show a fully hardcoded bar chart and fake
    // stats (RIR MOYEN, ADHÉRENCE) regardless of the selected muscle or any
    // real logged set.
    await page.goto('/')
    await goNav(page, 'Progress')
    await page.locator('.v94MainSegments button', { hasText: 'PERF.' }).click()
    await expect(page.locator('.v94MuscleChips button.active')).toHaveText('Pectoraux')
    await expect(page.locator('.v94NoData')).toContainText('Pas encore de série enregistrée sur Pectoraux')
    await expect(page.locator('.v94PerfStats span').nth(2).locator('b')).toHaveText('0')

    // log a real set on Pectoraux (Workout may open on a different muscle
    // group depending on today's schedule, so select it explicitly)
    await goNav(page, 'Workout')
    await page.locator('.v94MuscleTabs button', { hasText: 'Pectoraux' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v93Toast')).toBeVisible()

    // Workout is an immersive screen with no persistent bottom nav; return to
    // Today (which embeds its own nav) before switching screens again.
    await page.goto('/')
    await goNav(page, 'Progress')
    await page.locator('.v94MainSegments button', { hasText: 'PERF.' }).click()
    await expect(page.locator('.v94NoData')).toHaveCount(0)
    await expect(page.locator('.v94PerfStats span').nth(1).locator('b')).toContainText('kg')
    await expect(page.locator('.v94PerfStats span').nth(2).locator('b')).toHaveText('1')
  })

  test('switching the muscle chip changes PERF data independently per muscle', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v94MuscleTabs button', { hasText: 'Pectoraux' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()

    await page.goto('/')
    await goNav(page, 'Progress')
    await page.locator('.v94MainSegments button', { hasText: 'PERF.' }).click()
    await expect(page.locator('.v94PerfStats span').nth(2).locator('b')).toHaveText('1')
    await page.locator('.v94MuscleChips button', { hasText: 'Dos' }).click()
    await expect(page.locator('.v94NoData')).toContainText('Pas encore de série enregistrée sur Dos')
  })

  test('PHYSIQUE tab shows an honest empty state for evolution photos, not 3 fake pre-seeded ones', async ({ page }) => {
    // Regression: DEFAULT_EVOLUTION_PHOTOS used to pre-seed every new user
    // with 3 "photos" (same placeholder image, fabricated dates), looking
    // like a real tracked evolution with nothing ever uploaded.
    await page.goto('/')
    await goNav(page, 'Progress')
    await page.locator('.v94MainSegments button', { hasText: 'PHYSIQUE' }).click()
    await expect(page.locator('.v982ProgressPhotos .v94NoData')).toContainText('Pas encore de photo')
    await expect(page.locator('.v982ProgressPhotos > div')).toHaveCount(0)
  })

  test('PERF tab narrative reflects a real declining trend, not a hardcoded "force maintenue" claim', async ({ page }) => {
    // Regression: the paragraph under PERFORMANCE EN SÈCHE always said force
    // was maintained as soon as 2+ points existed, even when perfLabel (just
    // above it) correctly showed EN BAISSE.
    await page.goto('/')
    const today = new Date()
    const dateNDaysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
    await page.evaluate((dates) => {
      localStorage.setItem('bodyos.workout.history.v1', JSON.stringify([
        { id: 'h0', date: dates[0], group: 'Pectoraux', exercise: 'Développé couché', weight: 100, reps: 8, rir: 2 },
        { id: 'h1', date: dates[1], group: 'Pectoraux', exercise: 'Développé couché', weight: 85, reps: 8, rir: 2 },
      ]))
    }, [dateNDaysAgo(10), dateNDaysAgo(2)])
    await page.reload()
    await goNav(page, 'Progress')
    await page.locator('.v94MainSegments button', { hasText: 'PERF.' }).click()
    await expect(page.locator('.v94PerfHero b')).toHaveText('EN BAISSE')
    await expect(page.locator('.v94PerfHero p')).toContainText('Charge en baisse')
    await expect(page.locator('.v94PerfHero p')).not.toContainText('force est maintenue')
  })
})
