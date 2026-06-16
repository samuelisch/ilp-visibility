import { test, expect } from '@playwright/test'
import policies from './fixtures/policies.json' with { type: 'json' }
import detail from './fixtures/policy-detail.json' with { type: 'json' }

test.beforeEach(async ({ page }) => {
  // Happy-path API. Individual tests may override the list route before navigating.
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
