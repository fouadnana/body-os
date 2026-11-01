import { test, expect } from '@playwright/test'

const openTemplates = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
  await page.locator('button', { hasText: 'Mes séances' }).click()
}

const createTemplate = async (page: import('@playwright/test').Page, group: string, name: string, exercises: string[]) => {
  await openTemplates(page)
  await page.locator('.v9TemplateGroupList button', { hasText: group }).click()
  await page.locator('button', { hasText: '+ CRÉER UNE SÉANCE' }).click()
  await page.locator('.v9TemplateNameLabel input').fill(name)
  for (const ex of exercises) {
    await page.locator('.v9TemplatePickRow', { hasText: ex }).locator('input').check()
  }
  await page.locator('button', { hasText: 'CRÉER LA SÉANCE' }).click()
}

test.describe('Mes séances (Phase 3 — templates de séance)', () => {
  test('reachable from Plus, lists every muscle group with "Séance standard" as the default active template', async ({ page }) => {
    await openTemplates(page)
    await expect(page.locator('.v9TitleBar b')).toHaveText('MES SÉANCES')
    const rows = await page.locator('.v9TemplateGroupList button').count()
    expect(rows).toBe(6)
    const subtitles = await page.locator('.v9TemplateGroupList em').allTextContents()
    expect(subtitles.every(t => t === 'Séance standard')).toBe(true)
  })

  test('the builder requires a name and at least one exercise before it can save', async ({ page }) => {
    await openTemplates(page)
    await page.locator('.v9TemplateGroupList button', { hasText: 'Dos' }).click()
    await page.locator('button', { hasText: '+ CRÉER UNE SÉANCE' }).click()
    await expect(page.locator('button', { hasText: 'CRÉER LA SÉANCE' })).toBeDisabled()
    await page.locator('.v9TemplateNameLabel input').fill('Dos — variante')
    await expect(page.locator('button', { hasText: 'CRÉER LA SÉANCE' })).toBeDisabled()
    await page.locator('.v9TemplatePickRow').first().locator('input').check()
    await expect(page.locator('button', { hasText: 'CRÉER LA SÉANCE' })).toBeEnabled()
  })

  test('creating a template activates it immediately and it drives the actual Workout session', async ({ page }) => {
    await createTemplate(page, 'Pectoraux', 'Push léger', ['Dips', 'Écartés couchés'])
    await expect(page.locator('.v9TemplateSelect.active')).toContainText('Push léger')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await expect(page.locator('.v982SessionHeading em')).toContainText('2 exercices')
    const names = await page.locator('.v9ExerciseList b').allTextContents()
    expect(names).toEqual(['Dips', 'Écartés couchés'])
  })

  test('switching back to "Séance standard" restores the original 5-exercise session', async ({ page }) => {
    await createTemplate(page, 'Pectoraux', 'Push léger', ['Dips'])
    await openTemplates(page)
    await page.locator('.v9TemplateGroupList button', { hasText: 'Pectoraux' }).click()
    await page.locator('.v9TemplateSelect', { hasText: 'Séance standard' }).click()
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await expect(page.locator('.v9ExerciseList button')).toHaveCount(5)
  })

  test('deleting the active custom template falls back to "Séance standard"', async ({ page }) => {
    await createTemplate(page, 'Pectoraux', 'Push léger', ['Dips'])
    await openTemplates(page)
    await page.locator('.v9TemplateGroupList button', { hasText: 'Pectoraux' }).click()
    await page.locator('.v9TemplateDelete').click()
    await expect(page.locator('.v9TemplateSelect.active')).toContainText('Séance standard')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await expect(page.locator('.v9ExerciseList button')).toHaveCount(5)
  })

  test('a custom template with fewer exercises does not break progress tracking (no stale done[] index)', async ({ page }) => {
    await createTemplate(page, 'Pectoraux', 'Push léger', ['Dips'])
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await page.waitForTimeout(100)
    // should not throw / crash — reload and confirm still on a sane state
    await page.reload()
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await expect(page.locator('.v9ExerciseList button')).toHaveCount(1)
    expect(errors).toEqual([])
  })
})
