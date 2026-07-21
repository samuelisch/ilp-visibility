import { test, expect } from '@playwright/test';
import policies from './fixtures/policies.json' with { type: 'json' };
import detail from './fixtures/policy-detail-full.json' with { type: 'json' };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/policies', (route) => route.fulfill({ json: policies }));
  await page.route('**/api/policies/*', (route) => route.fulfill({ json: detail }));
});

test('fee table renders every year in a scroll viewport (no pagination)', async ({ page }) => {
  await page.goto('/policies/3');
  await expect(page.getByTestId('fee-year-table')).toBeVisible();
  await expect(page.getByTestId('fee-row')).toHaveCount(40); // all policy years; no paging
  await expect(
    page.getByTestId('fee-year-table').getByRole('button', { name: 'Next' }),
  ).toHaveCount(0);
  await expect(page.getByTestId('fee-year-table')).toContainText('11'); // year 11 already present
  await expect(
    page.getByRole('table', { name: /value versus premiums paid chart/i }),
  ).toBeVisible();
});

test('surrender table shows the charge-years only', async ({ page }) => {
  await page.goto('/policies/3');
  await expect(page.getByTestId('surrender-fee-table')).toBeVisible();
  // fixture has surrender years 1–5
  await expect(page.getByTestId('surrender-row')).toHaveCount(5);
  await expect(
    page.getByRole('table', { name: /surrender fee versus net value chart/i }),
  ).toBeVisible();
});
