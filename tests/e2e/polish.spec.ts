import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { seedMorningRegimen, signUp } from './helpers';

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${label}: ${v.id} — ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`)).toEqual([]);
}

test('no serious/critical axe violations on the main screens', async ({ page, browser }) => {
  await page.goto('/welcome');
  await axe(page, 'welcome');
  await signUp(page);
  await axe(page, 'today-empty');
  const { regimenId, productId } = await seedMorningRegimen(page);
  for (const [path, label] of [
    ['/today', 'today'],
    ['/products', 'products'],
    [`/products/${productId}`, 'product-detail'],
    ['/products/new', 'product-form'],
    ['/regimens', 'regimens'],
    [`/regimens/${regimenId}`, 'regimen-detail'],
    ['/regimens/new', 'builder'],
    [`/regimens/${regimenId}/schedule`, 'schedule'],
    ['/calendar', 'calendar'],
    ['/calendar?view=day', 'calendar-day'],
    ['/profile', 'profile'],
    ['/profile/notifications', 'notifications'],
    ['/profile/shares', 'my-shares'],
  ] as const) {
    await page.goto(path);
    await axe(page, label);
  }
  const share = await (await page.request.post('/api/shares', { data: { entity_type: 'regimen', entity_id: regimenId } })).json();
  const ctx = await browser.newContext();
  const anon = await ctx.newPage();
  await anon.goto(`/r/${share.share_slug}`);
  await axe(anon, 'share-view');
  await ctx.close();
});

test('bottom sheets: focus moves in, Tab is trapped, Esc closes and restores focus', async ({ page }) => {
  await signUp(page);
  await seedMorningRegimen(page);
  await page.goto('/products');
  await page.goto('/today');
  const more = page.getByRole('button', { name: 'More options for SPF 50' });
  await more.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'SPF 50' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Skip this step' })).toBeFocused();
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('Tab');
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(more).toBeFocused();
});

test('edit-scope: skip a step just for today leaves tomorrow untouched', async ({ page }) => {
  await signUp(page);
  await seedMorningRegimen(page);
  await page.goto('/today');
  await page.getByRole('button', { name: 'More options for SPF 50' }).click();
  await page.getByRole('button', { name: 'Skip this step' }).click();
  const sheet = page.getByRole('dialog', { name: 'Skip SPF 50' });
  await expect(sheet.getByRole('radio', { name: /Just today/ })).toHaveAttribute('aria-checked', 'true');
  await sheet.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('0 of 1 done')).toBeVisible();
  await page.getByRole('button', { name: 'Next day' }).click();
  await expect(page.getByText('0 of 2 done')).toBeVisible();
});

test('reduced motion: the success moment still appears without confetti', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await signUp(page);
  await seedMorningRegimen(page, { steps: 1 });
  await page.goto('/today');
  await page.getByRole('checkbox', { name: 'Foaming Cleanser', exact: true }).click();
  const success = page.getByTestId('success-moment');
  await expect(success).toBeVisible();
  await expect(success.locator('[class*="confetti"]')).toBeHidden();
  await ctx.close();
});

test('account deletion removes the user and signs out', async ({ page }) => {
  const username = await signUp(page);
  await seedMorningRegimen(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Delete account' }).click();
  const sheet = page.getByRole('dialog', { name: 'Delete your account?' });
  await expect(sheet.getByRole('button', { name: 'Delete forever' })).toBeDisabled();
  await sheet.getByLabel(/Type your username/).fill(username);
  await sheet.getByRole('button', { name: 'Delete forever' }).click();
  await expect(page).toHaveURL(/\/welcome/);
  expect((await page.request.get('/api/me')).status()).toBe(401);
  // The username is free again.
  const r = await (await page.request.get(`/api/me/username?u=${username}`)).json();
  expect(r.available).toBe(true);
});

test('PWA: manifest, icons and service worker are served', async ({ page }) => {
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ name: 'regi', display: 'standalone', start_url: '/today' });
  for (const icon of manifest.icons) {
    const res = await page.request.get(icon.src);
    expect(res.ok(), icon.src).toBeTruthy();
    expect(res.headers()['content-type']).toContain('image/png');
  }
  expect((await page.request.get('/sw.js')).ok()).toBeTruthy();
  await page.goto('/welcome');
  await expect.poll(async () => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()))).toBe(true);
});
