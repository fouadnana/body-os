import { test, expect } from '@playwright/test'
import { collectRealErrors } from './helpers'

const openLibrary = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
  await page.locator('button', { hasText: "Bibliothèque d'exercices" }).click()
}

test.describe('Bibliothèque d\'exercices (Phase 3)', () => {
  test('all muscle-group tabs render at distinct, non-overlapping positions', async ({ page }) => {
    // Regression: this tab bar's grid used to lay out one column short of its
    // real button count, so the last tab wrapped onto an earlier tab's exact
    // position.
    await openLibrary(page)
    const rects = await page.locator('.v9LibTabs button').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect()
        return { left: Math.round(r.left), right: Math.round(r.right), text: el.textContent }
      }),
    )
    expect(rects.length).toBeGreaterThan(1)
    const seen = new Set<string>()
    for (const r of rects) {
      const key = `${r.left}-${r.right}`
      expect(seen.has(key), `tab ${r.text} overlaps another tab at ${key}`).toBe(false)
      seen.add(key)
    }
  })

  test('no uncaught JS errors across search, filters, and opening a detail sheet', async ({ page }) => {
    const errors = collectRealErrors(page)
    await openLibrary(page)
    await page.locator('input[aria-label="Rechercher un exercice"]').fill('dévelop')
    await page.locator('.v9LibTabs button', { hasText: 'Jambes' }).click()
    await page.locator('input[aria-label="Rechercher un exercice"]').fill('')
    await page.locator('select[aria-label="Filtrer par matériel"]').selectOption('Machine')
    await page.locator('.v9LibList button').first().click()
    await page.locator('.v106Fiche .v9TitleBar button', { hasText: '‹' }).click()
    expect(errors).toEqual([])
  })

  test('reachable from Plus and lists every exercise from every muscle group', async ({ page }) => {
    await openLibrary(page)
    await expect(page.locator('.v9TitleBar b')).toHaveText('BIBLIOTHÈQUE')
    const count = await page.locator('.v9LibList button').count()
    expect(count).toBe(30) // 5 groups x 5 + L5-S1 x 5
  })

  test('searching filters the list by exercise name', async ({ page }) => {
    await openLibrary(page)
    await page.locator('input[aria-label="Rechercher un exercice"]').fill('Développé incliné')
    await expect(page.locator('.v9LibList button')).toHaveCount(1)
    await expect(page.locator('.v9LibList button')).toContainText('Développé incliné')
  })

  test('searching by muscle/target text also matches', async ({ page }) => {
    await openLibrary(page)
    await page.locator('input[aria-label="Rechercher un exercice"]').fill('mollets')
    const count = await page.locator('.v9LibList button').count()
    expect(count).toBeGreaterThan(0)
  })

  test('filtering by muscle-group tab narrows the list to that group only', async ({ page }) => {
    await openLibrary(page)
    await page.locator('.v9LibTabs button', { hasText: 'Dos' }).click()
    await expect(page.locator('.v9LibList button')).toHaveCount(5)
    const texts = await page.locator('.v9LibList button small').allTextContents()
    expect(texts.every(t => t === 'Dos')).toBe(true)
  })

  test('filtering by equipment narrows the list', async ({ page }) => {
    await openLibrary(page)
    await page.locator('select[aria-label="Filtrer par matériel"]').selectOption('Barre')
    const count = await page.locator('.v9LibList button').count()
    expect(count).toBeGreaterThan(0)
    const texts = await page.locator('.v9LibList button em').allTextContents()
    expect(texts.every(t => t.startsWith('Barre'))).toBe(true)
  })

  test('combining search + group filter with no match shows the empty state', async ({ page }) => {
    await openLibrary(page)
    await page.locator('.v9LibTabs button', { hasText: 'Bras' }).click()
    await page.locator('input[aria-label="Rechercher un exercice"]').fill('squat')
    await expect(page.locator('.v9LibList button')).toHaveCount(0)
    await expect(page.locator('.v9LibEmpty')).toBeVisible()
  })

  test('tapping an exercise opens the Fiche exercice with its prescription, and the back caret returns to the list', async ({ page }) => {
    await openLibrary(page)
    await page.locator('.v9LibList button', { hasText: 'Hack squat' }).click()
    await expect(page.locator('.v106Fiche .v9TitleBar b')).toHaveText('Hack squat')
    await expect(page.locator('.v106Prescription')).toContainText('6–10')
    await page.locator('.v106Fiche .v9TitleBar button', { hasText: '‹' }).click()
    await expect(page.locator('.v106Fiche')).toHaveCount(0)
    await expect(page.locator('.v9LibList')).toBeVisible()
  })

  test('the back caret returns to the Plus menu', async ({ page }) => {
    await openLibrary(page)
    await page.locator('.v9TitleBar button', { hasText: '‹' }).click()
    await expect(page.locator('.v9TitleBar b')).toHaveText('PLUS')
  })

  test('starring an exercise in the list persists and the FAVORIS filter narrows to it', async ({ page }) => {
    await openLibrary(page)
    await expect(page.locator('.v9LibStar.active')).toHaveCount(0)
    await page.locator('.v9LibList button', { hasText: 'Hack squat' }).locator('.v9LibStar').click()
    await expect(page.locator('.v9LibList button', { hasText: 'Hack squat' }).locator('.v9LibStar')).toHaveClass(/active/)

    await page.locator('.v9LibFavFilter').click()
    await expect(page.locator('.v9LibList button')).toHaveCount(1)
    await expect(page.locator('.v9LibList button')).toContainText('Hack squat')

    await openLibrary(page)
    await page.locator('.v9LibFavFilter').click()
    await expect(page.locator('.v9LibList button')).toHaveCount(1)
    await expect(page.locator('.v9LibList button')).toContainText('Hack squat')
  })

  test('toggling the favorite from the detail sheet reflects back in the list', async ({ page }) => {
    await openLibrary(page)
    await page.locator('.v9LibList button', { hasText: 'Hack squat' }).click()
    await page.locator('.v97FavoriteToggle').click()
    await expect(page.locator('.v97FavoriteToggle')).toHaveClass(/active/)
    await page.locator('.v106Fiche .v9TitleBar button', { hasText: '‹' }).click()
    await expect(page.locator('.v9LibList button', { hasText: 'Hack squat' }).locator('.v9LibStar')).toHaveClass(/active/)
  })

  test('the grid/list toggle switches layout and both show the same results', async ({ page }) => {
    await openLibrary(page)
    await expect(page.locator('.v9LibList')).toBeVisible()
    await expect(page.locator('.v9LibGrid')).toHaveCount(0)
    const listCount = await page.locator('.v9LibList button').count()

    await page.locator('.v9LibViewToggle button', { hasText: '⊞' }).click()
    await expect(page.locator('.v9LibGrid')).toBeVisible()
    await expect(page.locator('.v9LibList')).toHaveCount(0)
    await expect(page.locator('.v9LibGrid button')).toHaveCount(listCount)

    await page.locator('.v9LibViewToggle button', { hasText: '☰' }).click()
    await expect(page.locator('.v9LibList')).toBeVisible()
  })

  test('the favorites-only empty state is honest, distinct from the generic no-match message', async ({ page }) => {
    await openLibrary(page)
    await page.locator('.v9LibFavFilter').click()
    await expect(page.locator('.v9LibEmpty')).toContainText('Aucun favori ne correspond')
  })
})

