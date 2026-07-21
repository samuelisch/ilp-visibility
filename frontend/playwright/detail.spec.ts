import { test, expect } from '@playwright/test';
import policies from './fixtures/policies.json' with { type: 'json' };
import detail from './fixtures/policy-detail-full.json' with { type: 'json' };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/policies', async (route) => {
    await route.fulfill({ json: policies });
  });
  await page.route('**/api/policies/*', async (route) => {
    await route.fulfill({ json: detail });
  });
});

test('navigates from list to detail and renders both charts', async ({ page }) => {
  await page.goto('/');
  await page.getByText('ManuInvest Duo').click();
  await expect(page).toHaveURL(/\/policies\/\d+/);
  await expect(page.getByRole('heading', { name: 'ManuInvest Duo' })).toBeVisible();
  // Scope to the legend (recharts also pre-renders hidden tooltip items with the same text).
  const legends = page.locator('.recharts-legend-wrapper');
  await expect(legends.getByText('Net (after fees)')).toBeVisible(); // FeeGraph legend
  await expect(legends.getByText('Surrender fee ($)')).toBeVisible(); // SurrenderGraph legend
});

test('premium input can be replaced after clearing and defaults to zero on blur', async ({
  page,
}) => {
  await page.goto('/policies/3');
  const input = page.getByRole('spinbutton', { name: /premium/i });

  await input.fill('');
  await expect(input).toHaveValue('');
  await input.pressSequentially('800');
  await expect(input).toHaveValue('800');

  await input.fill('');
  await page.getByRole('heading', { name: 'ManuInvest Duo' }).click();
  await expect(input).toHaveValue('0');
});

test('premium input and 3/8 toggle work', async ({ page }) => {
  await page.goto('/policies/3');
  const input = page.getByRole('spinbutton', { name: /premium/i });
  await input.fill('800');
  await page.getByRole('button', { name: '8%' }).click();
  // Active segment uses the SegmentedControl's accent style.
  await expect(page.getByRole('button', { name: '8%' })).toHaveClass(/bg-accent/);
});

test('shows the omitted-fees disclaimer', async ({ page }) => {
  await page.goto('/policies/3');
  await expect(page.getByText(/Excludes insurance.*COI/i)).toBeVisible();
});

test('USD product shows the not-available-in-v1 notice', async ({ page }) => {
  await page.route('**/api/policies/*', (route) =>
    route.fulfill({ json: { ...detail, domicile: 'usd' } }),
  );
  await page.goto('/policies/6');
  await expect(page.getByText(/available in v1/i)).toBeVisible();
});
