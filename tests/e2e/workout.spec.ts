import { test, expect } from '@playwright/test'
import { goNav, collectRealErrors, seedTodayTemplate } from './helpers'

const MUSCLE_GROUPS = ['Pectoraux', 'Dos', 'Épaules', 'Jambes', 'Bras', 'L5-S1']
const DOS_EXERCISES = [
  { group: 'Dos', name: 'Tirage vertical' }, { group: 'Dos', name: 'Rowing machine' },
  { group: 'Dos', name: 'Rowing poitrine' }, { group: 'Dos', name: 'Pulldown unilatéral' }, { group: 'Dos', name: 'Reverse fly' },
]
const JAMBES_EXERCISES = [
  { group: 'Jambes', name: 'Hack squat' }, { group: 'Jambes', name: 'Fentes bulgares' },
  { group: 'Jambes', name: 'Leg curl' }, { group: 'Jambes', name: 'Leg extension' }, { group: 'Jambes', name: 'Mollets' },
]

test.describe('Workout — séance', () => {
  test('session options (•••) open a real menu that resets progress', async ({ page }) => {
    // Regression: the "•••" button only fired a decorative toast reading
    // "Options de séance" — no menu ever opened, so the button did nothing.
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v93Toast')).toBeVisible()

    await page.goto('/')
    await goNav(page, 'Workout')
    await expect(page.locator('.v9ExerciseList button.done')).toHaveCount(1)

    await page.locator('.v93Dots').click()
    await expect(page.locator('.v105Options')).toBeVisible()
    await expect(page.locator('.v105Options header')).toHaveText('OPTIONS DE SÉANCE')
    await page.locator('.v105OptionsList button', { hasText: 'Réinitialiser la progression' }).click()
    await expect(page.locator('.v105Options')).toHaveCount(0)
    await expect(page.locator('.v9ExerciseList button.done')).toHaveCount(0)
  })

  test('session options sheet dismisses via ANNULER without resetting anything', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v93Dots').click()
    await page.locator('.v105OptionsCancel').click()
    await expect(page.locator('.v105Options')).toHaveCount(0)
    await expect(page.locator('.v9ExerciseList button.done')).toHaveCount(1)
  })

  test('no uncaught JS errors across every muscle group and its first exercise', async ({ page }) => {
    const errors = collectRealErrors(page)
    for (const group of MUSCLE_GROUPS) {
      await seedTodayTemplate(page, [{ group, name: group === 'Pectoraux' ? 'Développé incliné' : group === 'Dos' ? 'Tirage vertical' : group === 'Épaules' ? 'Développé épaules' : group === 'Jambes' ? 'Hack squat' : group === 'Bras' ? 'Curl incliné' : 'Bird dog' }])
      await page.goto('/')
      await goNav(page, 'Workout')
      await page.locator('.v9ExerciseList button').first().click()
      await expect(page.locator('.v9SetPanel')).toBeVisible()
      await page.locator('.v9ExerciseActions button', { hasText: 'ANNULER' }).click()
    }
    expect(errors).toEqual([])
  })
})

