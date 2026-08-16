import { expect, test, type Page } from '@playwright/test';

async function authenticate(page: Page) {
  const captchaResponse = await page.request.get('/api/auth/captcha');
  const captcha = await captchaResponse.json();
  const match = String(captcha.prompt).match(/(-?\d+)\s*([+−×])\s*(-?\d+)/);
  if (!match) throw new Error(`Unexpected CAPTCHA: ${captcha.prompt}`);
  const left = Number(match[1]), right = Number(match[3]);
  const answer = match[2] === '+' ? left + right : match[2] === '−' ? left - right : left * right;
  const login = await page.request.post('/api/auth/login', {
    data: { username: 'admin', password: 'Sari@2026', captchaId: captcha.id, captchaAnswer: String(answer) },
  });
  expect(login.ok()).toBeTruthy();
}

test.beforeEach(async ({ page }) => {
  await authenticate(page);
  await page.goto('/');
  await expect(page.locator('#sari-auth-gate')).toHaveClass(/hidden/);
  await expect(page.locator('#sari-main-view .sari-tile').first()).toBeVisible();
});

test('desktop shell lazy-loads domains without horizontal overflow', async ({ page }, testInfo) => {
  await expect(page.locator('script[src^="http"]')).toHaveCount(0);
  await page.evaluate(() => window.app.navigate('inventory'));
  await expect(page).toHaveURL(/#inventory/);
  await expect(page.locator('table.sari-table').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('desktop-inventory.png'), fullPage: true });
});

test('dense inventory table becomes readable cards on mobile', async ({ page }, testInfo) => {
  await page.evaluate(() => window.app.navigate('inventory'));
  const row = page.locator('table.sari-table tbody tr').first();
  await expect(row).toBeVisible();
  expect(await row.evaluate((element) => getComputedStyle(element).display)).toBe('grid');
  await expect(row.locator('td[data-label]').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('mobile-inventory-cards.png'), fullPage: true });
});
