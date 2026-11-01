import { test, expect } from '@playwright/test'

const swipe = async (page: import('@playwright/test').Page, selector: string, dx: number) => {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`no bounding box for ${selector}`)
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y, { steps: 10 })
  await page.mouse.up()
}

test.describe('Workout — glisser entre exercices (Phase 2)', () => {
  test('swiping left on the exercise header goes to the next exercise', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await expect(page.locator('.v9ExerciseHead b')).toHaveText('Développé incliné')
    await swipe(page, '.v9SwipeZone', -120)
    await expect(page.locator('.v9ExerciseHead small')).toHaveText('EXERCICE 2/5')
  })

  test('swiping right from the first exercise does nothing (no previous exercise)', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await expect(page.locator('.v9ExerciseHead small')).toHaveText('EXERCICE 1/5')
    await swipe(page, '.v9SwipeZone', 120)
    await expect(page.locator('.v9ExerciseHead small')).toHaveText('EXERCICE 1/5')
  })

  test('swiping left then right returns to the original exercise', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await swipe(page, '.v9SwipeZone', -120)
    await expect(page.locator('.v9ExerciseHead small')).toHaveText('EXERCICE 2/5')
    await swipe(page, '.v9SwipeZone', 120)
    await expect(page.locator('.v9ExerciseHead small')).toHaveText('EXERCICE 1/5')
  })

  test('a short tap on the media (not a swipe) still opens the video, not a navigation', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    const popupPromise = page.waitForEvent('popup')
    await page.locator('.v93VideoMedia').click()
    const popup = await popupPromise
    expect(popup.url()).not.toBe('about:blank')
    await popup.close()
    await expect(page.locator('.v9ExerciseHead small')).toHaveText('EXERCICE 1/5')
  })

  test('swiping between exercises resets the set-entry draft (no stale weight carried over)', async ({ page }) => {
    await page.goto('/')
    await page.locator('.v9Bottom button', { hasText: 'Séance' }).click()
    await page.locator('.v9ExerciseList button').first().click()
    await page.locator('.v9Load button').nth(1).click() // +2.5kg on exercise 1
    await swipe(page, '.v9SwipeZone', -120)
    await expect(page.locator('.v9ExerciseHead small')).toHaveText('EXERCICE 2/5')
    await expect(page.locator('.v9TodaySets')).toHaveCount(0)
  })
})