test.describe('Workout — exercise detail', () => {
  test('weight +/- buttons are visible and change the weight', async ({ page }) => {
    // Regression: .v9Load button had opacity:0 (invisible, though technically
    // clickable), making the +/- controls effectively unusable.
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    const minus = page.locator('.v9Load button').nth(0)
    const plus = page.locator('.v9Load button').nth(1)
    await expect(minus).toBeVisible()
    await expect(plus).toBeVisible()
    await expect(minus).toHaveCSS('opacity', '1')
    await expect(plus).toHaveCSS('opacity', '1')

    const before = Number((await page.locator('.v9Load b').textContent())?.trim())
    await plus.click()
    await expect(page.locator('.v9Load b')).toHaveText(String(before + 2.5))
    await minus.click()
    await minus.click()
    await expect(page.locator('.v9Load b')).toHaveText(String(before - 2.5))
  })

  test('weight never goes below 0', async ({ page }) => {
    await seedTodayTemplate(page, JAMBES_EXERCISES)
    await page.goto('/')
    await goNav(page, 'Workout')
    // "index===3" exercise in the group starts at weight 0 — hit minus a lot and confirm it floors at 0
    await page.locator('.v9ExerciseList button').nth(3).click()
    const minus = page.locator('.v9Load button').nth(0)
    for (let i = 0; i < 3; i++) await minus.click()
    await expect(page.locator('.v9Load b')).toHaveText('0')
  })

  test('reps slider updates the rep count', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    const slider = page.locator('.v9SetPanel input[type=range]')
    await slider.fill('12')
    await expect(page.locator('.v9RepLine strong')).toHaveText('12')
    await expect(page.locator('.v9SetMeta b').first()).toHaveText('12 REPS')
  })

  test('validating a set shows a toast and moves to rest', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v93Toast')).toContainText('Série validée')
    await expect(page.locator('.v9Rest')).toBeVisible({ timeout: 2000 })
  })

  test('weight and reps persist across a reload (localStorage)', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9Load button').nth(1).click()
    const weight = await page.locator('.v9Load b').textContent()
    await page.reload()
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    await expect(page.locator('.v9Load b')).toHaveText(weight!)
  })
})

test.describe('Workout — rest', () => {
  test('timer +30s and skip work', async ({ page }) => {
    // Uses real time (not page.clock) and tolerant deltas instead of exact
    // mm:ss strings: under parallel-worker contention a few real seconds can
    // elapse between actions, which would flake an exact-text assertion.
    // What actually matters is that +30 moves the displayed time by the
    // right amount, which a delta check captures regardless of drift.
    const readSeconds = async () => {
      const t = await page.locator('.v9Timer b').textContent()
      const [m, s] = t!.split(':').map(Number)
      return m * 60 + s
    }
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9Rest')).toBeVisible()
    const initial = await readSeconds()
    expect(initial).toBeGreaterThanOrEqual(42)
    expect(initial).toBeLessThanOrEqual(45)

    await page.locator('.v93TimerControls button', { hasText: '+30' }).click()
    const afterPlus = await readSeconds()
    expect(afterPlus).toBeGreaterThanOrEqual(initial + 28)
    expect(afterPlus).toBeLessThanOrEqual(initial + 30)

    await page.locator('.v9NextSet').click()
    await expect(page.locator('.v9SetPanel')).toBeVisible()
  })
})

test.describe('Workout — history', () => {
  test('CHARGE/VOLUME/1RM tabs are real buttons that switch the chart and rows', async ({ page }) => {
    // Regression: the three tabs were static <b>/<span> with no onClick —
    // clicking VOLUME or 1RM did nothing at all.
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    // log one real set so the history has data
    await page.locator('.v9ExerciseActions .pulse').click()
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9LastSet').click()
    await expect(page.locator('.v9Segments button')).toHaveCount(3)

    await expect(page.locator('.v9Segments button.active')).toHaveText('CHARGE')
    const chargeRow = await page.locator('.v9HistoryRows span').first().textContent()
    expect(chargeRow).toMatch(/kg × \d+/)

    await page.locator('.v9Segments button', { hasText: 'VOLUME' }).click()
    await expect(page.locator('.v9Segments button.active')).toHaveText('VOLUME')
    const volumeRow = await page.locator('.v9HistoryRows span').first().textContent()
    expect(volumeRow).toMatch(/kg vol\./)

    await page.locator('.v9Segments button', { hasText: '1RM' }).click()
    await expect(page.locator('.v9Segments button.active')).toHaveText('1RM')
    const rmRow = await page.locator('.v9HistoryRows span').first().textContent()
    expect(rmRow).toMatch(/kg \(est\.\)/)
  })

  test('empty state is shown before any set is logged for an exercise', async ({ page }) => {
    await seedTodayTemplate(page, DOS_EXERCISES)
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').nth(2).click()
    await page.locator('.v9LastSet').click()
    await expect(page.locator('.v9HistoryEmpty')).toContainText('Aucune série enregistrée')
    await expect(page.locator('.v9HistoryRows div')).toHaveCount(0)
  })
})
