import { test, expect } from '@playwright/test'
import { collectRealErrors } from './helpers'

const openTemplates = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
  await page.locator('button', { hasText: 'Mes séances' }).click()
}

const createTemplate = async (page: import('@playwright/test').Page, name: string) => {
  await openTemplates(page)
  await page.locator('.v93Dots').click()
  await page.locator('.v9TemplateNameLabel input').fill(name)
  await page.locator('button', { hasText: 'CRÉER LE TEMPLATE' }).click()
}

const addExercise = async (page: import('@playwright/test').Page, group: string, name: string) => {
  await page.locator('button', { hasText: '+ AJOUTER UN EXERCICE' }).click()
  await page.locator('.v94MuscleTabs button', { hasText: group }).click()
  await page.locator('.v9PickerList button', { hasText: name }).click()
}

test.describe('Mes séances (V3 — templates transversaux)', () => {
  test('no uncaught JS errors across creating, editing, renaming, and deleting a template', async ({ page }) => {
    const errors = collectRealErrors(page)
    await createTemplate(page, 'Push léger')
    await addExercise(page, 'Pectoraux', 'Dips')
    await page.locator('.v93Dots').click() // rename
    await page.locator('.v9TemplateBuilder input').fill('Push léger — v2')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()
    await page.locator('.v9TitleBar button', { hasText: '‹' }).click()
    await page.locator('.v9TemplateDelete').last().click()
    expect(errors).toEqual([])
  })

  test('reachable from Plus and lists the built-in templates with exercise count and duration', async ({ page }) => {
    await openTemplates(page)
    await expect(page.locator('.v9TitleBar b')).toHaveText('MES SÉANCES')
    const names = await page.locator('.v9TemplateSelect b').allTextContents()
    expect(names).toEqual(['Haut du corps', 'Bas du corps', 'Push (Pecs/Épaules/Triceps)', 'Pull (Dos/Biceps)', 'Full Body', 'L5-S1 (renforcement)'])
    const subtitles = await page.locator('.v9TemplateSelect em').allTextContents()
    expect(subtitles.every(t => /\d+ exercices? · ~\d+ min/.test(t))).toBe(true)
  })

  test('creating a template opens its editor directly, empty until an exercise is added', async ({ page }) => {
    await createTemplate(page, 'Mon programme')
    await expect(page.locator('.v9TitleBar small')).toHaveText('Mon programme')
    await expect(page.locator('.v9LibEmpty')).toContainText('Aucun exercice')
    await addExercise(page, 'Jambes', 'Hack squat')
    await expect(page.locator('.v106ExerciseRow')).toHaveCount(1)
    await expect(page.locator('.v106ExerciseRow b')).toHaveText('Hack squat')
  })

  test('the picker can add exercises from any muscle group, not just one', async ({ page }) => {
    await createTemplate(page, 'Full')
    await addExercise(page, 'Pectoraux', 'Développé couché')
    await addExercise(page, 'Dos', 'Tirage vertical')
    const names = await page.locator('.v106ExerciseRow b').allTextContents()
    expect(names).toEqual(['Développé couché', 'Tirage vertical'])
  })

  test('removing an exercise from the editor removes it from the list', async ({ page }) => {
    await createTemplate(page, 'Solo')
    await addExercise(page, 'Pectoraux', 'Dips')
    await addExercise(page, 'Pectoraux', 'Développé couché')
    await expect(page.locator('.v106ExerciseRow')).toHaveCount(2)
    await page.locator('.v106RemoveExercise').first().click()
    await expect(page.locator('.v106ExerciseRow')).toHaveCount(1)
    await expect(page.locator('.v106ExerciseRow b')).toHaveText('Développé couché')
  })

  test('dragging an exercise by its handle reorders the list', async ({ page }) => {
    await createTemplate(page, 'Ordre')
    await addExercise(page, 'Pectoraux', 'Dips')
    await addExercise(page, 'Pectoraux', 'Développé couché')
    await addExercise(page, 'Pectoraux', 'Écartés couchés')
    await expect(page.locator('.v106ExerciseRow b')).toHaveText(['Dips', 'Développé couché', 'Écartés couchés'])

    const handle = page.locator('.v106Handle').first()
    const rows = page.locator('.v106ExerciseRow')
    const targetBox = await rows.nth(2).boundingBox()
    if (!targetBox) throw new Error('no bounding box for target row')
    const handleBox = await handle.boundingBox()
    if (!handleBox) throw new Error('no bounding box for handle')
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2 + 5, { steps: 10 })
    await page.mouse.up()

    await expect(page.locator('.v106ExerciseRow b')).toHaveText(['Développé couché', 'Écartés couchés', 'Dips'])
  })

  test('renaming a template updates its name in the list', async ({ page }) => {
    await createTemplate(page, 'Avant')
    await page.locator('.v93Dots').click()
    await page.locator('.v9TemplateBuilder input').fill('Après')
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()
    await expect(page.locator('.v9TitleBar small')).toHaveText('Après')
    await page.locator('.v9TitleBar button', { hasText: '‹' }).click()
    await expect(page.locator('.v9TemplateSelect b').last()).toHaveText('Après')
  })

  test('deleting a template removes it from the list', async ({ page }) => {
    await openTemplates(page)
    const before = await page.locator('.v9TemplateRow').count()
    await page.locator('.v9TemplateDelete').first().click()
    await expect(page.locator('.v9TemplateRow')).toHaveCount(before - 1)
  })

  test('assigning a template to today in Plan — Semaine drives the actual Workout session', async ({ page }) => {
    await createTemplate(page, 'Ma séance perso')
    await addExercise(page, 'Pectoraux', 'Dips')
    await addExercise(page, 'Pectoraux', 'Écartés couchés')
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
    await page.locator('button', { hasText: 'Plan — Semaine' }).click()
    await page.locator('.v93Dots').click()
    const todayIdx = await page.evaluate(() => (new Date().getDay() + 6) % 7)
    const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    await page.locator('.v96SettingsBody label', { hasText: weekdays[todayIdx] }).locator('select').selectOption({ label: 'Ma séance perso' })
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()

    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await expect(page.locator('.v982SessionHeading small')).toHaveText('Ma séance perso')
    await expect(page.locator('.v982SessionHeading em')).toContainText('2 exercices')
    const names = await page.locator('.v9ExerciseList b').allTextContents()
    expect(names).toEqual(['Dips', 'Écartés couchés'])
  })

  test('a custom template with fewer exercises does not break progress tracking (no stale done[] index)', async ({ page }) => {
    await createTemplate(page, 'Ma séance perso')
    await addExercise(page, 'Pectoraux', 'Dips')
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Plus' }).click()
    await page.locator('button', { hasText: 'Plan — Semaine' }).click()
    await page.locator('.v93Dots').click()
    const todayIdx = await page.evaluate(() => (new Date().getDay() + 6) % 7)
    const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    await page.locator('.v96SettingsBody label', { hasText: weekdays[todayIdx] }).locator('select').selectOption({ label: 'Ma séance perso' })
    await page.locator('button', { hasText: 'ENREGISTRER' }).click()

    await page.goto('/')
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
