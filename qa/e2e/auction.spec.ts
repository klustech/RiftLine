import { test, expect } from '@playwright/test';

test('Guest → AA wallet → place bid', async ({ page }) => {
  await page.goto(process.env.APP_URL ?? 'http://localhost:3000');

  await page.getByText('Continue as guest').click();
  await page.getByText('Create wallet').click();

  await page.getByRole('tab', { name: /Auctions/i }).click();
  await page.getByRole('button', { name: /Bid/i }).first().click();
  await expect(page.getByText(/Bid placed/i)).toBeVisible();
});
