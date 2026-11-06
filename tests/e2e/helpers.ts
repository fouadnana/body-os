import type { Page } from '@playwright/test'

export type NavLabel = 'Today' | 'Workout' | 'Nutrition' | 'Progress' | 'Coach'

// Phase 1 (fondations) renamed the visible bottom-nav labels (Workout→Séance,
// Progress→Progrès) and replaced the Coach tab with Plus→AI Coach. Tests keep
// using the original semantic names; this maps them to the current UI so the
// whole suite didn't need a mechanical rename across every call site.
const NAV_BUTTON_TEXT: Record<NavLabel, string> = {
  Today: 'Today',
  Workout: 'Séance',
  Nutrition: 'Nutrition',
  Progress: 'Progrès',
  Coach: 'Plus',
}

export const goNav = async (page: Page, label: NavLabel) => {
  await page.locator('.v9Bottom button', { hasText: NAV_BUTTON_TEXT[label] }).click()
  if (label === 'Coach') await page.locator('button', { hasText: 'AI Coach' }).click()
}

/** Forces "today" to resolve to the given muscle group in the weekly
 * schedule, regardless of the real calendar day the suite happens to run on.
 *
 * Several tests open Séance straight from Today without picking a group
 * explicitly, relying on it defaulting to Pectoraux — true only when the
 * default schedule's slot for the real current day *is* Pectoraux (Monday).
 * Call this before the test's first `page.goto` so the seeded schedule is
 * already in localStorage when the app's first read of it happens. */
export const seedTodayGroup = async (page: Page, group: string) => {
  await page.addInitScript((g) => {
    const schedule = ['Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Bras', 'Bras', 'Repos']
    const todayIdx = (new Date().getDay() + 6) % 7
    schedule[todayIdx] = g
    window.localStorage.setItem('bodyos.schedule.v1', JSON.stringify(schedule))
  }, group)
}

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
