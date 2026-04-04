const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:8080/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: '/tmp/zapgenda-login.png', fullPage: true });

  const link = page.getByRole('button', { name: /esqueci minha senha/i });
  await link.click({ timeout: 5000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/zapgenda-after-click.png', fullPage: true });

  console.log('URL:', page.url());
  console.log('DIALOG_OPEN:', await page.getByText(/recuperar senha|resetar senha|enviar link|email/i).count().catch(() => 0));
  console.log('BODY_START');
  console.log((await page.locator('body').innerText()).slice(0, 5000));
  console.log('BODY_END');

  await browser.close();
})();
