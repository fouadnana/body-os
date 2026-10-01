import type { Page } from '@playwright/test'

export type NavLabel = 'Today' | 'Workout' | 'Nutrition' | 'Progress' | 'Coach'

export const goNav = (page: Page, label: NavLabel) =>
  page.locator('.v9Bottom button', { hasText: label }).click()

/** Logs every page.on('console','error') and page.on('pageerror'), ignoring
 * network/resource failures (thumbnails etc. may be unreachable depending on
 * the environment's outbound network policy — not a regression signal). */
export const collectRealErrors = (page: Page) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const text = m.text()
    if (/Failed to load resource|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION/.test(text)) return
    errors.push(text)
  })
  page.on('pageerror', (e) => errors.push('PAGE ERROR: ' + e.message))
  return errors
}
