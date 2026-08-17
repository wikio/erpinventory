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

test('topbar keeps fixed proportions and no overflow at required breakpoints', async ({ page }) => {
  const widths = [320, 375, 768, 1024, 1280];
  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 375 ? 700 : 820 });
    await page.waitForTimeout(100);
    const metrics = await page.evaluate(() => {
      const logo = document.querySelector('.topbar-logo-shell') as HTMLElement;
      const header = document.querySelector('.sari-topbar') as HTMLElement;
      const hamburger = document.getElementById('topbar-hamburger') as HTMLElement;
      const iconButtons = [...document.querySelectorAll('.topbar-icon-button')] as HTMLElement[];
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        logoWidth: logo?.getBoundingClientRect().width || 0,
        logoHeight: logo?.getBoundingClientRect().height || 0,
        headerRight: header?.getBoundingClientRect().right || 0,
        hamburgerSize: getComputedStyle(hamburger).display === 'none' ? 0 : Math.min(hamburger.getBoundingClientRect().width, hamburger.getBoundingClientRect().height),
        minIconSize: iconButtons.filter(button => getComputedStyle(button).display !== 'none').reduce((min, button) => Math.min(min, button.getBoundingClientRect().width, button.getBoundingClientRect().height), 999),
      };
    });
    expect(metrics.overflow, `overflow at ${width}px`).toBeLessThanOrEqual(1);
    expect(metrics.logoWidth, `logo width at ${width}px`).toBeGreaterThanOrEqual(35);
    expect(metrics.logoHeight, `logo height at ${width}px`).toBeGreaterThanOrEqual(35);
    expect(metrics.headerRight, `header clipping at ${width}px`).toBeLessThanOrEqual(width + 1);
    if (width <= 640) expect(metrics.hamburgerSize, `hamburger at ${width}px`).toBeGreaterThanOrEqual(44);
    expect(metrics.minIconSize, `icon target at ${width}px`).toBeGreaterThanOrEqual(36);
  }
});
