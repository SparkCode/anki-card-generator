import { test, expect } from '@playwright/test';

test('should load the homepage and take a screenshot', async ({ page }) => {
  // Navigate to the application
  await page.goto('/');

  // Wait for the application to be fully loaded
  await page.waitForSelector('.App', { state: 'visible' });
  
  // Optional: wait a bit to ensure everything is loaded
  await page.waitForTimeout(1000);

  // Take a screenshot
  await page.screenshot({ path: 'e2e/screenshots/homepage.png', fullPage: true });
  
  // Optional: Add basic assertions to validate the page
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  // Check if the main app container exists
  const appContainer = await page.locator('.App').isVisible();
  expect(appContainer).toBeTruthy();
}); 