test.describe('Fiche exercice (V3 — détail plein écran)', () => {
  test('INFOS/MUSCLES/HISTORIQUE tabs switch content', async ({ page }) => {
    await openLibrary(page)
    await page.locator('.v9LibList button', { hasText: 'Hack squat' }).click()
    await expect(page.locator('.v106Prescription')).toBeVisible()

    await page.locator('.v9Segments button', { hasText: 'MUSCLES' }).click()
    await expect(page.locator('.v106FicheMuscles')).toContainText('Quadriceps')
    await expect(page.locator('.v106Prescription')).toHaveCount(0)

    await page.locator('.v9Segments button', { hasText: 'HISTORIQUE' }).click()
    await expect(page.locator('.v94NoData')).toContainText('Aucune série enregistrée')
  })

  test('without any past session, the progression card is an honest empty state, not a fake suggestion', async ({ page }) => {
    await openLibrary(page)
    await page.locator('.v9LibList button', { hasText: 'Hack squat' }).click()
    await expect(page.locator('.v106Progression')).toContainText('Pas encore de série enregistrée')
    await expect(page.locator('button', { hasText: 'APPLIQUER' })).toHaveCount(0)
  })

  test('with a past session, the suggestion is computed for real and APPLIQUER pre-fills the next Workout draft', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('bodyos.workout.history.v1', JSON.stringify([
      { id: 's1', date: '2026-10-20', group: 'Jambes', exercise: 'Hack squat', weight: 100, reps: 10, rir: 1 },
    ])))
    await page.reload()
    await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
    await page.locator('button', { hasText: "Bibliothèque d'exercices" }).click()
    await page.locator('.v9LibList button', { hasText: 'Hack squat' }).click()

    // Hack squat targets 6–10 reps ; la dernière fois a atteint le haut de
    // fourchette (10), donc la suggestion monte la charge et repart à 6.
    await expect(page.locator('.v106Progression')).toContainText('100 kg × 10')
    await expect(page.locator('.v106Progression')).toContainText('102.5 kg × 6')
    await page.locator('button', { hasText: 'APPLIQUER' }).click()
    await expect(page.locator('.v93Toast')).toContainText('Suggestion appliquée')

    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('bodyos.workout.log.v1') || '{}')['Jambes::Hack squat'])
    expect(draft).toEqual({ weight: 102.5, reps: 6, rir: 1 })
  })

  test('MODIFIER lets you adjust the suggestion before applying it', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('bodyos.workout.history.v1', JSON.stringify([
      { id: 's1', date: '2026-10-20', group: 'Jambes', exercise: 'Hack squat', weight: 100, reps: 10, rir: 1 },
    ])))
    await page.reload()
    await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
    await page.locator('button', { hasText: "Bibliothèque d'exercices" }).click()
    await page.locator('.v9LibList button', { hasText: 'Hack squat' }).click()

    await page.locator('button', { hasText: 'MODIFIER' }).click()
    await page.locator('.v9Load button').nth(1).click() // +2.5kg on top of the 102.5 suggestion
    await page.locator('button', { hasText: 'APPLIQUER' }).click()

    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('bodyos.workout.log.v1') || '{}')['Jambes::Hack squat'])
    expect(draft.weight).toBe(105)
  })
})
