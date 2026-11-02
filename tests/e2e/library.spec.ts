import { test, expect } from '@playwright/test'
import { collectRealErrors } from './helpers'

const openLibrary = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
  await page.locator('button', { hasText: "Bibliothèque d'exercices" }).click()
}

test.describe('Bibliothèque d\'exercices (Phase 3)', () => {
  test('no uncaught JS errors across search, filters, and opening a detail sheet', async ({ page }) => {
    const errors = collectRealErrors(page)
    await openLibrary(page)
    await page.locator('input[aria-label="Rechercher un exercice"]').fill('dévelop')
    await page.locator('.v9LibTabs button', { hasText: 'Jambes' }).click()
    await page.locator('input[aria-label="Rechercher un exercice"]').fill('')
    await page.locator('select[aria-label="Filtrer par matériel"]').selectOption('Machine')
    await page.locator('.v9LibList button').first().click()
    await page.locator('.v93InfoSheet header button').click()
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

  test('tapping an exercise opens a detail sheet with its prescription, and × closes it', async ({ page }) => {
    await openLibrary(page)
    await page.locator('.v9LibList button', { hasText: 'Hack squat' }).click()
    await expect(page.locator('.v93InfoSheet header b')).toHaveText('Hack squat')
    await expect(page.locator('.v93InfoSheet')).toContainText('Quadriceps')
    await page.locator('.v93InfoSheet header button').click()
    await expect(page.locator('.v93InfoSheet')).toHaveCount(0)
  })

  test('the back caret returns to the Plus menu', async ({ page }) => {
    await openLibrary(page)
    await page.locator('.v9TitleBar button', { hasText: '‹' }).click()
    await expect(page.locator('.v9TitleBar b')).toHaveText('PLUS')
  })
})
