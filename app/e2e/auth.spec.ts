import { test, expect } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('http://localhost:5173/auth'); // Guessing the route
  await expect(page).toHaveTitle(/Race Planner/);
});
