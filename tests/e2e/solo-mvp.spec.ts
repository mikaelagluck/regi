import { expect, test, type Page } from '@playwright/test';
import { advanceDays, signUp } from './helpers';

const PRODUCTS = [
  { brand: 'CeraVe', name: 'Hydrating Cleanser', category: 'Cleanser' },
  { brand: 'SkinCeuticals', name: 'CE Ferulic', category: 'Vitamin C serum' },
  { brand: 'The Ordinary', name: 'Niacinamide 10%', category: 'Niacinamide serum' },
  { brand: 'Cetaphil', name: 'Daily Moisturizer', category: 'Moisturizer' },
  { brand: 'Beauty of Joseon', name: 'Relief Sun SPF 50', category: 'Sunscreen' },
];

async function addProduct(page: Page, p: (typeof PRODUCTS)[number]) {
  await page.goto('/products/new');
  await page.getByLabel('Brand').fill(p.brand);
  await page.getByLabel('Name').fill(p.name);
  await page.getByLabel('Category').selectOption({ label: p.category });
  await page.getByRole('button', { name: 'Add product' }).click();
  await expect(page.getByRole('heading', { name: p.name })).toBeVisible();
}

async function addStepFromShelf(page: Page, slot: RegExp | null, productName: string, wait?: string) {
  if (slot) await page.getByRole('button', { name: slot }).click();
  else await page.getByRole('button', { name: 'Add step' }).click();
  await page.getByRole('button', { name: 'From my products' }).click();
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(productName) }).click();
  if (wait) await page.getByRole('button', { name: wait, exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: `Open ${productName}` })).toBeVisible();
}

test('sign up → add 5 products → build a morning regimen → complete it → next logical day it reappears', async ({ page }) => {
  await signUp(page);

  // Empty states teach each tab.
  await expect(page.getByText('No regimens yet')).toBeVisible();
  await page.goto('/products');
  await expect(page.getByText('Add your first product')).toBeVisible();

  for (const p of PRODUCTS) await addProduct(page, p);
  await page.goto('/products');
  await expect(page.getByTestId('product-card')).toHaveCount(5);
  await expect(page.getByRole('tab', { name: 'Using 5' })).toBeVisible();

  // Builder step 1: scaffold slots → shelf products, one with a wait timer.
  await page.goto('/regimens/new');
  await page.getByLabel('Regimen name').fill('Daily Morning');
  await addStepFromShelf(page, /^Cleanse/, 'Hydrating Cleanser');
  await addStepFromShelf(page, /^Treat/, 'CE Ferulic', '5m');
  await addStepFromShelf(page, /^Moisturize/, 'Daily Moisturizer');
  await addStepFromShelf(page, /^Protect/, 'Relief Sun SPF 50');
  await expect(page.getByText('Wait 5 min before next step')).toBeVisible();
  await page.getByRole('button', { name: 'Continue to schedule' }).click();

  // Builder step 2: recurring, every day preselected (no conflicts).
  await expect(page.getByRole('heading', { name: 'When does this run?' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Monday/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Save regimen' }).click();
  await expect(page.getByRole('heading', { name: 'Daily Morning' })).toBeVisible();
  await expect(page.getByText('Morning · Every day')).toBeVisible();

  // Today: complete it.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Today' }).click();
  await expect(page.getByText('0 of 4 done')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Hydrating Cleanser', exact: true }).click();
  await expect(page.getByText('1 of 4 done')).toBeVisible();

  // Step with a wait starts its timer; the row fills and counts down.
  await page.getByRole('checkbox', { name: 'CE Ferulic', exact: true }).click();
  await expect(page.getByTestId('step-1')).toHaveAttribute('data-state', 'waiting');
  await expect(page.getByText(/Wait \d:\d\d before Daily Moisturizer/)).toBeVisible();

  // Moving on early asks first (skip-wait sheet), Continue checks both.
  await page.getByRole('checkbox', { name: 'Daily Moisturizer', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: /left on the wait\. Continue anyway\?/ });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('3 of 4 done')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Relief Sun SPF 50', exact: true }).click();
  const success = page.getByTestId('success-moment');
  await expect(success).toBeVisible();
  await expect(success.getByText('Morning complete')).toBeVisible();
  await expect(success.getByText('Day 1.')).toBeVisible();
  await success.click();
  await expect(page.getByText('4 of 4 done')).toBeVisible();
  await expect(page.getByTestId('streak-value')).toHaveText('1');
  await expect(page.getByTestId('completed-value')).toHaveText('1');

  // Journal note saved per regimen instance.
  await page.getByRole('button', { name: /Add today's note/ }).click();
  await page.getByRole('textbox', { name: 'Today’s note' }).fill('Skin felt great.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Skin felt great.')).toBeVisible();

  // Advance the logical day: the regimen reappears fresh, streak carries.
  await advanceDays(page, 1);
  await page.goto('/today');
  await expect(page.getByText('0 of 4 done')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Hydrating Cleanser', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('streak-value')).toHaveText('1');
  await expect(page.getByText('Skin felt great.')).toHaveCount(0);

  // Yesterday kept its history.
  await page.getByRole('button', { name: 'Previous day' }).click();
  await expect(page.getByText('4 of 4 done')).toBeVisible();
  await expect(page.getByText('Skin felt great.')).toBeVisible();

  // Missing a whole day resets the streak at rollover.
  await advanceDays(page, 1);
  await page.goto('/today');
  await expect(page.getByTestId('streak-value')).toHaveText('0');
});
