import { expect, test } from '@playwright/test';

test('successful login transitions directly to the workspace without flashing the empty gate', async ({ page }) => {
  await page.goto('/');
  const canvas=page.locator('#captcha-canvas');
  await expect(canvas).toHaveAttribute('aria-label',/CAPTCHA/);
  const label=await canvas.getAttribute('aria-label'),match=label?.match(/(-?\d+)\s*([+−×])\s*(-?\d+)/);
  if(!match)throw new Error(`Unexpected CAPTCHA label: ${label}`);
  const left=Number(match[1]),right=Number(match[3]),answer=match[2]==='+'?left+right:match[2]==='−'?left-right:left*right;
  await page.evaluate(() => {
    (window as any).__loginGateFlashed=false;
    let wasHidden=false;
    const gate=document.getElementById('sari-auth-gate')!;
    new MutationObserver(()=>{const hidden=gate.classList.contains('hidden');if(wasHidden&&!hidden)(window as any).__loginGateFlashed=true;if(hidden)wasHidden=true;}).observe(gate,{attributes:true,attributeFilter:['class']});
  });
  await page.locator('#login-username').fill('admin');
  await page.locator('#login-password').fill('Sari@2026');
  await page.locator('#captcha-answer').fill(String(answer));
  await page.locator('#login-submit').click();
  await expect(page.locator('#sari-auth-gate')).toHaveClass(/hidden/);
  await expect(page.locator('#sari-main-view .sari-tile').first()).toBeVisible({timeout:45_000});
  expect(await page.evaluate(() => (window as any).__loginGateFlashed)).toBe(false);
});
