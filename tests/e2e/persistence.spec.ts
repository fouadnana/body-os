import { test, expect } from '@playwright/test'

test.describe('Persistance versionnée (Phase 1 — fondations)', () => {
  test('stamps a schema version in localStorage after first load', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)
    const version = await page.evaluate(() => localStorage.getItem('bodyos.schema.version'))
    expect(version).toBe('1')
  })

  test('corrupted JSON in localStorage does not crash the app, and is backed up instead of being silently destroyed', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('bodyos.schedule.v1', '{not valid json::')
    })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/')
    await page.waitForTimeout(300)
    // app still renders normally despite the corrupted key
    await expect(page.locator('.v104Brand b')).toBeVisible()
    expect(errors).toEqual([])
    // the corrupted raw value was preserved under a sibling key, not discarded
    const backedUp = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('bodyos.schedule.v1.corrupted.'))
      return keys.length ? localStorage.getItem(keys[0]) : null
    })
    expect(backedUp).toBe('{not valid json::')
  })
})
