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

/** A session (V3) opens via a template spanning any muscle group, not a
 * group picked live — see src/v9/data.ts. This is the exact exercise list
 * the old built-in "Pectoraux" default session used, kept here as a fixed
 * test fixture so existing assertions (exercise names/order/count) don't
 * depend on the app's own current built-in templates. */
export const PECTORAUX_EXERCISES: { group: string, name: string }[] = [
  { group: 'Pectoraux', name: 'Développé incliné' },
  { group: 'Pectoraux', name: 'Écarté poulie bas→haut' },
  { group: 'Pectoraux', name: 'Développé couché' },
  { group: 'Pectoraux', name: 'Dips' },
  { group: 'Pectoraux', name: 'Écartés couchés' },
]

/** Forces "today" to resolve to a template made of exactly the given
 * exercises (default: PECTORAUX_EXERCISES), regardless of the real calendar
 * day the suite happens to run on and regardless of the app's own built-in
 * templates. Call this before the test's first `page.goto` so the seeded
 * template/schedule are already in localStorage when the app's first read
 * of them happens. */
export const seedTodayTemplate = async (page: Page, exercises: { group: string, name: string }[] = PECTORAUX_EXERCISES) => {
  await page.addInitScript((exs) => {
    const id = 'test-tpl'
    window.localStorage.setItem('bodyos.templates.v1', JSON.stringify([{ id, name: 'Séance test', exercises: exs }]))
    const schedule = Array(7).fill('Repos')
    const todayIdx = (new Date().getDay() + 6) % 7
    schedule[todayIdx] = id
    window.localStorage.setItem('bodyos.schedule.v1', JSON.stringify(schedule))
  }, exercises)
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
