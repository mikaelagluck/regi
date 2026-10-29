import { expect, test } from '@playwright/test';
import { advanceDays, seedMorningRegimen, signUp } from './helpers';

test('calendar: shape-coded dots, expanded day card, retroactive logging marker', async ({ page }) => {
  await signUp(page);
  await seedMorningRegimen(page);
  // Day 1 passes untouched; now on day 2.
  await advanceDays(page, 1);

  await page.goto('/today');
  // Log today so the calendar has history.
  await page.getByRole('checkbox', { name: 'Foaming Cleanser', exact: true }).click();
  await expect(page.getByText('1 of 2 done')).toBeVisible();

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Calendar' }).click();
  await expect(page.getByText(/-day streak/)).toBeVisible();
  const cells = page.getByRole('gridcell');
  await expect(cells.filter({ has: page.locator('[aria-label="partial"]') })).toHaveCount(1); // today: half-filled
  await expect(cells.filter({ has: page.locator('[aria-label="no data"]') })).toHaveCount(1); // yesterday: outline

  // Expanded card for today, then open yesterday to log it after the fact.
  await expect(page.getByText('AM · Daily Morning')).toBeVisible();
  const yesterday = cells.filter({ has: page.locator('[aria-label="no data"]') });
  const date = (await yesterday.getAttribute('data-testid'))!.slice(4);
  await yesterday.click();
  await expect(page).toHaveURL(new RegExp(`date=${date}`));
  await page.getByRole('link', { name: /^Open / }).click();
  await expect(page).toHaveURL(new RegExp(`view=day&date=${date}`));
  await expect(page.getByText(/Logging a past day/)).toBeVisible();
  await page.getByRole('checkbox', { name: 'Foaming Cleanser', exact: true }).click();
  await page.getByRole('checkbox', { name: 'SPF 50', exact: true }).click();
  await expect(page.getByText('2 of 2 done')).toBeVisible();
  // B9.4 marker on retro-logged checks (non-colour cue: icon + accessible label).
  await expect(page.getByRole('checkbox', { name: /SPF 50, done \(logged later\)/ })).toBeVisible();

  await page.goto('/calendar?view=month');
  await expect(page.getByRole('gridcell').filter({ has: page.locator('[aria-label="complete"]') })).toHaveCount(1);
});

test('streaks: rollover job + perfect days, success moment shows Day N', async ({ page }) => {
  await signUp(page);
  await seedMorningRegimen(page, { steps: 1 });

  await page.goto('/today');
  await page.getByRole('checkbox', { name: 'Foaming Cleanser', exact: true }).click();
  await expect(page.getByTestId('success-moment').getByText('Day 1.')).toBeVisible();
  await page.getByTestId('success-moment').click();

  await advanceDays(page, 1);
  await page.goto('/today');
  await page.getByRole('checkbox', { name: 'Foaming Cleanser', exact: true }).click();
  await expect(page.getByTestId('success-moment').getByText('Day 2.')).toBeVisible();
  await page.getByTestId('success-moment').click();
  await expect(page.getByTestId('streak-value')).toHaveText('2');
  await expect(page.getByTestId('completed-value')).toHaveText('2');

  // The scheduled rollover endpoint is protected and idempotent.
  expect((await page.request.post('/api/cron/rollover')).status()).toBe(401);
  const run = await page.request.post('/api/cron/rollover', { headers: { authorization: 'Bearer e2e-cron-secret' } });
  expect(run.ok()).toBeTruthy();
  await page.goto('/today');
  await expect(page.getByTestId('streak-value')).toHaveText('2');
});

test('finishing a product: empty-product modal writes history and repurchase bumps the bottle', async ({ page }) => {
  await signUp(page);
  const { productId } = await seedMorningRegimen(page, { steps: 1 });
  await page.goto(`/products/${productId}`);
  await expect(page.getByText('1st')).toBeVisible();
  await page.getByRole('link', { name: 'Mark empty' }).click();
  await expect(page.getByText('Finished it!', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: '4 stars' }).click();
  await page.getByLabel('Final thoughts').fill('Gentle, no stripping.');
  await page.getByRole('radio', { name: 'Repurchasing' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: 'Foaming Cleanser' })).toBeVisible();
  await expect(page.getByText('2nd')).toBeVisible();
  await expect(page.getByText('Past bottles')).toBeVisible();
  await expect(page.getByText('“Gentle, no stripping.”')).toBeVisible();
  await expect(page.getByText('Using', { exact: true })).toBeVisible();
});
