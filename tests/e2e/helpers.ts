import { expect, type Page } from '@playwright/test';

export function uid() {
  return Math.random().toString(36).slice(2, 8);
}

/** Sign up through the real UI: welcome → email → (dev) magic link → username → Today. */
export async function signUp(page: Page, opts: { username?: string; next?: string } = {}) {
  const username = opts.username ?? `user_${uid()}`;
  await page.goto(opts.next ? `/welcome?next=${encodeURIComponent(opts.next)}` : '/today');
  await expect(page).toHaveURL(/\/welcome/);
  await page.getByRole('button', { name: 'Continue with email' }).click();
  await page.getByLabel('Email').fill(`${username}@regi.test`);
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await page.getByRole('link', { name: 'Open magic link (dev)' }).click();
  await expect(page.getByRole('heading', { name: 'Pick a username' })).toBeVisible();
  await page.getByLabel('Username').fill(username);
  await expect(page.getByText('Available')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  return username;
}

/** Shift the server clock (test-only endpoint, ALLOW_TIME_TRAVEL=1). */
export async function advanceDays(page: Page, days: number) {
  const res = await page.request.post('/api/dev/time', { data: { advanceDays: days } });
  expect(res.ok()).toBeTruthy();
}
