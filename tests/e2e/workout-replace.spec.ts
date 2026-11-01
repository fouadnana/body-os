import { test, expect } from '@playwright/test'

test.describe('Workout — remplacement d\'exercice (Phase 3)', () => {
  test('the options menu (•••) on the exercise screen offers "Remplacer l\'exercice"', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v93Dots').click()
    await expect(page.locator('button', { hasText: "Remplacer l'exercice" })).toBeVisible()
    await expect(page.locator('button', { hasText: "Revenir à l'exercice original" })).toHaveCount(0)
  })

  test('the picker lists only exercises from the same muscle group, excluding the current one', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v93Dots').click()
    await page.locator('button', { hasText: "Remplacer l'exercice" }).click()
    const names = await page.locator('.v9PickerList button b').allTextContents()
    expect(names).toHaveLength(4) // Pectoraux has 5, minus the current one
    expect(names).not.toContain('Développé incliné')
    expect(names).toContain('Dips')
  })

  test('picking a replacement swaps the exercise in place, at the same position, with a fresh set draft', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v93Dots').click()
    await page.locator('button', { hasText: "Remplacer l'exercice" }).click()
    await page.locator('.v9PickerList button', { hasText: 'Dips' }).click()
    await expect(page.locator('.v9ExerciseHead b')).toHaveText('Dips')
    await expect(page.locator('.v9ExerciseHead small')).toHaveText('EXERCICE 1/5')
    await expect(page.locator('.v9LastSet')).toContainText('Pas encore de série enregistrée')
  })

  test('the replacement persists across a reload and shows in the session exercise list', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v93Dots').click()
    await page.locator('button', { hasText: "Remplacer l'exercice" }).click()
    await page.locator('.v9PickerList button', { hasText: 'Dips' }).click()
    await page.reload()
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await expect(page.locator('.v9ExerciseList button').first()).toContainText('Dips')
  })

  test('"Revenir à l\'exercice original" restores the default exercise at that position', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v93Dots').click()
    await page.locator('button', { hasText: "Remplacer l'exercice" }).click()
    await page.locator('.v9PickerList button', { hasText: 'Dips' }).click()
    await page.locator('.v93Dots').click()
    await page.locator('button', { hasText: "Revenir à l'exercice original" }).click()
    await expect(page.locator('.v9ExerciseHead b')).toHaveText('Développé incliné')
  })

  test('logging sets on a replacement exercise does not affect the original exercise\'s history', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v93Dots').click()
    await page.locator('button', { hasText: "Remplacer l'exercice" }).click()
    await page.locator('.v9PickerList button', { hasText: 'Dips' }).click()
    await page.locator('.v9ExerciseActions .pulse').click()
    await page.waitForTimeout(100)
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem('bodyos.workout.history.v1') || '[]'))
    expect(history).toHaveLength(1)
    expect(history[0].exercise).toBe('Dips')
    expect(history[0].group).toBe('Pectoraux')
  })
})
