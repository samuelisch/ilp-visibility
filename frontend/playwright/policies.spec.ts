import { test, expect } from '@playwright/test'
import policies from './fixtures/policies.json' with { type: 'json' }
import detail from './fixtures/policy-detail.json' with { type: 'json' }

test.beforeEach(async ({ page }) => {
  await page.route('**/api/policies', async (route) => {
    await route.fulfill({ json: policies })
  })
  await page.route('**/api/policies/*', async (route) => {
    await route.fulfill({ json: detail })
  })
})

test('renders all policies from the API', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByText('6 policies')).toBeVisible()
  await expect(page.getByText('GREAT Wealth Advantage')).toBeVisible()
})

test('search narrows the list', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('Policy name or variant…').fill('Duo')
  await expect(page.getByText('1 policy')).toBeVisible()
  await expect(page.getByText('ManuInvest Duo')).toBeVisible()
  await expect(page.getByText('Wealth Voyage')).toHaveCount(0)
})

test('provider filter restricts to one insurer', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Insurer').selectOption('Manulife')
  await expect(page.getByText('2 policies')).toBeVisible()
  await expect(page.getByText('ManuInvest Duo')).toBeVisible()
  await expect(page.getByText('Elite Secure Income')).toHaveCount(0)
})

test('sort by name descending reorders rows', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Sort by').selectOption('name-desc')
  // Data rows carry role="button" (keyboard activation), so they're not in the
  // 'row' role tree — the first row button is the first data row.
  await expect(page.getByRole('button').first()).toContainText('Wealth Voyage')
})

test('shows the empty state when no rows match', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('Policy name or variant…').fill('zzzznotapolicy')
  await expect(page.getByText('No policies match your filters.')).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(0)
})

test('shows the loading state while the request is pending', async ({ page }) => {
  await page.route('**/api/policies', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await route.fulfill({ json: policies })
  })
  await page.goto('/')
  await expect(page.getByText('Loading policies…')).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible() // resolves after the delay
})

test('shows the error state when the request fails', async ({ page }) => {
  await page.route('**/api/policies', (route) =>
    route.fulfill({ status: 500, body: 'boom' }),
  )
  await page.goto('/')
  await expect(page.getByText(/Couldn.t load policies/)).toBeVisible({
    timeout: 15_000,
  })
})

test('clicking a row fetches detail and logs it', async ({ page }) => {
  const messages: string[] = []
  page.on('console', (msg) => messages.push(msg.text()))
  await page.goto('/')
  await page.getByText('ManuInvest Duo').click()
  await expect
    .poll(() => messages.some((m) => m.includes('policy detail')))
    .toBe(true)
})
