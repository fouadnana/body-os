import { test, expect } from '@playwright/test'
import { goNav, collectRealErrors } from './helpers'

const MUSCLE_GROUPS = ['Pectoraux', 'Dos', 'Épaules', 'Jambes', 'Bras', 'L5-S1']

test.describe('Workout — séance', () => {
  test('all 6 muscle tabs render at distinct, non-overlapping positions', async ({ page }) => {
    // Regression: .v94MuscleTabs used to be a 5-column grid for 6 tabs, so
    // the 6th (L5-S1) wrapped onto the 1st (Pectoraux)'s exact position.
    await page.goto('/')
    await goNav(page, 'Workout')
    await expect(page.locator('.v94MuscleTabs button')).toHaveCount(6)
    const rects = await page.locator('.v94MuscleTabs button').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect()
        return { left: Math.round(r.left), right: Math.round(r.right), text: el.textContent }
      }),
    )
    const seen = new Set<string>()
    for (const r of rects) {
      const key = `${r.left}-${r.right}`
      expect(seen.has(key), `tab ${r.text} overlaps another tab at ${key}`).toBe(false)
      seen.add(key)
    }
  })

  test('switching muscle groups shows the right exercise list', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Workout')
    for (const group of MUSCLE_GROUPS) {
      await page.locator('.v94MuscleTabs button', { hasText: group }).click()
      await expect(page.locator('.v982SessionHeading small')).toContainText(group === 'Pectoraux' ? 'Pectoraux' : group)
      await expect(page.locator('.v9ExerciseList button').first()).toBeVisible()
    }
  })

  test('no uncaught JS errors across every muscle group and its first exercise', async ({ page }) => {
    const errors = collectRealErrors(page)
    await page.goto('/')
    await goNav(page, 'Workout')
    for (const group of MUSCLE_GROUPS) {
      await page.locator('.v94MuscleTabs button', { hasText: group }).click()
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
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v94MuscleTabs button', { hasText: 'Jambes' }).click()
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
  test('timer +/-15s and skip work', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await expect(page.locator('.v9Rest')).toBeVisible()
    await expect(page.locator('.v9Timer b')).toHaveText('00:45')
    await page.locator('.v93TimerControls button', { hasText: '+15' }).click()
    await expect(page.locator('.v9Timer b')).toHaveText('01:00')
    await page.locator('.v93TimerControls button', { hasText: '−15' }).click()
    await page.locator('.v93TimerControls button', { hasText: '−15' }).click()
    await expect(page.locator('.v9Timer b')).toHaveText('00:30')
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
    await page.goto('/')
    await goNav(page, 'Workout')
    await page.locator('.v94MuscleTabs button', { hasText: 'Dos' }).click()
    await page.locator('.v9ExerciseList button').nth(2).click()
    await page.locator('.v9LastSet').click()
    await expect(page.locator('.v9HistoryEmpty')).toContainText('Aucune série enregistrée')
    await expect(page.locator('.v9HistoryRows div')).toHaveCount(0)
  })
})
