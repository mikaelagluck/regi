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

/** Create a product + scheduled regimen through the API (for tests that aren't about the builder). */
export async function seedMorningRegimen(page: Page, opts: { name?: string; steps?: number } = {}) {
  const html = await (await page.request.get('/products/new')).text();
  const cleanser = /<option value="([0-9a-f-]{36})">Cleanser<\/option>/.exec(html)?.[1];
  expect(cleanser).toBeTruthy();
  const product = await (await page.request.post('/api/products', { data: { brand: 'CeraVe', name: 'Foaming Cleanser', category_id: cleanser } })).json();
  const steps = [
    { step_type: 'cleanse', user_product_id: product.id, wait_seconds_after: 0 },
    { step_type: 'protect', free_text_label: 'SPF 50', wait_seconds_after: 0 },
  ].slice(0, opts.steps ?? 2);
  const { id } = await (await page.request.post('/api/regimens', { data: { name: opts.name ?? 'Daily Morning', time_of_day: 'morning', steps } })).json();
  const res = await page.request.post(`/api/regimens/${id}/schedule`, { data: { mode: 'recurring', days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] } });
  expect(res.ok()).toBeTruthy();
  return { regimenId: id as string, productId: product.id as string };
}
