import { expect, test } from '@playwright/test';
import { seedMorningRegimen, signUp } from './helpers';

test('share a regimen → signed-out visitor views it, copies it through sign-in, wishlists a step; tracking + revoke', async ({ page, browser }) => {
  const creator = await signUp(page);
  const { regimenId, productId } = await seedMorningRegimen(page);
  await page.request.patch(`/api/products/${productId}`, { data: { affiliate_url: 'https://shop.example.com/cerave', notes: 'PRIVATE PRODUCT NOTE' } });
  await page.request.patch(`/api/day/${new Date().toISOString().slice(0, 10)}/journal`, { data: { regimen_id: regimenId, note: 'SECRET JOURNAL' } }).catch(() => null);

  // [share-create]
  await page.goto(`/regimens/${regimenId}`);
  await page.getByRole('link', { name: 'Share' }).click();
  await expect(page.getByRole('heading', { name: 'Share Daily Morning' })).toBeVisible();
  await page.getByLabel('Description').fill('What I do every weekday morning.');
  await page.getByRole('button', { name: 'Create link' }).last().click();
  await expect(page.getByText('Link ready')).toBeVisible();
  const url = await page.getByLabel('Share link').inputValue();
  const slug = new URL(url).pathname.split('/').pop()!;
  expect(url).toMatch(/\/r\/[A-Za-z0-9]{10}$/);

  // Server-rendered with Open Graph tags; no private data in the HTML.
  const html = await (await page.request.get(`/r/${slug}`)).text();
  expect(html).toContain('property="og:title"');
  expect(html).toContain(`@${creator}`);
  expect(html).not.toContain('PRIVATE PRODUCT NOTE');
  expect(html).not.toContain('SECRET JOURNAL');

  // [share-view] as a signed-out visitor.
  const visitorCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const visitor = await visitorCtx.newPage();
  await visitor.goto(`/r/${slug}`);
  await expect(visitor.getByText(`@${creator}'s regimen`)).toBeVisible();
  await expect(visitor.getByRole('heading', { name: 'Daily Morning' })).toBeVisible();
  await expect(visitor.getByText('“What I do every weekday morning.”')).toBeVisible();
  await expect(visitor.getByRole('link', { name: /Link to Foaming Cleanser/ })).toBeVisible();

  // Link chip counts a click and redirects to the affiliate URL.
  const stepId = (await (await visitor.request.get(`/api/public/r/${slug}`)).json()).steps[0].id;
  const click = await visitor.request.get(`/api/public/r/${slug}/out?step=${stepId}`, { maxRedirects: 0 });
  expect(click.status()).toBe(302);
  expect(click.headers()['location']).toBe('https://shop.example.com/cerave');

  // Copy → sign up → copy completes (slug survives auth).
  await visitor.getByRole('link', { name: 'Copy to my regimens' }).click();
  await expect(visitor).toHaveURL(/\/welcome\?next=%2Fr%2F/);
  await visitor.getByRole('button', { name: 'Continue with email' }).click();
  await visitor.getByLabel('Email').fill(`visitor_${Date.now()}@regi.test`);
  await visitor.getByRole('button', { name: 'Send magic link' }).click();
  await visitor.getByRole('link', { name: 'Open magic link (dev)' }).click();
  await visitor.getByLabel('Username').fill(`visitor_${Date.now().toString(36).slice(-6)}`);
  await expect(visitor.getByText('Available')).toBeVisible();
  await visitor.getByRole('button', { name: 'Continue' }).click();
  await expect(visitor).toHaveURL(/\/regimens\/[0-9a-f-]{36}\?toast=copied/);
  await expect(visitor.getByRole('heading', { name: 'Daily Morning' })).toBeVisible();
  // B7.4: shelf-linked steps become free-text "Brand Name" steps.
  await expect(visitor.getByText('CeraVe Foaming Cleanser')).toBeVisible();
  await expect(visitor.getByText('Added to your regimens.', { exact: false })).toBeVisible();

  // Wishlist-add from the share (B7.5).
  await visitor.goto(`/r/${slug}`);
  await visitor.getByRole('button', { name: 'Add Foaming Cleanser to my wishlist' }).click();
  await expect(visitor.getByText('Foaming Cleanser added to your wishlist.')).toBeVisible();
  await visitor.goto('/products?state=wishlist');
  await expect(visitor.getByTestId('product-card').filter({ hasText: 'Foaming Cleanser' })).toBeVisible();

  // [my-shares] shows views / copies / clicks.
  await page.goto('/profile/shares');
  const row = page.getByTestId('share-row').first();
  await expect(row).toContainText('Daily Morning');
  await expect(row).toContainText('Active');
  await expect(row).toContainText(/[1-9]\d* views/);
  await expect(row).toContainText('1 copies');
  await expect(row).toContainText('1 clicks');

  // Revoke → public page goes dark.
  await row.click();
  await page.getByRole('button', { name: 'Revoke link' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Revoke' }).click();
  await expect(page.getByText('Revoked', { exact: true })).toBeVisible();
  const anon = await browser.newContext();
  const gone = await anon.newPage();
  await gone.goto(`/r/${slug}`);
  // ISR may serve the cached page for up to 60s; the API is authoritative immediately.
  expect((await gone.request.get(`/api/public/r/${slug}`)).status()).toBe(404);
  await visitorCtx.close();
  await anon.close();
});

test('product share page (/p/) with wishlist add for a signed-in viewer', async ({ page, browser }) => {
  await signUp(page);
  const { productId } = await seedMorningRegimen(page, { steps: 1 });
  const share = await (await page.request.post('/api/shares', { data: { entity_type: 'user_product', entity_id: productId, description: 'My holy grail cleanser' } })).json();
  expect(share.url).toMatch(/\/p\//);
  const slug = share.share_slug;

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const viewer = await ctx.newPage();
  await signUp(viewer);
  await viewer.goto(`/p/${slug}`);
  await expect(viewer.getByRole('heading', { name: 'Foaming Cleanser' })).toBeVisible();
  await expect(viewer.getByText('Cleanser · Cleanse')).toBeVisible();
  await viewer.getByRole('button', { name: 'Add to my wishlist' }).click();
  await expect(viewer.getByText('On your wishlist')).toBeVisible();
  await ctx.close();
});
