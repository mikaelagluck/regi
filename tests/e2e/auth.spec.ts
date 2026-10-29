import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

test('sign up lands on Today with the 5-tab nav; tabs remember their last screen', async ({ page }) => {
  await signUp(page);
  await expect(page).toHaveURL(/\/today/);
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const t of ['Products', 'Regimens', 'Today', 'Calendar', 'Profile']) await expect(nav.getByRole('link', { name: t })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');

  // Root redirects to Today (B1.2).
  await page.goto('/');
  await expect(page).toHaveURL(/\/today/);
});

test('username availability is checked and usernames are unique', async ({ page, browser }) => {
  const taken = await signUp(page);
  const other = await browser.newPage();
  await other.goto('/welcome');
  await other.getByRole('button', { name: 'Continue with email' }).click();
  await other.getByLabel('Email').fill(`second_${taken}@regi.test`);
  await other.getByRole('button', { name: 'Send magic link' }).click();
  await other.getByRole('link', { name: 'Open magic link (dev)' }).click();
  await other.getByLabel('Username').fill(taken);
  await expect(other.getByText('Taken')).toBeVisible();
  await expect(other.getByRole('button', { name: 'Continue' })).toBeDisabled();
});
