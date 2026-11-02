import { test, expect } from '@playwright/test'
import { goNav } from './helpers'

test.describe('Progress — options (☷) et export de données', () => {
  test('the ☷ button opens a real options menu instead of doing nothing', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Progress')
    await page.locator('.v93Dots').click()
    await expect(page.locator('.v9SheetBack')).toContainText('OPTIONS PROGRÈS')
    await expect(page.locator('button', { hasText: 'Exporter mes données' })).toBeVisible()
  })

  test('exporting downloads a JSON file containing the tracked data', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('bodyos.daily.log.v1', JSON.stringify([{ date: '2026-10-20', weight: 80 }]))
    })
    await goNav(page, 'Progress')
    await page.locator('.v93Dots').click()
    const downloadPromise = page.waitForEvent('download')
    await page.locator('button', { hasText: 'Exporter mes données' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^body-os-export-\d{4}-\d{2}-\d{2}\.json$/)
    const path = await download.path()
    expect(path).toBeTruthy()
    const fs = await import('node:fs')
    const content = JSON.parse(fs.readFileSync(path!, 'utf-8'))
    expect(content.dailyLog).toEqual([{ date: '2026-10-20', weight: 80 }])
    expect(content).toHaveProperty('workoutHistory')
    expect(content).toHaveProperty('nutritionMeals')
    expect(content).toHaveProperty('exportedAt')
  })

  test('the options sheet closes via ANNULER without exporting anything', async ({ page }) => {
    await page.goto('/')
    await goNav(page, 'Progress')
    await page.locator('.v93Dots').click()
    await page.locator('button', { hasText: 'ANNULER' }).click()
    await expect(page.locator('.v9SheetBack')).toHaveCount(0)
  })
})
